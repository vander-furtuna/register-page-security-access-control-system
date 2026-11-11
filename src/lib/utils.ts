import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * O tailwind-merge não conhece a escala tipográfica do design system (`text-h1`, `text-label`…)
 * e trataria essas classes como cor, apagando `text-ink` e afins. Registramos os tamanhos aqui.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        "display-xl",
        "display",
        "h1",
        "h2",
        "h3",
        "body-lg",
        "body",
        "label",
        "caption",
        "overline",
        "lcd",
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
