"use client";

import { InfoIcon } from "lucide-react";

import { StatusPill } from "@/components/pet/status-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { connectionTimeline, formatDuration } from "@/lib/device";
import { useDeviceOutages } from "@/lib/firebase/hooks/device";
import { formatLockTime } from "@/lib/format";
import { dayLabel } from "@/lib/members";

const HOUR = 60 * 60 * 1000;

/** "07:40" com "ontem"/"08/11" na frente quando não é hoje. */
function at(ms: number, now: Date) {
  const day = dayLabel(new Date(ms), now);
  return `${day} ${formatLockTime(new Date(ms), { seconds: false })}`;
}

/** Conexão nas últimas 24 h (tela 08): faixa online/offline e a lista das quedas. */
export function ConnectionCard({ now }: { now: number }) {
  const outages = useDeviceOutages();
  const nowDate = new Date(now);

  let body;
  let uptime: string | null = null;
  if (outages.status === "loading") {
    body = <Skeleton className="h-24 w-full" />;
  } else if (outages.status !== "ready") {
    body = (
      <p className="flex items-start gap-2 text-body text-ink-muted">
        <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>
          O histórico de conexão não está disponível nesta versão do firmware. A fechadura precisa registrar
          as quedas (firmware 2.1).
        </span>
      </p>
    );
  } else {
    const timeline = connectionTimeline(outages.data, now);
    uptime = timeline.uptime;
    const ticks = [0, 6, 12, 18].map((h) => timeline.from + h * HOUR);
    const summary =
      timeline.outages.length === 0
        ? "Linha do tempo: sem quedas nas últimas 24 h."
        : `Linha do tempo: ${timeline.outages.length} ${timeline.outages.length === 1 ? "queda" : "quedas"}, ${timeline.outages
            .map((o) => `${formatDuration(o.durationMs)} ${at(o.start, nowDate)}`)
            .join("; ")}.`;
    body = (
      <>
        <div role="img" aria-label={summary} className="relative h-7 overflow-hidden rounded-sm bg-lock">
          {timeline.segments.map((segment, index) => (
            <span
              key={index}
              title={`Offline: ${at(timeline.outages[index]!.start, nowDate)}–${formatLockTime(new Date(timeline.outages[index]!.end), { seconds: false })}`}
              className="absolute inset-y-0 min-w-1 bg-offline shadow-[0_0_0_2px_var(--surface)]"
              style={{ left: `${segment.left * 100}%`, width: `${segment.width * 100}%` }}
            />
          ))}
        </div>
        <div
          aria-hidden="true"
          className="flex justify-between font-mono text-[11px] leading-[14px] text-ink-subtle"
        >
          {ticks.map((tick, index) => (
            <span key={tick}>
              {index === 0 && dayLabel(new Date(tick), nowDate) !== "hoje"
                ? `${dayLabel(new Date(tick), nowDate)} `
                : ""}
              {formatLockTime(new Date(tick), { seconds: false }).slice(0, 2)}h
            </span>
          ))}
          <span>agora</span>
        </div>
        {timeline.outages.length === 0 ? (
          <p className="mt-2 text-label text-ink-muted">Nenhuma queda nas últimas 24 h.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2 text-label">
            {timeline.outages.map((outage) => (
              <li key={outage.start} className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <StatusPill status="offline">
                  {outage.ongoing ? "Offline agora" : `${formatDuration(outage.durationMs)} offline`}
                </StatusPill>
                <span className="text-ink-muted">
                  {outage.ongoing
                    ? `desde ${at(outage.start, nowDate)}`
                    : `${at(outage.start, nowDate)}–${formatLockTime(new Date(outage.end), { seconds: false })}`}
                  {" · "}
                  {outage.queued === undefined
                    ? "sem dados da fila"
                    : outage.queued === 0
                      ? "nenhum acesso no período"
                      : `${outage.queued} ${outage.queued === 1 ? "acesso guardado" : "acessos guardados"}${outage.ongoing ? " na fila" : " e enviados depois"}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }

  return (
    <section aria-labelledby="conexao" className="rounded-md border border-line bg-surface shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-line px-6 py-4">
        <h2 id="conexao" className="font-display text-h2 text-ink">
          Conexão nas últimas 24 h
        </h2>
        {uptime ? <span className="text-caption text-ink-subtle">{uptime} online</span> : null}
      </div>
      <div className="flex flex-col gap-2.5 px-6 py-5">{body}</div>
    </section>
  );
}
