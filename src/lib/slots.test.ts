import { describe, expect, it } from "vitest";

import type { UserRecord } from "@/lib/firebase/types";

import { commandDetail, connectionTimeline, formatDuration } from "./device";
import { buildSlots, slotCounts, usedCount } from "./slots";

const users: Record<string, UserRecord> = {
  user_card_22_finger_12: { username: "Maria Clara Sousa", email: "m@alu.ufc.br", rfid: 22, fingerId: 12 },
  user_card_id_7: { username: "João Pedro Lima", email: "j@alu.ufc.br", rfid: 7 },
  user_finger_id_3: { username: "Rafael", email: "r@alu.ufc.br", fingerId: 3 },
};

describe("buildSlots", () => {
  it("com inventário: vinculada, sem dono, livre e fantasma", () => {
    const slots = buildSlots("finger", {
      capacity: 20,
      inventory: { updatedAt: 0, fingers: { "12": true, "27": true }, cards: {} },
      users,
      logOrphans: [],
    });
    expect(slots).toHaveLength(27); // alarga até a maior posição ocupada
    expect(slots[11]).toMatchObject({ n: 12, state: "linked", memberName: "Maria Clara Sousa" });
    expect(slots[26]).toMatchObject({ n: 27, state: "orphan" });
    expect(slots[2]).toMatchObject({ n: 3, state: "ghost", memberKey: "user_finger_id_3" });
    expect(slots[0]?.state).toBe("free");
    const counts = slotCounts(slots);
    expect(counts).toMatchObject({ linked: 1, orphan: 1, ghost: 1, free: 24, unknown: 0 });
    expect(usedCount(counts)).toBe(2);
  });

  it("sem inventário (2.0): conhecidas pelo banco, sem dono pelos registros, resto desconhecido", () => {
    const slots = buildSlots("card", {
      inventory: undefined,
      users,
      logOrphans: [
        { kind: "rfid", id: 30, cardUID: "5D:22:A0:7F" },
        { kind: "finger", id: 27 },
      ],
    });
    expect(slots).toHaveLength(126);
    expect(slots[6]).toMatchObject({ n: 7, state: "linked" });
    expect(slots[29]).toMatchObject({ n: 30, state: "orphan", uid: "5D:22:A0:7F" });
    expect(slots[0]?.state).toBe("unknown");
    expect(slotCounts(slots)).toMatchObject({ linked: 2, orphan: 1, free: 0, unknown: 123 });
  });

  it("cartões trazem o UID do inventário", () => {
    const slots = buildSlots("card", {
      inventory: { updatedAt: 0, fingers: {}, cards: { "22": "A3:F2:1C:9D" } },
      users,
      logOrphans: [],
    });
    expect(slots[21]).toMatchObject({ n: 22, state: "linked", uid: "A3:F2:1C:9D" });
    expect(slots[6]?.state).toBe("ghost");
  });
});

describe("dispositivo", () => {
  const now = Date.parse("2026-11-10T17:32:00Z");
  const H = 3_600_000;

  it("formata durações", () => {
    expect(formatDuration(20_000)).toBe("menos de 1 min");
    expect(formatDuration(24 * 60_000)).toBe("24 min");
    expect(formatDuration(3 * H + 12 * 60_000)).toBe("3 h 12 min");
    expect(formatDuration(2 * H)).toBe("2 h");
    expect(formatDuration(52 * H)).toBe("2 d 4 h");
  });

  it("monta a linha do tempo de 24 h e o percentual online", () => {
    const t = connectionTimeline(
      [
        { start: now - 10 * H, end: now - 10 * H + 24 * 60_000, queued: 6 },
        { start: now - 30 * H, end: now - 29 * H }, // fora da janela
        { start: now - 25 * H, end: now - 23.5 * H }, // corta no início da janela
      ],
      now,
    );
    expect(t.outages).toHaveLength(2);
    expect(t.outages[0]).toMatchObject({ queued: 6, durationMs: 24 * 60_000, ongoing: false });
    expect(t.segments[1]?.left).toBe(0);
    // 24 min + 30 min fora em 24 h
    expect(t.uptime).toBe("96,3%");
  });

  it("queda em andamento vai até agora", () => {
    const t = connectionTimeline([{ start: now - 14 * 60_000, end: null }], now);
    expect(t.outages[0]).toMatchObject({ ongoing: true, durationMs: 14 * 60_000 });
  });

  it("descreve comandos", () => {
    const base = { requestedBy: "u", requestedAt: 0, status: "PENDING" as const };
    expect(commandDetail({ ...base, type: "DELETE_FINGER", fingerId: 7 })).toBe("#07");
    expect(commandDetail({ ...base, type: "DELETE_CARD", slot: 22 })).toBe("slot 22");
    expect(commandDetail({ ...base, type: "SET_UNLOCK_SECONDS", seconds: 3 })).toBe("3 s");
    expect(commandDetail({ ...base, type: "SET_SHOW_NAME", enabled: false })).toBe("desligado");
    expect(commandDetail({ ...base, type: "REBOOT" })).toBeUndefined();
  });
});
