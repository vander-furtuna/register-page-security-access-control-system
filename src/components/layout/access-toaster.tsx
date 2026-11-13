"use client";

import { limitToLast, onValue, orderByChild, query, ref } from "firebase/database";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { formatFingerId } from "@/components/pet/credential-chip";
import { getAccessAlerts } from "@/lib/access-alerts";
import { classifyLog, type LogRow } from "@/lib/access-logs";
import { getDb } from "@/lib/firebase/client";
import { parseLogs, useUsers } from "@/lib/firebase/hooks";
import { paths } from "@/lib/firebase/paths";
import type { UserRecord } from "@/lib/firebase/types";
import { formatLockTime, formatUid, shortName } from "@/lib/format";
import { sortLogs } from "@/lib/lock-state";

/** Só avisa acessos recentes: eventos que chegam atrasados da fila offline não viram toast. */
const FRESH_MS = 10 * 60_000;

function credentialText(row: LogRow): string {
  if (row.accessType === "fingerId")
    return row.fingerId !== undefined ? `Digital ${formatFingerId(row.fingerId)}` : "Digital";
  return row.cardUID ? `Cartão ${formatUid(row.cardUID)}` : "Cartão";
}

function notify(row: LogRow) {
  const { keepDenied } = getAccessAlerts();
  const description = `${credentialText(row)} · ${row.at ? formatLockTime(row.at) : ""}`;
  if (row.status === "ALLOWED") {
    toast.success(
      row.kind === "member" ? `${shortName(row.displayName)} entrou` : `${row.displayName}: porta aberta`,
      {
        description,
      },
    );
  } else {
    toast.error(`Acesso negado: ${row.kind === "member" ? shortName(row.displayName) : row.displayName}`, {
      description,
      duration: keepDenied ? Infinity : 5000,
      closeButton: true,
    });
  }
}

/**
 * Toast de cada acesso novo, em tempo real (`componentes.md` › Toast). O primeiro valor do
 * listener só marca o que já existia; daí em diante, cada registro novo vira um aviso
 * (respeitando as preferências do sino).
 */
export function AccessToaster() {
  const users = useUsers();
  const usersRef = useRef<Record<string, UserRecord>>({});
  useEffect(() => {
    if (users.status === "ready") usersRef.current = users.data;
  }, [users]);

  useEffect(() => {
    const seen = new Set<string>();
    let first = true;
    let off = () => {};
    try {
      off = onValue(query(ref(getDb(), paths.logs), orderByChild("timestamp"), limitToLast(10)), (snap) => {
        const data = parseLogs(snap.val());
        const fresh = Object.keys(data).filter((key) => !seen.has(key));
        fresh.forEach((key) => seen.add(key));
        if (first) {
          first = false;
          return;
        }
        if (!getAccessAlerts().enabled || fresh.length === 0) return;
        const rows = sortLogs(Object.fromEntries(fresh.map((key) => [key, data[key]!])))
          .filter((log) => log.at && Date.now() - log.at.getTime() < FRESH_MS)
          .map((log) => classifyLog(log, usersRef.current));
        // do mais antigo para o mais novo: o último aviso fica em cima
        rows.reverse().forEach(notify);
      });
    } catch {
      // Firebase sem configuração: o AuthGate já mostra o erro
    }
    return () => off();
  }, []);

  return null;
}
