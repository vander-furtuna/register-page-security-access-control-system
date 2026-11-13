import { expect, type Page } from "@playwright/test";

/** Acesso ao emulador do Firebase pela API REST, como dono (ignora as regras). Nunca produção. */
const NS = "demo-pet-lock-default-rtdb";
const DB = "http://127.0.0.1:9000";
const AUTH = "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1";
const OWNER = { Authorization: "Bearer owner", "Content-Type": "application/json" };

export const ADMIN = { email: "admin@ufc.br", password: "petlock-dev" };

export const db = {
  async get<T = unknown>(path: string): Promise<T> {
    const res = await fetch(`${DB}/${path}.json?ns=${NS}`, { headers: OWNER });
    return (await res.json()) as T;
  },
  async put(path: string, value: unknown) {
    await fetch(`${DB}/${path}.json?ns=${NS}`, {
      method: "PUT",
      headers: OWNER,
      body: JSON.stringify(value),
    });
  },
  async patch(path: string, value: unknown) {
    await fetch(`${DB}/${path}.json?ns=${NS}`, {
      method: "PATCH",
      headers: OWNER,
      body: JSON.stringify(value),
    });
  },
  async remove(path: string) {
    await fetch(`${DB}/${path}.json?ns=${NS}`, { method: "DELETE", headers: OWNER });
  },
};

export async function emulatorReady(): Promise<boolean> {
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

/** Entra como admin e vai para `next`. */
export async function loginAsAdmin(page: Page, next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("E-mail institucional").fill(ADMIN.email);
  await page.getByLabel("Senha", { exact: true }).fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${next.replace(/[?]/g, "\\?")}$`));
}

/** Horário no formato do firmware (UTC-3): "2026-11-10 14:32:08". */
export function lockTimestamp(date = new Date()): string {
  const local = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  return local.toISOString().slice(0, 19).replace("T", " ");
}
