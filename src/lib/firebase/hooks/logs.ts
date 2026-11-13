"use client";

import { endAt, limitToLast, orderByChild, query, ref, startAt } from "firebase/database";
import { useMemo } from "react";

import { classifyLog, type LogRow } from "@/lib/access-logs";
import { formatLockTimestamp } from "@/lib/format";
import { sortLogs } from "@/lib/lock-state";

import { paths } from "../paths";
import { useRtdbValue } from "../use-rtdb-value";

import { parseLogs, useUsers } from "./index";

export type LogsState = {
  status: "loading" | "ready" | "error";
  rows: LogRow[];
  /** A consulta veio cheia: pode haver registros mais antigos (use "Carregar mais"). */
  hasMore: boolean;
  error?: Error;
};

const EMPTY: LogRow[] = [];

/**
 * Registros a partir de `since`, do mais recente para o mais antigo pelo horário real.
 * Consulta por `timestamp` (texto "AAAA-MM-DD HH:MM:SS", índice nas regras), não pela chave:
 * `log_<millis>` recomeça a cada boot do ESP. Os de `1970-01-01` (sem NTP) ficam de fora:
 * use `useUnsyncedLogs`.
 */
export function useLogs({ since, limit }: { since: Date; limit: number }): LogsState {
  const from = formatLockTimestamp(since);
  const users = useUsers();
  const logs = useRtdbValue(`${paths.logs}?since=${from}&limit=${limit}`, parseLogs, (db) =>
    query(ref(db, paths.logs), orderByChild("timestamp"), startAt(from), limitToLast(limit)),
  );

  return useMemo<LogsState>(() => {
    if (logs.status === "error") return { status: "error", rows: EMPTY, hasMore: false, error: logs.error };
    if (logs.status === "loading" || users.status === "loading")
      return { status: "loading", rows: EMPTY, hasMore: false };
    const raw = logs.status === "ready" ? logs.data : {};
    const userMap = users.status === "ready" ? users.data : {};
    const rows = sortLogs(raw)
      .filter((log) => log.at)
      .map((log) => classifyLog(log, userMap));
    return { status: "ready", rows, hasMore: Object.keys(raw).length >= limit };
  }, [logs, users, limit]);
}

/** Acessos gravados sem horário confiável (`1970-01-01`: o ESP não sincronizou o relógio). */
export function useUnsyncedLogs(limit = 50): LogRow[] {
  const users = useUsers();
  const logs = useRtdbValue(`${paths.logs}?unsynced=${limit}`, parseLogs, (db) =>
    query(ref(db, paths.logs), orderByChild("timestamp"), endAt("1971"), limitToLast(limit)),
  );
  return useMemo(() => {
    if (logs.status !== "ready") return EMPTY;
    const userMap = users.status === "ready" ? users.data : {};
    return sortLogs(logs.data)
      .filter((log) => !log.at)
      .map((log) => classifyLog(log, userMap));
  }, [logs, users]);
}
