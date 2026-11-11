import { expect, test, type Browser, type Page } from "@playwright/test";

/**
 * Cadastro (tela 05) contra o emulador. O teste faz o papel da fechadura pela API REST do
 * emulador: grava `users/*`, apaga o pedido e troca o `system/mode`, como o firmware 2.0 faz.
 * Precisa de `pnpm emulators` + `pnpm seed:emulator`. Sem emulador, é pulado.
 *
 * Todos mexem no mesmo `pendingRegistration/current`: rodam em série e só no projeto desktop
 * (o layout de celular é conferido num contexto de 390px dentro do próprio teste).
 */
const NS = "demo-pet-lock-default-rtdb";
const DB = "http://127.0.0.1:9000";
const AUTH = "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1";
const ADMIN = { email: "admin@ufc.br", password: "petlock-dev" };
const OWNER = { Authorization: "Bearer owner", "Content-Type": "application/json" };

const db = {
  async get(path: string) {
    const res = await fetch(`${DB}/${path}.json?ns=${NS}`, { headers: OWNER });
    return res.json();
  },
  async put(path: string, value: unknown) {
    await fetch(`${DB}/${path}.json?ns=${NS}`, {
      method: "PUT",
      headers: OWNER,
      body: JSON.stringify(value),
    });
  },
  async remove(path: string) {
    await fetch(`${DB}/${path}.json?ns=${NS}`, { method: "DELETE", headers: OWNER });
  },
};

/** O que o ESP faz no fim do cadastro: cria users/* e apaga o pedido e o espelho. */
async function lockCompletes(key: string, user: Record<string, unknown>) {
  await db.put(`users/${key}`, { ...user, createdAt: "2026-11-10 14:05:00" });
  await db.remove("pendingRegistration/current");
  await db.remove("pendingUser/current");
}

async function emulatorReady(): Promise<boolean> {
  try {
    const res = await fetch(`${AUTH}/accounts:signInWithPassword?key=demo-api-key`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...ADMIN, returnSecureToken: true }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function openCadastro(page: Page) {
  await page.goto("/login?next=%2Fcadastro");
  await page.getByLabel("E-mail institucional").fill(ADMIN.email);
  await page.getByLabel("Senha", { exact: true }).fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/cadastro$/);
}

async function fill(
  page: Page,
  name: string,
  email: string,
  method: "Cartão + digital" | "Só cartão" | "Só digital",
) {
  await page.getByLabel("Nome completo").fill(name);
  await page.getByLabel("E-mail institucional").fill(email);
  await page.getByText(method, { exact: true }).click();
}

const start = (page: Page) => page.getByRole("button", { name: "Iniciar cadastro na fechadura" });
const uniqueEmail = (prefix: string) => `${prefix}.${Date.now()}@alu.ufc.br`;

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "Fluxos de cadastro rodam só no desktop (estado único no banco).",
  );
  test.skip(!(await emulatorReady()), "Emulador ou seed ausente: rode pnpm emulators e pnpm seed:emulator.");
  await db.remove("pendingRegistration/current");
  await db.remove("pendingUser/current");
  await db.put("system/mode", "MASTER");
});

// O afterAll roda também no worker do projeto celular (cujos testes são pulados): só o desktop limpa.
test.afterAll(async ({}, testInfo) => {
  if (testInfo.project.name !== "desktop" || !(await emulatorReady())) return;
  await db.remove("pendingRegistration/current");
  await db.remove("pendingUser/current");
  await db.put("system/mode", "STANDBY");
});

test("sem Modo mestre, o botão fica desabilitado com a instrução", async ({ page }) => {
  await db.put("system/mode", "STANDBY");
  await openCadastro(page);
  await expect(page.getByText("Fechadura em espera")).toBeVisible();
  await expect(start(page)).toBeDisabled();
  await expect(page.getByText("Aproxime o cartão mestre da fechadura para liberar o botão.")).toBeVisible();
});

test("valida o e-mail institucional", async ({ page }) => {
  await openCadastro(page);
  await fill(page, "Laura Mendes", "laura@gmail.com", "Só cartão");
  await start(page).click();
  await expect(
    page.getByText("Use o e-mail @alu.ufc.br ou @ufc.br. Só visitantes podem usar outro e-mail."),
  ).toBeVisible();
  expect(await db.get("pendingRegistration/current")).toBeNull();
});

test("envia o pedido com o espelho legado e conclui quando a fechadura grava", async ({ page }) => {
  const email = uniqueEmail("laura");
  await openCadastro(page);
  await fill(page, "Laura Mendes Araújo", email, "Só cartão");
  await expect(page.getByText("“Laura Mendes Ara”")).toBeVisible();
  await start(page).click();

  await expect(page.getByRole("heading", { name: "Acompanhe na porta" })).toBeVisible();
  await expect(page.getByText(/restantes/)).toBeVisible();
  // o título aparece já no envio: espera o pedido chegar ao banco
  await expect
    .poll(() => db.get("pendingRegistration/current"))
    .toMatchObject({
      username: "Laura Mendes Araújo",
      email,
      mode: "CARD_ONLY",
    });
  await expect
    .poll(() => db.get("pendingUser/current"))
    .toMatchObject({ username: "Laura Mendes Araújo", email });

  const key = `user_card_id_${40 + (Date.now() % 50)}`;
  await lockCompletes(key, { username: "Laura Mendes Araújo", email, rfid: 41 });

  await expect(page.getByText("Cadastro concluído")).toBeVisible();
  await expect(page.getByText("Laura Mendes já pode abrir a porta com o cartão.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver membro" })).toHaveAttribute("href", `/membros/${key}`);
  await expect.poll(() => db.get(`members/${key}`)).toMatchObject({ role: "petiano", active: true });
});

test("cartão + digital com só o cartão salvo mostra que a digital falhou", async ({ page }) => {
  const email = uniqueEmail("pedro");
  await openCadastro(page);
  await fill(page, "Pedro Henrique", email, "Cartão + digital");
  await start(page).click();
  await expect(page.getByRole("heading", { name: "Acompanhe na porta" })).toBeVisible();
  await lockCompletes("user_card_id_90", { username: "Pedro Henrique", email, rfid: 90 });
  await expect(page.getByRole("heading", { name: "Cartão salvo, digital falhou" })).toBeVisible();
});

test("pedido apagado pela porta sem membro novo vira cancelado na porta", async ({ page }) => {
  await openCadastro(page);
  await fill(page, "Clara Nunes", uniqueEmail("clara"), "Só digital");
  await start(page).click();
  await expect(page.getByRole("heading", { name: "Acompanhe na porta" })).toBeVisible();
  await db.remove("pendingRegistration/current");
  await db.remove("pendingUser/current");
  await expect(page.getByText("Conferindo na fechadura…")).toBeVisible();
  await expect(page.getByText("A fechadura cancelou o cadastro")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Tentar de novo" }).click();
  await expect(page.getByLabel("Nome completo")).toHaveValue("Clara Nunes");
});

test("cancelar pelo site apaga o pedido e o espelho", async ({ page }) => {
  await openCadastro(page);
  await fill(page, "Rui Barros", uniqueEmail("rui"), "Só cartão");
  await start(page).click();
  await page.getByRole("button", { name: "Cancelar cadastro" }).click();
  await expect(page.getByRole("heading", { name: "Cadastro cancelado" })).toBeVisible();
  expect(await db.get("pendingRegistration/current")).toBeNull();
  expect(await db.get("pendingUser/current")).toBeNull();
});

test("se a fechadura sai do Modo mestre no meio, o pedido é cancelado", async ({ page }) => {
  await openCadastro(page);
  await fill(page, "Ivo Lima", uniqueEmail("ivo"), "Só cartão");
  await start(page).click();
  await expect(page.getByRole("heading", { name: "Acompanhe na porta" })).toBeVisible();
  await db.put("system/mode", "STANDBY");
  await expect(
    page.getByText("A fechadura saiu do Modo mestre antes de concluir.", { exact: false }),
  ).toBeVisible();
  await expect.poll(() => db.get("pendingRegistration/current")).toBeNull();
});

test("no celular, o cadastro em andamento mostra a porta e esconde o formulário", async ({
  browser,
  baseURL,
}) => {
  const page = await mobilePage(browser, baseURL);
  await openCadastro(page);
  await fill(page, "Maria Clara Sousa", uniqueEmail("maria"), "Cartão + digital");
  await start(page).click();
  await expect(page.getByText("Siga as instruções do display da porta")).toBeVisible();
  await expect(page.getByLabel("Nome completo")).toBeHidden();
  await expect(page.getByRole("button", { name: "Cancelar cadastro" })).toBeVisible();
  await page.getByRole("button", { name: "Cancelar cadastro" }).click();
  await page.context().close();
});

async function mobilePage(browser: Browser, baseURL: string | undefined) {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  return context.newPage();
}
