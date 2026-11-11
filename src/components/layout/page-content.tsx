import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Área de conteúdo de uma tela: até 1280px, gutter de 32px (16px no celular). */
export function PageContent({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto flex w-full max-w-[1280px] flex-col gap-6 p-4 sm:p-8", className)}>
      {children}
    </div>
  );
}
