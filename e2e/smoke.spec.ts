import { expect, test } from "@playwright/test";

test("sem sessão, o painel leva ao login em pt-BR", async ({ page }) => {
  await page.goto("/membros");
  await expect(page).toHaveURL(/\/login\?next=%2Fmembros$/);
  await expect(page).toHaveTitle(/Entrar · PET Lock/);
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(page.getByRole("heading", { level: 1, name: "Entrar no painel" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar com Google" })).toBeVisible();
});

test("alterna entre tema claro e escuro", async ({ page }) => {
  await page.goto("/login");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Usar tema escuro" }).click();
  await expect(html).toHaveAttribute("data-theme", "dark");
});

test("valida o formulário de e-mail antes de enviar", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByText("Digite um e-mail válido, como voce@alu.ufc.br.")).toBeVisible();
  await expect(page.getByText("Digite sua senha.")).toBeVisible();
});
