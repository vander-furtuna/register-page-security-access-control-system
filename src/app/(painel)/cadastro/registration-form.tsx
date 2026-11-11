"use client";

import { CircleAlertIcon, Loader2Icon, LockKeyholeOpenIcon } from "lucide-react";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";

import { MethodPicker } from "@/components/pet/method-picker";
import { Alert, AlertContent, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { lcdName, lcdNameChanges } from "@/lib/format";
import { NEW_MEMBER_ROLES, type RegistrationFormValues } from "@/lib/registration/form";
import { cn } from "@/lib/utils";

type RegistrationFormProps = {
  form: UseFormReturn<RegistrationFormValues>;
  onSubmit: (values: RegistrationFormValues) => void;
  /** Pedido em andamento ou com resultado: campos travados. */
  locked: boolean;
  canSubmit: boolean;
  sending: boolean;
  /** Por que o botão está desabilitado (ou o que vai acontecer ao clicar). */
  hint: string;
  error?: string;
  className?: string;
};

const required = <span className="text-danger-ink">*</span>;

export function RegistrationForm({
  form,
  onSubmit,
  locked,
  canSubmit,
  sending,
  hint,
  error,
  className,
}: RegistrationFormProps) {
  const { errors } = form.formState;
  const name = useWatch({ control: form.control, name: "username" });
  const lcd = lcdName(name ?? "");

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
      className={cn("overflow-hidden rounded-md border border-line bg-surface shadow-sm", className)}
    >
      <fieldset disabled={locked || sending} className="contents">
        <SectionTitle id="quem">1. Quem vai ter acesso</SectionTitle>
        <div className="grid gap-x-6 gap-y-5 p-6 sm:grid-cols-2">
          <Field data-invalid={errors.username ? "true" : undefined}>
            <FieldLabel htmlFor="username">Nome completo {required}</FieldLabel>
            <Input
              id="username"
              autoComplete="off"
              aria-invalid={errors.username ? true : undefined}
              aria-describedby="username-help"
              {...form.register("username")}
            />
            {errors.username ? (
              <FieldError id="username-help">{errors.username.message}</FieldError>
            ) : (
              <FieldDescription id="username-help">
                {lcd ? (
                  <>
                    No display aparece <span className="font-mono">“{lcd}”</span>
                    {lcdNameChanges(name) ? " (até 16 caracteres, sem acento)." : "."}
                  </>
                ) : (
                  "O display da porta mostra até 16 caracteres, sem acento."
                )}
              </FieldDescription>
            )}
          </Field>

          <Field data-invalid={errors.email ? "true" : undefined}>
            <FieldLabel htmlFor="email">E-mail institucional {required}</FieldLabel>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="off"
              placeholder="voce@alu.ufc.br"
              aria-invalid={errors.email ? true : undefined}
              aria-describedby="email-help"
              {...form.register("email")}
            />
            {errors.email ? (
              <FieldError id="email-help">{errors.email.message}</FieldError>
            ) : (
              <FieldDescription id="email-help">Identifica o membro no painel.</FieldDescription>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="role">Vínculo</FieldLabel>
            <Controller
              control={form.control}
              name="role"
              render={({ field }) => (
                <Select
                  items={NEW_MEMBER_ROLES}
                  value={field.value}
                  onValueChange={(value) => value && field.onChange(value)}
                  disabled={locked || sending}
                >
                  <SelectTrigger id="role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NEW_MEMBER_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field data-invalid={errors.validUntil ? "true" : undefined}>
            <FieldLabel htmlFor="validUntil">Acesso válido até</FieldLabel>
            <Input
              id="validUntil"
              type="date"
              aria-invalid={errors.validUntil ? true : undefined}
              aria-describedby="validUntil-help"
              {...form.register("validUntil")}
            />
            {errors.validUntil ? (
              <FieldError id="validUntil-help">{errors.validUntil.message}</FieldError>
            ) : (
              <FieldDescription id="validUntil-help">
                Em branco, sem data de término. Visitantes podem ter acesso por período.
              </FieldDescription>
            )}
          </Field>
        </div>

        <SectionTitle id="como" className="border-t">
          2. Como vai abrir a porta
        </SectionTitle>
        <div className="flex flex-col gap-6 p-6">
          <Controller
            control={form.control}
            name="mode"
            render={({ field }) => (
              <MethodPicker
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                disabled={locked || sending}
                labelledBy="como"
              />
            )}
          />

          {!locked ? (
            <div className="flex flex-col gap-3">
              {error ? (
                <Alert variant="danger">
                  <CircleAlertIcon aria-hidden="true" />
                  <AlertContent>
                    <AlertDescription className="mt-0 text-danger-ink">{error}</AlertDescription>
                  </AlertContent>
                </Alert>
              ) : null}
              <Button
                type="submit"
                size="lg"
                className="w-full sm:w-auto sm:self-start"
                disabled={!canSubmit || sending}
                aria-describedby="submit-hint"
              >
                {sending ? (
                  <>
                    <Loader2Icon aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
                    Enviando à fechadura…
                  </>
                ) : (
                  <>
                    <LockKeyholeOpenIcon aria-hidden="true" />
                    Iniciar cadastro na fechadura
                  </>
                )}
              </Button>
              <p id="submit-hint" className="text-caption text-ink-muted">
                {hint}
              </p>
            </div>
          ) : null}
        </div>
      </fieldset>
    </form>
  );
}

function SectionTitle({ id, children, className }: { id: string; children: string; className?: string }) {
  return (
    <h2
      id={id}
      className={cn(
        "border-b border-line px-6 py-4 font-display text-[16px] leading-6 font-semibold text-ink",
        className,
      )}
    >
      {children}
    </h2>
  );
}
