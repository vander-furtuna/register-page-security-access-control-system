"use client";

import {
  CircleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  TimerOffIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { FingerIcon, LockDeviceIcon, RfidIcon } from "@/components/brand/icons";
import { CredentialChip } from "@/components/pet/credential-chip";
import { LockStatusCard } from "@/components/pet/lock-status-card";
import { RegistrationStepper } from "@/components/pet/registration-stepper";
import { Alert, AlertContent, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import type { LockSnapshot } from "@/lib/firebase/hooks";
import type { RegistrationMode } from "@/lib/firebase/types";
import { shortName } from "@/lib/format";
import type { RegistrationOutcome, RegistrationSnapshot } from "@/lib/registration/controller";
import { currentStep, stepView, type StepperInput, type StepView } from "@/lib/registration/steps";
import { cn } from "@/lib/utils";

type RegistrationPanelProps = {
  lock: LockSnapshot;
  registration: RegistrationSnapshot;
  /** Valores do formulário (prévia antes de enviar). */
  formMode: RegistrationMode;
  formName: string;
  onCancel: () => void;
  onRetry: () => void;
  onNew: () => void;
  className?: string;
};

const TITLES: Record<RegistrationOutcome, string> = {
  done: "Concluído",
  partial: "Cartão salvo, digital falhou",
  "cancelled-door": "Cancelado na porta",
  "cancelled-site": "Cadastro cancelado",
  timeout: "Tempo esgotado",
  "mode-left": "A fechadura saiu do Modo mestre",
  "card-exists": "Cartão já cadastrado",
};

function stepperInput(r: RegistrationSnapshot): StepperInput {
  if (r.phase === "idle") return { phase: "preview" };
  if (r.phase !== "result") return { phase: "live", step: r.step };
  if (r.outcome === "done") return { phase: "done" };
  if (r.outcome === "partial") return { phase: "partial" };
  if (r.outcome === "card-exists") return { phase: "failed", at: "card" };
  return { phase: "live", step: r.step };
}

function formatClock(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function RegistrationPanel({
  lock,
  registration: r,
  formMode,
  formName,
  onCancel,
  onRetry,
  onNew,
  className,
}: RegistrationPanelProps) {
  const request = r.phase === "idle" ? undefined : r.request;
  const mode = request?.mode ?? formMode;
  const who = shortName(request?.username ?? formName) || undefined;
  const steps = stepView(mode, stepperInput(r), who);
  const live = r.phase === "sending" || r.phase === "live" || r.phase === "confirming";
  const remaining = r.deadline ? Math.max(0, Math.ceil((r.deadline - lock.now) / 1000)) : 0;
  const reportsSteps = Boolean(r.step) || Boolean(lock.status?.capabilities.includes("registrationStep"));

  const title =
    r.phase === "idle"
      ? "O que vai acontecer na porta"
      : r.phase === "result" && r.outcome
        ? TITLES[r.outcome]
        : "Acompanhe na porta";

  return (
    <LockStatusCard
      snapshot={lock}
      subtitle={live && who ? `Cadastrando ${who}` : undefined}
      className={className}
    >
      <div className="flex flex-col gap-5 border-t border-line px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-h3 text-ink">{title}</h2>
          {live && r.phase !== "confirming" ? (
            <Badge
              variant={remaining > 30 ? "online" : "pending"}
              live={remaining > 30}
              dot={remaining <= 30}
              aria-label={`${remaining} segundos restantes para concluir na porta`}
            >
              <span className="font-mono">{formatClock(remaining)}</span> restantes
            </Badge>
          ) : null}
        </div>

        {live ? <ActiveInstruction step={currentStep(steps)} reportsSteps={reportsSteps} /> : null}

        <RegistrationStepper steps={steps} />

        <div className="flex flex-col gap-3" aria-live="polite">
          {r.phase === "confirming" ? (
            <p role="status" className="flex items-center gap-2 text-label text-ink-muted">
              <Loader2Icon aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
              Conferindo na fechadura…
            </p>
          ) : null}

          {live && !reportsSteps ? (
            <Note>Esta versão do firmware não informa o passo atual: acompanhe pelo display da porta.</Note>
          ) : null}
          {live && mode === "CARD_AND_FINGER" ? (
            <Note>
              Se a digital falhar 3 vezes, o cartão fica salvo e você pode tentar a digital depois pela página
              do membro.
            </Note>
          ) : null}

          {r.error ? (
            <Alert variant="danger">
              <CircleAlertIcon aria-hidden="true" />
              <AlertContent>
                <AlertDescription className="mt-0 text-danger-ink">{r.error}</AlertDescription>
              </AlertContent>
            </Alert>
          ) : null}

          {r.phase === "result" && r.outcome ? <Outcome r={r} who={who} /> : null}
        </div>

        {live ? (
          <Button
            variant="destructive-soft"
            size="lg"
            className="w-full"
            onClick={onCancel}
            disabled={r.phase !== "live"}
          >
            <XIcon aria-hidden="true" />
            Cancelar cadastro
          </Button>
        ) : null}

        {r.phase === "result" ? (
          r.outcome === "done" || r.outcome === "partial" ? (
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <Link href={`/membros/${r.userKey}`} className={buttonVariants({ variant: "secondary" })}>
                Ver membro
              </Link>
              <Button onClick={onNew}>Cadastrar outra pessoa</Button>
            </div>
          ) : (
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <Button variant="ghost" onClick={onNew}>
                Limpar formulário
              </Button>
              <Button onClick={onRetry}>Tentar de novo</Button>
            </div>
          )
        ) : null}
      </div>
    </LockStatusCard>
  );
}

/** Instrução do passo em destaque (tela 09): o celular é o caso principal, com o admin na porta. */
function ActiveInstruction({ step, reportsSteps }: { step: StepView | undefined; reportsSteps: boolean }) {
  const kind = step?.kind;
  const icon =
    kind === "finger" ? (
      <FingerIcon size={48} />
    ) : kind === "card" ? (
      <RfidIcon size={48} />
    ) : (
      <LockDeviceIcon size={48} />
    );
  return (
    <div className="flex flex-col items-center gap-3 py-2 text-center lg:hidden">
      <span
        aria-hidden="true"
        className={cn(
          "grid size-[88px] place-items-center rounded-lg",
          kind === "finger"
            ? "bg-finger-soft text-finger-ink"
            : kind === "card"
              ? "bg-rfid-soft text-rfid-ink"
              : "bg-surface-sunken text-ink-muted",
        )}
      >
        {icon}
      </span>
      <p className="font-display text-[20px] leading-7 font-semibold text-ink">
        {step
          ? step.title
          : reportsSteps
            ? "Aguardando a fechadura"
            : "Siga as instruções do display da porta"}
      </p>
      {step ? <p className="text-body-lg text-ink-muted">{step.description}</p> : null}
    </div>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <Alert variant="info">
      <InfoIcon aria-hidden="true" />
      <AlertContent>
        <AlertDescription className="mt-0">{children}</AlertDescription>
      </AlertContent>
    </Alert>
  );
}

function Outcome({ r, who }: { r: RegistrationSnapshot; who: string | undefined }) {
  const name = who ?? "A pessoa";
  const chips =
    r.user && (r.outcome === "done" || r.outcome === "partial") ? (
      <span className="mt-2 flex flex-wrap gap-2">
        {r.user.rfid !== undefined ? <CredentialChip kind="rfid" id={r.user.rfid} /> : null}
        {r.user.fingerId !== undefined ? <CredentialChip kind="finger" id={r.user.fingerId} /> : null}
      </span>
    ) : null;
  const member =
    r.member === "saving" ? (
      <p role="status" className="flex items-center gap-2 text-label text-ink-muted">
        <Loader2Icon aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
        Salvando vínculo e validade…
      </p>
    ) : r.member === "failed" ? (
      <Alert variant="offline">
        <TriangleAlertIcon aria-hidden="true" />
        <AlertContent>
          <AlertTitle>Vínculo e validade não foram salvos</AlertTitle>
          <AlertDescription>
            O membro já abre a porta. Edite o vínculo pela página do membro.
          </AlertDescription>
        </AlertContent>
      </Alert>
    ) : null;

  switch (r.outcome) {
    case "done": {
      const credential =
        r.user?.rfid !== undefined && r.user?.fingerId !== undefined
          ? "com cartão e digital"
          : r.user?.rfid !== undefined
            ? "com o cartão"
            : "com a digital";
      return (
        <>
          <Alert variant="success" role="status">
            <CircleCheckIcon aria-hidden="true" />
            <AlertContent>
              <AlertTitle>Cadastro concluído</AlertTitle>
              <AlertDescription>
                {name} já pode abrir a porta {credential}.{chips}
              </AlertDescription>
            </AlertContent>
          </Alert>
          {member}
        </>
      );
    }
    case "partial":
      return (
        <>
          <Alert variant="offline" role="status">
            <TriangleAlertIcon aria-hidden="true" />
            <AlertContent>
              <AlertTitle>Cartão salvo, digital falhou</AlertTitle>
              <AlertDescription>
                {name} já abre a porta com o cartão. Tente a digital de novo pela página do membro.{chips}
              </AlertDescription>
            </AlertContent>
          </Alert>
          {member}
        </>
      );
    case "cancelled-door":
      return (
        <Alert variant="info" role="status">
          <InfoIcon aria-hidden="true" />
          <AlertContent>
            <AlertTitle className="text-ink">A fechadura cancelou o cadastro</AlertTitle>
            <AlertDescription>
              O pedido saiu da porta sem criar o membro: o cartão mestre foi aproximado no meio do cadastro ou
              a leitura não terminou.
            </AlertDescription>
          </AlertContent>
        </Alert>
      );
    case "cancelled-site":
      return (
        <Alert variant="info" role="status">
          <InfoIcon aria-hidden="true" />
          <AlertContent>
            <AlertTitle className="text-ink">Cadastro cancelado</AlertTitle>
            <AlertDescription>O pedido foi retirado da fechadura.</AlertDescription>
          </AlertContent>
        </Alert>
      );
    case "timeout":
      return (
        <Alert variant="offline" role="status">
          <TimerOffIcon aria-hidden="true" />
          <AlertContent>
            <AlertTitle>Tempo esgotado</AlertTitle>
            <AlertDescription>
              A fechadura não concluiu em 2 minutos e o pedido foi cancelado. Se a pessoa chegou a passar o
              cartão, confira em Membros.
            </AlertDescription>
          </AlertContent>
        </Alert>
      );
    case "mode-left":
      return (
        <Alert variant="info" role="status">
          <LockDeviceIcon aria-hidden="true" />
          <AlertContent>
            <AlertTitle className="text-ink">O pedido foi cancelado</AlertTitle>
            <AlertDescription>
              A fechadura saiu do Modo mestre antes de concluir. Aproxime o cartão mestre de novo para
              recomeçar.
            </AlertDescription>
          </AlertContent>
        </Alert>
      );
    case "card-exists":
      return (
        <Alert variant="danger">
          <CircleAlertIcon aria-hidden="true" />
          <AlertContent>
            <AlertTitle>Cartão já cadastrado</AlertTitle>
            <AlertDescription className="text-danger-ink">
              Esse cartão já pertence a outro membro. Use outro cartão e tente de novo.
            </AlertDescription>
          </AlertContent>
        </Alert>
      );
    default:
      return null;
  }
}
