"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react";

/**
 * Toast do PET Lock (`componentes.md` › Toast): fundo `chassis`, canto inferior direito,
 * barra lateral `lock` (sucesso/liberado) ou `danger` (erro/negado), no máximo 3, some em 5 s.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={(resolvedTheme as ToasterProps["theme"]) ?? "light"}
      position="bottom-right"
      visibleToasts={3}
      duration={5000}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-[18px] text-lock" />,
        info: <InfoIcon className="size-[18px]" />,
        warning: <TriangleAlertIcon className="size-[18px] text-offline" />,
        error: <OctagonXIcon className="size-[18px] text-danger" />,
        loading: <Loader2Icon className="size-[18px] animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--chassis)",
          "--normal-text": "var(--on-chassis)",
          "--normal-border": "var(--chassis-raised)",
          "--border-radius": "var(--radius-md)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "font-sans shadow-md border-l-4!",
          description: "text-on-chassis-muted!",
          success: "border-l-lock!",
          error: "border-l-danger!",
          warning: "border-l-offline!",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
