import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Badge } from "@/components/ui/badge";

// Placeholder da fase 0. A Visão geral (tela 02) entra na fase 4 e o cadastro volta na fase 2
// (a lógica da v1 está em `release/v1:src/app/page.tsx`).
export default function Home() {
  const isDev = process.env.NODE_ENV !== "production";

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-4 py-12">
      <div className="flex items-center justify-between gap-4">
        <Logo height={40} priority />
        <ThemeToggle />
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-line bg-surface p-6 shadow-sm">
        <Badge variant="pending" dot className="self-start">
          Em construção
        </Badge>
        <h1 className="font-display text-h1 text-ink">Painel PET Lock v2</h1>
        <p className="text-body-lg text-ink-muted">
          A nova base do painel está pronta. As telas chegam nas próximas fases: o cadastro de membros volta
          na fase 2.
        </p>
        <p className="text-body text-ink-muted">
          A fechadura continua funcionando sozinha: digitais e cartões são validados na porta, sem depender
          deste site.
        </p>
        {isDev ? (
          <Link
            href="/dev/ui"
            className="self-start text-label text-lock-ink underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Ver componentes em /dev/ui
          </Link>
        ) : null}
      </div>
    </main>
  );
}
