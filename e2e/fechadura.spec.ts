import { expect, test } from "@playwright/test";

import { db, emulatorReady, lockTimestamp, loginAsAdmin } from "./emulator";

/**
 * Credenciais (tela 06) e Dispositivo (tela 08) contra o emulador. Roda no projeto `fechadura`,
 * depois dos outros (troca `devices/*` inteiro). No firmware 2.1 o teste faz o papel da
 * fechadura: publica o status e marca os comandos como DONE.
 */
const KEY = "user_card_66";
const NAME = "Teste Fechadura E2E";
const EMAIL = "teste.fechadura.e2e@alu.ufc.br";
const ORPHAN = 57;
const DEVICE = "devices/sala-pet";
const LOG = "log_e2e_fechadura_1";

type Commands = Record<string, { type: string; status: string; seconds?: number }>;

test.describe.configure({ mode: "serial" });

test.beforeEach(async () => {
  test.skip(!(await emulatorReady()), "Emulador ou seed ausente: rode pnpm emulators e pnpm seed:emulator.");
  await db.remove(DEVICE);
  // membro só com cartão + uma digital sem dono que abriu a porta (como o firmware 2.0 grava)
  await db.put(`users/${KEY}`, { username: NAME, email: EMAIL, rfid: 66 });
  await db.put(`logs/${LOG}`, {
    userName: "Desconhecido",
    userEmail: "N/A",
    userPath: `/users/user_finger_id_${ORPHAN}`,
    accessType: "fingerId",
    status: "ALLOWED",
    timestamp: lockTimestamp(new Date(Date.now() - 5 * 60_000)),
  });
});

test.afterAll(async () => {
  if (!(await emulatorReady())) return;
  await db.remove(`users/${KEY}`);
  await db.remove(`logs/${LOG}`);
  await db.remove(DEVICE);
});

test("credenciais no firmware 2.0: mapa parcial e vincular uma digital sem dono", async ({ page }) => {
  await loginAsAdmin(page, `/credenciais?pos=d${ORPHAN}`);
  await expect(page.getByText("Mapa parcial: atualize o firmware para ver a memória completa")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ler inventário agora" })).toBeDisabled();

  const map = page.getByRole("group", { name: "Posições do sensor de digitais" });
  await expect(map.getByRole("button", { name: `Digital ${ORPHAN}: sem dono` })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  const panel = page.getByRole("region", { name: `Digital #${ORPHAN}` });
  await expect(panel.getByText("Sem dono no banco")).toBeVisible();
  await panel.getByLabel("Vincular a um membro").fill("Fechadura E2E");
  await panel.getByRole("radio", { name: new RegExp(NAME) }).click();
  await panel.getByRole("button", { name: "Vincular a Teste" }).click();

  await expect.poll(() => db.get(`users/${KEY}/fingerId`)).toBe(ORPHAN);
  await expect(map.getByRole("button", { name: `Digital ${ORPHAN}: ${NAME}` })).toBeVisible();
  await expect(panel.getByRole("link", { name: new RegExp(NAME) })).toBeVisible();
});

test("dispositivo no firmware 2.0: explica o que não está disponível", async ({ page }) => {
  await loginAsAdmin(page, "/dispositivo");
  await expect(page.getByRole("heading", { name: "Quando a internet cai" })).toBeVisible();
  await expect(
    page.getByText("O histórico de conexão não está disponível nesta versão do firmware."),
  ).toBeVisible();
  await expect(page.getByText(/Os ajustes pelo site não estão disponíveis/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Reiniciar" })).toBeDisabled();
  await expect(page.getByRole("heading", { name: "Fila de comandos" })).toHaveCount(0);
});

test("dispositivo no firmware 2.1: quedas, ajustes por comando e fila", async ({ page }) => {
  const now = Date.now();
  await db.put(DEVICE, {
    status: {
      online: true,
      lastSeen: now,
      onlineSince: now - 90 * 60_000,
      firmware: "2.1.0",
      ssid: "PET-UFC",
      rssi: -60,
      lcd: ["Aguardando", "acesso..."],
      settings: { unlockSeconds: 2, showName: true },
      peripherals: { dy50: true, rc522: false },
      capabilities: ["status", "commands", "outages", "settings", "peripherals"],
    },
    outages: { a: { start: now - 3 * 60 * 60_000, end: now - 3 * 60 * 60_000 + 24 * 60_000, queued: 6 } },
  });

  await loginAsAdmin(page, "/dispositivo");
  await expect(page.getByText("Online há 1 h 30 min")).toBeVisible();
  await expect(page.getByText("24 min offline")).toBeVisible();
  await expect(page.getByText(/6 acessos guardados/)).toBeVisible();
  await expect(page.getByText("Não respondeu")).toBeVisible();

  const settings = page.getByRole("region", { name: "Ajustes" });
  const save = settings.getByRole("button", { name: "Salvar ajustes" });
  await expect(save).toBeDisabled();
  await settings.getByRole("combobox", { name: "Tempo com a tranca aberta" }).click();
  await page.getByRole("option", { name: "5 segundos" }).click();
  await save.click();

  // a fechadura recebe o comando, aplica e publica o novo valor
  let id = "";
  await expect
    .poll(async () => {
      const commands = (await db.get<Commands>(`${DEVICE}/commands`)) ?? {};
      id = Object.keys(commands).find((k) => commands[k]!.type === "SET_UNLOCK_SECONDS") ?? "";
      return id ? commands[id]!.seconds : undefined;
    })
    .toBe(5);
  await expect(settings.getByText("Aguardando a fechadura aplicar…")).toBeVisible();
  await db.patch(`${DEVICE}/status/settings`, { unlockSeconds: 5 });
  await db.patch(`${DEVICE}/commands/${id}`, { status: "DONE" });

  await expect(page.getByText("A fechadura aplicou os ajustes")).toBeVisible();
  await expect(save).toBeDisabled();
  const queue = page.getByRole("region", { name: "Fila de comandos" });
  await expect(queue.getByText("Tempo com a tranca aberta")).toBeVisible();
  await expect(queue.getByText("Feito")).toBeVisible();
});
