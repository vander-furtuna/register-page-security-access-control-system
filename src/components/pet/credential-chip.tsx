import Link from "next/link";

import { FingerIcon, RfidIcon } from "@/components/brand/icons";
import { formatUid } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Credencial guardada na fechadura (`componentes.md` › CredentialChip).
 * Azul é sempre digital (DY50), amarelo é sempre cartão (RC522). A cor nunca vem sozinha.
 *
 * - `finger`: "Digital #12" (`fingerId`).
 * - `rfid`: "Cartão slot 22" ou o UID em grupos de 2 (`cardUID`).
 * - `orphan`: tracejado, está na fechadura sem membro no banco; com `href` vira link "Vincular".
 * - `none`: o membro não tem esse tipo de credencial ("Sem digital", "Sem cartão").
 */
type Kind = "finger" | "rfid";

type CredentialChipProps = {
  kind: Kind;
  state?: "linked" | "orphan" | "none";
  /** ID da digital ou slot da EEPROM. */
  id?: number;
  /** UID do cartão, em qualquer formato (`A3:F2:1C:9D`). Tem prioridade sobre o slot. */
  uid?: string;
  /** Esconde a palavra "Digital"/"Cartão" (ela continua para leitores de tela). */
  hideLabel?: boolean;
  href?: string;
  className?: string;
};

export function formatFingerId(id: number): string {
  return `#${String(id).padStart(2, "0")}`;
}

export function CredentialChip({
  kind,
  state = "linked",
  id,
  uid,
  hideLabel,
  href,
  className,
}: CredentialChipProps) {
  const Icon = kind === "finger" ? FingerIcon : RfidIcon;
  const word = kind === "finger" ? "Digital" : "Cartão";

  if (state === "none") {
    return (
      <span
        className={cn(
          "inline-flex h-[26px] items-center gap-1.5 rounded-sm bg-surface-sunken px-2 text-caption font-medium whitespace-nowrap text-ink-subtle",
          className,
        )}
      >
        {kind === "finger" ? "Sem digital" : "Sem cartão"}
      </span>
    );
  }

  const value = uid
    ? formatUid(uid)
    : id !== undefined
      ? kind === "finger"
        ? formatFingerId(id)
        : `slot ${id}`
      : null;
  const classes = cn(
    "inline-flex h-[26px] items-center gap-1.5 rounded-sm pr-2 pl-1.5 text-caption font-medium whitespace-nowrap",
    state === "orphan"
      ? "border border-dashed border-line-strong bg-transparent text-ink-muted"
      : kind === "finger"
        ? "bg-finger-soft text-finger-ink"
        : "bg-rfid-soft text-rfid-ink",
    href &&
      "outline-none hover:border-offline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    className,
  );

  const content = (
    <>
      <Icon
        size={14}
        className={state === "orphan" ? (kind === "finger" ? "text-finger-ink" : "text-rfid-ink") : undefined}
      />
      <span className={hideLabel ? "sr-only" : undefined}>{word}</span>
      {value ? <span className="font-mono font-semibold">{value}</span> : null}
      {state === "orphan" ? <span className="text-offline-ink">sem dono</span> : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        aria-label={
          state === "orphan" ? `Vincular ${word.toLowerCase()} ${value ?? ""} a um membro` : undefined
        }
      >
        {content}
      </Link>
    );
  }
  return <span className={classes}>{content}</span>;
}
