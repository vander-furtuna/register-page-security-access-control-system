import { expect, test } from "@playwright/test";

import { db, emulatorReady, lockTimestamp, loginAsAdmin } from "./emulator";

/**
 * Membros (telas 03 e 04) contra o emulador, com um membro de teste próprio. No firmware 2.1
 * o teste faz o papel da fechadura: marca os comandos como DONE/ERROR pela API REST.
 * Em série e só no desktop: mexe em `devices/*` e no membro de teste.
 */
const KEY = "user_card_77_finger_77";
const NAME = "Teste Membro E2E";
const EMAIL = "teste.membro.e2e@alu.ufc.br";
const DEVICE = "devices/sala-pet";

type Commands = Record<string, { type: string; status: string; fingerId?: number; slot?: number }>;

async function createMember() {
  await db.put(`users/${KEY}`, {
    username: NAME,
    email: EMAIL,
    rfid: 77,
    fingerId: 77,
    createdAt: "2026-03-14 10:21:00",
  });
  await db.put(`members/${KEY}`, { role: "petiano", active: true });
  await db.put("logs/log_e2e_membro_1", {
    userName: NAME,
    userEmail: EMAIL,
    userPath: `/users/${KEY}`,
    accessType: "rfid",
    status: "ALLOWED",
    cardUID: "AB:CD:12:34",
    timestamp: lockTimestamp(new Date(Date.now() - 60 * 60 * 1000)),
  });
}

async function firmware21(online = true) {
  await db.put(`${DEVICE}/status`, {
    online,
    lastSeen: Date.now(),
    firmware: "2.1.0",
    lcd: ["Aguardando", "acesso..."],
    capabilities: ["status", "commands"],
  });
}

/** O que o ESP faz: pega os comandos pendentes e marca o resultado. */
async function lockAnswers(type: string, status: "DONE" | "ERROR", error?: string) {
  await expect
    .poll(async () =>
      Object.values((await db.get<Commands>(`${DEVICE}/commands`)) ?? {}).some((c) => c.type === type),
    )
    .toBe(true);
  const commands = (await db.get<Commands>(`${DEVICE}/commands`)) ?? {};
  for (const [id, command] of Object.entries(commands)) {
    if (command.type === type && command.status === "PENDING") {
      await db.patch(`${DEVICE}/commands/${id}`, { status, ...(error ? { error } : {}) });
    }
  }
}

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Fluxos de membros rodam só no desktop (estado no banco).");
  test.skip(!(await emulatorReady()), "Emulador ou seed ausente: rode pnpm emulators e pnpm seed:emulator.");
  await db.remove(DEVICE);
  await createMember();
});

test.afterAll(async ({}, testInfo) => {
  if (testInfo.project.name !== "desktop" || !(await emulatorReady())) return;
  await db.remove(DEVICE);
  await db.remove(`users/${KEY}`);
  await db.remove(`members/${KEY}`);
  await db.remove("logs/log_e2e_membro_1");
});

test("lista com busca por UID, abas e ordenação", async ({ page }) => {
  await loginAsAdmin(page, "/membros?q=ab%20cd%2012");
  await expect(page.getByText("Busca:")).toBeVisible();
  await expect(page.getByRole("link", { name: NAME })).toBeVisible();
  await expect(page.getByRole("cell", { name: /hoje \d\d:\d\d/ })).toBeVisible();

  await page.getByRole("tab", { name: /Só cartão/ }).click();
  await expect(page.getByText("Nenhum membro com esse filtro")).toBeVisible();
  await page.getByRole("button", { name: "Limpar filtros" }).click();
  await expect(page).toHaveURL(/\/membros$/);

  await page.getByRole("button", { name: "Último acesso" }).click();
  await expect(page.getByRole("columnheader", { name: /Último acesso/ })).toHaveAttribute(
    "aria-sort",
    /ending/,
  );
});

test("busca global abre o membro pelo UID", async ({ page }) => {
  await loginAsAdmin(page, "/membros");
  await page.getByRole("combobox", { name: "Buscar membro, UID ou ID da digital" }).fill("abcd12");
  await page.getByRole("option", { name: new RegExp(NAME) }).click();
  await expect(page).toHaveURL(new RegExp(`/membros/${KEY}$`));
  await expect(page.getByRole("heading", { level: 2, name: NAME })).toBeVisible();
});

test("exporta CSV com BOM e ponto e vírgula", async ({ page }) => {
  await loginAsAdmin(page, "/membros?q=teste%20membro");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV" }).click();
  const file = await (await download).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of file) chunks.push(chunk as Buffer);
  const text = Buffer.concat(chunks).toString("utf8");
  expect(text.charCodeAt(0)).toBe(0xfeff);
  expect(text).toContain("Nome;E-mail;Vínculo");
  expect(text).toContain(`${NAME};${EMAIL};Petiano(a);#77;77;AB CD 12 34`);
});

test("firmware 2.0: remover fica na porta; editar vínculo funciona", async ({ page }) => {
  await loginAsAdmin(page, `/membros/${KEY}`);
  await expect(page.getByRole("button", { name: "Desativar acesso" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Remover digital" })).toBeDisabled();
  await expect(page.getByText(/aproxime o cartão mestre e passe o cartão ou o dedo na porta/)).toBeVisible();

  await page.getByRole("button", { name: "Editar" }).click();
  await page.getByLabel("Vínculo").click();
  await page.getByRole("option", { name: "Tutor(a)" }).click();
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect.poll(() => db.get(`members/${KEY}/role`)).toBe("tutor");
  await expect(page.getByText("Tutor(a) desde 03/2026")).toBeVisible();
});

test("firmware 2.1: remove a digital só depois que a fechadura confirma", async ({ page }) => {
  await firmware21();
  await loginAsAdmin(page, `/membros/${KEY}`);
  await page.getByRole("button", { name: "Remover digital" }).click();
  await expect(page.getByRole("heading", { name: "Remover a digital #77 de Teste Membro?" })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Remover digital" }).click();

  await expect(page.getByText("Aguardando a fechadura…")).toBeVisible();
  expect(await db.get(`users/${KEY}/fingerId`)).toBe(77); // nada muda antes da porta confirmar

  await lockAnswers("DELETE_FINGER", "DONE");
  await expect(page.getByText("Digital removida da fechadura")).toBeVisible();
  await expect.poll(() => db.get(`users/${KEY}/fingerId`)).toBeNull();
  expect(await db.get(`users/${KEY}/rfid`)).toBe(77);
});

test("firmware 2.1: desativar apaga as credenciais e mantém a pessoa", async ({ page }) => {
  await firmware21();
  await loginAsAdmin(page, `/membros/${KEY}`);
  await page.getByRole("button", { name: "Desativar acesso" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Desativar acesso" }).click();
  await expect(page.getByText(/Aguardando a fechadura \(0 de 2\)/)).toBeVisible();
  await lockAnswers("DELETE_FINGER", "DONE");
  await lockAnswers("DELETE_CARD", "DONE");
  await expect(page.getByText("Acesso desativado", { exact: true })).toBeVisible();
  await expect.poll(() => db.get(`members/${KEY}/active`)).toBe(false);
  expect(await db.get(`users/${KEY}`)).toMatchObject({ username: NAME, email: EMAIL });
  expect(await db.get(`users/${KEY}/rfid`)).toBeNull();
});

test("firmware 2.1: erro da fechadura não muda o banco", async ({ page }) => {
  await firmware21();
  await loginAsAdmin(page, `/membros/${KEY}`);
  await page.getByRole("button", { name: "Remover cartão" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Remover cartão" }).click();
  await lockAnswers("DELETE_CARD", "ERROR", "slot vazio");
  await expect(page.getByText("A fechadura recusou: slot vazio")).toBeVisible();
  expect(await db.get(`users/${KEY}/rfid`)).toBe(77);
});
