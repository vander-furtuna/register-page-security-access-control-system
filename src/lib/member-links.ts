import type { RegistrationMode } from "@/lib/firebase/types";

/** Link para o cadastro já preenchido (recadastrar, trocar cartão, adicionar credencial). */
export function cadastroHref(member: { username: string; email: string }, mode: RegistrationMode): string {
  const params = new URLSearchParams({ nome: member.username, email: member.email, modo: mode });
  return `/cadastro?${params.toString()}`;
}

/** Iniciais para o avatar: "Maria Clara Sousa" → "MC", "Prof. Gustavo Teixeira" → "GT". */
export function initials(name: string): string {
  const parts = name
    .replace(/^Prof(a)?\.\s+/i, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]!;
  return (first[0]! + (parts[1]?.[0] ?? first[1] ?? "")).toUpperCase();
}
