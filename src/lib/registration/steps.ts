import type { RegistrationMode, RegistrationStep } from "@/lib/firebase/types";

/**
 * Passos do cadastro por modo (`componentes.md` › RegistrationStepper):
 * - CARD_ONLY: enviar → cartão → pronto
 * - FINGER_ONLY: enviar → 1ª leitura → 2ª leitura → pronto
 * - CARD_AND_FINGER: enviar → cartão → digital → pronto
 * Os textos descrevem o gesto físico na porta.
 */
export type StepId = "sent" | "card" | "finger" | "finger1" | "finger2" | "ready";
export type StepKind = "sent" | "card" | "finger" | "ready";
export type StepDef = { id: StepId; kind: StepKind; title: string; description: string };
export type StepState = "pending" | "active" | "done" | "error" | "instruction";
export type StepView = StepDef & { state: StepState };

export const MODE_LABEL: Record<RegistrationMode, string> = {
  CARD_AND_FINGER: "Cartão + digital",
  CARD_ONLY: "Só cartão",
  FINGER_ONLY: "Só digital",
};

const CARD: StepDef = {
  id: "card",
  kind: "card",
  title: "Aproxime o cartão do leitor",
  description: "Encoste a carteirinha ou a tag no leitor RFID e espere o bipe.",
};
const FINGER: StepDef = {
  id: "finger",
  kind: "finger",
  title: "Encoste o dedo no sensor",
  description: "Segure até o bipe, retire e encoste o mesmo dedo de novo.",
};
const READY: StepDef = {
  id: "ready",
  kind: "ready",
  title: "Pronto para usar",
  description: "A pessoa já pode abrir a porta.",
};

export function stepsFor(mode: RegistrationMode, who?: string): StepDef[] {
  const sent: StepDef = {
    id: "sent",
    kind: "sent",
    title: "Pedido enviado à fechadura",
    description: who ? `${who} · ${MODE_LABEL[mode]}` : MODE_LABEL[mode],
  };
  if (mode === "CARD_ONLY") return [sent, CARD, READY];
  if (mode === "FINGER_ONLY") {
    return [
      sent,
      {
        id: "finger1",
        kind: "finger",
        title: "Encoste o dedo no sensor",
        description: "Segure até o bipe e retire o dedo.",
      },
      {
        id: "finger2",
        kind: "finger",
        title: "Encoste o mesmo dedo de novo",
        description: "Segunda leitura, para conferir a digital.",
      },
      READY,
    ];
  }
  return [sent, CARD, FINGER, READY];
}

/** Índice do passo em que a fechadura está, segundo o `step` do firmware 2.1. */
function activeIndexFor(mode: RegistrationMode, step: RegistrationStep): number {
  const ids = stepsFor(mode).map((s) => s.id);
  const at = (id: StepId) => ids.indexOf(id);
  switch (step) {
    case "WAIT_CARD":
    case "FAILED_CARD_EXISTS":
      return at("card");
    case "CARD_OK":
      return mode === "CARD_ONLY" ? at("ready") : at("finger");
    case "WAIT_FINGER_1":
      return mode === "FINGER_ONLY" ? at("finger1") : at("finger");
    case "WAIT_FINGER_2":
      return mode === "FINGER_ONLY" ? at("finger2") : at("finger");
    case "FAILED_FINGER":
      return mode === "FINGER_ONLY" ? at("finger1") : at("finger");
    case "DONE":
      return ids.length;
    case "CANCELLED":
      return -1;
  }
}

export type StepperInput =
  | { phase: "preview" }
  /** `step` ausente = firmware 2.0: só sabemos que o pedido foi enviado. */
  | { phase: "live"; step?: RegistrationStep }
  | { phase: "done" }
  /** Cartão salvo, digital falhou. */
  | { phase: "partial" }
  | { phase: "failed"; at: "card" | "finger" };

/**
 * Estado de cada passo. Firmware 2.0 ao vivo: o 1º passo está feito e os demais viram
 * instruções (nunca marcamos como feito o que a porta não confirmou).
 */
export function stepView(mode: RegistrationMode, input: StepperInput, who?: string): StepView[] {
  const defs = stepsFor(mode, who);
  if (input.phase === "preview") return defs.map((d) => ({ ...d, state: "pending" }));
  if (input.phase === "done") return defs.map((d) => ({ ...d, state: "done" }));
  if (input.phase === "partial") {
    return defs.map((d) => ({
      ...d,
      state: d.kind === "finger" ? "error" : d.id === "ready" ? "pending" : "done",
    }));
  }
  if (input.phase === "failed") {
    const failIndex = defs.findIndex((d) => d.kind === input.at);
    return defs.map((d, i) => ({
      ...d,
      state: i < failIndex ? "done" : i === failIndex ? "error" : "pending",
    }));
  }
  if (!input.step) {
    return defs.map((d, i) => ({ ...d, state: i === 0 ? "done" : "instruction" }));
  }
  const active = activeIndexFor(mode, input.step);
  const failed = input.step === "FAILED_CARD_EXISTS" || input.step === "FAILED_FINGER";
  return defs.map((d, i) => ({
    ...d,
    state: i < active || i === 0 ? "done" : i === active ? (failed ? "error" : "active") : "pending",
  }));
}

/** O passo em destaque (instrução grande no celular): o ativo ou o primeiro com erro. */
export function currentStep(steps: StepView[]): StepView | undefined {
  return steps.find((s) => s.state === "active" || s.state === "error");
}
