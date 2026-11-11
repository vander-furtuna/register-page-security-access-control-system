import Link from "next/link";
import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Número com rótulo e contexto (`componentes.md` › StatTile). No máximo 4 por linha.
 * Com `href`, o tile inteiro leva à lista filtrada (ex.: "Negados" → Registros filtrados).
 */
type StatTileProps = {
  label: string;
  icon?: ReactNode;
  value: ReactNode;
  /** Linha de contexto em `caption`, ex.: "34 com digital · 21 com cartão". */
  context?: ReactNode;
  /** Variação com sinal e base de comparação: `{ value: 12, base: "em relação a ontem" }`. */
  delta?: { value: number; base: string; better?: "higher" | "lower" };
  tone?: "default" | "danger";
  href?: string;
  loading?: boolean;
  size?: "default" | "compact";
  className?: string;
};

export function StatTile({
  label,
  icon,
  value,
  context,
  delta,
  tone = "default",
  href,
  loading,
  size = "default",
  className,
}: StatTileProps) {
  const improving = delta ? (delta.better === "lower" ? delta.value < 0 : delta.value > 0) : false;
  const body = (
    <>
      <span className="flex items-center gap-2 text-label text-ink-muted [&_svg]:size-[18px] [&_svg]:shrink-0">
        {icon}
        {label}
      </span>
      {loading ? (
        <Skeleton className="h-[34px] w-16" />
      ) : (
        <span className={cn("font-display text-display", tone === "danger" ? "text-danger-ink" : "text-ink")}>
          {value}
        </span>
      )}
      {delta || context ? (
        <span className="text-caption text-ink-subtle">
          {delta && delta.value !== 0 ? (
            <span className={cn("font-semibold", improving ? "text-lock-ink" : "text-danger-ink")}>
              {delta.value > 0 ? "+" : "−"}
              {Math.abs(delta.value)}
            </span>
          ) : null}
          {delta ? ` ${delta.value === 0 ? "igual " : ""}${delta.base}` : null}
          {delta && context ? " · " : null}
          {context}
        </span>
      ) : null}
    </>
  );

  const classes = cn(
    "flex flex-col gap-2 rounded-md border border-line bg-surface shadow-sm",
    size === "compact" ? "px-4 py-3.5" : "px-6 py-5",
    href &&
      "transition-colors outline-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    className,
  );

  return href ? (
    <Link href={href} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}
