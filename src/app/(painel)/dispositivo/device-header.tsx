"use client";

import { CircleAlertIcon } from "lucide-react";

import { LogoSymbol } from "@/components/brand/logo";
import { LcdMirror } from "@/components/pet/lcd-mirror";
import { LOCK_NAME, lockPill } from "@/components/pet/lock-status-card";
import { StatusPill } from "@/components/pet/status-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/device";
import type { LockSnapshot } from "@/lib/firebase/hooks";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Cabeçalho da tela 08: símbolo, nome, pílula ("Online há 3 h 12 min"), placa/firmware/IP, LCD
 * grande e as métricas. Firmware 2.0: só o modo e o último acesso registrado.
 */
export function DeviceHeader({ snapshot }: { snapshot: LockSnapshot }) {
  const { status, connection, mode, lcd, now, loading, lastAccessAt, error } = snapshot;
  const pill = lockPill(snapshot);
  const pillText =
    pill === "online" && status?.onlineSince
      ? `Online há ${formatDuration(now - status.onlineSince)}`
      : pill === "offline" && status?.lastSeen
        ? `Offline há ${formatDuration(now - status.lastSeen)}`
        : undefined;

  const sub = status
    ? [
        status.board ?? "ESP32",
        status.firmware ? `firmware ${status.firmware}` : null,
        status.ip ? `IP ${status.ip}` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "ESP32 · status ao vivo não disponível nesta versão do firmware";

  const metrics: { label: string; value: string }[] = status
    ? [
        {
          label: "Último contato",
          value: relativeTime(new Date(status.lastSeen), new Date(now), { seconds: true }),
        },
        {
          label: "Wi-Fi",
          value:
            [status.ssid, status.rssi !== undefined ? `${status.rssi} dBm` : null]
              .filter(Boolean)
              .join(" · ") || "—",
        },
        { label: "Modo", value: mode ?? "—" },
        {
          label: "Memória livre",
          value: status.freeHeap !== undefined ? `${Math.round(status.freeHeap / 1024)} KB` : "—",
        },
        { label: "Fila local", value: `${status.queue ?? 0} ${status.queue === 1 ? "evento" : "eventos"}` },
      ]
    : [
        { label: "Modo", value: mode ?? "—" },
        {
          label: "Último acesso registrado",
          value: lastAccessAt ? relativeTime(lastAccessAt, new Date(now)) : "—",
        },
      ];

  return (
    <section
      aria-label="Fechadura"
      className={cn(
        "overflow-hidden rounded-lg border bg-surface shadow-sm",
        mode === "MASTER" ? "border-master ring-1 ring-master" : "border-line",
      )}
    >
      <div className="flex flex-wrap items-center gap-6 bg-chassis p-6 text-on-chassis">
        <LogoSymbol size={88} className="hidden shrink-0 sm:block" />
        <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-display text-[20px] leading-7 font-semibold text-on-chassis">{LOCK_NAME}</h2>
            {loading ? (
              <Skeleton className="h-6 w-28 rounded-full bg-chassis-raised" />
            ) : (
              <StatusPill status={pill} onChassis>
                {pillText}
              </StatusPill>
            )}
          </div>
          <p className="text-caption text-on-chassis-muted">{sub}</p>
        </div>
        {status ? <LcdMirror lines={lcd} size="lg" className="w-full sm:w-auto" /> : null}
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

      <dl className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))]">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="-mr-px flex flex-col gap-0.5 border-t border-r border-line px-6 py-3"
          >
            <dt className="text-caption text-ink-subtle">{metric.label}</dt>
            <dd className="font-mono text-label font-medium text-ink">
              {loading ? <Skeleton className="h-5 w-16" /> : metric.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
