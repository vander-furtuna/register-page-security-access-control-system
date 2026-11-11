import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Pílula de estado (`componentes.md` › StatusPill). Cada cor tem um único significado:
 * online/allowed = verde, denied = vermelho, offline/pending = laranja, master = roxo,
 * neutral = em espera. A cor nunca vem sozinha: use `dot` + palavra.
 */
const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full pr-2.5 pl-2 text-xs leading-4 font-semibold whitespace-nowrap focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&>svg]:pointer-events-none [&>svg]:size-3.5!",
  {
    variants: {
      variant: {
        neutral: "bg-surface-sunken text-ink-muted",
        online: "bg-lock-soft text-lock-ink",
        allowed: "bg-lock-soft text-lock-ink",
        denied: "bg-danger-soft text-danger-ink",
        offline: "bg-offline-soft text-offline-ink",
        pending: "bg-offline-soft text-offline-ink",
        master: "bg-master-soft text-master",
        finger: "bg-finger-soft text-finger-ink",
        rfid: "bg-rfid-soft text-rfid-ink",
        outline: "border border-line-strong text-ink",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

type BadgeProps = useRender.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    /** Mostra o ponto colorido à esquerda. */
    dot?: boolean;
    /** Pulsa o ponto: só para o que está acontecendo agora (online, Modo mestre). */
    live?: boolean;
  };

function Badge({ className, variant = "neutral", dot, live, render, children, ...props }: BadgeProps) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
        children: (
          <>
            {dot || live ? (
              <span
                aria-hidden="true"
                data-slot="badge-dot"
                className={cn(
                  "size-2 flex-none rounded-full bg-current",
                  live && "animate-pulse motion-reduce:animate-none",
                )}
              />
            ) : null}
            {children}
          </>
        ),
      },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants };
