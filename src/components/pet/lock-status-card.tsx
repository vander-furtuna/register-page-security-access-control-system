import { CircleAlertIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import type { LockSnapshot } from "@/lib/firebase/hooks";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

import { LcdMirror } from "./lcd-mirror";
import { StatusPill, type PillStatus } from "./status-pill";

/**
 * Estado da fechadura física (`componentes.md` › LockStatusCard): topo `chassis` com nome,
 * pílula e LCD; métricas em mono embaixo. Em Modo mestre o card ganha contorno `master`.
 *
 * Firmware 2.0 (sem `devices/<id>/status`): mostra o modo e "Último acesso registrado",
 * sem LCD, Wi-Fi nem memória (`docs/produto/telas.md` › 02, aceite).
 */
export const LOCK_NAME = "Porta da sala do PET";

export function lockPill(snapshot: Pick<LockSnapshot, "mode" | "connection">): PillStatus {
  if (snapshot.mode === "MASTER") return "master";
  if (snapshot.connection === "online") return "online";
  if (snapshot.connection === "offline") return "offline";
  return "standby";
}

type LockStatusCardProps = {
  snapshot: LockSnapshot;
  name?: string;
  /** Substitui a linha "ESP32 · firmware …" (ex.: "Cadastrando Maria Clara"). */
  subtitle?: ReactNode;
  /** Substitui as métricas (ex.: os passos do cadastro). */
  children?: ReactNode;
  className?: string;
};

export function LockStatusCard({
  snapshot,
  name = LOCK_NAME,
  subtitle,
  children,
  className,
}: LockStatusCardProps) {
  const { mode, connection, status, lcd, lastAccessAt, now, loading, error } = snapshot;
  const master = mode === "MASTER";
  const since = (ms: number | undefined) =>
    ms ? relativeTime(new Date(ms), new Date(now), { seconds: true }) : "—";

  const metrics: { label: string; value: string }[] = status
    ? [
        { label: "Último contato", value: since(status.lastSeen) },
        { label: "Wi-Fi", value: status.rssi !== undefined ? `${status.rssi} dBm` : "—" },
        {
          label: "Digitais",
          value:
            status.fingerCount !== undefined
              ? `${status.fingerCount} / ${status.fingerCapacity ?? "—"}`
              : "—",
        },
        {
          label: "Cartões",
          value: status.cardCount !== undefined ? `${status.cardCount} / ${status.cardCapacity ?? "—"}` : "—",
        },
      ]
    : [
        { label: "Modo", value: master ? "Modo mestre" : mode === "STANDBY" ? "Em espera" : "—" },
        {
          label: "Último acesso registrado",
          value: lastAccessAt ? relativeTime(lastAccessAt, new Date(now)) : "—",
        },
      ];

  return (
    <section
      aria-label={`Estado da ${name.toLowerCase()}`}
      className={cn(
        "overflow-hidden rounded-lg border bg-surface shadow-sm",
        master ? "border-master ring-1 ring-master" : "border-line",
        className,
      )}
    >
      <div className="flex flex-col gap-4 bg-chassis px-6 py-5 text-on-chassis">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-h3 text-on-chassis">{name}</h2>
            <p className="text-caption text-on-chassis-muted">
              {subtitle ?? (status?.firmware ? `ESP32 · firmware ${status.firmware}` : "ESP32")}
            </p>
          </div>
          {loading ? (
            <Skeleton className="h-6 w-20 rounded-full bg-chassis-raised" />
          ) : (
            <StatusPill status={lockPill(snapshot)} onChassis />
          )}
        </div>
        {status ? (
          <LcdMirror lines={lcd} className="w-full" />
        ) : !loading ? (
          <p className="text-caption text-on-chassis-muted">
            Espelho do display e status ao vivo não disponíveis nesta versão do firmware.
          </p>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="flex items-start gap-2 px-6 py-3 text-label text-danger-ink">
          <CircleAlertIcon className="mt-px size-4 shrink-0" aria-hidden="true" />
          Não foi possível ler o estado da fechadura. A porta continua funcionando normalmente.
        </p>
      ) : null}

      {connection === "offline" ? (
        <p className="border-t border-line bg-offline-soft px-6 py-3 text-label text-offline-ink">
          A porta continua abrindo com digitais e cartões.
          {status?.queue
            ? ` ${status.queue} ${status.queue === 1 ? "evento aguarda" : "eventos aguardam"} envio.`
            : ""}
        </p>
      ) : null}

      {children ?? (
        <dl className="grid grid-cols-2">
          {metrics.map((metric, index) => (
            <div
              key={metric.label}
              className={cn(
                "flex flex-col gap-0.5 border-t border-line px-6 py-3",
                index % 2 === 0 && "border-r",
              )}
            >
              <dt className="text-caption text-ink-subtle">{metric.label}</dt>
              <dd className="font-mono text-label font-medium text-ink">
                {loading ? <Skeleton className="h-5 w-16" /> : metric.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
