import type { DeviceInventory, UserRecord } from "@/lib/firebase/types";
import type { Orphan } from "@/lib/lock-state";

/**
 * Mapa da memória da fechadura (`componentes.md` › SlotMap): uma posição por ID do sensor
 * DY50 (digitais) ou slot da EEPROM (cartões).
 *
 * - `linked`: ocupada e ligada a um `users/*`.
 * - `orphan`: ocupada na fechadura, sem `users/*` (cadastro pelo cartão mestre sem o site).
 * - `free`: livre (só se sabe com inventário).
 * - `ghost`: o banco aponta para ela, mas a fechadura está vazia ali (ex.: depois de um wipe).
 * - `unknown`: firmware 2.0, sem inventário: não dá para saber se está livre.
 */
export type SlotKind = "finger" | "card";
export type SlotState = "linked" | "orphan" | "free" | "ghost" | "unknown";
export type Slot = { n: number; state: SlotState; memberKey?: string; memberName?: string; uid?: string };

/** Capacidade de fábrica (DY50: 127 digitais; EEPROM do firmware: 126 cartões + o mestre). */
export const DEFAULT_CAPACITY: Record<SlotKind, number> = { finger: 127, card: 126 };

type BuildInput = {
  capacity?: number;
  inventory: DeviceInventory | undefined;
  users: Record<string, UserRecord>;
  /** Sem dono deduzidos dos registros (firmware 2.0). */
  logOrphans: Orphan[];
};

export function buildSlots(kind: SlotKind, { capacity, inventory, users, logOrphans }: BuildInput): Slot[] {
  const byPosition = new Map<number, { key: string; name: string }>();
  for (const [key, user] of Object.entries(users)) {
    const n = kind === "finger" ? user.fingerId : user.rfid;
    if (n !== undefined && !byPosition.has(n)) byPosition.set(n, { key, name: user.username });
  }
  const occupied = inventory
    ? new Set(Object.keys(kind === "finger" ? inventory.fingers : inventory.cards).map(Number))
    : null;
  const orphanFromLogs = new Map(
    logOrphans
      .filter((o) => (kind === "finger" ? o.kind === "finger" : o.kind === "rfid"))
      .map((o) => [o.id, o]),
  );

  const highest = Math.max(
    capacity ?? DEFAULT_CAPACITY[kind],
    ...byPosition.keys(),
    ...(occupied ? [...occupied] : []),
    ...orphanFromLogs.keys(),
  );

  const slots: Slot[] = [];
  for (let n = 1; n <= highest; n++) {
    const owner = byPosition.get(n);
    const uid = kind === "card" ? (inventory?.cards[String(n)] ?? orphanFromLogs.get(n)?.cardUID) : undefined;
    let state: SlotState;
    if (occupied) {
      if (owner) state = occupied.has(n) ? "linked" : "ghost";
      else state = occupied.has(n) ? "orphan" : "free";
    } else {
      state = owner ? "linked" : orphanFromLogs.has(n) ? "orphan" : "unknown";
    }
    slots.push({
      n,
      state,
      ...(owner ? { memberKey: owner.key, memberName: owner.name } : {}),
      ...(uid ? { uid } : {}),
    });
  }
  return slots;
}

export type SlotCounts = Record<SlotState, number>;

export function slotCounts(slots: Slot[]): SlotCounts {
  const counts: SlotCounts = { linked: 0, orphan: 0, free: 0, ghost: 0, unknown: 0 };
  for (const slot of slots) counts[slot.state]++;
  return counts;
}

/** Posições ocupadas na fechadura (vinculadas + sem dono). */
export function usedCount(counts: SlotCounts): number {
  return counts.linked + counts.orphan;
}
