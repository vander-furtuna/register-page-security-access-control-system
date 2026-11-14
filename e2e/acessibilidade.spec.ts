import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { emulatorReady, loginAsAdmin } from "./emulator";

/**
 * Varredura automática (axe-core, WCAG 2.2 A e AA) de cada tela nos temas claro e escuro.
 * Roda nos dois projetos: desktop e celular (390px). Não substitui o teste com teclado e leitor
 * de tela, mas pega contraste, nomes acessíveis, landmarks e ARIA inválido.
 */
const ROUTES = [
  "/",
  "/membros",
  "/membros/user_card_1_finger_1",
  "/cadastro",
  "/registros",
  "/credenciais?pos=d27",
  "/dispositivo",
];

async function scan(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    // o espelho do LCD é uma ilustração (role="img" com aria-label); o resto é verificado
    .analyze();
  const report = results.violations.map((v) => ({
    rule: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes
      .slice(0, 5)
      .map((n) => `${n.target.join(" ")} — ${n.failureSummary?.split("\n")[1]?.trim()}`),
  }));
  expect.soft(report, JSON.stringify(report, null, 2)).toEqual([]);
}

for (const theme of ["light", "dark"] as const) {
  test.describe(`tema ${theme === "light" ? "claro" : "escuro"}`, () => {
    test.beforeEach(async ({ page }) => {
      test.skip(
        !(await emulatorReady()),
        "Emulador ou seed ausente: rode pnpm emulators e pnpm seed:emulator.",
      );
      await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
    });

    test("login", async ({ page }) => {
      await page.goto("/login");
      await expect(page.getByLabel("E-mail institucional")).toBeVisible();
      await scan(page);
    });

    test("telas do painel", async ({ page }) => {
      test.setTimeout(120_000);
      await loginAsAdmin(page, ROUTES[0]!);
      for (const route of ROUTES) {
        await test.step(route, async () => {
          await page.goto(route);
          await expect(page.getByRole("main")).toBeVisible();
          // espera os dados chegarem (sem esqueletos de carregamento)
          await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0);
          await scan(page);
        });
      }
    });
  });
}

test.describe("teclado", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Teclado físico: só no desktop.");
    test.skip(
      !(await emulatorReady()),
      "Emulador ou seed ausente: rode pnpm emulators e pnpm seed:emulator.",
    );
  });

  test("o primeiro Tab pula a navegação e leva ao conteúdo", async ({ page }) => {
    await loginAsAdmin(page, "/membros");
    // carregamento novo: o foco começa no documento, como para quem chega pelo navegador
    await page.reload();
    await expect(page.getByRole("main")).toBeVisible();
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Pular para o conteúdo" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#conteudo")).toBeFocused();
  });

  test("mapa de slots: setas, Home e End mudam a posição e o foco", async ({ page }) => {
    await loginAsAdmin(page, "/credenciais?pos=d1");
    const map = page.getByRole("group", { name: "Posições do sensor de digitais" });
    const first = map.getByRole("button", { name: /^Digital 1:/ });
    await first.focus();
    await expect(first).toHaveAttribute("aria-pressed", "true");
    // só a posição selecionada entra no Tab (roving tabindex)
    await expect(map.locator('button[tabindex="0"]')).toHaveCount(1);

    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL(/pos=d2$/);
    await expect(map.getByRole("button", { name: /^Digital 2:/ })).toBeFocused();

    await page.keyboard.press("End");
    await expect(page).toHaveURL(/pos=d127$/);
    await expect(map.getByRole("button", { name: /^Digital 127:/ })).toBeFocused();

    await page.keyboard.press("Home");
    await expect(page).toHaveURL(/pos=d1$/);
    await expect(page.getByRole("region", { name: "Digital #01" })).toBeVisible();
  });
});
