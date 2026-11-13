"use client";

import { useSyncExternalStore } from "react";

/**
 * Preferências dos avisos de acesso em tempo real, por pessoa e por navegador
 * (`localStorage`, com fallback se estiver bloqueado).
 * - `enabled`: mostrar um toast a cada acesso novo.
 * - `keepDenied`: negados ficam na tela até serem dispensados (`componentes.md` › Toast).
 */
export type AccessAlertSettings = { enabled: boolean; keepDenied: boolean };

const KEY = "petlock:avisos-de-acesso";
const DEFAULTS: AccessAlertSettings = { enabled: true, keepDenied: false };

let cache: AccessAlertSettings | null = null;
const listeners = new Set<() => void>();

function read(): AccessAlertSettings {
  if (cache) return cache;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<AccessAlertSettings> | null;
    cache = {
      enabled: typeof raw?.enabled === "boolean" ? raw.enabled : DEFAULTS.enabled,
      keepDenied: typeof raw?.keepDenied === "boolean" ? raw.keepDenied : DEFAULTS.keepDenied,
    };
  } catch {
    cache = DEFAULTS;
  }
  return cache;
}

export function setAccessAlerts(patch: Partial<AccessAlertSettings>) {
  cache = { ...read(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // armazenamento bloqueado: vale só nesta aba
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAccessAlerts(): AccessAlertSettings {
  return useSyncExternalStore(subscribe, read, () => DEFAULTS);
}

export function getAccessAlerts(): AccessAlertSettings {
  return read();
}
