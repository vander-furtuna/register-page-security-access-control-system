"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { isActive, mainNav } from "./nav";

/** Barra inferior do celular (≤ 640px): Início, Membros, Cadastro, Registros. Alvos ≥ 44px. */
export function MobileNav() {
  const pathname = usePathname();
  const items = mainNav.filter((item) => item.mobile);

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <ul className="grid grid-cols-4">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 text-caption font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  active ? "font-semibold text-lock-ink" : "text-ink-muted",
                )}
              >
                <Icon aria-hidden="true" className="size-6" />
                {item.short ?? item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
