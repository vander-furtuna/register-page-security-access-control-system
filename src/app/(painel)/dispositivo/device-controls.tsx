"use client";

import { Loader2Icon, RefreshCwIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { StatusPill } from "@/components/pet/status-pill";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { CommandRequest } from "@/lib/commands";
import { COMMAND_LABEL, commandDetail, REGISTRATION_SECONDS, UNLOCK_SECONDS } from "@/lib/device";
import { useDeviceCommands } from "@/lib/firebase/hooks/device";
import { useCommandBatch } from "@/lib/firebase/hooks/use-command-batch";
import type { DeviceStatus } from "@/lib/firebase/types";
import { relativeTime } from "@/lib/format";

function Card({
  id,
  title,
  children,
  danger,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <section
      aria-labelledby={id}
      className={`rounded-md border bg-surface shadow-sm ${danger ? "border-danger" : "border-line"}`}
    >
      <h2 id={id} className="border-b border-line px-6 py-4 font-display text-h2 text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

function useBatchToasts(batch: ReturnType<typeof useCommandBatch>, done: string) {
  useEffect(() => {
    if (batch.state.phase === "done") toast.success(done);
    if (batch.state.phase === "error")
      toast.error("A fechadura não concluiu", { description: batch.state.message });
  }, [batch.state, done]);
}

const seconds = (n: number) => `${n} ${n === 1 ? "segundo" : "segundos"}`;
const minutes = (s: number) => `${s / 60} ${s === 60 ? "minuto" : "minutos"}`;

type Settings = NonNullable<DeviceStatus["settings"]>;

/**
 * Ajustes (tela 08) → comandos `SET_*`. O valor mostrado é o que a fechadura publicou em
 * `status.settings`; o rascunho só vira o valor real depois que ela confirma.
 */
export function SettingsCard({ status }: { status: DeviceStatus | undefined }) {
  const auth = useAuth();
  const batch = useCommandBatch(auth.user?.uid);
  useBatchToasts(batch, "A fechadura aplicou os ajustes");
  const [draft, setDraft] = useState<Settings>({});

  const current = status?.settings;
  const available = !!current && (status?.capabilities.includes("commands") ?? false);
  const value = { ...current, ...draft };
  const changes: CommandRequest[] = [];
  if (current && value.unlockSeconds !== undefined && value.unlockSeconds !== current.unlockSeconds)
    changes.push({ type: "SET_UNLOCK_SECONDS", seconds: value.unlockSeconds });
  if (
    current &&
    value.registrationSeconds !== undefined &&
    value.registrationSeconds !== current.registrationSeconds
  )
    changes.push({ type: "SET_REGISTRATION_SECONDS", seconds: value.registrationSeconds });
  if (current && value.showName !== undefined && value.showName !== current.showName)
    changes.push({ type: "SET_SHOW_NAME", enabled: value.showName });
  const busy = batch.state.phase === "sending" || batch.state.phase === "waiting";

  if (!available) {
    return (
      <Card id="ajustes" title="Ajustes">
        <p className="px-6 py-5 text-body text-ink-muted">
          Os ajustes pelo site não estão disponíveis nesta versão do firmware. Tempo da tranca, prazo do
          cadastro e nome no display seguem os valores gravados na fechadura.
        </p>
      </Card>
    );
  }

  const unlockOptions = [
    ...new Set([...UNLOCK_SECONDS, ...(current.unlockSeconds ? [current.unlockSeconds] : [])]),
  ].sort((a, b) => a - b);
  const registrationOptions = [
    ...new Set([
      ...REGISTRATION_SECONDS,
      ...(current.registrationSeconds ? [current.registrationSeconds] : []),
    ]),
  ].sort((a, b) => a - b);

  return (
    <Card id="ajustes" title="Ajustes">
      <form
        className="flex flex-col gap-[18px] px-6 py-5"
        onSubmit={(event) => {
          event.preventDefault();
          void batch.start(changes, {});
        }}
      >
        {current.unlockSeconds !== undefined ? (
          <div className="flex flex-col gap-1.5">
            <label id="tranca-label" className="text-label font-medium text-ink">
              Tempo com a tranca aberta
            </label>
            <Select
              items={unlockOptions.map((n) => ({ value: String(n), label: seconds(n) }))}
              value={String(value.unlockSeconds)}
              onValueChange={(v) => v && setDraft((d) => ({ ...d, unlockSeconds: Number(v) }))}
              disabled={busy}
            >
              <SelectTrigger aria-labelledby="tranca-label" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {unlockOptions.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {seconds(n)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {current.registrationSeconds !== undefined ? (
          <div className="flex flex-col gap-1.5">
            <label id="prazo-label" className="text-label font-medium text-ink">
              Prazo para concluir um cadastro
            </label>
            <Select
              items={registrationOptions.map((n) => ({ value: String(n), label: minutes(n) }))}
              value={String(value.registrationSeconds)}
              onValueChange={(v) => v && setDraft((d) => ({ ...d, registrationSeconds: Number(v) }))}
              disabled={busy}
            >
              <SelectTrigger aria-labelledby="prazo-label" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {registrationOptions.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {minutes(n)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {current.showName !== undefined ? (
          <label className="flex cursor-pointer items-start gap-3">
            <Checkbox
              checked={value.showName}
              onCheckedChange={(checked) => setDraft((d) => ({ ...d, showName: checked }))}
              disabled={busy}
              className="mt-0.5"
            />
            <span>
              <span className="block text-body font-medium text-ink">Mostrar o nome no display</span>
              <span className="text-caption text-ink-subtle">
                “Bem Vindo(a), Maria Clara” depois de liberar.
              </span>
            </span>
          </label>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={changes.length === 0 || busy}>
            {busy ? (
              <Loader2Icon aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
            ) : null}
            Salvar ajustes
          </Button>
          <p aria-live="polite" className="text-caption text-ink-muted">
            {busy ? "Aguardando a fechadura aplicar…" : null}
          </p>
        </div>
      </form>
    </Card>
  );
}

/** Manutenção: reiniciar (comando); trocar o cartão mestre e limpar a memória só na porta. */
export function MaintenanceCard({ supportsCommands }: { supportsCommands: boolean }) {
  const auth = useAuth();
  const batch = useCommandBatch(auth.user?.uid);
  useBatchToasts(batch, "A fechadura reiniciou");
  const busy = batch.state.phase === "sending" || batch.state.phase === "waiting";

  return (
    <Card id="manutencao" title="Manutenção" danger>
      <ul>
        <li className="flex flex-wrap items-center gap-3 border-b border-line px-6 py-3.5">
          <div className="min-w-0 flex-[1_1_200px]">
            <p className="font-semibold text-ink">Reiniciar a fechadura</p>
            <p className="text-caption text-ink-subtle">
              {supportsCommands
                ? busy
                  ? "Aguardando a fechadura reiniciar…"
                  : "A porta fica ~8 s sem responder."
                : "Não disponível nesta versão do firmware: desligue e ligue a fechadura na porta."}
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger
              render={<Button variant="secondary" size="sm" disabled={!supportsCommands || busy} />}
            >
              {busy ? (
                <Loader2Icon aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
              ) : (
                <RefreshCwIcon aria-hidden="true" />
              )}
              Reiniciar
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reiniciar a fechadura?</AlertDialogTitle>
                <AlertDialogDescription>
                  A porta fica uns 8 segundos sem ler digitais nem cartões. Depois a fechadura volta sozinha e
                  publica o estado de novo.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => void batch.start([{ type: "REBOOT" }], {})}>
                  Reiniciar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </li>
        <li className="flex flex-wrap items-center gap-3 border-b border-line px-6 py-3.5">
          <div className="min-w-0 flex-[1_1_200px]">
            <p className="font-semibold text-ink">Trocar o cartão mestre</p>
            <p className="text-caption text-ink-subtle">
              Só pela porta: limpe a memória e aproxime o novo cartão.
            </p>
          </div>
          <Badge>Presencial</Badge>
        </li>
        <li className="flex flex-wrap items-center gap-3 px-6 py-3.5">
          <div className="min-w-0 flex-[1_1_200px]">
            <p className="font-semibold text-danger-ink">Limpar toda a memória</p>
            <p className="text-caption text-ink-subtle">
              Apaga digitais e cartões. Só pela porta: segure o botão de wipe por 10 s.
            </p>
          </div>
          <Badge>Presencial</Badge>
        </li>
      </ul>
    </Card>
  );
}

const COMMAND_PILL = { PENDING: "pending", DONE: "allowed", ERROR: "denied" } as const;
const COMMAND_TEXT = { PENDING: "Pendente", DONE: "Feito", ERROR: "Erro" } as const;

/** Últimos comandos enviados à fechadura e o estado de cada um. */
export function CommandQueueCard({ now }: { now: number }) {
  const commands = useDeviceCommands(8);
  return (
    <Card id="fila-comandos" title="Fila de comandos">
      {commands.status === "loading" ? (
        <div className="px-6 py-5">
          <Skeleton className="h-24 w-full" />
        </div>
      ) : commands.status !== "ready" || commands.data.length === 0 ? (
        <p className="px-6 py-5 text-body text-ink-muted">
          {commands.status === "error"
            ? "Não foi possível ler a fila de comandos."
            : "Nenhum comando enviado à fechadura ainda."}
        </p>
      ) : (
        <ul>
          {commands.data.map((command) => {
            const detail = commandDetail(command);
            return (
              <li
                key={command.id}
                className="flex items-center gap-3 border-b border-line px-6 py-3 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-label font-medium text-ink">
                    {COMMAND_LABEL[command.type]}
                    {detail ? <span className="font-mono text-ink-muted"> {detail}</span> : null}
                  </p>
                  <p className="truncate text-caption text-ink-subtle">
                    <span className="font-mono">
                      {relativeTime(new Date(command.requestedAt), new Date(now))}
                    </span>
                    {command.status === "ERROR" && command.error ? ` · ${command.error}` : null}
                  </p>
                </div>
                <StatusPill status={COMMAND_PILL[command.status]} size="sm">
                  {COMMAND_TEXT[command.status]}
                </StatusPill>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
