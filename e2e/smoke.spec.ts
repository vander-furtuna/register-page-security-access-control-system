import { expect, test } from "@playwright/test";

test("página inicial abre em pt-BR com o título PET Lock", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/PET Lock/);
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("img", { name: "PET Lock" }).first()).toBeVisible();
});

test("alterna entre tema claro e escuro", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Usar tema escuro" }).click();
  await expect(html).toHaveAttribute("data-theme", "dark");
});
