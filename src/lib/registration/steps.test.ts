import { describe, expect, it } from "vitest";

import { currentStep, stepView, stepsFor } from "./steps";

const states = (views: { state: string }[]) => views.map((v) => v.state);

describe("stepsFor", () => {
  it("tem os passos de cada modo", () => {
    expect(stepsFor("CARD_ONLY").map((s) => s.id)).toEqual(["sent", "card", "ready"]);
    expect(stepsFor("FINGER_ONLY").map((s) => s.id)).toEqual(["sent", "finger1", "finger2", "ready"]);
    expect(stepsFor("CARD_AND_FINGER").map((s) => s.id)).toEqual(["sent", "card", "finger", "ready"]);
  });

  it("descreve o pedido com o nome e o modo", () => {
    expect(stepsFor("CARD_AND_FINGER", "Maria Clara")[0]?.description).toBe("Maria Clara · Cartão + digital");
  });
});

describe("stepView", () => {
  it("antes de enviar, tudo é prévia", () => {
    expect(states(stepView("CARD_AND_FINGER", { phase: "preview" }))).toEqual([
      "pending",
      "pending",
      "pending",
      "pending",
    ]);
  });

  it("firmware 2.0 ao vivo: só o envio está feito, o resto é instrução", () => {
    const view = stepView("CARD_AND_FINGER", { phase: "live" });
    expect(states(view)).toEqual(["done", "instruction", "instruction", "instruction"]);
    expect(currentStep(view)).toBeUndefined();
  });

  it("firmware 2.1: marca o passo ativo pelo step", () => {
    expect(states(stepView("CARD_AND_FINGER", { phase: "live", step: "WAIT_CARD" }))).toEqual([
      "done",
      "active",
      "pending",
      "pending",
    ]);
    expect(states(stepView("CARD_AND_FINGER", { phase: "live", step: "CARD_OK" }))).toEqual([
      "done",
      "done",
      "active",
      "pending",
    ]);
    expect(states(stepView("FINGER_ONLY", { phase: "live", step: "WAIT_FINGER_2" }))).toEqual([
      "done",
      "done",
      "active",
      "pending",
    ]);
    expect(currentStep(stepView("CARD_ONLY", { phase: "live", step: "WAIT_CARD" }))?.id).toBe("card");
  });

  it("firmware 2.1: erro no passo que falhou", () => {
    expect(states(stepView("CARD_AND_FINGER", { phase: "live", step: "FAILED_CARD_EXISTS" }))).toEqual([
      "done",
      "error",
      "pending",
      "pending",
    ]);
  });

  it("resultado: concluído, cartão salvo com digital falha, e falha no cartão", () => {
    expect(states(stepView("CARD_ONLY", { phase: "done" }))).toEqual(["done", "done", "done"]);
    expect(states(stepView("CARD_AND_FINGER", { phase: "partial" }))).toEqual([
      "done",
      "done",
      "error",
      "pending",
    ]);
    expect(states(stepView("CARD_AND_FINGER", { phase: "failed", at: "card" }))).toEqual([
      "done",
      "error",
      "pending",
      "pending",
    ]);
  });
});
