import { z } from "zod";

import { isAllowedEmail } from "@/lib/firebase/auth";
import { registrationModeSchema } from "@/lib/firebase/schemas";
import { lockDateISO } from "@/lib/format";

/** Vínculos oferecidos num cadastro novo (egresso é um estado posterior, na página do membro). */
export const NEW_MEMBER_ROLES = [
  { value: "petiano", label: "Petiano(a)" },
  { value: "tutor", label: "Tutor(a)" },
  { value: "visitante", label: "Visitante" },
] as const;

const validEmail = z.email();

export function registrationFormSchema(now: () => Date = () => new Date()) {
  return z
    .object({
      username: z
        .string()
        .trim()
        .min(3, { error: "Digite o nome completo da pessoa." })
        .max(60, { error: "Use até 60 caracteres." }),
      email: z
        .string()
        .trim()
        .min(1, { error: "Digite o e-mail da pessoa.", abort: true })
        .refine((value) => validEmail.safeParse(value).success, {
          error: "Digite um e-mail válido, como voce@alu.ufc.br.",
        }),
      role: z.enum(["petiano", "tutor", "visitante"]),
      validUntil: z.string(),
      mode: registrationModeSchema,
    })
    .superRefine((values, ctx) => {
      if (
        values.role !== "visitante" &&
        validEmail.safeParse(values.email).success &&
        !isAllowedEmail(values.email)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["email"],
          message: "Use o e-mail @alu.ufc.br ou @ufc.br. Só visitantes podem usar outro e-mail.",
        });
      }
      if (values.validUntil && values.validUntil < lockDateISO(now())) {
        ctx.addIssue({
          code: "custom",
          path: ["validUntil"],
          message: "Essa data já passou. Escolha hoje ou uma data futura, ou deixe em branco.",
        });
      }
    });
}

export type RegistrationFormValues = z.infer<ReturnType<typeof registrationFormSchema>>;

export const EMPTY_FORM: RegistrationFormValues = {
  username: "",
  email: "",
  role: "petiano",
  validUntil: "",
  mode: "CARD_AND_FINGER",
};
