import { LCD_COLUMNS } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Espelho do LCD 16x2 da fechadura (`componentes.md` › LcdMirror). Mostra o texto exatamente
 * como o firmware publicou (sem acentos, 16 colunas); só garante o corte em 16.
 * `lines = null` → tela apagada (sem dado ou sem comunicação há mais de 2 min).
 */
type LcdMirrorProps = {
  lines: readonly [string, string] | null;
  size?: "sm" | "md" | "lg";
  /** Texto do `aria-label` quando o display é uma ilustração (tela de login). */
  label?: string;
  className?: string;
};

const sizes = {
  sm: "min-w-0 px-2 py-1.5 text-[11px] leading-[15px]",
  md: "min-w-[calc(16ch*1.06+28px)] px-3.5 py-2.5 text-lcd",
  lg: "min-w-0 px-[18px] py-3.5 text-[18px] leading-6",
} as const;

export function LcdMirror({ lines, size = "md", label, className }: LcdMirrorProps) {
  const [first, second] = lines ? [lines[0].slice(0, LCD_COLUMNS), lines[1].slice(0, LCD_COLUMNS)] : ["", ""];
  const readable = lines ? `${first} ${second}`.trim() : "";

  return (
    <div
      role="img"
      aria-label={
        label ?? (lines ? `Display da fechadura: ${readable || "em branco"}` : "Display da fechadura apagado")
      }
      data-state={lines ? "on" : "off"}
      className={cn(
        "flex flex-col justify-center rounded-sm font-mono font-semibold tracking-[0.06em] whitespace-pre",
        lines
          ? "bg-[radial-gradient(120%_160%_at_30%_100%,var(--lock-teal)_0%,var(--lock-lime)_55%)] text-lcd-ink shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--lcd-ink)_18%,transparent)]"
          : "bg-lcd-ink text-on-chassis/25",
        sizes[size],
        className,
      )}
    >
      {/* Duas linhas sempre, mesmo vazias, para o display não "pular" de altura. */}
      <span className="block min-h-[1lh]">{first}</span>
      <span className="block min-h-[1lh]">{second}</span>
    </div>
  );
}
