import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * O que mostrar quando uma área está vazia (`componentes.md` › EmptyState): o que ela vai
 * conter e, se houver, a ação que a preenche. Vazio por filtro: diga qual filtro e ofereça
 * "Limpar filtros" como `action`.
 */
type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  /** `h2` quando o estado vazio é o conteúdo principal da página; `h3` dentro de um card. */
  headingLevel?: 2 | 3;
  className?: string;
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  headingLevel = 3,
  className,
}: EmptyStateProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-12 text-center", className)}>
      {icon ? (
        <span
          aria-hidden="true"
          className="grid size-12 place-items-center rounded-lg bg-surface-sunken text-ink-muted [&_svg]:size-6"
        >
          {icon}
        </span>
      ) : null}
      <Heading className="font-display text-[16px] leading-6 font-semibold text-ink">{title}</Heading>
      {description ? <p className="max-w-[360px] text-body text-ink-muted">{description}</p> : null}
      {action ? <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
