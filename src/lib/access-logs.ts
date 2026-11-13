import type { UserRecord } from "@/lib/firebase/types";
import { formatLockLongDate, formatLockTime, formatUid, lockDateISO, lockStartOfDay } from "@/lib/format";
import type { TimedLog } from "@/lib/lock-state";

/**
 * Registros de acesso (`logs/*`) prontos para as telas de Registros e Visão geral.
 * Regras do firmware 2.0 (`dados-firebase.md`): negado grava id 0 e "Desconhecido";
 * credencial sem dono abre a porta mas também vem como "Desconhecido".
 */

export type LogKind = "member" | "orphan" | "unknown-card" | "unrecognized-finger" | "denied";

export type LogRow = TimedLog & {
  kind: LogKind;
  displayName: string;
  memberKey: string | undefined;
  /** ID da digital usada (firmware 2.1, membro conhecido ou sem dono). */
  fingerId: number | undefined;
  /** Passou pela fila offline e chegou depois (firmware 2.1). */
  late: boolean;
  arrivedAt: Date | null;
};

const ID_FROM_PATH = /_id_(\d+)$/;
const normalizeEmail = (email: string) => email.trim().toLowerCase();

function findMemberKey(log: TimedLog, users: Record<string, UserRecord>): string | undefined {
  const fromPath = log.userPath.replace(/^\/?users\//, "");
  if (users[fromPath]) return fromPath;
  if (log.userEmail && log.userEmail !== "N/A") {
    const email = normalizeEmail(log.userEmail);
    return Object.keys(users).find((key) => normalizeEmail(users[key]!.email) === email);
  }
  return undefined;
}

export function classifyLog(log: TimedLog, users: Record<string, UserRecord>): LogRow {
  const memberKey = findMemberKey(log, users);
  const member = memberKey ? users[memberKey] : undefined;
  const pathId = Number(ID_FROM_PATH.exec(log.userPath)?.[1]);
  const finger = log.accessType === "fingerId";

  let kind: LogKind;
  if (member) kind = "member";
  else if (log.status === "ALLOWED") kind = "orphan";
  else if (!finger && log.cardUID) kind = "unknown-card";
  else if (finger) kind = "unrecognized-finger";
  else kind = "denied";

  const fingerId = finger
    ? (log.credentialId ??
      (kind === "member" && log.status === "ALLOWED" ? member?.fingerId : undefined) ??
      (kind === "orphan" && pathId > 0 ? pathId : undefined))
    : undefined;

  const displayName =
    kind === "member"
      ? (member?.username ?? log.userName)
      : kind === "orphan"
        ? finger
          ? "Digital sem dono"
          : "Cartão sem dono"
        : kind === "unknown-card"
          ? "Cartão desconhecido"
          : kind === "unrecognized-finger"
            ? "Digital não reconhecida"
            : "Acesso negado";

  return {
    ...log,
    kind,
    displayName,
    memberKey,
    fingerId,
    late: log.queuedOffline === true,
    arrivedAt: log.syncedAt ? new Date(log.syncedAt) : null,
  };
}

// ---------------------------------------------------------------------------
// Filtros e resumo

export type Period = "today" | "7d" | "30d" | "custom";
export type CredentialFilter = "all" | "finger" | "card";
export type ResultFilter = "all" | "allowed" | "denied";

/** Início do período no fuso da sala. */
export function periodStart(period: Exclude<Period, "custom">, now: Date): Date {
  return lockStartOfDay(now, period === "today" ? 0 : period === "7d" ? 6 : 29);
}

export function filterRows(rows: LogRow[], credential: CredentialFilter, result: ResultFilter): LogRow[] {
  return rows.filter(
    (r) =>
      (credential === "all" ||
        (credential === "finger" ? r.accessType === "fingerId" : r.accessType === "rfid")) &&
      (result === "all" || (result === "allowed" ? r.status === "ALLOWED" : r.status === "DENIED")),
  );
}

export type LogSummary = {
  total: number;
  allowed: number;
  denied: number;
  byFinger: number;
  byCard: number;
  late: number;
};

export function summarize(rows: LogRow[]): LogSummary {
  return {
    total: rows.length,
    allowed: rows.filter((r) => r.status === "ALLOWED").length,
    denied: rows.filter((r) => r.status === "DENIED").length,
    byFinger: rows.filter((r) => r.accessType === "fingerId").length,
    byCard: rows.filter((r) => r.accessType === "rfid").length,
    late: rows.filter((r) => r.late).length,
  };
}

export function percent(part: number, total: number): string {
  return total === 0 ? "0%" : `${Math.round((part / total) * 100)}%`;
}

/** Tentativas de hoje × ontem até o mesmo horário (comparação justa no meio do dia). */
export function deltaVsYesterday(
  rows: LogRow[],
  now: Date,
): { today: number; yesterday: number; delta: number } {
  const todayStart = lockStartOfDay(now).getTime();
  const yesterdayStart = lockStartOfDay(now, 1).getTime();
  const sameTimeYesterday = now.getTime() - 24 * 60 * 60 * 1000;
  let today = 0;
  let yesterday = 0;
  for (const r of rows) {
    const t = r.at?.getTime();
    if (t === undefined) continue;
    if (t >= todayStart && t <= now.getTime()) today++;
    else if (t >= yesterdayStart && t <= sameTimeYesterday) yesterday++;
  }
  return { today, yesterday, delta: today - yesterday };
}

// ---------------------------------------------------------------------------
// Agrupamento e gráfico

export type DayGroup = { key: string; label: string; rows: LogRow[] };

/** Agrupa por dia (fuso da sala), mantendo a ordem (mais recente primeiro). */
export function groupByDay(rows: LogRow[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const r of rows) {
    if (!r.at) continue;
    const key = lockDateISO(r.at);
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      group = { key, label: formatLockLongDate(r.at), rows: [] };
      groups.push(group);
    }
    group.rows.push(r);
  }
  return groups;
}

export type HourBucket = { hour: string; allowed: number; denied: number };

/**
 * Acessos por hora do dia (somando o período), de 07 a 22 h e alargando se houver acesso
 * fora dessa faixa.
 */
export function hourlyBuckets(rows: LogRow[]): HourBucket[] {
  const counts = new Map<number, { allowed: number; denied: number }>();
  for (const r of rows) {
    if (!r.at) continue;
    const hour = Number(formatLockTime(r.at, { seconds: false }).slice(0, 2));
    const c = counts.get(hour) ?? { allowed: 0, denied: 0 };
    if (r.status === "ALLOWED") c.allowed++;
    else c.denied++;
    counts.set(hour, c);
  }
  const hours = [...counts.keys()];
  const first = Math.min(7, ...hours);
  const last = Math.max(22, ...hours);
  const buckets: HourBucket[] = [];
  for (let h = first; h <= last; h++) {
    const c = counts.get(h) ?? { allowed: 0, denied: 0 };
    buckets.push({ hour: String(h).padStart(2, "0"), ...c });
  }
  return buckets;
}

/** Cartão desconhecido que mais tentou (para "Precisa de atenção" e o contexto dos negados). */
export function topUnknownCard(rows: LogRow[]): { uid: string; attempts: LogRow[] } | null {
  const byUid = new Map<string, LogRow[]>();
  for (const r of rows) {
    if (r.kind !== "unknown-card" || !r.cardUID) continue;
    const uid = formatUid(r.cardUID);
    byUid.set(uid, [...(byUid.get(uid) ?? []), r]);
  }
  let top: { uid: string; attempts: LogRow[] } | null = null;
  for (const [uid, attempts] of byUid) {
    if (!top || attempts.length > top.attempts.length) top = { uid, attempts };
  }
  return top;
}

// ---------------------------------------------------------------------------
// CSV

function csvCell(value: string): string {
  return /[";\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function logsCsv(rows: LogRow[]): string {
  const header = ["Data", "Hora", "Quem", "E-mail", "Credencial", "Resultado", "Chegou depois (offline)"];
  const lines = rows.map((r) => [
    r.at ? lockDateISO(r.at).split("-").reverse().join("/") : "sem horário",
    r.at ? formatLockTime(r.at) : "",
    r.displayName,
    r.kind === "member" ? r.userEmail : "",
    r.accessType === "fingerId"
      ? `Digital${r.fingerId !== undefined ? ` #${r.fingerId}` : ""}`
      : `Cartão${r.cardUID ? ` ${formatUid(r.cardUID)}` : ""}`,
    r.status === "ALLOWED" ? "Liberado" : "Negado",
    r.late ? "sim" : "",
  ]);
  return [header, ...lines].map((line) => line.map(csvCell).join(";")).join("\r\n");
}
