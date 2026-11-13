import { describe, expect, it } from "vitest";

import type { AccessLog, UserRecord } from "@/lib/firebase/types";
import { sortLogs } from "@/lib/lock-state";

import {
  classifyLog,
  deltaVsYesterday,
  filterRows,
  groupByDay,
  hourlyBuckets,
  logsCsv,
  percent,
  periodStart,
  summarize,
  topUnknownCard,
} from "./access-logs";

// terça, 10/11/2026 14:40 em Sobral
const now = new Date("2026-11-10T17:40:00.000Z");

const users: Record<string, UserRecord> = {
  user_card_22_finger_12: {
    username: "Maria Clara Sousa",
    email: "mariaclara@alu.ufc.br",
    rfid: 22,
    fingerId: 12,
  },
  user_card_id_7: { username: "João Pedro Lima", email: "joaopedro@alu.ufc.br", rfid: 7 },
};

const base: AccessLog = {
  userName: "Maria Clara Sousa",
  userEmail: "mariaclara@alu.ufc.br",
  userPath: "/users/user_card_22_finger_12",
  accessType: "fingerId",
  status: "ALLOWED",
  timestamp: "2026-11-10 14:32:08",
};
const unknown = { userName: "Desconhecido", userEmail: "N/A" };

const logs = sortLogs({
  a: base,
  b: {
    ...base,
    ...unknown,
    userPath: "/users/user_card_id_0",
    accessType: "rfid",
    status: "DENIED",
    cardUID: "7C:11:E0:5A",
    timestamp: "2026-11-10 13:58:40",
  },
  c: {
    ...base,
    ...unknown,
    userPath: "/users/user_card_id_0",
    accessType: "rfid",
    status: "DENIED",
    cardUID: "7C:11:E0:5A",
    timestamp: "2026-11-10 13:57:12",
  },
  d: { ...base, ...unknown, userPath: "/users/user_finger_id_27", timestamp: "2026-11-10 11:05:33" },
  e: {
    ...base,
    ...unknown,
    userPath: "/users/user_finger_id_0",
    status: "DENIED",
    timestamp: "2026-11-10 09:48:19",
  },
  f: {
    ...base,
    userPath: "/users/user_card_id_7",
    userName: "João Pedro Lima",
    userEmail: "joaopedro@alu.ufc.br",
    accessType: "rfid",
    cardUID: "04:9B:7E:21",
    timestamp: "2026-11-09 10:22:47",
  },
  g: {
    ...base,
    timestamp: "2026-11-10 08:03:17",
    queuedOffline: true,
    syncedAt: Date.parse("2026-11-10T12:20:00Z"),
  },
  h: { ...base, timestamp: "2026-11-09 16:00:00" },
});
const rows = logs.map((l) => classifyLog(l, users));
const byKey = (key: string) => rows.find((r) => r.key === key)!;

describe("classifyLog", () => {
  it("reconhece membro, sem dono, cartão desconhecido e digital não reconhecida", () => {
    expect(byKey("a")).toMatchObject({
      kind: "member",
      displayName: "Maria Clara Sousa",
      fingerId: 12,
      memberKey: "user_card_22_finger_12",
    });
    expect(byKey("b")).toMatchObject({ kind: "unknown-card", displayName: "Cartão desconhecido" });
    expect(byKey("d")).toMatchObject({ kind: "orphan", displayName: "Digital sem dono", fingerId: 27 });
    expect(byKey("e")).toMatchObject({
      kind: "unrecognized-finger",
      displayName: "Digital não reconhecida",
      fingerId: undefined,
    });
  });

  it("acha o membro pelo e-mail quando o userPath não bate com a chave", () => {
    const row = classifyLog(
      { ...base, userPath: "/users/user_finger_id_12", timestamp: "2026-11-10 10:00:00", key: "x", at: now },
      users,
    );
    expect(row.memberKey).toBe("user_card_22_finger_12");
  });

  it("marca o que chegou depois pela fila offline", () => {
    expect(byKey("g").late).toBe(true);
    expect(byKey("g").arrivedAt?.toISOString()).toBe("2026-11-10T12:20:00.000Z");
  });
});

describe("filtros e resumo", () => {
  const today = rows.filter((r) => r.at && r.at >= periodStart("today", now));

  it("período de hoje começa às 00:00 da sala", () => {
    expect(periodStart("today", now).toISOString()).toBe("2026-11-10T03:00:00.000Z");
    expect(periodStart("7d", now).toISOString()).toBe("2026-11-04T03:00:00.000Z");
    expect(today).toHaveLength(6);
  });

  it("filtra por credencial e resultado", () => {
    expect(filterRows(today, "card", "all")).toHaveLength(2);
    expect(filterRows(today, "all", "denied")).toHaveLength(3);
    expect(filterRows(today, "finger", "allowed")).toHaveLength(3);
  });

  it("resume o período", () => {
    expect(summarize(today)).toEqual({ total: 6, allowed: 3, denied: 3, byFinger: 4, byCard: 2, late: 1 });
    expect(percent(4, 6)).toBe("67%");
    expect(percent(0, 0)).toBe("0%");
  });

  it("compara com ontem até o mesmo horário", () => {
    // ontem: 10:22 (antes de 14:40) conta; 16:00 não
    expect(deltaVsYesterday(rows, now)).toEqual({ today: 6, yesterday: 1, delta: 5 });
  });
});

describe("agrupamento, gráfico e atenção", () => {
  it("agrupa por dia com o rótulo longo", () => {
    const groups = groupByDay(rows);
    expect(groups.map((g) => g.label)).toEqual(["Terça, 10 de novembro", "Segunda, 9 de novembro"]);
    expect(groups[0]?.rows).toHaveLength(6);
  });

  it("monta as barras por hora de 07 a 22", () => {
    const buckets = hourlyBuckets(rows.filter((r) => r.at && r.at >= periodStart("today", now)));
    expect(buckets[0]?.hour).toBe("07");
    expect(buckets.at(-1)?.hour).toBe("22");
    expect(buckets.find((b) => b.hour === "13")).toEqual({ hour: "13", allowed: 0, denied: 2 });
    expect(buckets.find((b) => b.hour === "14")).toEqual({ hour: "14", allowed: 1, denied: 0 });
  });

  it("alarga a faixa se houver acesso de madrugada", () => {
    const late = classifyLog(
      { ...base, timestamp: "2026-11-10 05:10:00", key: "z", at: new Date("2026-11-10T08:10:00Z") },
      users,
    );
    expect(hourlyBuckets([late])[0]?.hour).toBe("05");
  });

  it("acha o cartão desconhecido que mais tentou", () => {
    const top = topUnknownCard(rows);
    expect(top?.uid).toBe("7C 11 E0 5A");
    expect(top?.attempts).toHaveLength(2);
  });

  it("gera CSV com ;", () => {
    const [header, first] = logsCsv([byKey("b")]).split("\r\n");
    expect(header).toBe("Data;Hora;Quem;E-mail;Credencial;Resultado;Chegou depois (offline)");
    expect(first).toBe("10/11/2026;13:58:40;Cartão desconhecido;;Cartão 7C 11 E0 5A;Negado;");
  });
});
