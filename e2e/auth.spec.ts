import { expect, test, type Page } from "@playwright/test";

/**
 * Fluxo de login contra o emulador do Firebase. Precisa de `pnpm emulators` e
 * `pnpm seed:emulator` (cria admin@ufc.br / petlock-dev). Sem emulador, os testes são pulados.
 */
const AUTH = "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1";
const ADMIN = { email: "admin@ufc.br", password: "petlock-dev" };

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

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail institucional").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}

test.beforeEach(async () => {
  test.skip(!(await emulatorReady()), "Emulador ou seed ausente: rode pnpm emulators e pnpm seed:emulator.");
});

test("admin entra e vê o painel com o estado da porta", async ({ page, isMobile }) => {
  await login(page, ADMIN.email, ADMIN.password);
  await expect(page).toHaveURL(/\/$/);
  // o h1 tem um texto para o celular e outro para o desktop; só um é visível (nome acessível)
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(
    isMobile ? "PET Lock" : "Visão geral",
  );
  await expect(page.getByRole("region", { name: /porta da sala do pet/i })).toBeVisible();
  if (isMobile) {
    await expect(page.getByRole("navigation", { name: "Navegação principal" })).toBeVisible();
  } else {
    await expect(page.getByRole("link", { name: "Membros", exact: true })).toBeVisible();
  }
});

test("login com senha errada mostra o erro em português", async ({ page }) => {
  await login(page, ADMIN.email, "senha-errada");
  await expect(page.getByText("E-mail ou senha incorretos. Confira e tente de novo.")).toBeVisible();
});

test("conta sem admins/{uid} vê a tela sem permissão", async ({ page }) => {
  const email = `visitante.${Date.now()}@alu.ufc.br`;
  await fetch(`${AUTH}/accounts:signUp?key=demo-api-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "senha-visitante", returnSecureToken: true }),
  });
  await login(page, email, "senha-visitante");
  await expect(page.getByRole("heading", { name: "Sem permissão para o painel" })).toBeVisible();
  await page.getByRole("button", { name: "Sair e usar outra conta" }).click();
  await expect(page.getByRole("heading", { name: "Entrar no painel" })).toBeVisible();
});
