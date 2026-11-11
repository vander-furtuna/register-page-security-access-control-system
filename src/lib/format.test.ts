import { describe, expect, it } from "vitest";

import {
  formatLockDate,
  formatLockLongDate,
  lockDateISO,
  shortName,
  formatLockTime,
  formatUid,
  lcdName,
  lcdNameChanges,
  normalizeUid,
  parseLockTimestamp,
  relativeTime,
} from "./format";

describe("formatUid", () => {
  it("agrupa o UID do firmware em pares com espaço", () => {
    expect(formatUid("A3:F2:1C:9D")).toBe("A3 F2 1C 9D");
  });

  it("aceita minúsculas, espaços e UID sem separador", () => {
    expect(formatUid("a3f21c9d")).toBe("A3 F2 1C 9D");
    expect(formatUid(" 04-9b 7e:21 ")).toBe("04 9B 7E 21");
  });

  it("devolve vazio para entrada sem hexadecimal", () => {
    expect(formatUid("")).toBe("");
    expect(formatUid("::")).toBe("");
  });
});

describe("normalizeUid", () => {
  it("remove separadores e põe em maiúsculas", () => {
    expect(normalizeUid("A3:F2")).toBe("A3F2");
    expect(normalizeUid("a3 f2")).toBe("A3F2");
    expect(normalizeUid("A3F2")).toBe("A3F2");
  });
});

describe("parseLockTimestamp", () => {
  it("interpreta o horário da fechadura como UTC-3", () => {
    expect(parseLockTimestamp("2026-11-10 14:32:08")?.toISOString()).toBe("2026-11-10T17:32:08.000Z");
  });

  it("vira o dia corretamente perto da meia-noite", () => {
    expect(parseLockTimestamp("2026-11-10 22:15:00")?.toISOString()).toBe("2026-11-11T01:15:00.000Z");
  });

  it("aceita ISO com fuso gravado pelo site", () => {
    expect(parseLockTimestamp("2026-11-10T17:02:11.000Z")?.toISOString()).toBe("2026-11-10T17:02:11.000Z");
  });

  it("devolve null quando o NTP falhou (1970-01-01)", () => {
    expect(parseLockTimestamp("1970-01-01 00:00:00")).toBeNull();
    expect(parseLockTimestamp("1970-01-01 00:03:12")).toBeNull();
  });

  it("devolve null para valores inválidos", () => {
    expect(parseLockTimestamp("")).toBeNull();
    expect(parseLockTimestamp(undefined)).toBeNull();
    expect(parseLockTimestamp("ontem")).toBeNull();
    expect(parseLockTimestamp("2026-02-31 10:00:00")).toBeNull();
    expect(parseLockTimestamp("2026-11-10 25:00:00")).toBeNull();
  });

  it("trata horário sem fuso, com ou sem T, como hora da fechadura", () => {
    expect(parseLockTimestamp("2026-11-10T14:32:08")?.toISOString()).toBe("2026-11-10T17:32:08.000Z");
  });
});

describe("formatLockTime / formatLockDate", () => {
  const date = new Date("2026-11-10T17:32:08.000Z");

  it("formata no fuso da fechadura", () => {
    expect(formatLockTime(date)).toBe("14:32:08");
    expect(formatLockTime(date, { seconds: false })).toBe("14:32");
    expect(formatLockDate(date)).toBe("10/11/2026");
    expect(formatLockLongDate(date)).toBe("Terça, 10 de novembro");
    // 23:30 de domingo em Sobral já é segunda em UTC
    expect(formatLockLongDate(new Date("2026-11-09T02:30:00.000Z"))).toBe("Domingo, 8 de novembro");
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-11-10T17:32:08.000Z"); // 14:32:08 em Sobral

  it("usa 'agora' para menos de um minuto e para o futuro", () => {
    expect(relativeTime(new Date(now.getTime() - 20_000), now)).toBe("agora");
    expect(relativeTime(new Date(now.getTime() + 60_000), now)).toBe("agora");
  });

  it("mostra segundos quando pedido", () => {
    expect(relativeTime(new Date(now.getTime() - 4_000), now, { seconds: true })).toBe("há 4 s");
    expect(relativeTime(new Date(now.getTime() - 500), now, { seconds: true })).toBe("agora");
    expect(relativeTime(new Date(now.getTime() - 3 * 60_000), now, { seconds: true })).toBe("há 3 min");
  });

  it("conta minutos e horas no mesmo dia", () => {
    expect(relativeTime(new Date(now.getTime() - 3 * 60_000), now)).toBe("há 3 min");
    expect(relativeTime(new Date(now.getTime() - 59 * 60_000), now)).toBe("há 59 min");
    expect(relativeTime(new Date(now.getTime() - 2 * 3_600_000), now)).toBe("há 2 h");
  });

  it("usa o dia de calendário da sala para 'ontem'", () => {
    // 23:50 do dia 9 em Sobral, 14h42 antes de now
    expect(relativeTime(new Date("2026-11-10T02:50:00.000Z"), now)).toBe("ontem");
  });

  it("conta dias até uma semana e depois mostra a data", () => {
    expect(relativeTime(new Date("2026-11-07T15:00:00.000Z"), now)).toBe("há 3 dias");
    expect(relativeTime(new Date("2026-11-01T15:00:00.000Z"), now)).toBe("01/11/2026");
  });
});

describe("lcdName", () => {
  it("remove acentos, que o LCD não mostra", () => {
    expect(lcdName("João Pedro")).toBe("Joao Pedro");
    expect(lcdName("Conceição")).toBe("Conceicao");
  });

  it("corta em 16 colunas", () => {
    expect(lcdName("Maria Clara Sousa Araújo")).toBe("Maria Clara Sous");
    expect(lcdName("Maria Clara Sousa Araújo")).toHaveLength(16);
  });

  it("colapsa espaços e descarta caracteres fora do ASCII", () => {
    expect(lcdName("  Ana   Lúcia  ")).toBe("Ana Lucia");
    expect(lcdName("Zoë 🙂")).toBe("Zoe");
  });

  it("indica quando o nome muda no LCD", () => {
    expect(lcdNameChanges("Ana Lima")).toBe(false);
    expect(lcdNameChanges("Ana Lúcia")).toBe(true);
    expect(lcdNameChanges("Maria Clara Sousa")).toBe(true);
  });
});

describe("lockDateISO e shortName", () => {
  it("dá a data de hoje no fuso da sala", () => {
    expect(lockDateISO(new Date("2026-11-11T02:00:00.000Z"))).toBe("2026-11-10");
  });

  it("encurta o nome para os dois primeiros", () => {
    expect(shortName("Maria Clara Sousa")).toBe("Maria Clara");
    expect(shortName("Prof. Gustavo Teixeira")).toBe("Gustavo Teixeira");
    expect(shortName("  Ana ")).toBe("Ana");
  });
});
