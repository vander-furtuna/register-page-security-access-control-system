import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Botão do PET Lock (`docs/design-system/componentes.md` › Button).
 * - default: primário verde `lock` com texto `on-lock` (nunca branco). No máximo um por tela.
 * - secondary: fundo `surface` + borda `line-strong`. Ações de apoio.
 * - ghost: sem borda. Cancelar, toolbars, menus de linha.
 * - destructive: fundo `danger`. Só dentro de modal de confirmação.
 * - destructive-soft: interromper algo em andamento sem perda de dados.
 */
const buttonVariantsBase = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-transparent font-sans font-semibold whitespace-nowrap transition-[background-color,border-color,color,box-shadow] outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-45 aria-disabled:cursor-not-allowed aria-disabled:opacity-45 aria-invalid:border-danger [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      variant: {
        default: "border-lock bg-lock text-on-lock hover:border-lock-hover hover:bg-lock-hover",
        secondary:
          "border-line-strong bg-surface text-ink hover:bg-surface-hover aria-expanded:bg-surface-hover",
        ghost:
          "bg-transparent text-ink-muted hover:bg-surface-hover hover:text-ink aria-expanded:bg-surface-hover aria-expanded:text-ink",
        destructive: "border-danger bg-danger text-on-danger hover:opacity-90",
        "destructive-soft": "bg-danger-soft text-danger-ink hover:opacity-90",
        link: "h-auto! border-0 px-0! text-lock-ink underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-[13px] [&_svg:not([class*='size-'])]:size-4",
        default: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-[15px]",
        icon: "size-10",
        "icon-sm": "size-8 [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariantsBase>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariantsBase({ variant, size, className }))}
      {...props}
    />
  );
}

/**
 * Classes do botão já resolvidas pelo `cn` (tailwind-merge). Use em links com cara de botão:
 * `<Link className={buttonVariants({ variant: "secondary" })}>`. Sem o merge, `border-transparent`
 * da base e a borda da variante disputariam pela ordem do CSS.
 */
function buttonVariants(props?: Parameters<typeof buttonVariantsBase>[0]) {
  return cn(buttonVariantsBase(props));
}

export { Button, buttonVariants };
