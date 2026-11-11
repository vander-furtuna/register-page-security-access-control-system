"use client";

import { CircleXIcon, DoorOpenIcon, LinkIcon, UsersIcon } from "lucide-react";

import { CredentialChip } from "@/components/pet/credential-chip";
import { EmptyState } from "@/components/pet/empty-state";
import { LcdMirror } from "@/components/pet/lcd-mirror";
import { LockStatusCard } from "@/components/pet/lock-status-card";
import { StatTile } from "@/components/pet/stat-tile";
import { StatusPill } from "@/components/pet/status-pill";
import { Button } from "@/components/ui/button";
import { useNow } from "@/hooks/use-now";
import type { LockSnapshot } from "@/lib/firebase/hooks";
import type { DeviceStatus } from "@/lib/firebase/types";

/** Componentes de `components/pet/` com dados simulados, nos estados do firmware 2.0 e 2.1. */
export function DomainShowcase() {
  const now = useNow(1000);
  const status = (over: Partial<DeviceStatus> = {}): DeviceStatus => ({
    online: true,
    lastSeen: now - 4_000,
    firmware: "2.1.0",
    rssi: -58,
    lcd: ["Aguardando", "acesso..."],
    fingerCount: 34,
    fingerCapacity: 127,
    cardCount: 21,
    cardCapacity: 126,
    queue: 0,
    capabilities: ["status", "inventory"],
    ...over,
  });
  const snapshot = (over: Partial<LockSnapshot>): LockSnapshot => ({
    loading: false,
    error: undefined,
    mode: "STANDBY",
    connection: "online",
    status: status(),
    lcd: ["Aguardando", "acesso..."],
    lastAccessAt: new Date(now - 3 * 60_000),
    now,
    ...over,
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <span className="text-overline text-ink-subtle uppercase">StatusPill</span>
        <div className="flex flex-wrap gap-2">
          {(["online", "offline", "master", "standby", "allowed", "denied", "pending"] as const).map((s) => (
            <StatusPill key={s} status={s} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 rounded-md bg-chassis p-3">
          {(["online", "offline", "master", "standby"] as const).map((s) => (
            <StatusPill key={s} status={s} onChassis />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-overline text-ink-subtle uppercase">CredentialChip</span>
        <div className="flex flex-wrap gap-2">
          <CredentialChip kind="finger" id={12} />
          <CredentialChip kind="rfid" id={22} />
          <CredentialChip kind="rfid" uid="04:9B:7E:21" hideLabel />
          <CredentialChip kind="finger" state="orphan" id={27} href="/credenciais" />
          <CredentialChip kind="rfid" state="orphan" uid="5D:22:A0:7F" href="/credenciais" />
          <CredentialChip kind="finger" state="none" />
          <CredentialChip kind="rfid" state="none" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-overline text-ink-subtle uppercase">LcdMirror (sm, md, lg, apagado)</span>
        <div className="flex flex-wrap items-start gap-4">
          <LcdMirror lines={["Aguardando", "acesso..."]} size="sm" className="w-44" />
          <LcdMirror lines={["Passo 2/2: Dedo", "1. Encoste o dedo"]} />
          <LcdMirror lines={["Bem Vindo(a),", "Maria Clara"]} size="lg" className="w-72" />
          <LcdMirror lines={null} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-overline text-ink-subtle uppercase">StatTile</span>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Acessos hoje"
            icon={<DoorOpenIcon />}
            value={47}
            delta={{ value: 12, base: "em relação a ontem" }}
            href="/registros"
          />
          <StatTile
            label="Tentativas negadas"
            icon={<CircleXIcon />}
            value={3}
            context="2 do mesmo cartão desconhecido"
          />
          <StatTile
            label="Membros ativos"
            icon={<UsersIcon />}
            value={38}
            context="34 com digital · 21 com cartão"
          />
          <StatTile label="Credenciais sem dono" icon={<LinkIcon />} value={2} loading />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-overline text-ink-subtle uppercase">
          LockStatusCard (firmware 2.0, online, offline, Modo mestre)
        </span>
        <div className="grid items-start gap-4 md:grid-cols-2">
          <LockStatusCard snapshot={snapshot({ status: undefined, connection: "unknown", lcd: null })} />
          <LockStatusCard snapshot={snapshot({})} />
          <LockStatusCard
            snapshot={snapshot({
              connection: "offline",
              status: status({ lastSeen: now - 14 * 60_000, queue: 3 }),
              lcd: null,
            })}
          />
          <LockStatusCard snapshot={snapshot({ mode: "MASTER", lcd: ["Modo mestre", "Aguardando..."] })} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-overline text-ink-subtle uppercase">EmptyState</span>
        <div className="rounded-md border border-line bg-surface">
          <EmptyState
            icon={<UsersIcon />}
            title="Nenhum membro com esse filtro"
            description="Nenhum membro só com cartão entre os egressos."
            action={<Button variant="secondary">Limpar filtros</Button>}
          />
        </div>
      </div>
    </div>
  );
}
