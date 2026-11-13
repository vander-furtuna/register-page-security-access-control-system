import { describe, expect, it } from "vitest";

import type { AccessLog, MemberMeta, UserRecord } from "@/lib/firebase/types";
import { sortLogs } from "@/lib/lock-state";

import {
  buildMembers,
  credentialUsage,
  dayLabel,
  formatLastAccess,
  inTab,
  logsInPeriod,
  matchesQuery,
  memberStatus,
  membersCsv,
  presence,
  tabCounts,
} from "./members";

// terça, 10/11/2026 14:32:08 em Sobral
const now = new Date("2026-11-10T17:32:08.000Z");

const users: Record<string, UserRecord> = {
  user_card_22_finger_12: {
    username: "Maria Clara Sousa",
    email: "mariaclara@alu.ufc.br",
    rfid: 22,
    fingerId: 12,
    createdAt: "2026-03-14 10:21:00",
  },
  user_card_id_7: { username: "João Pedro Lima", email: "joaopedro@alu.ufc.br", rfid: 7 },
  user_finger_id_9: { username: "Lucas Ferreira", email: "lucasf@alu.ufc.br", fingerId: 9 },
};
const members: Record<string, MemberMeta> = {
  user_card_22_finger_12: { role: "petiano", active: true },
  user_finger_id_9: { role: "egresso", active: false },
};

const log = (over: Partial<AccessLog>): AccessLog => ({
  userName: "Maria Clara Sousa",
  userEmail: "mariaclara@alu.ufc.br",
  userPath: "/users/user_card_22_finger_12",
  accessType: "fingerId",
  status: "ALLOWED",
  timestamp: "2026-11-10 14:32:08",
  ...over,
});

const logs = sortLogs({
  a: log({}),
  b: log({ timestamp: "2026-11-06 08:15:02", accessType: "rfid", cardUID: "A3:F2:1C:9D" }),
  c: log({
    userName: "João Pedro Lima",
    userEmail: "joaopedro@alu.ufc.br",
    userPath: "/users/user_card_id_7",
    accessType: "rfid",
    cardUID: "04:9B:7E:21",
    timestamp: "2026-11-10 14:10:51",
  }),
  d: log({ timestamp: "2026-11-09 13:20:40", status: "DENIED" }),
});

const rows = buildMembers(users, members, logs, undefined, now);
const byKey = (key: string) => rows.find((r) => r.key === key)!;

describe("buildMembers", () => {
  it("junta users, members e o último acesso liberado", () => {
    const maria = byKey("user_card_22_finger_12");
    expect(maria).toMatchObject({ role: "petiano", status: "active", fingerId: 12, rfid: 22 });
    expect(maria.lastAccessAt?.toISOString()).toBe("2026-11-10T17:32:08.000Z");
    expect(maria.createdAt?.toISOString()).toBe("2026-03-14T13:21:00.000Z");
  });

  it("descobre o UID do cartão pelos registros (firmware 2.0) ou pelo inventário (2.1)", () => {
    expect(byKey("user_card_22_finger_12").cardUID).toBe("A3:F2:1C:9D");
    const withInventory = buildMembers(
      users,
      members,
      [],
      { updatedAt: 0, fingers: {}, cards: { "7": "11:22:33:44" } },
      now,
    );
    expect(withInventory.find((r) => r.key === "user_card_id_7")?.cardUID).toBe("11:22:33:44");
  });

  it("membro sem acesso tem lastAccessAt nulo", () => {
    expect(byKey("user_finger_id_9").lastAccessAt).toBeNull();
  });
});

describe("memberStatus", () => {
  it("egresso, desativado, vencido e ativo", () => {
    expect(memberStatus({ role: "egresso", active: true }, now)).toBe("alumni");
    expect(memberStatus({ role: "petiano", active: false }, now)).toBe("inactive");
    expect(memberStatus({ role: "visitante", active: true, validUntil: "2026-11-09" }, now)).toBe("expired");
    expect(memberStatus({ role: "visitante", active: true, validUntil: "2026-11-10" }, now)).toBe("active");
    expect(memberStatus(undefined, now)).toBe("active");
  });
});

describe("abas", () => {
  it("filtra e conta", () => {
    expect(inTab(byKey("user_card_id_7"), "card-only")).toBe(true);
    expect(inTab(byKey("user_finger_id_9"), "finger-only")).toBe(true);
    expect(tabCounts(rows)).toEqual({ all: 3, active: 2, "card-only": 1, "finger-only": 1, alumni: 1 });
  });
});

describe("matchesQuery", () => {
  const maria = byKey("user_card_22_finger_12");

  it("acha por nome e e-mail sem acento nem maiúsculas", () => {
    expect(matchesQuery(byKey("user_card_id_7"), "joao")).toBe(true);
    expect(matchesQuery(maria, "CLARA")).toBe(true);
    expect(matchesQuery(maria, "mariaclara@")).toBe(true);
    expect(matchesQuery(maria, "pedro")).toBe(false);
  });

  it("acha pelo UID em qualquer formato", () => {
    expect(matchesQuery(maria, "A3F2")).toBe(true);
    expect(matchesQuery(maria, "a3:f2")).toBe(true);
    expect(matchesQuery(maria, "a3 f2 1c")).toBe(true);
    expect(matchesQuery(maria, "9B 7E")).toBe(false);
  });

  it("acha por #ID da digital ou número", () => {
    expect(matchesQuery(maria, "#12")).toBe(true);
    expect(matchesQuery(maria, "# 12")).toBe(true);
    expect(matchesQuery(maria, "#22")).toBe(false);
    expect(matchesQuery(maria, "22")).toBe(true);
  });

  it("busca vazia aceita tudo", () => {
    expect(matchesQuery(maria, "  ")).toBe(true);
  });
});

describe("datas curtas", () => {
  it("hoje, ontem, data do ano e de outro ano", () => {
    expect(dayLabel(new Date("2026-11-10T03:30:00Z"), now)).toBe("hoje");
    expect(dayLabel(new Date("2026-11-10T02:30:00Z"), now)).toBe("ontem");
    expect(dayLabel(new Date("2026-11-07T12:00:00Z"), now)).toBe("07/11");
    expect(dayLabel(new Date("2025-10-12T12:00:00Z"), now)).toBe("12/10/2025");
    expect(formatLastAccess(new Date("2026-11-10T17:10:51Z"), now)).toBe("hoje 14:10");
    expect(formatLastAccess(null, now)).toBe("nunca");
  });
});

describe("membersCsv", () => {
  it("gera ; com cabeçalho e escapa aspas", () => {
    const csv = membersCsv([{ ...byKey("user_card_22_finger_12"), username: 'Maria "Clara"; Sousa' }], now);
    const [header, line] = csv.split("\r\n");
    expect(header).toBe("Nome;E-mail;Vínculo;Digital;Cartão (slot);UID do cartão;Último acesso;Status");
    expect(line).toBe(
      '"Maria ""Clara""; Sousa";mariaclara@alu.ufc.br;Petiano(a);#12;22;A3 F2 1C 9D;hoje 14:32;Ativo',
    );
  });
});

describe("detalhe", () => {
  const own = logs.filter((l) => l.userPath === "/users/user_card_22_finger_12");

  it("filtra por período no fuso da sala", () => {
    expect(logsInPeriod(own, "today", now)).toHaveLength(1);
    expect(logsInPeriod(own, "7d", now)).toHaveLength(3);
  });

  it("calcula último uso e usos de cada credencial", () => {
    expect(credentialUsage(own, "fingerId", now)).toMatchObject({ uses30d: 1 });
    expect(credentialUsage(own, "rfid", now).lastUsedAt?.toISOString()).toBe("2026-11-06T11:15:02.000Z");
  });

  it("monta 5 semanas de segunda a domingo com dias futuros marcados", () => {
    const p = presence(own, now);
    expect(p.weeks).toHaveLength(5);
    expect(p.weeks.every((w) => w.length === 7)).toBe(true);
    const last = p.weeks[4]!;
    expect(last[0]?.iso).toBe("2026-11-09"); // segunda desta semana
    expect(last[1]).toMatchObject({ iso: "2026-11-10", count: 1, future: false });
    expect(last[2]?.future).toBe(true);
    expect(p.daysPresent).toBe(2);
    expect(p.commonHour).toBe("08–09h");
  });
});
