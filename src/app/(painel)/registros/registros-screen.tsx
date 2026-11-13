"use client";

import {
  CalendarIcon,
  CircleAlertIcon,
  CloudOffIcon,
  DoorOpenIcon,
  DownloadIcon,
  ListIcon,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { FingerIcon, RfidIcon } from "@/components/brand/icons";
import { PageContent } from "@/components/layout/page-content";
import { Topbar } from "@/components/layout/topbar";
import { LogCredential, LogShortcut } from "@/components/pet/access-feed";
import { EmptyState } from "@/components/pet/empty-state";
import { StatTile } from "@/components/pet/stat-tile";
import { Alert, AlertContent, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useNow } from "@/hooks/use-now";
import {
  filterRows,
  groupByDay,
  logsCsv,
  percent,
  periodStart,
  summarize,
  type CredentialFilter,
  type LogRow,
  type Period,
  type ResultFilter,
} from "@/lib/access-logs";
import { useDeviceStatus } from "@/lib/firebase/hooks";
import { useLogs, useUnsyncedLogs } from "@/lib/firebase/hooks/logs";
import { formatLockTime, lockDateISO } from "@/lib/format";
import { initials } from "@/lib/member-links";
import { cn } from "@/lib/utils";

const PAGE = 100;

const PERIOD_PARAM: Record<string, Period> = { hoje: "today", "7d": "7d", "30d": "30d", datas: "custom" };
const CREDENTIAL_PARAM: Record<string, CredentialFilter> = {
  todas: "all",
  digital: "finger",
  cartao: "card",
};
const RESULT_PARAM: Record<string, ResultFilter> = { todos: "all", liberados: "allowed", negados: "denied" };
const reverse = <T extends string>(map: Record<string, T>, value: T) =>
  Object.keys(map).find((key) => map[key] === value)!;

/** "2026-11-10" (fuso da sala) → início do dia como Date. */
const dayStart = (iso: string) => new Date(`${iso}T00:00:00-03:00`);

/** Tela 07 · Registros de acesso. */
export function RegistrosScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const minute = useNow(60_000);
  const now = useMemo(() => new Date(minute), [minute]);

  const period = PERIOD_PARAM[params.get("periodo") ?? ""] ?? "today";
  const credential = CREDENTIAL_PARAM[params.get("credencial") ?? ""] ?? "all";
  const result = RESULT_PARAM[params.get("resultado") ?? ""] ?? "all";
  const today = lockDateISO(now);
  const from = params.get("de") ?? today;
  const to = params.get("ate") ?? today;

  const since = useMemo(
    () => (period === "custom" ? dayStart(from) : periodStart(period, new Date(minute))),
    [period, from, minute],
  );
  const until = period === "custom" ? dayStart(to).getTime() + 24 * 60 * 60 * 1000 : Infinity;

  const [limit, setLimit] = useState(PAGE);
  const logs = useLogs({ since, limit });
  const unsynced = useUnsyncedLogs();
  const device = useDeviceStatus();
  const queueSupported =
    (device.status === "ready" && device.data.capabilities.includes("persistentQueue")) ||
    logs.rows.some((r) => r.queuedOffline !== undefined);

  const inPeriod = useMemo(() => logs.rows.filter((r) => r.at && r.at.getTime() < until), [logs.rows, until]);
  const summary = summarize(inPeriod);
  const visible = useMemo(() => filterRows(inPeriod, credential, result), [inPeriod, credential, result]);
  const groups = useMemo(() => groupByDay(visible), [visible]);
  const visibleUnsynced = filterRows(unsynced, credential, result);

  function setParam(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    setLimit(PAGE);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function exportCsv() {
    const blob = new Blob(["﻿" + logsCsv([...visible, ...visibleUnsynced])], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registros-pet-lock-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const periodLabel =
    period === "today"
      ? "hoje"
      : period === "7d"
        ? "em 7 dias"
        : period === "30d"
          ? "em 30 dias"
          : "no período";
  const loading = logs.status === "loading";
  const plus = logs.hasMore ? "+" : "";

  return (
    <>
      <Topbar
        title="Registros de acesso"
        subtitle="Cada tentativa na porta, liberada ou negada"
        action={null}
      />
      <PageContent>
        {logs.status === "error" ? (
          <Alert variant="danger">
            <CircleAlertIcon aria-hidden="true" />
            <AlertContent>
              <AlertTitle>Não foi possível carregar os registros</AlertTitle>
              <AlertDescription className="text-danger-ink">
                Confira a internet e recarregue a página. A porta continua funcionando normalmente.
              </AlertDescription>
            </AlertContent>
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label={`Tentativas ${periodLabel}`}
            icon={<DoorOpenIcon />}
            loading={loading}
            value={`${summary.total}${plus}`}
            context={`${summary.allowed} liberadas · ${summary.denied} negadas`}
          />
          <StatTile
            label="Pela digital"
            icon={<FingerIcon />}
            loading={loading}
            value={summary.byFinger}
            context={`${percent(summary.byFinger, summary.total)} das tentativas`}
          />
          <StatTile
            label="Pelo cartão"
            icon={<RfidIcon />}
            loading={loading}
            value={summary.byCard}
            context={`${percent(summary.byCard, summary.total)} das tentativas`}
          />
          <StatTile
            label="Chegaram atrasados"
            icon={<CloudOffIcon />}
            loading={loading}
            value={queueSupported ? summary.late : "—"}
            context={
              queueSupported
                ? "guardados na fechadura durante quedas de internet"
                : "Não disponível nesta versão do firmware"
            }
          />
        </div>

        <section
          aria-label="Registros"
          className="overflow-hidden rounded-md border border-line bg-surface shadow-sm"
        >
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
            <ToggleGroup
              variant="segmented"
              spacing={1}
              value={[period]}
              onValueChange={(v) =>
                v[0] &&
                setParam({
                  periodo: reverse(PERIOD_PARAM, v[0] as Period),
                  ...(v[0] !== "custom" ? { de: null, ate: null } : {}),
                })
              }
              aria-label="Período"
            >
              <ToggleGroupItem value="today">Hoje</ToggleGroupItem>
              <ToggleGroupItem value="7d">7 dias</ToggleGroupItem>
              <ToggleGroupItem value="30d">30 dias</ToggleGroupItem>
              <ToggleGroupItem value="custom">
                <CalendarIcon aria-hidden="true" />
                Escolher datas
              </ToggleGroupItem>
            </ToggleGroup>
            <ToggleGroup
              variant="segmented"
              spacing={1}
              value={[credential]}
              onValueChange={(v) =>
                v[0] &&
                setParam({
                  credencial: v[0] === "all" ? null : reverse(CREDENTIAL_PARAM, v[0] as CredentialFilter),
                })
              }
              aria-label="Credencial"
            >
              <ToggleGroupItem value="all">Todas</ToggleGroupItem>
              <ToggleGroupItem value="finger">
                <FingerIcon size={16} />
                Digital
              </ToggleGroupItem>
              <ToggleGroupItem value="card">
                <RfidIcon size={16} />
                Cartão
              </ToggleGroupItem>
            </ToggleGroup>
            <ToggleGroup
              variant="segmented"
              spacing={1}
              value={[result]}
              onValueChange={(v) =>
                v[0] &&
                setParam({ resultado: v[0] === "all" ? null : reverse(RESULT_PARAM, v[0] as ResultFilter) })
              }
              aria-label="Resultado"
            >
              <ToggleGroupItem value="all">Todos</ToggleGroupItem>
              <ToggleGroupItem value="allowed">Liberados</ToggleGroupItem>
              <ToggleGroupItem value="denied">Negados</ToggleGroupItem>
            </ToggleGroup>
            <Button
              variant="secondary"
              size="sm"
              className="sm:ml-auto"
              onClick={exportCsv}
              disabled={visible.length + visibleUnsynced.length === 0}
            >
              <DownloadIcon aria-hidden="true" />
              Exportar CSV
            </Button>
          </div>

          {period === "custom" ? (
            <div className="flex flex-wrap items-end gap-4 border-t border-line bg-surface-sunken px-4 py-3 sm:px-6">
              <label className="flex flex-col gap-1 text-label text-ink">
                De
                <Input
                  type="date"
                  value={from}
                  max={to}
                  onChange={(e) => e.target.value && setParam({ de: e.target.value })}
                  className="h-8 w-44"
                />
              </label>
              <label className="flex flex-col gap-1 text-label text-ink">
                Até
                <Input
                  type="date"
                  value={to}
                  min={from}
                  max={today}
                  onChange={(e) => e.target.value && setParam({ ate: e.target.value })}
                  className="h-8 w-44"
                />
              </label>
            </div>
          ) : null}

          {loading ? (
            <div
              className="flex flex-col gap-3 border-t border-line p-6"
              role="status"
              aria-label="Carregando registros"
            >
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : groups.length === 0 && visibleUnsynced.length === 0 ? (
            <EmptyState
              className="border-t border-line"
              icon={<ListIcon />}
              title={
                inPeriod.length === 0 ? "Nenhum registro neste período" : "Nenhum registro com esses filtros"
              }
              description={
                inPeriod.length === 0
                  ? "Cada tentativa na porta, liberada ou negada, aparece aqui."
                  : "Troque a credencial ou o resultado para ver mais."
              }
              action={
                inPeriod.length > 0 ? (
                  <Button variant="secondary" onClick={() => setParam({ credencial: null, resultado: null })}>
                    Limpar filtros
                  </Button>
                ) : null
              }
            />
          ) : (
            <div className="relative overflow-x-auto border-t border-line">
              <table className="w-full min-w-[900px] text-body">
                <thead>
                  <tr className="bg-surface-sunken">
                    {["Hora", "Quem", "Credencial", "Resultado", "Observação"].map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="h-10 px-4 text-left text-overline font-semibold tracking-[0.08em] text-ink-muted uppercase first:pl-6"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                {groups.map((group) => (
                  <tbody key={group.key}>
                    <tr className="border-t border-line bg-surface-sunken/60">
                      <th
                        scope="colgroup"
                        colSpan={5}
                        className="h-9 px-6 text-left text-label font-semibold text-ink-muted"
                      >
                        {group.label}
                      </th>
                    </tr>
                    {group.rows.map((row) => (
                      <LogTableRow key={row.key} row={row} />
                    ))}
                  </tbody>
                ))}
                {visibleUnsynced.length ? (
                  <tbody>
                    <tr className="border-t border-line bg-offline-soft">
                      <th
                        scope="colgroup"
                        colSpan={5}
                        className="px-6 py-2 text-left text-label font-normal text-offline-ink"
                      >
                        <span className="font-semibold">Sem horário confiável</span> · o relógio da fechadura
                        não estava sincronizado quando estes acessos aconteceram (1970-01-01).
                      </th>
                    </tr>
                    {visibleUnsynced.map((row) => (
                      <LogTableRow key={row.key} row={row} />
                    ))}
                  </tbody>
                ) : null}
              </table>
            </div>
          )}

          {!loading && visible.length > 0 ? (
            <div className="flex items-center justify-between gap-3 border-t border-line px-6 py-3">
              <p className="text-label text-ink-muted" aria-live="polite">
                {visible.length} {visible.length === 1 ? "registro" : "registros"} {periodLabel}
                {logs.hasMore ? " · há registros mais antigos" : ""}
              </p>
              {logs.hasMore ? (
                <Button variant="secondary" size="sm" onClick={() => setLimit((l) => l + PAGE)}>
                  Carregar mais
                </Button>
              ) : null}
            </div>
          ) : null}
        </section>
      </PageContent>
    </>
  );
}

function LogTableRow({ row }: { row: LogRow }) {
  const unknown = row.status === "DENIED" && row.kind !== "member";
  return (
    <tr className="h-14 border-t border-line">
      <td className="px-4 pl-6 font-mono text-label text-ink">
        {row.at ? formatLockTime(row.at) : "--:--:--"}
      </td>
      <td className="px-4">
        <span className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-full font-display text-caption font-semibold text-ink-muted",
              row.kind === "member" ? "bg-surface-sunken" : "border border-dashed border-line-strong",
            )}
          >
            {row.kind === "member" ? initials(row.displayName) : "?"}
          </span>
          <span className={cn("font-semibold", unknown ? "text-danger-ink" : "text-ink")}>
            {row.displayName}
          </span>
        </span>
      </td>
      <td className="px-4">
        <LogCredential row={row} />
      </td>
      <td className="px-4">
        <Badge variant={row.status === "ALLOWED" ? "allowed" : "denied"} dot>
          {row.status === "ALLOWED" ? "Liberado" : "Negado"}
        </Badge>
      </td>
      <td className="px-4">
        {row.late ? (
          <Badge variant="pending" dot>
            {row.arrivedAt
              ? `Enviado às ${formatLockTime(row.arrivedAt, { seconds: false })} (estava offline)`
              : "Chegou depois (estava offline)"}
          </Badge>
        ) : row.kind === "unrecognized-finger" ? (
          <span className="text-label text-ink-muted">Dedo não cadastrado ou leitura ruim</span>
        ) : (
          <LogShortcut row={row} />
        )}
      </td>
    </tr>
  );
}
