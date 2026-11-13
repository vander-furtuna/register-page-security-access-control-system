import { describe, expect, it } from "vitest";

import { batchStatus, commandsFor, followUpFor } from "./commands";

const both = { fingerId: 12, rfid: 22 };

describe("commandsFor", () => {
  it("monta os comandos de cada ação", () => {
    expect(commandsFor("remove-finger", both)).toEqual([{ type: "DELETE_FINGER", fingerId: 12 }]);
    expect(commandsFor("remove-card", both)).toEqual([{ type: "DELETE_CARD", slot: 22 }]);
    expect(commandsFor("deactivate", both)).toHaveLength(2);
    expect(commandsFor("remove", { rfid: 7 })).toEqual([{ type: "DELETE_CARD", slot: 7 }]);
    expect(commandsFor("remove-finger", { rfid: 7 })).toEqual([]);
  });
});

describe("followUpFor", () => {
  it("remove só a credencial quando há outra", () => {
    expect(followUpFor("remove-finger", "k", both, "petiano", "u")).toEqual({ "users/k/fingerId": null });
    expect(followUpFor("remove-card", "k", both, "petiano", "u")).toEqual({ "users/k/rfid": null });
  });

  it("remove o membro quando era a única credencial", () => {
    expect(followUpFor("remove-card", "k", { rfid: 7 }, undefined, "u")).toEqual({
      "users/k": null,
      "members/k": null,
    });
  });

  it("desativa mantendo a pessoa e o vínculo", () => {
    expect(followUpFor("deactivate", "k", both, "tutor", "u")).toEqual({
      "users/k/fingerId": null,
      "users/k/rfid": null,
      "members/k/role": "tutor",
      "members/k/active": false,
      "members/k/updatedBy": "u",
    });
  });
});

describe("batchStatus", () => {
  it("só fica pronto quando todos terminam, e erro vence", () => {
    expect(batchStatus(["PENDING", "DONE"])).toBe("pending");
    expect(batchStatus(["DONE", "DONE"])).toBe("done");
    expect(batchStatus(["DONE", "ERROR"])).toBe("error");
    expect(batchStatus([undefined])).toBe("pending");
    expect(batchStatus([])).toBe("pending");
  });
});
