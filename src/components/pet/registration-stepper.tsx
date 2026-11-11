import { CheckIcon, XIcon } from "lucide-react";

import type { StepView } from "@/lib/registration/steps";
import { cn } from "@/lib/utils";

/**
 * Passos do cadastro (`componentes.md` › RegistrationStepper): feito (verde, check), ativo
 * (anel pulsante `lock-ink`), erro (`danger`), pendente (cinza) e instrução (firmware 2.0:
 * o gesto a fazer, sem afirmar que a porta já chegou lá).
 */
export function RegistrationStepper({ steps, className }: { steps: StepView[]; className?: string }) {
  return (
    <ol className={cn("flex flex-col", className)}>
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        return (
          <li
            key={step.id}
            aria-current={step.state === "active" ? "step" : undefined}
            className={cn(
              "relative grid grid-cols-[32px_1fr] gap-4",
              !last && "pb-6",
              // linha que liga os passos
              !last &&
                "before:absolute before:top-[34px] before:bottom-0.5 before:left-[15px] before:w-0.5 before:content-['']",
              !last && (step.state === "done" ? "before:bg-lock" : "before:bg-line"),
            )}
          >
            <span
              className={cn(
                "grid size-8 place-items-center rounded-full border font-mono text-label font-semibold",
                step.state === "done" && "border-lock bg-lock text-on-lock",
                step.state === "active" &&
                  "animate-[pl-ring_1.6s_ease-out_infinite] border-2 border-lock-ink bg-surface text-lock-ink motion-reduce:animate-none",
                step.state === "error" && "border-danger bg-danger text-on-danger",
                (step.state === "pending" || step.state === "instruction") &&
                  "border-line bg-surface-sunken text-ink-subtle",
              )}
            >
              {step.state === "done" ? (
                <CheckIcon aria-hidden="true" className="size-4" />
              ) : step.state === "error" ? (
                <XIcon aria-hidden="true" className="size-4" />
              ) : (
                index + 1
              )}
            </span>
            <div className="min-w-0 pt-[5px]">
              <p
                className={cn(
                  "text-body font-semibold",
                  step.state === "pending" ? "text-ink-muted" : "text-ink",
                )}
              >
                {step.title}
                <span className="sr-only">
                  {step.state === "done"
                    ? " (feito)"
                    : step.state === "active"
                      ? " (agora)"
                      : step.state === "error"
                        ? " (falhou)"
                        : ""}
                </span>
              </p>
              <p className="mt-0.5 text-label font-normal text-ink-muted">{step.description}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
