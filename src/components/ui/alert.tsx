import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Alerta em bloco (`componentes.md` › Alert).
 * offline: sempre diga que a porta segue funcionando. danger: use `role="alert"` (padrão desta variante).
 */
const alertVariants = cva(
  "group/alert relative flex w-full items-start gap-3 rounded-md px-4 py-3 text-left text-[13px] leading-[18px] [&>svg]:mt-px [&>svg]:shrink-0 [&>svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      variant: {
        info: "bg-surface-sunken text-ink-muted",
        offline: "bg-offline-soft text-offline-ink",
        master: "bg-master-soft text-master",
        danger: "bg-danger-soft text-danger-ink",
        success: "bg-lock-soft text-lock-ink",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  },
);

function Alert({
  className,
  variant = "info",
  role,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      data-variant={variant}
      role={role ?? (variant === "danger" ? "alert" : "status")}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-content" className={cn("min-w-0 flex-1", className)} {...props} />;
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-title" className={cn("font-semibold", className)} {...props} />;
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("mt-0.5 text-ink-muted [&_a]:underline [&_a]:underline-offset-3", className)}
      {...props}
    />
  );
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn("ml-auto flex shrink-0 items-center gap-2 self-center", className)}
      {...props}
    />
  );
}

export { Alert, AlertContent, AlertTitle, AlertDescription, AlertAction };
