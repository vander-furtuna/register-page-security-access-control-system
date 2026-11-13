import type { DeviceInventory, MemberMeta, MemberRole, UserRecord } from "@/lib/firebase/types";
import { formatUid, lockDateISO, normalizeUid, parseLockTimestamp } from "@/lib/format";
import type { TimedLog } from "@/lib/lock-state";

/**
 * Membros = `users/*` (escrito pela fechadura) + `members/*` (metadados do site, mesma chave)
 * + registros de acesso. Funções puras: a tela de Membros, o detalhe e a busca global usam isto.
 */

export type MemberStatus = "active" | "inactive" | "alumni" | "expired";

export type MemberRow = {
  key: string;
  username: string;
  email: string;
  role: MemberRole | undefined;
  meta: MemberMeta | undefined;
  fingerId: number | undefined;
  rfid: number | undefined;
  /** UID do cartão: do inventário (firmware 2.1) ou do último registro com cartão (2.0). */
  cardUID: string | undefined;
  createdAt: Date | null;
  lastAccessAt: Date | null;
  status: MemberStatus;
};

export const ROLE_LABEL: Record<MemberRole, string> = {
  petiano: "Petiano(a)",
  tutor: "Tutor(a)",
  visitante: "Visitante",
  egresso: "Egresso(a)",
};

export const STATUS_LABEL: Record<MemberStatus, string> = {
  active: "Ativo",
  inactive: "Desativado",
  alumni: "Egresso",
  expired: "Acesso vencido",
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** O registro é deste membro? Pelo `userPath` e, como reserva, pelo e-mail. */
export function logBelongsTo(
  log: Pick<TimedLog, "userPath" | "userEmail">,
  key: string,
  email: string,
): boolean {
  if (log.userPath === `/users/${key}` || log.userPath === `users/${key}`) return true;
  return log.userEmail !== "N/A" && normalizeEmail(log.userEmail) === normalizeEmail(email);
}

export function memberStatus(meta: MemberMeta | undefined, now: Date): MemberStatus {
  if (meta?.role === "egresso") return "alumni";
  if (meta?.active === false) return "inactive";
  if (meta?.validUntil && meta.validUntil < lockDateISO(now)) return "expired";
  return "active";
}

/**
 * Monta as linhas da tabela. `logs` vem de `sortLogs` (mais recente primeiro): o primeiro
 * liberado de cada membro é o último acesso.
 */
export function buildMembers(
  users: Record<string, UserRecord>,
  members: Record<string, MemberMeta>,
  logs: TimedLog[],
  inventory: DeviceInventory | undefined,
  now: Date,
): MemberRow[] {
  return Object.entries(users).map(([key, user]) => {
    const meta = members[key];
    const own = logs.filter((log) => logBelongsTo(log, key, user.email));
    const lastAllowed = own.find((log) => log.status === "ALLOWED" && log.at);
    const cardUID =
      (user.rfid !== undefined ? inventory?.cards[String(user.rfid)] : undefined) ??
      own.find((log) => log.accessType === "rfid" && log.cardUID)?.cardUID;
    return {
      key,
      username: user.username,
      email: user.email,
      role: meta?.role,
      meta,
      fingerId: user.fingerId,
      rfid: user.rfid,
      cardUID,
      createdAt: parseLockTimestamp(user.createdAt),
      lastAccessAt: lastAllowed?.at ?? null,
      status: memberStatus(meta, now),
    };
  });
}

// ---------------------------------------------------------------------------
// Filtros e busca

export type MemberTab = "all" | "active" | "card-only" | "finger-only" | "alumni";

export const TABS: { value: MemberTab; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "card-only", label: "Só cartão" },
  { value: "finger-only", label: "Só digital" },
  { value: "alumni", label: "Egressos" },
];

export function inTab(row: MemberRow, tab: MemberTab): boolean {
  switch (tab) {
    case "all":
      return true;
    case "active":
      return row.status === "active";
    case "card-only":
      return row.rfid !== undefined && row.fingerId === undefined;
    case "finger-only":
      return row.fingerId !== undefined && row.rfid === undefined;
    case "alumni":
      return row.status === "alumni";
  }
}

export function tabCounts(rows: MemberRow[]): Record<MemberTab, number> {
  return Object.fromEntries(
    TABS.map(({ value }) => [value, rows.filter((r) => inTab(r, value)).length]),
  ) as Record<MemberTab, number>;
}

export function normalizeText(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/**
 * Busca por nome ou e-mail (sem acento, sem diferenciar maiúsculas), UID do cartão em
 * qualquer formato (`A3F2`, `A3:F2`, `a3 f2`), `#12` (digital) ou número (digital ou slot).
 */
export function matchesQuery(
  row: Pick<MemberRow, "username" | "email" | "fingerId" | "rfid" | "cardUID">,
  query: string,
): boolean {
  const q = query.trim();
  if (!q) return true;

  const hash = /^#\s*(\d+)$/.exec(q);
  if (hash) return row.fingerId === Number(hash[1]);
  if (/^\d+$/.test(q) && (row.fingerId === Number(q) || row.rfid === Number(q))) return true;

  const text = normalizeText(q);
  if (normalizeText(row.username).includes(text) || normalizeText(row.email).includes(text)) return true;

  // parece UID: só hexadecimais e separadores, ao menos 2 dígitos
  if (row.cardUID && /^[0-9a-f\s:.-]+$/i.test(q)) {
    const hex = normalizeUid(q);
    if (hex.length >= 2 && normalizeUid(row.cardUID).includes(hex)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Datas curtas e CSV

const OFFSET_MS = -3 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, "0");
const local = (date: Date) => new Date(date.getTime() + OFFSET_MS);
const dayNumber = (date: Date) => Math.floor(local(date).getTime() / DAY);

/** Rótulo do dia no fuso da sala: "hoje", "ontem" ou "08/11" (com ano se for de outro ano). */
export function dayLabel(date: Date, now: Date): string {
  const diff = dayNumber(now) - dayNumber(date);
  if (diff === 0) return "hoje";
  if (diff === 1) return "ontem";
  const d = local(date);
  const sameYear = d.getUTCFullYear() === local(now).getUTCFullYear();
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}${sameYear ? "" : `/${d.getUTCFullYear()}`}`;
}

/** "hoje 14:32", "ontem 17:55", "08/11 16:20" ou "nunca". */
export function formatLastAccess(date: Date | null, now: Date): string {
  if (!date) return "nunca";
  const d = local(date);
  return `${dayLabel(date, now)} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

function csvCell(value: string): string {
  return /[";\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** CSV com `;` (o Excel em pt-BR abre direto). Quem baixa acrescenta o BOM. */
export function membersCsv(rows: MemberRow[], now: Date): string {
  const header = [
    "Nome",
    "E-mail",
    "Vínculo",
    "Digital",
    "Cartão (slot)",
    "UID do cartão",
    "Último acesso",
    "Status",
  ];
  const lines = rows.map((r) => [
    r.username,
    r.email,
    r.role ? ROLE_LABEL[r.role] : "",
    r.fingerId !== undefined ? `#${r.fingerId}` : "",
    r.rfid !== undefined ? String(r.rfid) : "",
    r.cardUID ? formatUid(r.cardUID) : "",
    formatLastAccess(r.lastAccessAt, now),
    STATUS_LABEL[r.status],
  ]);
  return [header, ...lines].map((line) => line.map(csvCell).join(";")).join("\r\n");
}

// ---------------------------------------------------------------------------
// Detalhe do membro

export type Period = "today" | "7d" | "30d";

export function logsInPeriod<T extends { at: Date | null }>(logs: T[], period: Period, now: Date): T[] {
  const days = period === "today" ? 0 : period === "7d" ? 6 : 29;
  const from = dayNumber(now) - days;
  return logs.filter(
    (log) => log.at && dayNumber(log.at) >= from && log.at.getTime() <= now.getTime() + 60_000,
  );
}

export type CredentialUsage = { lastUsedAt: Date | null; uses30d: number };

/** Último uso e usos nos últimos 30 dias de uma credencial (só acessos liberados). */
export function credentialUsage(logs: TimedLog[], kind: "fingerId" | "rfid", now: Date): CredentialUsage {
  const own = logs.filter((log) => log.accessType === kind && log.status === "ALLOWED" && log.at);
  return {
    lastUsedAt: own[0]?.at ?? null,
    uses30d: logsInPeriod(own, "30d", now).length,
  };
}

export type PresenceCell = { iso: string; count: number; level: 0 | 1 | 2 | 3 | 4; future: boolean };

/**
 * Mapa de presença: 5 semanas (segunda a domingo), terminando na semana atual. Intensidade
 * pelos acessos liberados do dia. Também devolve os dias na sala e a faixa de horário mais comum.
 */
export function presence(logs: TimedLog[], now: Date) {
  const allowed = logs.filter((log) => log.status === "ALLOWED" && log.at);
  const today = dayNumber(now);
  // dia 0 = 01/01/1970, quinta-feira; segunda = 0 no nosso grid
  const weekday = (day: number) => (day + 3) % 7;
  const start = today - weekday(today) - 28;

  const byDay = new Map<number, number>();
  const byHour = new Map<number, number>();
  for (const log of allowed) {
    const day = dayNumber(log.at!);
    if (day < start || day > today) continue;
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
    const hour = local(log.at!).getUTCHours();
    byHour.set(hour, (byHour.get(hour) ?? 0) + 1);
  }

  const level = (count: number): PresenceCell["level"] =>
    count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : count <= 4 ? 3 : 4;

  const weeks: PresenceCell[][] = [];
  for (let w = 0; w < 5; w++) {
    const week: PresenceCell[] = [];
    for (let d = 0; d < 7; d++) {
      const day = start + w * 7 + d;
      const count = byDay.get(day) ?? 0;
      week.push({
        iso: new Date(day * DAY).toISOString().slice(0, 10),
        count,
        level: level(count),
        future: day > today,
      });
    }
    weeks.push(week);
  }

  let topHour: number | undefined;
  for (const [hour, count] of byHour) {
    if (
      topHour === undefined ||
      count > byHour.get(topHour)! ||
      (count === byHour.get(topHour) && hour < topHour)
    ) {
      topHour = hour;
    }
  }

  return {
    weeks,
    daysPresent: byDay.size,
    commonHour: topHour === undefined ? null : `${pad(topHour)}–${pad((topHour + 1) % 24)}h`,
  };
}
