import type { Metadata } from "next";
import { Suspense } from "react";

import { FingerIcon, RfidIcon } from "@/components/brand/icons";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LcdMirror } from "@/components/pet/lcd-mirror";

import { LoginPanel } from "./login-panel";

export const metadata: Metadata = { title: "Entrar" };

/** Tela 01 · Login (`docs/design/telas/01-login.png`). */
export default function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col bg-background lg:flex-row">
      {/* Celular e tablet: faixa chassis só com o logo. */}
      <header className="flex items-center bg-chassis px-6 py-5 lg:hidden">
        <Logo tone="dark" height={40} priority />
      </header>

      <aside className="hidden min-h-svh flex-1 flex-col gap-10 bg-chassis px-16 py-14 text-on-chassis lg:flex">
        <Logo tone="dark" height={64} priority />
        <div className="mt-auto flex max-w-[460px] flex-col gap-6">
          {/* Ilustração da porta: sem sessão não lemos o banco, então não há status ao vivo aqui. */}
          <div className="flex flex-col gap-4 rounded-lg bg-chassis-raised p-5">
            <span className="font-display text-h3">Porta da sala do PET</span>
            <LcdMirror
              lines={["Aguardando", "acesso..."]}
              size="lg"
              label="Ilustração do display da fechadura: Aguardando acesso"
              className="w-full"
            />
            <div className="grid grid-cols-2 gap-3">
              <span className="flex items-center gap-2.5 rounded-md bg-on-chassis/5 p-3 text-label">
                <span className="grid size-8 place-items-center rounded-md bg-finger-soft text-finger-ink">
                  <FingerIcon size={18} />
                </span>
                Digital
              </span>
              <span className="flex items-center gap-2.5 rounded-md bg-on-chassis/5 p-3 text-label">
                <span className="grid size-8 place-items-center rounded-md bg-rfid-soft text-rfid-ink">
                  <RfidIcon size={18} />
                </span>
                Cartão RFID
              </span>
            </div>
          </div>
          <p className="text-body leading-[22px] text-on-chassis-muted">
            A fechadura continua funcionando sem internet. Este painel cadastra membros, identifica digitais e
            cartões e mostra quem entrou na sala.
          </p>
        </div>
        <span className="text-caption text-on-chassis-muted">
          PET Engenharia de Computação · UFC Campus Sobral
        </span>
      </aside>

      <main className="relative flex flex-1 items-center justify-center px-4 py-10 sm:px-8 lg:py-14">
        <ThemeToggle className="absolute top-4 right-4" />
        <Suspense fallback={null}>
          <LoginPanel />
        </Suspense>
      </main>
    </div>
  );
}
