import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MemberMeta, PendingRegistration, SystemMode, UserRecord } from "@/lib/firebase/types";

import {
  CANCEL_ERROR,
  RegistrationController,
  WRITE_ERROR,
  findRegisteredUser,
  isPartial,
  usersFingerprint,
  type FormValues,
  type RegistrationAdapter,
} from "./controller";

const T0 = Date.parse("2026-11-10T17:02:11.000Z");

/** Banco falso: as escritas ecoam nos listeners, como o SDK do Firebase faz localmente. */
function fakeDb() {
  let handlers: Parameters<RegistrationAdapter["subscribe"]>[0] | null = null;
  const state = {
    pending: null as PendingRegistration | null,
    members: {} as Record<string, MemberMeta>,
    failWrite: false,
    failClear: false,
    failMember: false,
  };
  const adapter: RegistrationAdapter = {
    subscribe(h) {
      handlers = h;
      return () => {
        handlers = null;
      };
    },
    async writePending(pending) {
      if (state.failWrite) throw new Error("offline");
      state.pending = pending;
      handlers?.pending(pending);
    },
    async clearPending() {
      if (state.failClear) throw new Error("offline");
      state.pending = null;
      handlers?.pending(null);
    },
    async writeMember(key, meta) {
      if (state.failMember) throw new Error("denied");
      state.members[key] = meta;
    },
  };
  return {
    adapter,
    state,
    // o que a fechadura (ou outra pessoa) faz no banco
    mode: (mode: SystemMode | null) => handlers?.mode(mode),
    pending: (pending: PendingRegistration | null) => {
      state.pending = pending;
      handlers?.pending(pending);
    },
    users: (users: Record<string, UserRecord>) => handlers?.users(users),
  };
}

const values: FormValues = {
  username: "Maria Clara Sousa",
  email: "mariaclara@alu.ufc.br",
  mode: "CARD_AND_FINGER",
  role: "petiano",
  validUntil: "2027-12-31",
};

const maria: UserRecord = {
  username: "Maria Clara Sousa",
  email: "mariaclara@alu.ufc.br",
  rfid: 22,
  fingerId: 12,
  createdAt: "2026-11-10 14:02:40",
};
const joao: UserRecord = { username: "João Pedro Lima", email: "joaopedro@alu.ufc.br", rfid: 7 };

async function setup({
  mode = "MASTER" as SystemMode | null,
  pending = null as PendingRegistration | null,
} = {}) {
  const db = fakeDb();
  const controller = new RegistrationController(db.adapter, {
    now: () => Date.now(),
    actor: () => "admin-uid",
  });
  const unsubscribe = controller.subscribe(() => {});
  db.mode(mode);
  db.users({ user_card_id_7: joao });
  db.pending(pending);
  return { db, controller, unsubscribe };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});
afterEach(() => vi.useRealTimers());

describe("funções puras", () => {
  it("acha o users/* novo pelo e-mail do pedido, ignorando o que já existia", () => {
    const before = usersFingerprint({ user_card_id_7: joao });
    expect(findRegisteredUser({ user_card_id_7: joao }, before, "joaopedro@alu.ufc.br")).toBeNull();
    expect(
      findRegisteredUser(
        { user_card_id_7: joao, user_card_22_finger_12: maria },
        before,
        " MariaClara@alu.ufc.br ",
      ),
    ).toEqual({ key: "user_card_22_finger_12", user: maria });
  });

  it("considera alterado um users/* existente que ganhou credencial", () => {
    const before = usersFingerprint({ user_card_id_7: joao });
    const updated = { ...joao, fingerId: 3 };
    expect(findRegisteredUser({ user_card_id_7: updated }, before, joao.email)?.key).toBe("user_card_id_7");
  });

  it("detecta cartão salvo e digital falhou só no modo cartão + digital", () => {
    expect(isPartial("CARD_AND_FINGER", { ...maria, fingerId: undefined })).toBe(true);
    expect(isPartial("CARD_AND_FINGER", maria)).toBe(false);
    expect(isPartial("CARD_ONLY", { ...maria, fingerId: undefined })).toBe(false);
  });
});

describe("RegistrationController", () => {
  it("não envia sem Modo mestre", async () => {
    const { controller, db } = await setup({ mode: "STANDBY" });
    expect(await controller.start(values)).toBe(false);
    expect(db.state.pending).toBeNull();
  });

  it("envia o pedido com o espelho e conclui quando a fechadura cria o users/*", async () => {
    const { controller, db } = await setup();
    const legacy = vi.spyOn(db.adapter, "writePending");
    expect(await controller.start(values)).toBe(true);
    expect(legacy).toHaveBeenCalledWith(
      {
        username: "Maria Clara Sousa",
        email: "mariaclara@alu.ufc.br",
        mode: "CARD_AND_FINGER",
        timestamp: "2026-11-10T17:02:11.000Z",
      },
      {
        username: "Maria Clara Sousa",
        email: "mariaclara@alu.ufc.br",
        timestamp: "2026-11-10T17:02:11.000Z",
      },
    );
    expect(controller.getSnapshot().phase).toBe("live");

    // firmware: grava users/* e apaga o pedido
    db.users({ user_card_id_7: joao, user_card_22_finger_12: maria });
    db.pending(null);
    await vi.runAllTimersAsync();

    const s = controller.getSnapshot();
    expect(s.outcome).toBe("done");
    expect(s.userKey).toBe("user_card_22_finger_12");
    expect(s.member).toBe("saved");
    expect(db.state.members["user_card_22_finger_12"]).toEqual({
      role: "petiano",
      active: true,
      validUntil: "2027-12-31",
      updatedBy: "admin-uid",
    });
  });

  it("espera o users/* que chega logo depois de o pedido sumir", async () => {
    const { controller, db } = await setup();
    await controller.start(values);
    db.pending(null);
    expect(controller.getSnapshot().phase).toBe("confirming");
    await vi.advanceTimersByTimeAsync(3_000);
    db.users({ user_card_id_7: joao, user_card_22_finger_12: maria });
    await vi.runAllTimersAsync();
    expect(controller.getSnapshot().outcome).toBe("done");
  });

  it("trata como cancelado na porta quando o pedido some e nenhum users/* aparece", async () => {
    const { controller, db } = await setup();
    await controller.start(values);
    db.pending(null);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(controller.getSnapshot().outcome).toBe("cancelled-door");
    expect(db.state.members).toEqual({});
  });

  it("marca cartão salvo, digital falhou", async () => {
    const { controller, db } = await setup();
    await controller.start(values);
    db.users({ user_card_id_7: joao, user_card_id_22: { ...maria, fingerId: undefined } });
    db.pending(null);
    await vi.runAllTimersAsync();
    expect(controller.getSnapshot().outcome).toBe("partial");
    expect(controller.getSnapshot().userKey).toBe("user_card_id_22");
  });

  it("cancela pelo site", async () => {
    const { controller, db } = await setup();
    await controller.start(values);
    await controller.cancel();
    expect(db.state.pending).toBeNull();
    expect(controller.getSnapshot().outcome).toBe("cancelled-site");
  });

  it("apaga o pedido depois de 120 s", async () => {
    const { controller, db } = await setup();
    await controller.start(values);
    await vi.advanceTimersByTimeAsync(119_000);
    expect(db.state.pending).not.toBeNull();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(db.state.pending).toBeNull();
    expect(controller.getSnapshot().outcome).toBe("timeout");
  });

  it("cancela se a fechadura sai do Modo mestre no meio", async () => {
    const { controller, db } = await setup();
    await controller.start(values);
    db.mode("STANDBY");
    await vi.runAllTimersAsync();
    expect(db.state.pending).toBeNull();
    expect(controller.getSnapshot().outcome).toBe("mode-left");
  });

  it("retoma um pedido em andamento e respeita o prazo dele", async () => {
    const started: PendingRegistration = {
      username: "Ana Beatriz Rocha",
      email: "anabeatriz@alu.ufc.br",
      mode: "FINGER_ONLY",
      timestamp: new Date(T0 - 100_000).toISOString(),
    };
    const { controller, db } = await setup({ pending: started });
    expect(controller.getSnapshot().phase).toBe("live");
    expect(controller.getSnapshot().request?.username).toBe("Ana Beatriz Rocha");
    await vi.advanceTimersByTimeAsync(20_000);
    expect(db.state.pending).toBeNull();
    expect(controller.getSnapshot().outcome).toBe("timeout");
  });

  it("limpa um pedido esquecido com a porta fora do Modo mestre", async () => {
    const stale: PendingRegistration = { ...values, timestamp: new Date(T0).toISOString() };
    const { controller, db } = await setup({ mode: "STANDBY", pending: stale });
    await vi.runAllTimersAsync();
    expect(db.state.pending).toBeNull();
    expect(controller.getSnapshot().outcome).toBe("mode-left");
  });

  it("firmware 2.1: segue o step e usa result.userKey", async () => {
    const { controller, db } = await setup();
    await controller.start(values);
    const pending = db.state.pending!;
    db.pending({ ...pending, step: "WAIT_FINGER_1" });
    expect(controller.getSnapshot().step).toBe("WAIT_FINGER_1");
    db.pending({ ...pending, step: "DONE", result: { userKey: "user_card_22_finger_12" } });
    db.pending(null);
    expect(controller.getSnapshot().phase).toBe("confirming");
    db.users({ user_card_id_7: joao, user_card_22_finger_12: maria });
    await vi.runAllTimersAsync();
    expect(controller.getSnapshot().outcome).toBe("done");
  });

  it("firmware 2.1: cartão já cadastrado encerra e libera o pedido", async () => {
    const { controller, db } = await setup();
    await controller.start(values);
    db.pending({ ...db.state.pending!, step: "FAILED_CARD_EXISTS" });
    await vi.runAllTimersAsync();
    expect(controller.getSnapshot().outcome).toBe("card-exists");
    expect(db.state.pending).toBeNull();
  });

  it("mostra erro se não conseguir enviar ou cancelar", async () => {
    const { controller, db } = await setup();
    db.state.failWrite = true;
    expect(await controller.start(values)).toBe(false);
    expect(controller.getSnapshot()).toMatchObject({ phase: "idle", error: WRITE_ERROR });

    db.state.failWrite = false;
    await controller.start(values);
    db.state.failClear = true;
    await controller.cancel();
    expect(controller.getSnapshot()).toMatchObject({ phase: "live", error: CANCEL_ERROR });
  });

  it("conclui mesmo se gravar members/* falhar, e avisa", async () => {
    const { controller, db } = await setup();
    db.state.failMember = true;
    await controller.start(values);
    db.users({ user_card_id_7: joao, user_card_22_finger_12: maria });
    db.pending(null);
    await vi.runAllTimersAsync();
    expect(controller.getSnapshot()).toMatchObject({ outcome: "done", member: "failed" });
  });

  it("reset volta ao formulário e retoma um pedido que exista", async () => {
    const { controller, db } = await setup();
    await controller.start(values);
    await controller.cancel();
    controller.reset();
    expect(controller.getSnapshot().phase).toBe("idle");
    db.pending({ ...values, timestamp: new Date(T0).toISOString() });
    expect(controller.getSnapshot().phase).toBe("live");
  });
});
