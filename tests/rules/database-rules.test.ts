import { readFileSync } from "node:fs";

import { beforeAll, beforeEach, describe, expect, it } from "vitest";

/**
 * Testes de `database.rules.json` contra o EMULADOR (nunca produção), num namespace só deles
 * para não mexer nos dados do `pnpm seed:emulator`. Usa a API REST com tokens de verdade do
 * emulador de Auth: admin, não-admin, e-mail fora da UFC, fechadura anônima (firmware 2.0) e
 * conta própria da fechadura (firmware 2.1).
 *
 *   pnpm emulators   # em outro terminal
 *   pnpm test:rules
 */
const DB = `http://${process.env.FIREBASE_DATABASE_EMULATOR_HOST ?? "127.0.0.1:9000"}`;
const AUTH = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099"}/identitytoolkit.googleapis.com/v1`;
const NS = `rules-test-${Date.now().toString(36)}`;
const RULES = readFileSync(new URL("../../database.rules.json", import.meta.url), "utf8");

type Who = { uid: string; token: string } | null;

async function signUp(email?: string): Promise<{ uid: string; token: string }> {
  const res = await fetch(`${AUTH}/accounts:signUp?key=demo-api-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      email ? { email, password: "senha-de-teste", returnSecureToken: true } : { returnSecureToken: true },
    ),
  });
  if (!res.ok) throw new Error(`Auth emulator: HTTP ${res.status} ${await res.text()}`);
  const body = (await res.json()) as { localId: string; idToken: string };
  return { uid: body.localId, token: body.idToken };
}

/** Requisição como `who` (null = sem login). Devolve o status HTTP: 200 permitido, 401 negado. */
async function as(who: Who, method: "GET" | "PUT" | "PATCH" | "DELETE", path: string, body?: unknown) {
  const auth = who ? `&auth=${who.token}` : "";
  const res = await fetch(`${DB}/${path}.json?ns=${NS}${auth}`, {
    method,
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  await res.text();
  return res.status;
}

const owner = {
  async put(path: string, value: unknown) {
    const res = await fetch(`${DB}/${path}.json?ns=${NS}`, {
      method: "PUT",
      headers: { Authorization: "Bearer owner" },
      body: JSON.stringify(value),
    });
    if (!res.ok) throw new Error(`owner PUT ${path}: HTTP ${res.status}`);
  },
};

async function emulatorUp(): Promise<boolean> {
  try {
    await fetch(`${DB}/.json?ns=${NS}`);
    await fetch(`${AUTH}/accounts:signUp?key=demo-api-key`, { method: "POST", body: "{}" });
    return true;
  } catch {
    return false;
  }
}

const up = await emulatorUp();
// no CI o job sobe o emulador: se ele não respondeu, falhar em vez de pular em silêncio
if (!up && process.env.CI) throw new Error("Emulador do Firebase indisponível no CI.");
const OK = 200;
const DENIED = 401;

describe.skipIf(!up)("database.rules.json", () => {
  const id = Date.now().toString(36);
  let admin: Who;
  let notAdmin: Who;
  let outsider: Who;
  let anonDevice: Who;
  let device: Who;

  beforeAll(async () => {
    const res = await fetch(`${DB}/.settings/rules.json?ns=${NS}`, {
      method: "PUT",
      headers: { Authorization: "Bearer owner" },
      body: RULES,
    });
    if (!res.ok) throw new Error(`Regras recusadas pelo emulador: ${await res.text()}`);
    admin = await signUp(`admin.${id}@alu.ufc.br`);
    notAdmin = await signUp(`aluno.${id}@alu.ufc.br`);
    outsider = await signUp(`fora.${id}@gmail.com`);
    anonDevice = await signUp();
    device = await signUp(`fechadura.${id}@pet-lock.dev`);
  });

  /** Estado de partida de cada teste (escrito como dono, ignorando as regras). */
  beforeEach(async () => {
    await owner.put("", {
      admins: { [admin!.uid]: true, [outsider!.uid]: true },
      config: { deviceUids: { [device!.uid]: true } },
      system: { mode: "STANDBY" },
      users: {
        user_card_1_finger_1: { username: "Maria Clara", email: "maria@alu.ufc.br", rfid: 1, fingerId: 1 },
      },
      members: { user_card_1_finger_1: { role: "petiano", active: true } },
      logs: { log_1: { userName: "Maria Clara", status: "ALLOWED" } },
      devices: {
        "sala-pet": {
          status: { online: true, lastSeen: 1 },
          commands: { c1: { type: "REBOOT", requestedBy: admin!.uid, requestedAt: 1, status: "PENDING" } },
        },
      },
    });
  });

  describe("leitura", () => {
    it("admin da UFC, fechadura (conta própria e anônima no firmware 2.0) leem", async () => {
      expect(await as(admin, "GET", "users")).toBe(OK);
      expect(await as(device, "GET", "users")).toBe(OK);
      expect(await as(anonDevice, "GET", "logs")).toBe(OK);
    });

    it("sem login, não-admin e admin com e-mail fora da UFC não leem", async () => {
      expect(await as(null, "GET", "users")).toBe(DENIED);
      expect(await as(notAdmin, "GET", "users")).toBe(DENIED);
      expect(await as(outsider, "GET", "users")).toBe(DENIED);
    });

    it("cada pessoa lê só o próprio admins/{uid} (tela de sem permissão)", async () => {
      expect(await as(notAdmin, "GET", `admins/${notAdmin!.uid}`)).toBe(OK);
      expect(await as(notAdmin, "GET", `admins/${admin!.uid}`)).toBe(DENIED);
    });

    it("com config/legacyAnonymousDevice = false, o login anônimo deixa de valer", async () => {
      await owner.put("config/legacyAnonymousDevice", false);
      expect(await as(anonDevice, "GET", "logs")).toBe(DENIED);
      expect(await as(anonDevice, "PUT", "system/mode", "MASTER")).toBe(DENIED);
      expect(await as(device, "PUT", "system/mode", "MASTER")).toBe(OK);
    });
  });

  describe("caminhos da fechadura (firmware 2.0)", () => {
    it("Modo mestre: só a fechadura liga, nunca o site", async () => {
      expect(await as(anonDevice, "PUT", "system/mode", "MASTER")).toBe(OK);
      expect(await as(device, "PUT", "system/mode", "STANDBY")).toBe(OK);
      expect(await as(admin, "PUT", "system/mode", "MASTER")).toBe(DENIED);
      expect(await as(device, "PUT", "system/mode", "LIBERADO")).toBe(DENIED);
    });

    it("registros de acesso: só a fechadura grava", async () => {
      expect(await as(anonDevice, "PUT", "logs/log_2", { userName: "Desconhecido", status: "DENIED" })).toBe(
        OK,
      );
      expect(await as(admin, "PUT", "logs/log_3", { userName: "x", status: "ALLOWED" })).toBe(DENIED);
      expect(await as(admin, "DELETE", "logs/log_1")).toBe(DENIED);
    });

    it("users: a fechadura cria; o admin só altera ou apaga quem já existe", async () => {
      expect(
        await as(device, "PUT", "users/user_card_2", { username: "Novo", email: "n@alu.ufc.br", rfid: 2 }),
      ).toBe(OK);
      expect(await as(admin, "PATCH", "users/user_card_1_finger_1", { fingerId: 27 })).toBe(OK);
      expect(await as(admin, "DELETE", "users/user_card_1_finger_1")).toBe(OK);
      expect(
        await as(admin, "PUT", "users/user_card_9", {
          username: "Inventado",
          email: "i@alu.ufc.br",
          rfid: 9,
        }),
      ).toBe(DENIED);
      expect(await as(notAdmin, "PATCH", "users/user_card_2", { fingerId: 3 })).toBe(DENIED);
    });
  });

  describe("cadastro", () => {
    const pending = {
      username: "Ana Beatriz",
      email: "ana@alu.ufc.br",
      mode: "CARD_AND_FINGER",
      timestamp: "2026-11-13 10:00:00",
    };

    it("o admin cria e cancela; o formato é conferido", async () => {
      expect(await as(admin, "PUT", "pendingRegistration/current", pending)).toBe(OK);
      expect(await as(admin, "PUT", "pendingRegistration/current", { ...pending, mode: "TUDO" })).toBe(
        DENIED,
      );
      expect(await as(admin, "PUT", "pendingRegistration/current", { username: "Sem e-mail" })).toBe(DENIED);
      expect(await as(admin, "DELETE", "pendingRegistration/current")).toBe(OK);
    });

    it("a fechadura atualiza o passo e apaga o pedido, mas não cria pedido", async () => {
      expect(await as(device, "PUT", "pendingRegistration/current", pending)).toBe(DENIED);
      await owner.put("pendingRegistration/current", pending);
      expect(await as(device, "PATCH", "pendingRegistration/current", { step: "WAITING_CARD" })).toBe(OK);
      expect(await as(anonDevice, "DELETE", "pendingRegistration/current")).toBe(OK);
    });

    it("espelho legado pendingUser: admin grava; a fechadura só apaga", async () => {
      const legacy = { username: "Ana", email: "ana@alu.ufc.br", timestamp: "2026-11-13 10:00:00" };
      expect(await as(admin, "PUT", "pendingUser/current", legacy)).toBe(OK);
      expect(await as(anonDevice, "PUT", "pendingUser/current", legacy)).toBe(DENIED);
      expect(await as(anonDevice, "DELETE", "pendingUser/current")).toBe(OK);
    });

    it("não-admin não pede cadastro", async () => {
      expect(await as(notAdmin, "PUT", "pendingRegistration/current", pending)).toBe(DENIED);
      expect(await as(outsider, "PUT", "pendingRegistration/current", pending)).toBe(DENIED);
    });
  });

  describe("members (metadados do site)", () => {
    const key = "members/user_card_1_finger_1";

    it("o admin grava vínculo, validade e quem alterou", async () => {
      expect(
        await as(admin, "PUT", key, {
          role: "tutor",
          active: true,
          validUntil: "2027-12-31",
          updatedBy: admin!.uid,
        }),
      ).toBe(OK);
      expect(await as(admin, "PATCH", key, { active: false })).toBe(OK);
      expect(await as(admin, "DELETE", key)).toBe(OK);
    });

    it("formato errado, autoria falsa e campos extras são recusados", async () => {
      expect(await as(admin, "PATCH", key, { role: "dono" })).toBe(DENIED);
      expect(await as(admin, "PATCH", key, { validUntil: "31/12/2027" })).toBe(DENIED);
      expect(await as(admin, "PATCH", key, { updatedBy: "outra-pessoa" })).toBe(DENIED);
      expect(await as(admin, "PATCH", key, { senha: "123" })).toBe(DENIED);
      expect(await as(admin, "PUT", "members/user_x", { role: "petiano" })).toBe(DENIED);
    });

    it("a fechadura e não-admins não mexem em members", async () => {
      expect(await as(device, "PATCH", key, { active: false })).toBe(DENIED);
      expect(await as(notAdmin, "PATCH", key, { active: false })).toBe(DENIED);
    });
  });

  describe("devices/* (firmware 2.1)", () => {
    const commands = "devices/sala-pet/commands";
    const command = () => ({
      type: "DELETE_FINGER",
      fingerId: 12,
      requestedBy: admin!.uid,
      requestedAt: { ".sv": "timestamp" },
      status: "PENDING",
    });

    it("status, inventário e quedas: só a fechadura", async () => {
      expect(await as(device, "PATCH", "devices/sala-pet/status", { lastSeen: 2 })).toBe(OK);
      expect(await as(anonDevice, "PUT", "devices/sala-pet/inventory", { updatedAt: 2 })).toBe(OK);
      expect(await as(device, "PUT", "devices/sala-pet/outages/o1", { start: 1, end: 2 })).toBe(OK);
      expect(await as(admin, "PATCH", "devices/sala-pet/status", { online: false })).toBe(DENIED);
      expect(await as(device, "PUT", "devices/sala-pet/outro", { x: 1 })).toBe(DENIED);
    });

    it("o admin cria comandos pendentes em nome próprio", async () => {
      expect(await as(admin, "PUT", `${commands}/c2`, command())).toBe(OK);
      expect(await as(admin, "PUT", `${commands}/c3`, { ...command(), status: "DONE" })).toBe(DENIED);
      expect(await as(admin, "PUT", `${commands}/c4`, { ...command(), requestedBy: "outra-pessoa" })).toBe(
        DENIED,
      );
      expect(await as(admin, "PUT", `${commands}/c5`, { ...command(), type: "WIPE" })).toBe(DENIED);
      expect(await as(admin, "PUT", `${commands}/c6`, { ...command(), extra: true })).toBe(DENIED);
    });

    it("só a fechadura marca o resultado; o admin não reescreve comando enviado", async () => {
      expect(await as(admin, "PATCH", `${commands}/c1`, { status: "DONE" })).toBe(DENIED);
      expect(await as(device, "PUT", `${commands}/c9`, command())).toBe(DENIED);
      expect(await as(device, "PATCH", `${commands}/c1`, { status: "ERROR", error: "Slot vazio" })).toBe(OK);
      expect(await as(device, "PATCH", `${commands}/c1`, { requestedBy: "outra-pessoa" })).toBe(DENIED);
    });

    it("não-admin não envia comandos", async () => {
      expect(await as(notAdmin, "PUT", `${commands}/c7`, { ...command(), requestedBy: notAdmin!.uid })).toBe(
        DENIED,
      );
    });
  });

  it("admins/* e config/* só pelo console", async () => {
    expect(await as(admin, "PUT", `admins/${notAdmin!.uid}`, true)).toBe(DENIED);
    expect(await as(device, "PUT", `config/deviceUids/${anonDevice!.uid}`, true)).toBe(DENIED);
    expect(await as(admin, "PUT", "config/legacyAnonymousDevice", false)).toBe(DENIED);
  });
});
