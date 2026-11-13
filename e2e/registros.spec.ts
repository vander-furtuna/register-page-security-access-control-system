import { expect, test } from "@playwright/test";

import { db, emulatorReady, lockTimestamp, loginAsAdmin } from "./emulator";

/**
 * Registros (tela 07), Visão geral (tela 02) e avisos em tempo real contra o emulador.
 * O teste grava registros como a fechadura faria. Em série, só no desktop.
 */
const KEY = "user_card_88_finger_88";
const NAME = "Teste Registros E2E";
const EMAIL = "teste.registros.e2e@alu.ufc.br";
const minutesAgo = (m: number) => lockTimestamp(new Date(Date.now() - m * 60_000));

const LOGS = {
  log_e2e_reg_1: {
    userName: NAME,
    userEmail: EMAIL,
    userPath: `/users/${KEY}`,
    accessType: "fingerId",
    status: "ALLOWED",
    timestamp: minutesAgo(3),
  },
  log_e2e_reg_2: {
    userName: "Desconhecido",
    userEmail: "N/A",
    userPath: "/users/user_card_id_0",
    accessType: "rfid",
    status: "DENIED",
    cardUID: "DE:AD:BE:EF",
    timestamp: minutesAgo(2),
  },
  log_e2e_reg_3: {
    userName: NAME,
    userEmail: EMAIL,
    userPath: `/users/${KEY}`,
    accessType: "rfid",
    status: "ALLOWED",
    cardUID: "88:88:88:88",
    timestamp: "1970-01-01 00:00:42",
  },
};

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Registros rodam só no desktop (estado no banco).");
  test.skip(!(await emulatorReady()), "Emulador ou seed ausente: rode pnpm emulators e pnpm seed:emulator.");
  await db.put(`users/${KEY}`, { username: NAME, email: EMAIL, rfid: 88, fingerId: 88 });
  for (const [key, log] of Object.entries(LOGS)) await db.put(`logs/${key}`, log);
});

test.afterAll(async ({}, testInfo) => {
  if (testInfo.project.name !== "desktop" || !(await emulatorReady())) return;
  await db.remove(`users/${KEY}`);
  for (const key of [...Object.keys(LOGS), "log_e2e_reg_toast_1", "log_e2e_reg_toast_2"])
    await db.remove(`logs/${key}`);
});

test("registros de hoje com filtros na URL, atalho e grupo sem horário", async ({ page }) => {
  await loginAsAdmin(page, "/registros");
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName("Registros de acesso");
  await expect(page.getByRole("cell", { name: NAME }).first()).toBeVisible();
  await expect(page.getByText("DE AD BE EF")).toBeVisible();
  await expect(page.getByRole("link", { name: "Cadastrar este cartão" }).first()).toHaveAttribute(
    "href",
    "/cadastro?modo=CARD_ONLY",
  );
  await expect(page.getByText("Sem horário confiável")).toBeVisible();

  await page.getByRole("button", { name: "Negados", exact: true }).click();
  await expect(page).toHaveURL(/resultado=negados/);
  await expect(page.getByText("DE AD BE EF")).toBeVisible();
  await expect(page.getByRole("cell", { name: NAME })).toHaveCount(0);
});

test("exporta CSV dos registros", async ({ page }) => {
  await loginAsAdmin(page, "/registros?credencial=cartao");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV" }).click();
  const file = await (await download).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of file) chunks.push(chunk as Buffer);
  const text = Buffer.concat(chunks).toString("utf8");
  expect(text).toContain("Data;Hora;Quem;E-mail;Credencial;Resultado");
  expect(text).toContain("Cartão desconhecido;;Cartão DE AD BE EF;Negado");
  expect(text).toContain("sem horário");
});

test("visão geral mostra os números, o gráfico com tabela e o feed", async ({ page }) => {
  await loginAsAdmin(page, "/");
  await expect(page.getByRole("link", { name: /Tentativas negadas/ })).toHaveAttribute(
    "href",
    "/registros?resultado=negados",
  );
  await expect(page.getByRole("heading", { name: "Últimos acessos" })).toBeVisible();
  await expect(page.getByRole("link", { name: NAME }).first()).toBeVisible();
  await page.getByRole("button", { name: "Ver tabela" }).click();
  await expect(page.getByRole("columnheader", { name: "Liberados" })).toBeVisible();
  await page.getByRole("button", { name: "Ver gráfico" }).click();
  await expect(page.getByRole("img", { name: /Acessos por hora/ })).toBeVisible();
});

test("avisa cada acesso novo em tempo real e respeita o desligar", async ({ page }) => {
  await loginAsAdmin(page, "/");
  await expect(page.getByRole("heading", { name: "Últimos acessos" })).toBeVisible();
  await page.waitForTimeout(500);

  await db.put("logs/log_e2e_reg_toast_1", { ...LOGS.log_e2e_reg_1, timestamp: minutesAgo(0) });
  await expect(page.getByText("Teste Registros entrou")).toBeVisible();

  await page.getByRole("button", { name: /^Avisos/ }).click();
  await page.getByRole("menuitemcheckbox", { name: "Avisar cada acesso na porta" }).click();
  await page.keyboard.press("Escape");

  await db.put("logs/log_e2e_reg_toast_2", { ...LOGS.log_e2e_reg_2, timestamp: minutesAgo(0) });
  await expect(page.getByText("DE AD BE EF").first()).toBeVisible(); // chegou no feed…
  await expect(page.getByText("Acesso negado: Cartão desconhecido")).toHaveCount(0); // …sem toast
});
