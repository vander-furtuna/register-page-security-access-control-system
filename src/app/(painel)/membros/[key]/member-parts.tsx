"use client";

import { RefreshCwIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { FingerIcon, RfidIcon } from "@/components/brand/icons";
import { CredentialChip, formatFingerId } from "@/components/pet/credential-chip";
import { EmptyState } from "@/components/pet/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatLockDate, formatLockTime, formatUid } from "@/lib/format";
import type { TimedLog } from "@/lib/lock-state";
import { cadastroHref } from "@/lib/member-links";
import {
  dayLabel,
  formatLastAccess,
  logsInPeriod,
  presence,
  type CredentialUsage,
  type Period,
} from "@/lib/members";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Card de credencial

type CredentialCardProps = {
  kind: "finger" | "rfid";
  /** ID da digital ou slot do cartão; ausente = o membro não tem essa credencial. */
  id: number | undefined;
  uid?: string;
  createdAt: Date | null;
  usage: CredentialUsage;
  /** Inventário (firmware 2.1): true = está na memória da fechadura; undefined = sem inventário. */
  inLock: boolean | undefined;
  member: { username: string; email: string };
  active: boolean;
  canRemove: boolean;
  onRemove: () => void;
  now: Date;
};

export function CredentialCard({
  kind,
  id,
  uid,
  createdAt,
  usage,
  inLock,
  member,
  active,
  canRemove,
  onRemove,
  now,
}: CredentialCardProps) {
  const finger = kind === "finger";
  const title = finger ? "Digital" : "Cartão RFID";
  const tile = (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-12 shrink-0 place-items-center rounded-lg",
        finger ? "bg-finger-soft text-finger-ink" : "bg-rfid-soft text-rfid-ink",
      )}
    >
      {finger ? <FingerIcon size={26} /> : <RfidIcon size={26} />}
    </span>
  );

  if (id === undefined) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-md border border-dashed border-line-strong bg-surface p-5">
        <div className="flex items-center gap-3">
          {tile}
          <div>
            <h3 className="font-display text-h3 text-ink">{finger ? "Sem digital" : "Sem cartão"}</h3>
            <p className="text-caption text-ink-muted">
              {finger
                ? "Uma digital de reserva ajuda se o cartão for perdido."
                : "Um cartão de reserva ajuda se a digital falhar."}
            </p>
          </div>
        </div>
        {active ? (
          <Link
            href={cadastroHref(member, finger ? "FINGER_ONLY" : "CARD_ONLY")}
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            {finger ? "Adicionar digital" : "Adicionar cartão"}
          </Link>
        ) : null}
      </div>
    );
  }

  const facts: { label: string; value: string }[] = finger
    ? [
        { label: "ID no sensor", value: formatFingerId(id) },
        {
          label: "Cadastrada em",
          value: createdAt
            ? `${formatLockDate(createdAt)} ${formatLockTime(createdAt, { seconds: false })}`
            : "—",
        },
      ]
    : [
        { label: "UID", value: uid ? formatUid(uid) : "desconhecido" },
        { label: "Slot na EEPROM", value: String(id) },
      ];
  facts.push(
    { label: "Último uso", value: formatLastAccess(usage.lastUsedAt, now) },
    { label: "Usos em 30 dias", value: String(usage.uses30d) },
  );

  return (
    <div className="flex flex-col gap-4 rounded-md border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {tile}
          <div>
            <h3 className="font-display text-h3 text-ink">{title}</h3>
            <p className="text-caption text-ink-muted">{finger ? "Sensor óptico DY50" : "Leitor RC522"}</p>
          </div>
        </div>
        {inLock === true ? (
          <Badge variant="allowed" dot>
            Na fechadura
          </Badge>
        ) : inLock === false ? (
          <Badge variant="pending" dot>
            Fora da fechadura
          </Badge>
        ) : null}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        {facts.map((f) => (
          <div key={f.label} className="flex flex-col gap-0.5">
            <dt className="text-caption text-ink-subtle">{f.label}</dt>
            <dd className="font-mono text-label font-medium text-ink">{f.value}</dd>
          </div>
        ))}
      </dl>
      {active ? (
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={cadastroHref(member, finger ? "FINGER_ONLY" : "CARD_ONLY")}
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <RefreshCwIcon aria-hidden="true" />
            {finger ? "Recadastrar" : "Trocar cartão"}
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="text-danger-ink hover:bg-danger-soft hover:text-danger-ink"
            disabled={!canRemove}
            onClick={onRemove}
          >
            <Trash2Icon aria-hidden="true" />
            {finger ? "Remover digital" : "Remover cartão"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Histórico

const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
];
const MAX_ROWS = 50;

/** `fingerId`: ID da digital do membro, para os registros do firmware 2.0 (que não trazem o ID). */
export function AccessHistory({ logs, now, fingerId }: { logs: TimedLog[]; now: Date; fingerId?: number }) {
  const [period, setPeriod] = useState<Period>("7d");
  const rows = logsInPeriod(logs, period, now);

  return (
    <section
      aria-labelledby="historico"
      className="overflow-hidden rounded-md border border-line bg-surface shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <h2 id="historico" className="font-display text-h2 text-ink">
          Histórico de acessos
        </h2>
        <ToggleGroup
          variant="segmented"
          spacing={1}
          value={[period]}
          onValueChange={(value) => value[0] && setPeriod(value[0] as Period)}
          aria-label="Período do histórico"
        >
          {PERIODS.map((p) => (
            <ToggleGroupItem key={p.value} value={p.value}>
              {p.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          title="Nenhum acesso neste período"
          description="Os acessos desta pessoa na porta aparecem aqui, com a credencial usada."
          className="border-t border-line py-10"
        />
      ) : (
        <div className="relative overflow-x-auto border-t border-line">
          <table className="w-full min-w-[560px] text-body">
            <thead>
              <tr className="bg-surface-sunken">
                {["Dia", "Hora", "Credencial", "Resultado"].map((h) => (
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
            <tbody>
              {rows.slice(0, MAX_ROWS).map((log) => (
                <tr key={log.key} className="h-12 border-t border-line">
                  <td className="px-4 pl-6 font-mono text-label text-ink">
                    {log.at ? dayLabel(log.at, now) : "—"}
                  </td>
                  <td className="px-4 font-mono text-label text-ink">
                    {log.at ? formatLockTime(log.at) : "—"}
                  </td>
                  <td className="px-4">
                    {log.accessType === "fingerId" ? (
                      <CredentialChip
                        kind="finger"
                        id={log.credentialId ?? (log.status === "ALLOWED" ? fingerId : undefined)}
                      />
                    ) : (
                      <CredentialChip kind="rfid" uid={log.cardUID} hideLabel={Boolean(log.cardUID)} />
                    )}
                  </td>
                  <td className="px-4">
                    <Badge variant={log.status === "ALLOWED" ? "allowed" : "denied"} dot>
                      {log.status === "ALLOWED" ? "Liberado" : "Negado"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > MAX_ROWS ? (
            <p className="border-t border-line px-6 py-3 text-label text-ink-muted">
              Mostrando os {MAX_ROWS} mais recentes de {rows.length}. O histórico completo fica em Registros
              de acesso.
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Presença

const WEEKDAYS = ["S", "T", "Q", "Q", "S", "S", "D"];
const WEEKDAY_NAMES = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];
const LEVEL = ["bg-surface-sunken", "bg-lock/25", "bg-lock/50", "bg-lock", "bg-lock-ink"] as const;

export function PresenceMap({ logs, now }: { logs: TimedLog[]; now: Date }) {
  const p = presence(logs, now);
  return (
    <section aria-labelledby="presenca" className="rounded-md border border-line bg-surface shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-4">
        <h2 id="presenca" className="font-display text-h3 text-ink">
          Presença na sala
        </h2>
        <span className="text-caption text-ink-muted">últimas 5 semanas</span>
      </div>
      <div className="flex flex-col gap-4 p-6">
        <div
          role="img"
          aria-label={`Presença nas últimas 5 semanas: ${p.daysPresent} ${p.daysPresent === 1 ? "dia" : "dias"} na sala${p.commonHour ? `, mais comum entre ${p.commonHour}` : ""}.`}
          className="grid grid-cols-7 gap-1.5"
        >
          {WEEKDAYS.map((d, i) => (
            <span key={i} aria-hidden="true" className="text-center text-caption text-ink-subtle">
              {d}
            </span>
          ))}
          {p.weeks.flat().map((cell, i) => (
            <span
              key={cell.iso}
              title={
                cell.future
                  ? undefined
                  : `${WEEKDAY_NAMES[i % 7]} ${cell.iso.slice(8, 10)}/${cell.iso.slice(5, 7)}: ${cell.count} ${cell.count === 1 ? "acesso" : "acessos"}`
              }
              className={cn(
                "aspect-square rounded-sm",
                cell.future ? "border border-dashed border-line" : LEVEL[cell.level],
              )}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 text-caption text-ink-muted" aria-hidden="true">
          menos
          {LEVEL.map((c) => (
            <span key={c} className={cn("size-3 rounded-[3px]", c)} />
          ))}
          mais
        </div>
        <dl className="grid grid-cols-2 gap-4 border-t border-line pt-4">
          <Stat label="Dias na sala" value={String(p.daysPresent)} />
          <Stat label="Horário mais comum" value={p.commonHour ?? "—"} />
        </dl>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-caption text-ink-muted">{label}</dt>
      <dd className="font-display text-display text-ink">{value}</dd>
    </div>
  );
}
