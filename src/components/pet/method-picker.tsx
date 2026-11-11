"use client";

import { FingerIcon, RfidIcon } from "@/components/brand/icons";
import type { RegistrationMode } from "@/lib/firebase/types";
import { cn } from "@/lib/utils";

/**
 * Escolha do modo de cadastro (`componentes.md` › MethodPicker), 1:1 com
 * `pendingRegistration/current.mode`. Cards-rádio nativos (teclado e leitor de tela de graça);
 * selecionado = borda 2px `lock-ink` + rádio preenchido, nunca só cor de fundo.
 */
const OPTIONS: {
  value: RegistrationMode;
  title: string;
  description: string;
  icons: ("rfid" | "finger")[];
  recommended?: boolean;
}[] = [
  {
    value: "CARD_AND_FINGER",
    title: "Cartão + digital",
    description: "Dois passos na porta. Se a digital falhar, o cartão continua valendo.",
    icons: ["rfid", "finger"],
    recommended: true,
  },
  {
    value: "CARD_ONLY",
    title: "Só cartão",
    description: "Aproximar a carteirinha ou uma tag do leitor RFID.",
    icons: ["rfid"],
  },
  {
    value: "FINGER_ONLY",
    title: "Só digital",
    description: "Encostar o mesmo dedo duas vezes no sensor.",
    icons: ["finger"],
  },
];

type MethodPickerProps = {
  name: string;
  value: RegistrationMode;
  onChange: (value: RegistrationMode) => void;
  disabled?: boolean;
  /** id do título da seção ("2. Como vai abrir a porta"), para o `aria-labelledby`. */
  labelledBy?: string;
};

export function MethodPicker({ name, value, onChange, disabled, labelledBy }: MethodPickerProps) {
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="grid gap-3 sm:grid-cols-3">
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              "relative flex cursor-pointer flex-col gap-3 rounded-md border bg-surface p-4 transition-colors",
              "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
              selected
                ? "border-lock-ink shadow-[inset_0_0_0_1px_var(--lock-ink)]"
                : "border-line-strong hover:bg-surface-hover",
              disabled && "cursor-not-allowed opacity-70 hover:bg-surface",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={selected}
              disabled={disabled}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={cn(
                "absolute top-3.5 right-3.5 size-[18px] rounded-full border-line-strong bg-surface",
                selected ? "border-[5px] border-lock-ink" : "border-[1.5px]",
              )}
            />
            <span className="flex gap-1.5" aria-hidden="true">
              {option.icons.map((icon) => (
                <span
                  key={icon}
                  className={cn(
                    "grid size-8 place-items-center rounded-md",
                    icon === "finger" ? "bg-finger-soft text-finger-ink" : "bg-rfid-soft text-rfid-ink",
                  )}
                >
                  {icon === "finger" ? <FingerIcon size={18} /> : <RfidIcon size={18} />}
                </span>
              ))}
            </span>
            <span className="flex flex-col gap-1 pr-6">
              <span className="text-body font-semibold text-ink">{option.title}</span>
              <span className="text-caption text-ink-muted">{option.description}</span>
            </span>
            {option.recommended ? (
              <span className="self-start rounded-full bg-lock-soft px-2.5 py-1 text-caption font-semibold text-lock-ink">
                Recomendado
              </span>
            ) : null}
          </label>
        );
      })}
    </div>
  );
}
