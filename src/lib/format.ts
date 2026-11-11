/**
 * Formatação compartilhada pelo painel. Horários da fechadura estão no fuso da sala
 * (America/Fortaleza, UTC-3 fixo, sem horário de verão).
 */

export const LOCK_UTC_OFFSET_HOURS = -3;
export const LCD_COLUMNS = 16;

const OFFSET_MS = LOCK_UTC_OFFSET_HOURS * 60 * 60 * 1000;
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// ---------------------------------------------------------------------------
// UID de cartão

/**
 * UID sem separadores, em maiúsculas, só com dígitos hexadecimais.
 * Usado para comparar e buscar: `"a3:f2 1c-9d"` → `"A3F21C9D"`.
 */
export function normalizeUid(uid: string): string {
  return uid.replace(/[^0-9a-f]/gi, "").toUpperCase();
}

/** UID para exibição, em grupos de 2 com espaço: `"A3:F2:1C:9D"` → `"A3 F2 1C 9D"`. */
export function formatUid(uid: string): string {
  const hex = normalizeUid(uid);
  return hex.match(/.{1,2}/g)?.join(" ") ?? "";
}

// ---------------------------------------------------------------------------
// Datas

const LOCK_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/;

/**
 * Converte o `timestamp` gravado pelo firmware (`"2026-11-10 14:32:08"`, hora local UTC-3)
 * num `Date`. Também aceita ISO com fuso (`"2026-11-10T17:02:11.000Z"`, gravado pelo site).
 * Devolve `null` quando o horário não é confiável: `1970-01-01 …` (NTP falhou) ou inválido.
 */
export function parseLockTimestamp(value: string | null | undefined): Date | null {
  if (!value) return null;
  const text = value.trim();
  const match = LOCK_TIMESTAMP.exec(text);
  let date: Date;
  if (match) {
    const [y, mo, d, h, mi, s] = match.slice(1).map(Number) as [
      number,
      number,
      number,
      number,
      number,
      number,
    ];
    date = new Date(Date.UTC(y, mo - 1, d, h, mi, s) - OFFSET_MS);
    // rejeita datas que o Date "corrige" (ex.: 2026-02-31)
    const back = new Date(date.getTime() + OFFSET_MS);
    if (back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d || h > 23 || mi > 59 || s > 59) return null;
  } else if (/^\d{4}-\d{2}-\d{2}T.+(Z|[+-]\d{2}:?\d{2})$/.test(text)) {
    date = new Date(text);
  } else {
    return null;
  }
  if (Number.isNaN(date.getTime())) return null;
  if (date.getUTCFullYear() <= 1970) return null;
  return date;
}

/** Partes do horário no fuso da fechadura. */
function lockParts(date: Date) {
  const shifted = new Date(date.getTime() + OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
    seconds: shifted.getUTCSeconds(),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** `"14:32:08"` (ou `"14:32"` com `seconds: false`) no fuso da fechadura. */
export function formatLockTime(date: Date, { seconds = true }: { seconds?: boolean } = {}): string {
  const p = lockParts(date);
  return seconds
    ? `${pad(p.hours)}:${pad(p.minutes)}:${pad(p.seconds)}`
    : `${pad(p.hours)}:${pad(p.minutes)}`;
}

/** `"2026-11-10"` no fuso da fechadura (valor de `<input type="date">`). */
export function lockDateISO(date: Date): string {
  const p = lockParts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** `"10/11/2026"` no fuso da fechadura. */
export function formatLockDate(date: Date): string {
  const p = lockParts(date);
  return `${pad(p.day)}/${pad(p.month)}/${p.year}`;
}

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** `"Terça, 10 de novembro"` no fuso da fechadura (subtítulo da Visão geral). */
export function formatLockLongDate(date: Date): string {
  const p = lockParts(date);
  const weekday = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
  return `${WEEKDAYS[weekday]}, ${p.day} de ${MONTHS[p.month - 1]}`;
}

/** Dias de calendário (no fuso da fechadura) entre `date` e `now`. */
function calendarDaysBetween(date: Date, now: Date): number {
  const a = lockParts(date);
  const b = lockParts(now);
  return Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / DAY);
}

/**
 * Tempo relativo em pt-BR, curto: "agora" (ou "há 4 s" com `seconds`), "há 3 min", "há 2 h", "ontem", "há 4 dias",
 * e a data absoluta depois de 7 dias. Datas no futuro (relógio do ESP adiantado) viram "agora".
 */
export function relativeTime(
  date: Date,
  now: Date = new Date(),
  { seconds = false }: { seconds?: boolean } = {},
): string {
  const diff = now.getTime() - date.getTime();
  // `seconds`: para "Último contato" da fechadura, que muda a cada heartbeat (10 s)
  if (seconds && diff >= 1000 && diff < MINUTE) return `há ${Math.floor(diff / 1000)} s`;
  if (diff < MINUTE) return "agora";
  if (diff < HOUR) return `há ${Math.floor(diff / MINUTE)} min`;
  const days = calendarDaysBetween(date, now);
  if (diff < DAY && days === 0) return `há ${Math.floor(diff / HOUR)} h`;
  if (days <= 1) return "ontem";
  if (days < 7) return `há ${days} dias`;
  return formatLockDate(date);
}

/** Primeiro e segundo nome, para textos curtos: "Maria Clara Sousa" → "Maria Clara". */
export function shortName(name: string): string {
  return name
    .trim()
    .replace(/^Prof(a)?\.\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .join(" ");
}

// ---------------------------------------------------------------------------
// LCD

/**
 * Texto como o LCD 16x2 da fechadura mostra: sem acentos (o HD44780 não tem), só ASCII
 * imprimível, espaços colapsados e cortado em 16 colunas.
 * `lcdName("Maria Clara Sousa Araújo")` → `"Maria Clara Sous"`.
 */
export function lcdText(text: string, columns: number = LCD_COLUMNS): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, columns);
}

/** Nome do membro como aparece no LCD. */
export function lcdName(name: string): string {
  return lcdText(name);
}

/** O nome perde caracteres no LCD (corte ou acento)? Use para avisar no formulário. */
export function lcdNameChanges(name: string): boolean {
  return lcdName(name) !== name.replace(/\s+/g, " ").trim();
}
