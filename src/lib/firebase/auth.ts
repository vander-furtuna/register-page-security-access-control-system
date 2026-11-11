import {
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";

import { getFirebaseAuth } from "./client";

/** Domínios aceitos no login com Google (`docs/produto/telas.md` › 01). */
export const ALLOWED_EMAIL_DOMAINS = ["ufc.br", "alu.ufc.br"] as const;

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const domain = email.trim().toLowerCase().split("@")[1];
  return ALLOWED_EMAIL_DOMAINS.some((allowed) => domain === allowed);
}

/** Erro de login com mensagem pronta para a interface. */
export class AuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

const MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "E-mail ou senha incorretos. Confira e tente de novo.",
  "auth/wrong-password": "E-mail ou senha incorretos. Confira e tente de novo.",
  "auth/user-not-found": "E-mail ou senha incorretos. Confira e tente de novo.",
  "auth/invalid-email": "Digite um e-mail válido, como voce@alu.ufc.br.",
  "auth/user-disabled": "Esta conta foi desativada. Fale com um administrador do PET.",
  "auth/too-many-requests": "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.",
  "auth/network-request-failed": "Sem conexão com o servidor. Confira a internet e tente de novo.",
  "auth/popup-blocked": "O navegador bloqueou a janela do Google. Libere pop-ups para este site.",
  "auth/domain-not-allowed": "Use sua conta @ufc.br ou @alu.ufc.br.",
};

/** Traduz um erro do Firebase Auth. `null` quando a pessoa só fechou a janela do Google. */
export function authErrorMessage(error: unknown): string | null {
  const code = (error as { code?: unknown })?.code;
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return null;
  if (typeof code === "string" && MESSAGES[code]) return MESSAGES[code];
  return "Não foi possível entrar agora. Tente de novo em instantes.";
}

export async function signInWithGoogle(): Promise<User> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const { user } = await signInWithPopup(auth, provider);
  if (!isAllowedEmail(user.email)) {
    await firebaseSignOut(auth);
    throw new AuthError("auth/domain-not-allowed", MESSAGES["auth/domain-not-allowed"]!);
  }
  return user;
}

export async function signInWithPassword(email: string, password: string): Promise<User> {
  const { user } = await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
  return user;
}

export function requestPasswordReset(email: string): Promise<void> {
  return sendPasswordResetEmail(getFirebaseAuth(), email.trim());
}

export function signOut(): Promise<void> {
  return firebaseSignOut(getFirebaseAuth());
}

/** Destino seguro depois do login: só caminhos internos (`/membros`), nunca `//outro-site`. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/login")) return "/";
  return next;
}
