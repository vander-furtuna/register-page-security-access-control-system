"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { useAuth } from "@/components/auth/auth-provider";
import { PageContent } from "@/components/layout/page-content";
import { useLockSnapshot } from "@/lib/firebase/hooks";
import { usePendingRegistration } from "@/lib/firebase/hooks/use-registration";
import { registrationModeSchema } from "@/lib/firebase/schemas";
import { EMPTY_FORM, registrationFormSchema, type RegistrationFormValues } from "@/lib/registration/form";
import { cn } from "@/lib/utils";

import { ModeBanner } from "./mode-banner";
import { RegistrationForm } from "./registration-form";
import { RegistrationPanel } from "./registration-panel";

/**
 * Tela 05 · Novo cadastro. O site envia o pedido; a fechadura grava a credencial e confirma no
 * banco. Só começa com `system/mode === "MASTER"` (cartão mestre aproximado na porta).
 */
export function RegistrationScreen() {
  const auth = useAuth();
  const registration = usePendingRegistration(auth.user?.uid);
  const lock = useLockSnapshot();
  const schema = useMemo(() => registrationFormSchema(), []);
  // Recadastrar / trocar cartão / adicionar credencial chegam com ?nome=&email=&modo=
  const params = useSearchParams();
  const [initial] = useState<RegistrationFormValues>(() => {
    const mode = registrationModeSchema.safeParse(params.get("modo"));
    return {
      ...EMPTY_FORM,
      username: params.get("nome") ?? "",
      email: params.get("email") ?? "",
      mode: mode.success ? mode.data : EMPTY_FORM.mode,
    };
  });
  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial,
    mode: "onTouched",
  });

  const formMode = useWatch({ control: form.control, name: "mode" });
  const formName = useWatch({ control: form.control, name: "username" });

  // Pedido retomado (outra aba, página recarregada): o formulário mostra o que está na porta.
  const request = registration.request;
  useEffect(() => {
    if (!request) return;
    form.reset({
      username: request.username,
      email: request.email,
      mode: request.mode,
      role: request.role === "egresso" ? "petiano" : request.role,
      validUntil: request.validUntil ?? "",
    });
  }, [request, form]);

  const { phase, ready, mode, pending } = registration;
  const locked = phase !== "idle";
  const canSubmit = ready && mode === "MASTER" && !pending && phase === "idle";
  const hint = !ready
    ? "Conferindo o estado da fechadura…"
    : pending && phase === "idle"
      ? "Já há um cadastro em andamento na porta."
      : mode === "MASTER"
        ? "A fechadura já está em Modo mestre. Você terá 2 minutos para concluir na porta."
        : "Aproxime o cartão mestre da fechadura para liberar o botão.";

  return (
    <PageContent>
      <ModeBanner
        ready={ready}
        mode={mode}
        connection={lock.connection}
        request={request}
        live={phase === "sending" || phase === "live" || phase === "confirming"}
        readError={registration.readError}
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <RegistrationForm
          form={form}
          onSubmit={(values) =>
            void registration.start({ ...values, validUntil: values.validUntil || undefined })
          }
          locked={locked}
          canSubmit={canSubmit}
          sending={phase === "sending"}
          hint={hint}
          error={phase === "idle" ? registration.error : undefined}
          // no celular, durante o cadastro o foco é a porta (tela 09)
          className={cn(locked && "hidden lg:block")}
        />
        <RegistrationPanel
          lock={lock}
          registration={registration}
          formMode={formMode}
          formName={formName}
          onCancel={() => void registration.cancel()}
          onRetry={() => registration.reset()}
          onNew={() => {
            form.reset(EMPTY_FORM);
            registration.reset();
          }}
          className="lg:sticky lg:top-24"
        />
      </div>
    </PageContent>
  );
}
