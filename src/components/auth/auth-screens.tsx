"use client";

import { CircleAlertIcon, Loader2Icon, LogOutIcon, ShieldOffIcon } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Alert, AlertContent, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { useAuth } from "./auth-provider";

/** Tela inteira enquanto a sessão e a permissão são checadas. */
export function AuthLoading() {
  return (
    <div className="grid min-h-svh place-items-center bg-background p-4">
      <div className="flex flex-col items-center gap-4" role="status" aria-live="polite">
        <Logo height={40} priority />
        <p className="flex items-center gap-2 text-body text-ink-muted">
          <Loader2Icon aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
          Carregando o painel…
        </p>
      </div>
    </div>
  );
}

/**
 * Logado, mas sem `admins/{uid}`. Não há cadastro aberto: quem não é admin pede acesso
 * a um administrador do PET (`docs/produto/telas.md` › 01).
 */
export function NoPermission({ compact = false }: { compact?: boolean }) {
  const auth = useAuth();
  const email = auth.user?.email;
  const body = (
    <div className="flex w-full max-w-[400px] flex-col gap-6">
      <span
        aria-hidden="true"
        className="grid size-12 place-items-center rounded-lg bg-danger-soft text-danger-ink"
      >
        <ShieldOffIcon className="size-6" />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[28px] leading-[34px] font-bold tracking-[-0.02em] text-ink">
          Sem permissão para o painel
        </h1>
        <p className="text-body-lg text-ink-muted">
          {email ? (
            <>
              A conta <span className="font-semibold text-ink">{email}</span> ainda não é administradora.
            </>
          ) : (
            "Sua conta ainda não é administradora."
          )}{" "}
          Peça a um administrador do PET para liberar seu acesso.
        </p>
      </div>
      <Alert variant="info">
        <CircleAlertIcon aria-hidden="true" />
        <AlertContent>
          <AlertDescription className="mt-0">
            A fechadura não depende deste painel: se você tem digital ou cartão cadastrado, a porta continua
            abrindo normalmente.
          </AlertDescription>
        </AlertContent>
      </Alert>
      <Button variant="secondary" size="lg" className="w-full" onClick={() => void auth.signOut()}>
        <LogOutIcon aria-hidden="true" />
        Sair e usar outra conta
      </Button>
    </div>
  );
  if (compact) return body;
  return <div className="grid min-h-svh place-items-center bg-background p-4">{body}</div>;
}

/** Firebase sem configuração ou falha ao checar a permissão. */
export function AuthFailure({ error }: { error: Error }) {
  const auth = useAuth();
  const missingConfig = error.message.includes("Configuração do Firebase ausente");
  return (
    <div className="grid min-h-svh place-items-center bg-background p-4">
      <div className="flex w-full max-w-[440px] flex-col gap-4">
        <Logo height={36} />
        <Alert variant="danger">
          <CircleAlertIcon aria-hidden="true" />
          <AlertContent>
            <AlertTitle>Não foi possível abrir o painel</AlertTitle>
            <AlertDescription>
              {missingConfig
                ? "O Firebase não está configurado neste ambiente. Confira as variáveis NEXT_PUBLIC_FIREBASE_* ou use NEXT_PUBLIC_USE_EMULATOR=true."
                : "A conexão com o banco falhou ao checar sua permissão. Confira a internet e tente de novo. A porta continua funcionando normalmente."}
            </AlertDescription>
          </AlertContent>
        </Alert>
        <div className="flex gap-2">
          <Button onClick={() => window.location.reload()}>Tentar de novo</Button>
          {auth.user ? (
            <Button variant="ghost" onClick={() => void auth.signOut()}>
              Sair
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
