import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "on-first-retry", actionTimeout: 10_000 },
  // No `pnpm dev` cada rota compila na primeira visita; com a suíte toda em paralelo isso passa
  // dos 5 s padrão. No CI (`pnpm start`, build pronto) não faz diferença.
  expect: { timeout: 15_000 },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /fechadura\.spec/ },
    {
      name: "celular",
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
      testIgnore: /fechadura\.spec/,
    },
    // Credenciais e Dispositivo trocam devices/* inteiro (firmware 2.0 ↔ 2.1): rodam depois dos
    // outros projetos para não disputar o nó com membros.spec.
    {
      name: "fechadura",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /fechadura\.spec/,
      dependencies: ["desktop", "celular"],
    },
  ],
  webServer: {
    // Contra o emulador: nunca rode e2e contra o banco de produção.
    command: process.env.CI ? `pnpm start -p ${PORT}` : `pnpm dev -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    env: { NEXT_PUBLIC_USE_EMULATOR: "true" },
    timeout: 120_000,
  },
});
