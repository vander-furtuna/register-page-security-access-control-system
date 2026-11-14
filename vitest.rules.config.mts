import { defineConfig } from "vitest/config";

/** `pnpm test:rules`: regras do Realtime Database contra o emulador (`pnpm emulators`). */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/rules/**/*.test.ts"],
    testTimeout: 20_000,
  },
});
