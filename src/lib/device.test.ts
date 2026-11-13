import { describe, expect, it } from "vitest";

import { commandDetail, connectionTimeline, formatDuration } from "./device";

const MIN = 60_000;
const HOUR = 60 * MIN;

describe("formatDuration", () => {
  it("usa a maior unidade que faz sentido", () => {
    expect(formatDuration(20_000)).toBe("menos de 1 min");
    expect(formatDuration(24 * MIN)).toBe("24 min");
    expect(formatDuration(3 * HOUR)).toBe("3 h");
    expect(formatDuration(3 * HOUR + 12 * MIN)).toBe("3 h 12 min");
    expect(formatDuration(52 * HOUR)).toBe("2 d 4 h");
  });
});

describe("connectionTimeline", () => {
  const now = Date.UTC(2026, 10, 12, 18, 0);

  it("sem quedas: 100% online", () => {
    const t = connectionTimeline([], now);
    expect(t.uptime).toBe("100,0%");
    expect(t.segments).toEqual([]);
  });

  it("corta quedas na janela e ordena da mais recente", () => {
    const t = connectionTimeline(
      [
        { start: now - 25 * HOUR, end: now - 23 * HOUR }, // começou antes da janela
        { start: now - 2 * HOUR, end: now - 2 * HOUR + 24 * MIN, queued: 6 },
        { start: now - 30 * HOUR, end: now - 29 * HOUR }, // fora da janela
      ],
      now,
    );
    expect(t.outages).toHaveLength(2);
    expect(t.outages[0]).toMatchObject({ durationMs: 24 * MIN, queued: 6, ongoing: false });
    // a de antes da janela conta só 1 h; a duração real (2 h) continua na lista
    expect(t.outages[1]!.durationMs).toBe(2 * HOUR);
    expect(t.segments[1]).toEqual({ left: 0, width: 1 / 24 });
    expect(t.uptime).toBe("94,2%");
  });

  it("queda em andamento vai até agora", () => {
    const t = connectionTimeline([{ start: now - 30 * MIN, end: null }], now);
    expect(t.outages[0]).toMatchObject({ ongoing: true, end: now, durationMs: 30 * MIN });
  });
});

describe("commandDetail", () => {
  const base = { requestedBy: "uid", requestedAt: 0, status: "DONE" as const };
  it("mostra o alvo de cada comando", () => {
    expect(commandDetail({ ...base, type: "DELETE_FINGER", fingerId: 7 })).toBe("#07");
    expect(commandDetail({ ...base, type: "DELETE_CARD", slot: 22 })).toBe("slot 22");
    expect(commandDetail({ ...base, type: "SET_UNLOCK_SECONDS", seconds: 3 })).toBe("3 s");
    expect(commandDetail({ ...base, type: "SET_SHOW_NAME", enabled: false })).toBe("desligado");
    expect(commandDetail({ ...base, type: "REBOOT" })).toBeUndefined();
  });
});
