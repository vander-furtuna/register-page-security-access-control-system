import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Pílula de estado (`componentes.md` › StatusPill). Cada cor tem um único significado.
 * `live` (ponto pulsando) só para o que está acontecendo agora: online e Modo mestre.
 * `onChassis`: versão para o fundo `chassis` (sidebar, topo do card da fechadura).
 */
export type PillStatus = "online" | "offline" | "master" | "standby" | "allowed" | "denied" | "pending";

const config: Record<
  PillStatus,
  {
    variant: "online" | "offline" | "master" | "neutral" | "allowed" | "denied" | "pending";
    label: string;
    live?: boolean;
  }
> = {
  online: { variant: "online", label: "Online", live: true },
  offline: { variant: "offline", label: "Offline" },
  master: { variant: "master", label: "Modo mestre", live: true },
  standby: { variant: "neutral", label: "Em espera" },
  allowed: { variant: "allowed", label: "Liberado" },
  denied: { variant: "denied", label: "Negado" },
  pending: { variant: "pending", label: "Pendente" },
};

// No chassis as versões -soft somem; o texto vem do token misturado com on-chassis (contraste ≥ 4.5:1).
const onChassisTone: Record<PillStatus, string> = {
  online: "text-lock",
  offline: "text-[color-mix(in_oklch,var(--offline)_70%,var(--on-chassis))]",
  master: "text-[color-mix(in_oklch,var(--master)_45%,var(--on-chassis))]",
  standby: "text-on-chassis-muted",
  allowed: "text-lock",
  denied: "text-[color-mix(in_oklch,var(--danger)_60%,var(--on-chassis))]",
  pending: "text-[color-mix(in_oklch,var(--offline)_70%,var(--on-chassis))]",
};

type StatusPillProps = {
  status: PillStatus;
  /** Troca o texto padrão ("Online", "Modo mestre"…), ex.: o tempo restante do cadastro. */
  children?: React.ReactNode;
  onChassis?: boolean;
  size?: "sm" | "default";
  className?: string;
};

export function StatusPill({ status, children, onChassis, size = "default", className }: StatusPillProps) {
  const { variant, label, live } = config[status];
  return (
    <Badge
      variant={variant}
      dot={!live}
      live={live}
      className={cn(
        size === "sm" && "h-5 gap-1 pr-2 pl-1.5 text-[11px] [&_[data-slot=badge-dot]]:size-1.5",
        onChassis && ["bg-on-chassis/10", onChassisTone[status]],
        className,
      )}
    >
      {children ?? label}
    </Badge>
  );
}
