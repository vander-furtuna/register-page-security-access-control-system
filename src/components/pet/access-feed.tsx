import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { LogRow } from "@/lib/access-logs";
import { formatLockTime } from "@/lib/format";
import { initials } from "@/lib/member-links";
import { dayLabel } from "@/lib/members";
import { cn } from "@/lib/utils";

import { CredentialChip, formatFingerId } from "./credential-chip";

/** Chip da credencial usada num registro: digital com ID (quando se sabe) ou cartão com UID. */
export function LogCredential({ row }: { row: LogRow }) {
  if (row.accessType === "fingerId") {
    // firmware 2.0 não grava o ID da digital nos negados: o chip fica só com a palavra
    return <CredentialChip kind="finger" id={row.fingerId} />;
  }
  return row.cardUID ? (
    <CredentialChip kind="rfid" uid={row.cardUID} hideLabel />
  ) : (
    <CredentialChip kind="rfid" />
  );
}

/** Atalho da observação: cadastrar cartão desconhecido ou vincular credencial sem dono. */
export function LogShortcut({ row }: { row: LogRow }) {
  const linkClass =
    "rounded-sm text-label font-medium text-lock-ink underline underline-offset-2 outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-ring";
  if (row.kind === "unknown-card") {
    return (
      <Link href="/cadastro?modo=CARD_ONLY" className={linkClass}>
        Cadastrar este cartão
      </Link>
    );
  }
  if (row.kind === "orphan") {
    return (
      <Link href="/credenciais" className={linkClass}>
        {row.accessType === "fingerId" && row.fingerId !== undefined
          ? `Vincular digital ${formatFingerId(row.fingerId)}`
          : "Vincular a um membro"}
      </Link>
    );
  }
  return null;
}

function Avatar({ row }: { row: LogRow }) {
  return row.kind === "member" ? (
    <span
      aria-hidden="true"
      className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-sunken font-display text-caption font-semibold text-ink-muted"
    >
      {initials(row.displayName)}
    </span>
  ) : (
    <span
      aria-hidden="true"
      className="grid size-8 shrink-0 place-items-center rounded-full border border-dashed border-line-strong font-display text-caption font-semibold text-ink-muted"
    >
      ?
    </span>
  );
}

/**
 * Lista cronológica de entradas (`componentes.md` › AccessFeed). Negado de quem não é membro
 * fica com o nome em `danger-ink`; evento que chegou depois da queda mostra "Chegou às …".
 */
export function AccessFeed({ rows, now, className }: { rows: LogRow[]; now: Date; className?: string }) {
  return (
    <ul className={cn("divide-y divide-line", className)}>
      {rows.map((row) => {
        const unknown = row.status === "DENIED" && row.kind !== "member";
        const time = row.at ? formatLockTime(row.at) : "--:--:--";
        const day = row.at ? dayLabel(row.at, now) : "";
        return (
          <li key={row.key} className="flex items-center gap-3 px-6 py-3">
            <Avatar row={row} />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              {row.kind === "member" && row.memberKey ? (
                <Link
                  href={`/membros/${row.memberKey}`}
                  className="truncate rounded-sm font-semibold text-ink outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {row.displayName}
                </Link>
              ) : (
                <span className={cn("truncate font-semibold", unknown ? "text-danger-ink" : "text-ink")}>
                  {row.displayName}
                </span>
              )}
              <span className="flex flex-wrap items-center gap-2">
                <LogCredential row={row} />
                <LogShortcut row={row} />
                {row.late ? (
                  <span className="text-caption text-ink-subtle">registrado sem internet</span>
                ) : null}
              </span>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="font-mono text-label text-ink-muted">
                {day !== "hoje" ? <span className="mr-1">{day}</span> : null}
                {time}
              </span>
              {row.late && row.arrivedAt ? (
                <Badge variant="pending" dot>
                  Chegou às {formatLockTime(row.arrivedAt, { seconds: false })}
                </Badge>
              ) : (
                <Badge variant={row.status === "ALLOWED" ? "allowed" : "denied"} dot>
                  {row.status === "ALLOWED" ? "Liberado" : "Negado"}
                </Badge>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
