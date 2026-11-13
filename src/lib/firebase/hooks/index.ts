"use client";

import { limitToLast, query, ref } from "firebase/database";
import { useMemo } from "react";

import { useNow } from "@/hooks/use-now";
import {
  connectionOf,
  lcdLinesOf,
  modeOf,
  orphansFromInventory,
  orphansFromLogs,
  sortLogs,
  type Connection,
  type Orphan,
  type TimedLog,
} from "@/lib/lock-state";

import { paths } from "../paths";
import {
  accessLogSchema,
  deviceInventorySchema,
  deviceStatusSchema,
  systemModeSchema,
  usersSchema,
} from "../schemas";
import type { AccessLog, DeviceStatus, RtdbState, SystemMode } from "../types";
import { useRtdbValue } from "../use-rtdb-value";

/** `system/mode`: "STANDBY" ou "MASTER" (escrito pelo ESP). */
export function useSystemMode() {
  return useRtdbValue(paths.systemMode, (raw) => systemModeSchema.parse(raw));
}

/**
 * `devices/<id>/status` (firmware 2.1). `status: "missing"` = firmware 2.0: mostrar o
 * fallback ("não disponível nesta versão do firmware"), nunca quebrar.
 */
export function useDeviceStatus() {
  return useRtdbValue(paths.deviceStatus, (raw) => deviceStatusSchema.parse(raw));
}

/** `devices/<id>/inventory` (firmware 2.1). */
export function useDeviceInventory() {
  return useRtdbValue(paths.deviceInventory, (raw) => deviceInventorySchema.parse(raw));
}

export function useUsers() {
  return useRtdbValue(paths.users, (raw) => usersSchema.parse(raw));
}

/** Um registro fora do esquema não derruba a lista inteira: é descartado. */
export function parseLogs(raw: unknown): Record<string, AccessLog> {
  const out: Record<string, AccessLog> = {};
  if (raw && typeof raw === "object") {
    for (const [key, value] of Object.entries(raw)) {
      const parsed = accessLogSchema.safeParse(value);
      if (parsed.success) out[key] = parsed.data;
    }
  }
  return out;
}

/**
 * Últimos `limit` registros de acesso, do mais recente para o mais antigo pelo horário real.
 * Busca uma margem a mais pela chave (`log_<millis>` recomeça no boot do ESP).
 */
export function useRecentLogs(limit = 20): RtdbState<TimedLog[]> {
  const fetchCount = limit * 2;
  const state = useRtdbValue(`${paths.logs}?last=${fetchCount}`, parseLogs, (db) =>
    query(ref(db, paths.logs), limitToLast(fetchCount)),
  );
  return useMemo(() => {
    if (state.status !== "ready") return state;
    return { ...state, data: sortLogs(state.data).slice(0, limit) };
  }, [state, limit]);
}

export type OrphansState =
  | { status: "loading" | "error"; orphans: Orphan[]; source: undefined }
  | { status: "ready"; orphans: Orphan[]; source: "inventory" | "logs" };

/**
 * Credenciais na fechadura sem membro no banco. Com inventário (firmware 2.1) a lista é
 * completa; sem ele, é deduzida dos registros recentes (liberado + "Desconhecido").
 */
export function useOrphans(): OrphansState {
  const inventory = useDeviceInventory();
  const users = useUsers();
  const logs = useRtdbValue(`${paths.logs}?last=200`, parseLogs, (db) =>
    query(ref(db, paths.logs), limitToLast(200)),
  );

  return useMemo<OrphansState>(() => {
    if (inventory.status === "ready" && users.status !== "loading" && users.status !== "error") {
      return {
        status: "ready",
        source: "inventory",
        orphans: orphansFromInventory(inventory.data, users.status === "ready" ? users.data : {}),
      };
    }
    if (inventory.status === "loading" || logs.status === "loading" || users.status === "loading") {
      return { status: "loading", orphans: [], source: undefined };
    }
    if (logs.status === "error") return { status: "error", orphans: [], source: undefined };
    return {
      status: "ready",
      source: "logs",
      orphans: orphansFromLogs(logs.status === "ready" ? Object.values(logs.data) : []),
    };
  }, [inventory, users, logs]);
}

export type LockSnapshot = {
  /** Ainda esperando `system/mode` (o resto pode chegar depois). */
  loading: boolean;
  error: Error | undefined;
  mode: SystemMode | undefined;
  connection: Connection;
  /** `undefined` = firmware 2.0 (sem `devices/<id>/status`). */
  status: DeviceStatus | undefined;
  lcd: [string, string] | null;
  /** Último registro de acesso com horário confiável (fallback do "último contato"). */
  lastAccessAt: Date | null;
  now: number;
};

/** Estado da fechadura para o card, a sidebar e os banners: junta modo, heartbeat e último acesso. */
export function useLockSnapshot(): LockSnapshot {
  const mode = useSystemMode();
  const device = useDeviceStatus();
  const logs = useRecentLogs(5);
  const now = useNow(1000);
  const status = device.status === "ready" ? device.data : undefined;

  return {
    loading: mode.status === "loading",
    error: mode.status === "error" ? mode.error : device.status === "error" ? device.error : undefined,
    mode: modeOf(mode.status === "ready" ? mode.data : undefined, status),
    connection: connectionOf(status, now),
    status,
    lcd: lcdLinesOf(status, now),
    lastAccessAt: logs.status === "ready" ? (logs.data.find((log) => log.at)?.at ?? null) : null,
    now,
  };
}
