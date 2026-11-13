"use client";

import {
  ChevronRightIcon,
  CircleXIcon,
  DoorOpenIcon,
  KeyRoundIcon,
  LinkIcon,
  ListIcon,
  UserPlusIcon,
  UsersIcon,
  WifiOffIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { FingerIcon, RfidIcon } from "@/components/brand/icons";
import { AccessChart } from "@/components/pet/access-chart";
import { AccessFeed } from "@/components/pet/access-feed";
import { formatFingerId } from "@/components/pet/credential-chip";
import { EmptyState } from "@/components/pet/empty-state";
import { LockStatusCard } from "@/components/pet/lock-status-card";
import { StatTile } from "@/components/pet/stat-tile";
import { Alert, AlertAction, AlertContent, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useNow } from "@/hooks/use-now";
import { deltaVsYesterday, hourlyBuckets, periodStart, topUnknownCard, type LogRow } from "@/lib/access-logs";
import { useLockSnapshot, useOrphans } from "@/lib/firebase/hooks";
import { useLogs } from "@/lib/firebase/hooks/logs";
import { useMembers } from "@/lib/firebase/hooks/members";
import { formatLockTime, lockStartOfDay, relativeTime } from "@/lib/format";
import type { Orphan } from "@/lib/lock-state";
import { cn } from "@/lib/utils";

type ChartPeriod = "today" | "7d" | "30d";

/** Tela 02 · Visão geral (`02-visao-geral.png`, offline em `02b`, Modo mestre em `02c`). */
export function OverviewScreen() {
  const lock = useLockSnapshot();
  const members = useMembers(1);
  const orphans = useOrphans();
  const minute = useNow(60_000);
  const now = useMemo(() => new Date(minute), [minute]);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("today");

  // hoje + ontem: números do topo, comparação e últimos acessos
  const recentSince = useMemo(() => lockStartOfDay(new Date(minute), 1), [minute]);
  const recent = useLogs({ since: recentSince, limit: 1000 });
  const chartSince = useMemo(() => periodStart(chartPeriod, new Date(minute)), [chartPeriod, minute]);
  const chartLogs = useLogs({ since: chartSince, limit: 5000 });

  const todayStart = lockStartOfDay(now).getTime();
  const today = recent.rows.filter((r) => r.at && r.at.getTime() >= todayStart);
  const denied = today.filter((r) => r.status === "DENIED");
  const delta = deltaVsYesterday(recent.rows, now);
  const repeated = topUnknownCard(today);
  const active = members.rows.filter((r) => r.status === "active");
  const cardOnly = active.filter((r) => r.rfid !== undefined && r.fingerId === undefined);
  const loading = recent.status === "loading";

  return (
    <div className="flex flex-col gap-6">
      <Banner lock={lock} />

      <div className="grid gap-6 [grid-template-areas:'lock''tiles''feed''attention''chart'] lg:grid-cols-[minmax(0,1fr)_340px] lg:[grid-template-areas:'tiles_tiles''chart_lock''feed_attention']">
        <div className="grid grid-cols-2 gap-4 [grid-area:tiles] xl:grid-cols-4">
          <StatTile
            label="Acessos hoje"
            icon={<DoorOpenIcon />}
            loading={loading}
            value={today.length}
            delta={{ value: delta.delta, base: "em relação a ontem até agora" }}
            href="/registros"
          />
          <StatTile
            label="Tentativas negadas"
            icon={<CircleXIcon />}
            loading={loading}
            value={denied.length}
            tone={denied.length > 0 ? "danger" : "default"}
            context={
              repeated && repeated.attempts.length > 1
                ? `${repeated.attempts.length} do mesmo cartão desconhecido`
                : denied.length === 0
                  ? "nenhuma hoje"
                  : undefined
            }
            href="/registros?resultado=negados"
          />
          <StatTile
            label="Membros ativos"
            icon={<UsersIcon />}
            loading={members.status === "loading"}
            value={active.length}
            context={`${active.filter((r) => r.fingerId !== undefined).length} com digital · ${active.filter((r) => r.rfid !== undefined).length} com cartão`}
            href="/membros?aba=ativos"
          />
          <StatTile
            label="Credenciais sem dono"
            icon={<LinkIcon />}
            loading={orphans.status === "loading"}
            value={orphans.orphans.length}
            context={
              orphans.source === "logs" ? "vistas nos acessos recentes" : "na fechadura, sem membro no banco"
            }
            href="/credenciais"
          />
        </div>

        <section
          aria-labelledby="por-hora"
          className="rounded-md border border-line bg-surface shadow-sm [grid-area:chart] lg:self-start"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
            <h2 id="por-hora" className="font-display text-h2 text-ink">
              Acessos por hora
            </h2>
            <ToggleGroup
              variant="segmented"
              spacing={1}
              value={[chartPeriod]}
              onValueChange={(v) => v[0] && setChartPeriod(v[0] as ChartPeriod)}
              aria-label="Período do gráfico"
            >
              <ToggleGroupItem value="today">Hoje</ToggleGroupItem>
              <ToggleGroupItem value="7d">7 dias</ToggleGroupItem>
              <ToggleGroupItem value="30d">30 dias</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="px-6 py-5">
            {chartLogs.status === "loading" ? (
              <Skeleton className="h-[240px] w-full" />
            ) : (
              <AccessChart
                buckets={hourlyBuckets(chartLogs.rows)}
                currentHour={
                  chartPeriod === "today" ? formatLockTime(now, { seconds: false }).slice(0, 2) : undefined
                }
              />
            )}
          </div>
        </section>

        <section
          aria-labelledby="ultimos"
          className="rounded-md border border-line bg-surface shadow-sm [grid-area:feed] lg:self-start"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-4">
            <h2 id="ultimos" className="font-display text-h2 text-ink">
              Últimos acessos
            </h2>
            <Link href="/registros" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Ver todos
              <ChevronRightIcon aria-hidden="true" />
            </Link>
          </div>
          {loading ? (
            <div className="flex flex-col gap-3 p-6">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recent.rows.length === 0 ? (
            <EmptyState
              icon={<ListIcon />}
              title="Nenhum acesso ainda"
              description="Cada vez que alguém usar a porta, o acesso aparece aqui na hora."
            />
          ) : (
            <AccessFeed rows={recent.rows.slice(0, 5)} now={now} />
          )}
        </section>

        <div className="[grid-area:lock] lg:self-start">
          <LockStatusCard
            snapshot={lock}
            footer={
              lock.mode === "MASTER" ? (
                <Link href="/cadastro" className={cn(buttonVariants(), "w-full")}>
                  <UserPlusIcon aria-hidden="true" />
                  Cadastrar membro agora
                </Link>
              ) : undefined
            }
          />
        </div>

        <section
          aria-labelledby="atencao"
          className="rounded-md border border-line bg-surface shadow-sm [grid-area:attention] lg:self-start"
        >
          <h2 id="atencao" className="border-b border-line px-6 py-4 font-display text-h2 text-ink">
            Precisa de atenção
          </h2>
          <Attention orphans={orphans.orphans} repeated={repeated} cardOnly={cardOnly.length} />
        </section>
      </div>
    </div>
  );
}

function Banner({ lock }: { lock: ReturnType<typeof useLockSnapshot> }) {
  if (lock.connection === "offline" && lock.status) {
    const queue = lock.status.queue ?? 0;
    return (
      <Alert variant="offline">
        <WifiOffIcon aria-hidden="true" />
        <AlertContent>
          <AlertTitle>
            Fechadura offline {relativeTime(new Date(lock.status.lastSeen), new Date(lock.now))}
          </AlertTitle>
          <AlertDescription>
            A porta continua abrindo com as digitais e cartões já salvos.
            {queue > 0
              ? ` ${queue} ${queue === 1 ? "acesso está guardado" : "acessos estão guardados"} na fechadura e ${queue === 1 ? "aparece" : "aparecem"} aqui quando a conexão voltar.`
              : ""}
          </AlertDescription>
        </AlertContent>
        <AlertAction>
          <Link href="/dispositivo" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            Ver diagnóstico
          </Link>
        </AlertAction>
      </Alert>
    );
  }
  if (lock.mode === "MASTER") {
    return (
      <Alert variant="master">
        <KeyRoundIcon aria-hidden="true" />
        <AlertContent>
          <AlertTitle>Modo mestre ativo na fechadura</AlertTitle>
          <AlertDescription>
            Você pode iniciar um cadastro pelo site agora. Aproxime o cartão mestre de novo para sair.
          </AlertDescription>
        </AlertContent>
        <AlertAction>
          <Link href="/cadastro" className={buttonVariants({ size: "sm" })}>
            Cadastrar membro
          </Link>
        </AlertAction>
      </Alert>
    );
  }
  return null;
}

function Attention({
  orphans,
  repeated,
  cardOnly,
}: {
  orphans: Orphan[];
  repeated: { uid: string; attempts: LogRow[] } | null;
  cardOnly: number;
}) {
  const items: {
    key: string;
    icon: ReactNode;
    tone: string;
    title: string;
    detail: string;
    href: string;
    action: string;
  }[] = [];
  if (orphans.length > 0) {
    const fingers = orphans.filter((o) => o.kind === "finger");
    const title =
      fingers.length === orphans.length
        ? `${orphans.length} ${orphans.length === 1 ? "digital sem dono" : "digitais sem dono"}`
        : `${orphans.length} ${orphans.length === 1 ? "credencial sem dono" : "credenciais sem dono"}`;
    const ids = orphans.map((o) => (o.kind === "finger" ? formatFingerId(o.id) : `slot ${o.id}`)).join(", ");
    items.push({
      key: "orphans",
      icon: fingers.length ? <FingerIcon size={20} /> : <RfidIcon size={20} />,
      tone: fingers.length ? "bg-finger-soft text-finger-ink" : "bg-rfid-soft text-rfid-ink",
      title,
      detail: `${ids} · ${orphans.length === 1 ? "cadastrada" : "cadastradas"} pelo cartão mestre`,
      href: "/credenciais",
      action: "Vincular",
    });
  }
  if (repeated && repeated.attempts.length > 1) {
    const times = repeated.attempts
      .map((a) => (a.at ? formatLockTime(a.at, { seconds: false }) : ""))
      .reverse()
      .join(" e ");
    items.push({
      key: "unknown-card",
      icon: <RfidIcon size={20} />,
      tone: "bg-rfid-soft text-rfid-ink",
      title: `Cartão ${repeated.uid} tentou ${repeated.attempts.length} vezes`,
      detail: `Hoje, ${times}`,
      href: "/registros?resultado=negados&credencial=cartao",
      action: "Ver",
    });
  }
  if (cardOnly > 0) {
    items.push({
      key: "card-only",
      icon: <span className="font-mono text-label font-semibold">{cardOnly}</span>,
      tone: "bg-surface-sunken text-ink-muted rounded-full",
      title: `${cardOnly} ${cardOnly === 1 ? "membro só com cartão" : "membros só com cartão"}`,
      detail: "Sem digital de reserva se perderem o cartão",
      href: "/membros?aba=so-cartao",
      action: "Ver",
    });
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Nada pedindo atenção"
        description="Credenciais sem dono e cartões desconhecidos insistentes aparecem aqui."
        className="py-8"
      />
    );
  }
  return (
    <ul className="divide-y divide-line">
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-3 px-6 py-4">
          <span
            aria-hidden="true"
            className={cn("grid size-9 shrink-0 place-items-center rounded-md", item.tone)}
          >
            {item.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">{item.title}</p>
            <p className="text-caption text-ink-muted">{item.detail}</p>
          </div>
          <Link
            href={item.href}
            className={buttonVariants({ variant: "secondary", size: "sm" })}
            aria-label={`${item.action}: ${item.title}`}
          >
            {item.action}
          </Link>
        </li>
      ))}
    </ul>
  );
}
