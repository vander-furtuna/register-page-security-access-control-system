import Image from "next/image";

import { cn } from "@/lib/utils";

type LogoProps = {
  /**
   * `auto` troca pelo tema (`data-theme`); `light` = logo para fundo claro;
   * `dark` = "PET" clareado, para a sidebar `chassis` e o tema escuro.
   */
  tone?: "auto" | "light" | "dark";
  /** Altura em px. Mínimo de 32 para o logo completo. */
  height?: number;
  className?: string;
  priority?: boolean;
};

const RATIO = 427 / 137;

export function Logo({ tone = "auto", height = 32, className, priority }: LogoProps) {
  const width = Math.round(height * RATIO);
  const common = { width, height, priority } as const;

  if (tone === "light") {
    return <Image src="/brand/petlock-logo.svg" alt="PET Lock" {...common} className={className} />;
  }
  if (tone === "dark") {
    return (
      <Image src="/brand/petlock-logo-fundo-escuro.svg" alt="PET Lock" {...common} className={className} />
    );
  }
  return (
    <span className={cn("inline-flex", className)}>
      <Image src="/brand/petlock-logo.svg" alt="PET Lock" {...common} className="dark:hidden" />
      <Image
        src="/brand/petlock-logo-fundo-escuro.svg"
        alt="PET Lock"
        {...common}
        className="hidden dark:block"
      />
    </span>
  );
}

export function LogoSymbol({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <Image src="/brand/petlock-simbolo.svg" width={size} height={size} alt="PET Lock" className={className} />
  );
}
