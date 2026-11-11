import { describe, expect, it } from "vitest";

import type { AccessLog, DeviceStatus } from "@/lib/firebase/types";

import {
  connectionOf,
  lcdLinesOf,
  modeOf,
  orphansFromInventory,
  orphansFromLogs,
  sortLogs,
} from "./lock-state";

const now = Date.parse("2026-11-10T17:32:08.000Z");

const status = (over: Partial<DeviceStatus> = {}): DeviceStatus => ({
  online: true,
  lastSeen: now - 4_000,
  lcd: ["Aguardando", "acesso..."],
  capabilities: ["status"],
  ...over,
});

const log = (over: Partial<AccessLog>): AccessLog => ({
  userName: "Maria Clara Sousa",
  userEmail: "mariaclara@alu.ufc.br",
  userPath: "/users/user_card_22_finger_12",
  accessType: "fingerId",
  status: "ALLOWED",
  timestamp: "2026-11-10 14:32:08",
  ...over,
});

describe("connectionOf", () => {
  it("é unknown sem status (firmware 2.0)", () => {
    expect(connectionOf(undefined, now)).toBe("unknown");
  });

  it("é online com heartbeat recente e offline depois de 30 s", () => {
    expect(connectionOf(status(), now)).toBe("online");
    expect(connectionOf(status({ lastSeen: now - 31_000 }), now)).toBe("offline");
    expect(connectionOf(status({ online: false }), now)).toBe("offline");
  });
});

describe("lcdLinesOf", () => {
  it("devolve as duas linhas como o firmware publicou", () => {
    expect(lcdLinesOf(status(), now)).toEqual(["Aguardando", "acesso..."]);
    expect(lcdLinesOf(status({ lcd: ["Uma linha"] }), now)).toEqual(["Uma linha", ""]);
  });

  it("apaga o LCD sem dado ou com dado de mais de 2 min", () => {
    expect(lcdLinesOf(undefined, now)).toBeNull();
    expect(lcdLinesOf(status({ lcd: undefined }), now)).toBeNull();
    expect(lcdLinesOf(status({ lastSeen: now - 3 * 60_000 }), now)).toBeNull();
  });
});

describe("modeOf", () => {
  it("prefere o modo do heartbeat e cai para system/mode", () => {
    expect(modeOf("STANDBY", status({ mode: "MASTER" }))).toBe("MASTER");
    expect(modeOf("MASTER", undefined)).toBe("MASTER");
    expect(modeOf(undefined, undefined)).toBeUndefined();
  });
});

describe("sortLogs", () => {
  it("ordena pelo horário real, não pela chave, e manda 1970 para o fim", () => {
    const sorted = sortLogs({
      log_9000: log({ timestamp: "2026-11-10 08:00:00" }),
      log_100: log({ timestamp: "2026-11-10 14:00:00" }), // depois de um reboot
      log_5: log({ timestamp: "1970-01-01 00:01:00" }),
    });
    expect(sorted.map((l) => l.key)).toEqual(["log_100", "log_9000", "log_5"]);
    expect(sorted[2]?.at).toBeNull();
  });

  it("usa epoch quando o firmware 2.1 envia", () => {
    const sorted = sortLogs({
      a: log({
        timestamp: "2026-11-10 09:00:00",
        epoch: Date.parse("2026-11-10T20:00:00Z"),
        clockSynced: true,
      }),
      b: log({ timestamp: "2026-11-10 10:00:00" }),
    });
    expect(sorted.map((l) => l.key)).toEqual(["a", "b"]);
  });
});

describe("orphansFromLogs", () => {
  it("acha liberados com dono Desconhecido e ignora negados e id 0", () => {
    const orphans = orphansFromLogs([
      log({ userName: "Desconhecido", userPath: "/users/user_finger_id_27" }),
      log({ userName: "Desconhecido", userPath: "/users/user_finger_id_27" }),
      log({
        userName: "Desconhecido",
        userPath: "/users/user_card_id_30",
        accessType: "rfid",
        cardUID: "5D:22:A0:7F",
      }),
      log({
        userName: "Desconhecido",
        userPath: "/users/user_card_id_0",
        accessType: "rfid",
        status: "DENIED",
      }),
      log({ userName: "Desconhecido", userPath: "/users/user_finger_id_0" }),
      log({}),
    ]);
    expect(orphans).toEqual([
      { kind: "finger", id: 27 },
      { kind: "rfid", id: 30, cardUID: "5D:22:A0:7F" },
    ]);
  });
});

describe("orphansFromInventory", () => {
  it("lista posições ocupadas sem users/* correspondente", () => {
    const orphans = orphansFromInventory(
      {
        updatedAt: now,
        fingers: { "12": true, "27": true },
        cards: { "22": "A3:F2:1C:9D", "30": "5D:22:A0:7F" },
      },
      { user_card_22_finger_12: { username: "Maria", email: "m@alu.ufc.br", rfid: 22, fingerId: 12 } },
    );
    expect(orphans).toEqual([
      { kind: "finger", id: 27 },
      { kind: "rfid", id: 30, cardUID: "5D:22:A0:7F" },
    ]);
  });
});
