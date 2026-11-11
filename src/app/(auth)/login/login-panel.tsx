"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlertIcon, InfoIcon, Loader2Icon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { useAuth } from "@/components/auth/auth-provider";
import { NoPermission } from "@/components/auth/auth-screens";
import { Alert, AlertContent, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  authErrorMessage,
  requestPasswordReset,
  safeNext,
  signInWithGoogle,
  signInWithPassword,
} from "@/lib/firebase/auth";

const schema = z.object({
  email: z.email({ error: "Digite um e-mail válido, como voce@alu.ufc.br." }),
  password: z.string().min(1, { error: "Digite sua senha." }),
});

type Values = z.infer<typeof schema>;

export function LoginPanel() {
  const auth = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [pending, setPending] = useState<"google" | "password" | "reset" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });
  const { errors } = form.formState;

  useEffect(() => {
    if (auth.status === "admin") router.replace(next);
  }, [auth.status, next, router]);

  if (auth.status === "no-permission") return <NoPermission compact />;

  const checking = auth.status === "admin" || (auth.status === "loading" && auth.user !== null);

  async function run(kind: "google" | "password", action: () => Promise<unknown>) {
    setError(null);
    setPending(kind);
    try {
      await action();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setPending(null);
    }
  }

  async function resetPassword() {
    const email = form.getValues("email");
    const parsed = schema.shape.email.safeParse(email);
    if (!parsed.success) {
      form.setError("email", { message: "Digite seu e-mail aqui para receber o link de nova senha." });
      form.setFocus("email");
      return;
    }
    setPending("reset");
    try {
      await requestPasswordReset(parsed.data);
      toast.success("Link enviado", {
        description: "Se houver uma conta com esse e-mail, chega um link para criar uma nova senha.",
      });
    } catch (err) {
      toast.error("Não foi possível enviar o link", { description: authErrorMessage(err) ?? undefined });
    } finally {
      setPending(null);
    }
  }

  const busy = pending !== null || checking;

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) =>
        run("password", () => signInWithPassword(values.email, values.password)),
      )}
      className="flex w-full max-w-[400px] flex-col gap-6"
    >
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[32px] leading-[38px] font-bold tracking-[-0.02em] text-ink">
          Entrar no painel
        </h1>
        <p className="text-body text-ink-muted">Acesso para petianos e tutores com conta da UFC.</p>
      </div>

      {auth.status === "error" ? (
        <Alert variant="danger">
          <CircleAlertIcon aria-hidden="true" />
          <AlertContent>
            <AlertDescription className="mt-0 text-danger-ink">
              O login não está disponível neste ambiente: o Firebase não foi configurado.
            </AlertDescription>
          </AlertContent>
        </Alert>
      ) : null}

      {checking ? (
        <p role="status" className="flex items-center gap-2 text-body text-ink-muted">
          <Loader2Icon aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
          Conferindo seu acesso…
        </p>
      ) : null}

      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="w-full gap-3"
        disabled={busy}
        onClick={() => run("google", signInWithGoogle)}
      >
        {pending === "google" ? (
          <Loader2Icon aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
        ) : (
          <GoogleMark />
        )}
        Entrar com Google
      </Button>

      <div className="flex items-center gap-3 text-caption text-ink-subtle">
        <span aria-hidden="true" className="h-px flex-1 bg-line" />
        ou com e-mail
        <span aria-hidden="true" className="h-px flex-1 bg-line" />
      </div>

      <Field data-invalid={errors.email ? "true" : undefined}>
        <FieldLabel htmlFor="email">E-mail institucional</FieldLabel>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="voce@alu.ufc.br"
          className="h-12"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...form.register("email")}
        />
        {errors.email ? <FieldError id="email-error">{errors.email.message}</FieldError> : null}
      </Field>

      <Field data-invalid={errors.password ? "true" : undefined}>
        <div className="flex items-center justify-between gap-2">
          <FieldLabel htmlFor="password">Senha</FieldLabel>
          <button
            type="button"
            onClick={resetPassword}
            disabled={busy}
            className="rounded-sm text-label font-medium text-lock-ink underline underline-offset-2 outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-45"
          >
            Esqueci a senha
          </button>
        </div>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          className="h-12"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? "password-error" : undefined}
          {...form.register("password")}
        />
        {errors.password ? <FieldError id="password-error">{errors.password.message}</FieldError> : null}
      </Field>

      {error ? (
        <Alert variant="danger">
          <CircleAlertIcon aria-hidden="true" />
          <AlertContent>
            <AlertDescription className="mt-0 text-danger-ink">{error}</AlertDescription>
          </AlertContent>
        </Alert>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={busy} aria-disabled={busy}>
        {pending === "password" ? (
          <>
            <Loader2Icon aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
            Entrando…
          </>
        ) : (
          "Entrar"
        )}
      </Button>

      <Alert variant="info">
        <InfoIcon aria-hidden="true" />
        <AlertContent>
          <AlertDescription className="mt-0">
            Ainda não tem acesso? Peça a um administrador do PET para cadastrar você na fechadura.
          </AlertDescription>
        </AlertContent>
      </Alert>
    </form>
  );
}

/** Marca do Google com as cores oficiais (exigência das diretrizes de marca do Google). */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z"
      />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8z" />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.8 3.6-4.9 6.7-4.9z"
      />
    </svg>
  );
}
