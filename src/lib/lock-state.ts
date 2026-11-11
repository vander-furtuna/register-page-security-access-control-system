import { parseLockTimestamp } from "@/lib/format";
import type { AccessLog, DeviceInventory, DeviceStatus, SystemMode, UserRecord } from "@/lib/firebase/types";

/**
 * Regras do estado da fechadura (`docs/arquitetura/contrato-firmware.md`), sem React,
 * para serem testadas e reaproveitadas pelos componentes.
 */

/** Sem heartbeat há mais de 30 s = offline (contrato 2.1). */
export const OFFLINE_AFTER_MS = 30_000;
/** LCD apagado quando não há comunicação há mais de 2 min (`LcdMirror` › off). */
export const LCD_STALE_AFTER_MS = 2 * 60_000;

export type Connection = "online" | "offline" | "unknown";

/** `unknown` quando o firmware não publica `devices/<id>/status` (2.0). */
export function connectionOf(status: DeviceStatus | undefined, now: number): Connection {
  if (!status) return "unknown";
  if (!status.online) return "offline";
  return now - status.lastSeen > OFFLINE_AFTER_MS ? "offline" : "online";
}

/** As duas linhas do LCD, ou `null` se não há o que mostrar (sem dado ou dado velho). */
export function lcdLinesOf(status: DeviceStatus | undefined, now: number): [string, string] | null {
  if (!status?.lcd || status.lcd.length === 0) return null;
  if (now - status.lastSeen > LCD_STALE_AFTER_MS) return null;
  return [status.lcd[0] ?? "", status.lcd[1] ?? ""];
}

/** O modo vem do heartbeat quando existe (mais recente) e de `system/mode` no firmware 2.0. */
export function modeOf(
  systemMode: SystemMode | undefined,
  status: DeviceStatus | undefined,
): SystemMode | undefined {
  return status?.mode ?? systemMode;
}

// ---------------------------------------------------------------------------
// Registros de acesso

export type TimedLog = AccessLog & { key: string; at: Date | null };

/**
 * Ordena por horário real (mais recente primeiro), nunca pela chave: `log_<millis>` recomeça
 * a cada boot do ESP. Prefere `epoch` (firmware 2.1); logs sem horário confiável
 * (`1970-01-01`) vão para o fim, na ordem da chave.
 */
export function sortLogs(logs: Record<string, AccessLog>): TimedLog[] {
  return Object.entries(logs)
    .map(([key, log]) => ({
      ...log,
      key,
      at: log.epoch && log.clockSynced !== false ? new Date(log.epoch) : parseLockTimestamp(log.timestamp),
    }))
    .sort((a, b) => {
      if (a.at && b.at) return b.at.getTime() - a.at.getTime();
      if (a.at) return -1;
      if (b.at) return 1;
      return b.key.localeCompare(a.key);
    });
}

// ---------------------------------------------------------------------------
// Credenciais sem dono

export type Orphan = { kind: "finger" | "rfid"; id: number; cardUID?: string };

const USER_PATH_ID = /_id_(\d+)$/;

/**
 * Firmware 2.0: uma credencial sem dono abre a porta (`ALLOWED`) mas o firmware não acha
 * o `users/*` e grava `userName: "Desconhecido"`. O id sai do `userPath` (`…_id_27`).
 * Id 0 é o "não reconhecido" dos negados e nunca é sem dono.
 */
export function orphansFromLogs(logs: Iterable<AccessLog>): Orphan[] {
  const found = new Map<string, Orphan>();
  for (const log of logs) {
    if (log.status !== "ALLOWED" || log.userName !== "Desconhecido") continue;
    const id = log.credentialId ?? Number(USER_PATH_ID.exec(log.userPath)?.[1]);
    if (!Number.isInteger(id) || id <= 0) continue;
    const kind = log.accessType === "rfid" ? "rfid" : "finger";
    const key = `${kind}:${id}`;
    if (!found.has(key)) found.set(key, { kind, id, ...(log.cardUID && { cardUID: log.cardUID }) });
  }
  return [...found.values()];
}

/** Firmware 2.1: posição ocupada na fechadura sem `users/*` correspondente. */
export function orphansFromInventory(
  inventory: DeviceInventory,
  users: Record<string, UserRecord>,
): Orphan[] {
  const fingers = new Set<number>();
  const cards = new Set<number>();
  for (const user of Object.values(users)) {
    if (user.fingerId !== undefined) fingers.add(user.fingerId);
    if (user.rfid !== undefined) cards.add(user.rfid);
  }
  const orphans: Orphan[] = [];
  for (const id of Object.keys(inventory.fingers).map(Number)) {
    if (!fingers.has(id)) orphans.push({ kind: "finger", id });
  }
  for (const [slot, uid] of Object.entries(inventory.cards)) {
    const id = Number(slot);
    if (!cards.has(id)) orphans.push({ kind: "rfid", id, cardUID: uid });
  }
  return orphans.sort((a, b) => a.kind.localeCompare(b.kind) || a.id - b.id);
}
