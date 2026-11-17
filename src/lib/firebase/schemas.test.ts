import { describe, expect, it } from "vitest";

import { deviceInventorySchema } from "./schemas";

describe("deviceInventorySchema", () => {
  it("aceita o inventário como objeto (chaves esparsas)", () => {
    const parsed = deviceInventorySchema.parse({
      updatedAt: 1,
      fingers: { "12": true, "27": true },
      cards: { "22": "A3:F2:1C:9D" },
      masterCard: true,
    });
    expect(parsed.fingers).toEqual({ "12": true, "27": true });
    expect(parsed.cards).toEqual({ "22": "A3:F2:1C:9D" });
  });

  it("aceita a lista que o RTDB devolve para chaves 1, 2, 3… (fechadura real)", () => {
    const parsed = deviceInventorySchema.parse({
      updatedAt: 1794870582746,
      cards: [null, "20:12:84:F6"],
      fingers: [null, true, true, null, true],
      masterCard: true,
    });
    expect(parsed.cards).toEqual({ "1": "20:12:84:F6" });
    expect(parsed.fingers).toEqual({ "1": true, "2": true, "4": true });
  });

  it("sem digitais nem cartões: listas vazias", () => {
    const parsed = deviceInventorySchema.parse({ updatedAt: 1 });
    expect(parsed.fingers).toEqual({});
    expect(parsed.cards).toEqual({});
  });
});
