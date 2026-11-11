"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

import { signOut } from "@/lib/firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { paths } from "@/lib/firebase/paths";
import { useRtdbValue } from "@/lib/firebase/use-rtdb-value";

/**
 * Sessão do Firebase Auth + autorização por `admins/{uid} === true`.
 *
 * - `loading`: ainda não sabemos se há sessão (ou estamos checando `admins/`).
 * - `signed-out`: ninguém logado.
 * - `no-permission`: logado, mas não é admin → tela "sem permissão".
 * - `admin`: pode usar o painel.
 * - `error`: Firebase sem configuração ou falha ao checar a permissão.
 */
export type AuthState =
  | { status: "loading"; user: User | null }
  | { status: "signed-out"; user: null }
  | { status: "no-permission"; user: User }
  | { status: "admin"; user: User }
  | { status: "error"; user: User | null; error: Error };

type SessionSnapshot =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "user"; user: User }
  | { status: "error"; error: Error };

// A sessão é única no app: um listener só, compartilhado por quem assina.
const session = (() => {
  let snapshot: SessionSnapshot = { status: "loading" };
  let started = false;
  const listeners = new Set<() => void>();
  const emit = (next: SessionSnapshot) => {
    snapshot = next;
    listeners.forEach((listener) => listener());
  };
  const start = () => {
    started = true;
    try {
      onAuthStateChanged(
        getFirebaseAuth(),
        (user) => emit(user ? { status: "user", user } : { status: "signed-out" }),
        (error) => emit({ status: "error", error }),
      );
    } catch (error) {
      emit({ status: "error", error: error instanceof Error ? error : new Error(String(error)) });
    }
  };
  const serverSnapshot: SessionSnapshot = { status: "loading" };
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (!started) start();
      return () => listeners.delete(listener);
    },
    get: () => snapshot,
    getServer: () => serverSnapshot,
  };
})();

type AuthContextValue = AuthState & { signOut: () => Promise<void> };

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const current = useSyncExternalStore(session.subscribe, session.get, session.getServer);
  const user = current.status === "user" ? current.user : null;
  const admin = useRtdbValue(user ? paths.admin(user.uid) : null, (raw) => raw === true);

  const value = useMemo<AuthContextValue>(() => {
    const base = { signOut };
    if (current.status === "loading") return { ...base, status: "loading", user: null };
    if (current.status === "signed-out") return { ...base, status: "signed-out", user: null };
    if (current.status === "error") return { ...base, status: "error", user: null, error: current.error };
    const signedIn = current.user;
    if (admin.status === "loading") return { ...base, status: "loading", user: signedIn };
    if (admin.status === "error") return { ...base, status: "error", user: signedIn, error: admin.error };
    if (admin.status === "ready" && admin.data) return { ...base, status: "admin", user: signedIn };
    return { ...base, status: "no-permission", user: signedIn };
  }, [current, admin]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth precisa estar dentro de <AuthProvider>.");
  return value;
}

/** Nome curto e iniciais para a sidebar ("Vanderlei F.", "VF"). */
export function userDisplay(user: User | null): { name: string; initials: string; email: string } {
  const email = user?.email ?? "";
  const full = (user?.displayName || email.split("@")[0] || "Administrador").trim();
  const parts = full.split(/\s+/).filter(Boolean);
  const name = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]![0]}.` : full;
  const initials = (
    parts.length > 1 ? `${parts[0]![0]}${parts[parts.length - 1]![0]}` : full.slice(0, 2)
  ).toUpperCase();
  return { name, initials, email };
}
