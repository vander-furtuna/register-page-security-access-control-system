import type {
  MemberMeta,
  MemberRole,
  PendingRegistration,
  RegistrationMode,
  RegistrationStep,
  SystemMode,
  UserRecord,
} from "@/lib/firebase/types";

/**
 * Máquina de estados do cadastro guiado pela fechadura (`docs/arquitetura/dados-firebase.md`
 * › Fluxo de cadastro). Sem React e sem Firebase: o banco chega por um `RegistrationAdapter`,
 * o que deixa os casos difíceis testáveis (concluído × cancelado na porta, tempo esgotado,
 * Modo mestre caindo no meio).
 *
 * Regra de ouro: só mostramos "concluído" quando a fechadura confirma no banco (um `users/*`
 * novo com o e-mail do pedido, ou `result.userKey` no firmware 2.1).
 */

export type RegistrationRequest = {
  username: string;
  email: string;
  mode: RegistrationMode;
  timestamp: string;
  role: MemberRole;
  validUntil?: string;
};

export type RegistrationOutcome =
  | "done"
  /** Modo cartão + digital em que só o cartão foi salvo. */
  | "partial"
  | "cancelled-door"
  | "cancelled-site"
  | "timeout"
  | "mode-left"
  | "card-exists";

export type Phase = "idle" | "sending" | "live" | "confirming" | "result";

export type RegistrationSnapshot = {
  /** `system/mode` e o pedido já foram lidos pelo menos uma vez. */
  ready: boolean;
  mode: SystemMode | undefined;
  /** `undefined` = carregando; `null` = não há pedido. */
  pending: PendingRegistration | null | undefined;
  phase: Phase;
  request?: RegistrationRequest;
  /** Quando o site cancela o pedido por tempo (ms). */
  deadline?: number;
  /** Passo publicado pelo firmware 2.1. */
  step?: RegistrationStep;
  outcome?: RegistrationOutcome;
  userKey?: string;
  user?: UserRecord;
  member?: "saving" | "saved" | "failed";
  /** Erro ao gravar no banco (enviar ou cancelar). */
  error?: string;
  /** Falha de leitura (sem permissão, rede). */
  readError?: Error;
};

export type FormValues = {
  username: string;
  email: string;
  mode: RegistrationMode;
  role: MemberRole;
  validUntil?: string;
};

export interface RegistrationAdapter {
  subscribe(handlers: {
    mode: (mode: SystemMode | null) => void;
    pending: (pending: PendingRegistration | null) => void;
    users: (users: Record<string, UserRecord>) => void;
    error: (error: Error) => void;
  }): () => void;
  writePending(
    pending: PendingRegistration,
    legacy: { username: string; email: string; timestamp: string },
  ): Promise<void>;
  clearPending(): Promise<void>;
  writeMember(key: string, meta: MemberMeta): Promise<void>;
}

/** Vínculo e validade não vão para a fechadura: guardamos até o cadastro terminar. */
export interface MetaStorage {
  save(timestamp: string, meta: { role: MemberRole; validUntil?: string }): void;
  load(timestamp: string): { role: MemberRole; validUntil?: string } | undefined;
}

export type ControllerOptions = {
  now?: () => number;
  /** uid de quem cadastra (`members/*.updatedBy`). */
  actor?: () => string | undefined;
  storage?: MetaStorage;
  /** Prazo para concluir na porta (padrão 120 s, como na v1). */
  timeoutMs?: number;
  /** Quanto esperar pelo `users/*` depois que o pedido some (padrão 10 s). */
  confirmWindowMs?: number;
};

export const REGISTRATION_TIMEOUT_MS = 120_000;
export const CONFIRM_WINDOW_MS = 10_000;

export const WRITE_ERROR =
  "Não foi possível enviar o pedido à fechadura. Confira a internet e tente de novo.";
export const CANCEL_ERROR =
  "Não foi possível cancelar o pedido. Tente de novo; se continuar, aproxime o cartão mestre da porta.";

// ---------------------------------------------------------------------------
// Funções puras

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const fingerprint = (user: UserRecord) =>
  JSON.stringify([user.username, user.email, user.rfid, user.fingerId, user.createdAt]);

export function usersFingerprint(users: Record<string, UserRecord>): Record<string, string> {
  return Object.fromEntries(Object.entries(users).map(([key, user]) => [key, fingerprint(user)]));
}

/** `users/*` com o e-mail do pedido que não existia (ou mudou) desde que o pedido foi feito. */
export function findRegisteredUser(
  users: Record<string, UserRecord>,
  before: Record<string, string>,
  email: string,
): { key: string; user: UserRecord } | null {
  const target = normalizeEmail(email);
  const matches = Object.entries(users).filter(
    ([key, user]) => normalizeEmail(user.email) === target && before[key] !== fingerprint(user),
  );
  if (matches.length === 0) return null;
  matches.sort(([, a], [, b]) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  const [key, user] = matches[0]!;
  return { key, user };
}

/** Cartão + digital em que o firmware salvou só o cartão (a digital falhou). */
export function isPartial(mode: RegistrationMode, user: UserRecord): boolean {
  return mode === "CARD_AND_FINGER" && user.rfid !== undefined && user.fingerId === undefined;
}

export function buildPending(values: FormValues, timestamp: string) {
  const pending: PendingRegistration = {
    username: values.username.trim(),
    email: values.email.trim(),
    mode: values.mode,
    timestamp,
  };
  // espelho legado `pendingUser/current`, que o firmware ainda lê como fallback (sem `mode`)
  const legacy = { username: pending.username, email: pending.email, timestamp };
  return { pending, legacy };
}

// ---------------------------------------------------------------------------

type CancelReason = "cancelled-site" | "timeout" | "mode-left";

export class RegistrationController {
  private snapshot: RegistrationSnapshot = {
    ready: false,
    mode: undefined,
    pending: undefined,
    phase: "idle",
  };
  private listeners = new Set<() => void>();
  private detach: (() => void) | null = null;
  private users: Record<string, UserRecord> | undefined;
  private usersBefore: Record<string, string> = {};
  private modeLoaded = false;
  private reason: CancelReason | null = null;
  private expectedKey: string | undefined;
  private deadlineTimer: ReturnType<typeof setTimeout> | undefined;
  private confirmTimer: ReturnType<typeof setTimeout> | undefined;

  private actorUid: string | undefined;
  private readonly now: () => number;
  private readonly timeoutMs: number;
  private readonly confirmWindowMs: number;

  constructor(
    private readonly adapter: RegistrationAdapter,
    private readonly options: ControllerOptions = {},
  ) {
    this.now = options.now ?? Date.now;
    this.timeoutMs = options.timeoutMs ?? REGISTRATION_TIMEOUT_MS;
    this.confirmWindowMs = options.confirmWindowMs ?? CONFIRM_WINDOW_MS;
  }

  // --- store para useSyncExternalStore ------------------------------------

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    if (!this.detach) {
      this.detach = this.adapter.subscribe({
        mode: (mode) => this.onMode(mode),
        pending: (pending) => this.onPending(pending),
        users: (users) => this.onUsers(users),
        error: (error) => this.set({ readError: error }),
      });
    }
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.stop();
    };
  };

  getSnapshot = (): RegistrationSnapshot => this.snapshot;

  /** Quem está cadastrando (vai para `members/*.updatedBy`). */
  setActor(uid: string | undefined) {
    this.actorUid = uid;
  }

  private actor(): string | undefined {
    return this.actorUid ?? this.options.actor?.();
  }

  private stop() {
    this.detach?.();
    this.detach = null;
    clearTimeout(this.deadlineTimer);
    clearTimeout(this.confirmTimer);
  }

  private set(patch: Partial<RegistrationSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  // --- ações ----------------------------------------------------------------

  /** Envia o pedido. Só com a fechadura em Modo mestre e sem outro pedido em andamento. */
  async start(values: FormValues): Promise<boolean> {
    const s = this.snapshot;
    if (s.mode !== "MASTER" || s.pending || (s.phase !== "idle" && s.phase !== "result")) return false;

    const timestamp = new Date(this.now()).toISOString();
    const request: RegistrationRequest = {
      ...values,
      username: values.username.trim(),
      email: values.email.trim(),
      timestamp,
    };
    this.usersBefore = usersFingerprint(this.users ?? {});
    this.reason = null;
    this.expectedKey = undefined;
    this.options.storage?.save(timestamp, { role: values.role, validUntil: values.validUntil });
    this.set({
      phase: "sending",
      request,
      deadline: Date.parse(timestamp) + this.timeoutMs,
      step: undefined,
      outcome: undefined,
      userKey: undefined,
      user: undefined,
      member: undefined,
      error: undefined,
    });

    const { pending, legacy } = buildPending(values, timestamp);
    try {
      await this.adapter.writePending(pending, legacy);
      return true;
    } catch {
      this.set({ phase: "idle", request: undefined, deadline: undefined, error: WRITE_ERROR });
      return false;
    }
  }

  /** Cancela pelo site (apaga o pedido e o espelho). */
  async cancel(): Promise<void> {
    if (this.snapshot.phase !== "live" && this.snapshot.phase !== "sending") return;
    await this.clear("cancelled-site");
  }

  /** Volta ao formulário. Se houver um pedido no banco (de outra aba ou pessoa), retoma-o. */
  reset() {
    clearTimeout(this.confirmTimer);
    this.reason = null;
    this.expectedKey = undefined;
    this.set({
      phase: "idle",
      request: undefined,
      deadline: undefined,
      step: undefined,
      outcome: undefined,
      userKey: undefined,
      user: undefined,
      member: undefined,
      error: undefined,
    });
    if (this.snapshot.pending) this.resume(this.snapshot.pending);
  }

  // --- eventos do banco -------------------------------------------------------

  private onMode(mode: SystemMode | null) {
    this.modeLoaded = true;
    this.set({ mode: mode ?? undefined, ready: this.snapshot.pending !== undefined });
    const { phase, pending } = this.snapshot;
    // Saiu do Modo mestre com o pedido ainda no banco: a porta não vai mais processá-lo.
    if ((phase === "live" || phase === "sending") && pending && mode !== "MASTER")
      void this.clear("mode-left");
  }

  private onPending(pending: PendingRegistration | null) {
    this.set({ pending, ready: this.modeLoaded });
    const { phase, request } = this.snapshot;

    if (pending) {
      if (phase === "idle") return this.resume(pending);
      if (phase === "sending" && request && pending.timestamp === request.timestamp) {
        this.set({ phase: "live" });
        this.scheduleDeadline();
      }
      if (phase === "live" || this.snapshot.phase === "live") this.onStep(pending);
      return;
    }

    // O pedido sumiu.
    if (phase !== "live" && phase !== "sending") return;
    if (this.reason) return this.finish(this.reason);
    // Firmware apagou: concluiu ou foi cancelado na porta. Só o users/* decide.
    this.set({ phase: "confirming" });
    clearTimeout(this.deadlineTimer);
    if (this.check()) return;
    this.confirmTimer = setTimeout(() => {
      if (this.snapshot.phase === "confirming") this.finish("cancelled-door");
    }, this.confirmWindowMs);
  }

  private onStep(pending: PendingRegistration) {
    if (pending.step !== this.snapshot.step) this.set({ step: pending.step });
    if (pending.result?.userKey) this.expectedKey = pending.result.userKey;
    if (pending.step === "CANCELLED") {
      this.reason = null;
      this.finish("cancelled-door");
    } else if (pending.step === "FAILED_CARD_EXISTS") {
      this.finish("card-exists");
      // a porta recusou o cartão: liberamos o pedido para não ficar preso até o prazo
      void this.adapter.clearPending().catch(() => undefined);
    }
  }

  private onUsers(users: Record<string, UserRecord>) {
    this.users = users;
    if (this.snapshot.phase === "confirming") this.check();
  }

  // --- internos ---------------------------------------------------------------

  private resume(pending: PendingRegistration) {
    const meta = this.options.storage?.load(pending.timestamp);
    this.usersBefore = usersFingerprint(this.users ?? {});
    this.reason = null;
    this.set({
      phase: "live",
      request: {
        username: pending.username,
        email: pending.email,
        mode: pending.mode,
        timestamp: pending.timestamp,
        role: meta?.role ?? "petiano",
        validUntil: meta?.validUntil,
      },
      deadline: Date.parse(pending.timestamp) + this.timeoutMs,
      step: pending.step,
      outcome: undefined,
    });
    this.scheduleDeadline();
    this.onStep(pending);
    // pedido esquecido com a porta fora do Modo mestre: ela não vai processá-lo
    if (this.modeLoaded && this.snapshot.mode !== "MASTER" && this.snapshot.phase === "live") {
      void this.clear("mode-left");
    }
  }

  private scheduleDeadline() {
    clearTimeout(this.deadlineTimer);
    const deadline = this.snapshot.deadline;
    if (deadline === undefined || Number.isNaN(deadline)) return;
    this.deadlineTimer = setTimeout(
      () => {
        if (this.snapshot.phase === "live" && this.snapshot.pending) void this.clear("timeout");
      },
      Math.max(0, deadline - this.now()),
    );
  }

  private async clear(reason: CancelReason) {
    this.reason = reason;
    try {
      await this.adapter.clearPending();
    } catch {
      this.reason = null;
      this.set({ error: CANCEL_ERROR });
    }
  }

  private check(): boolean {
    const request = this.snapshot.request;
    if (!request || !this.users) return false;
    const match = this.expectedKey
      ? this.users[this.expectedKey]
        ? { key: this.expectedKey, user: this.users[this.expectedKey]! }
        : null
      : findRegisteredUser(this.users, this.usersBefore, request.email);
    if (!match) return false;
    void this.resolve(match.key, match.user, request);
    return true;
  }

  private async resolve(key: string, user: UserRecord, request: RegistrationRequest) {
    clearTimeout(this.confirmTimer);
    clearTimeout(this.deadlineTimer);
    this.set({
      phase: "result",
      outcome: isPartial(request.mode, user) ? "partial" : "done",
      userKey: key,
      user,
      member: "saving",
    });
    const meta: MemberMeta = {
      role: request.role,
      active: true,
      ...(request.validUntil ? { validUntil: request.validUntil } : {}),
      ...(this.actor() ? { updatedBy: this.actor()! } : {}),
    };
    try {
      await this.adapter.writeMember(key, meta);
      this.set({ member: "saved" });
    } catch {
      this.set({ member: "failed" });
    }
  }

  private finish(outcome: RegistrationOutcome) {
    clearTimeout(this.deadlineTimer);
    clearTimeout(this.confirmTimer);
    this.reason = null;
    this.set({ phase: "result", outcome });
  }
}
