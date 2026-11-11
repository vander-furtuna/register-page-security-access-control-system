"use client";

import { BellIcon, MenuIcon, SearchIcon, UserPlusIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { LogoSymbol } from "@/components/brand/logo";
import { EmptyState } from "@/components/pet/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import { ThemeToggle } from "./theme-toggle";

/**
 * Barra do topo de cada tela do painel. Acima de 640px: título, subtítulo, busca global,
 * avisos e a ação principal (fundo `surface`). No celular vira o header `chassis` com o
 * símbolo e o título curto (telas 09 e 10). O `h1` da tela é o título daqui.
 */
type TopbarProps = {
  title: string;
  subtitle?: ReactNode;
  /** Título no header do celular; padrão = `title`. Na Visão geral é "PET Lock". */
  mobileTitle?: string;
  /** Ação principal (botão verde). Padrão: "Cadastrar membro". `null` remove. */
  action?: ReactNode | null;
};

export function Topbar({ title, subtitle, mobileTitle, action }: TopbarProps) {
  const { state, isMobile, toggleSidebar } = useSidebar();
  const primary =
    action === undefined ? (
      <Link href="/cadastro" className={buttonVariants()}>
        <UserPlusIcon aria-hidden="true" />
        Cadastrar membro
      </Link>
    ) : (
      action
    );

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex items-center gap-3 bg-chassis px-4 py-3 text-on-chassis",
        "sm:min-h-16 sm:flex-wrap sm:border-b sm:border-line sm:bg-surface sm:px-8 sm:text-ink",
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        aria-label="Abrir menu"
        aria-expanded={isMobile ? undefined : state === "expanded"}
        onClick={toggleSidebar}
        className={cn(
          "-ml-2 text-on-chassis-muted hover:bg-chassis-raised hover:text-on-chassis sm:text-ink-muted sm:hover:bg-surface-hover sm:hover:text-ink",
          state === "expanded" && "lg:hidden",
        )}
      >
        <MenuIcon />
      </Button>
      <LogoSymbol size={32} className="sm:hidden" />

      <div className="flex min-w-0 flex-1 flex-col">
        <h1 className="truncate font-display text-[17px] leading-6 font-semibold tracking-[-0.01em] sm:text-[20px] sm:leading-7">
          <span className="sm:hidden">{mobileTitle ?? title}</span>
          <span className="hidden sm:inline">{title}</span>
        </h1>
        {subtitle ? (
          <p className="hidden text-label font-normal text-ink-subtle sm:block">{subtitle}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <form action="/membros" role="search" className="relative hidden md:block">
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-ink-subtle"
          />
          <Input
            type="search"
            name="q"
            aria-label="Buscar membro, UID ou ID da digital"
            placeholder="Buscar membro, UID ou ID da digital"
            className="w-64 pl-10 xl:w-80"
          />
        </form>
        <ThemeToggle className="hidden text-ink-muted sm:inline-flex" />
        <Notifications />
        {primary ? <div className="hidden sm:block">{primary}</div> : null}
      </div>
    </header>
  );
}

/** Avisos (acessos negados, fechadura offline) chegam na fase 4; por ora o menu explica isso. */
function Notifications() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Avisos"
            className="text-on-chassis-muted hover:bg-chassis-raised hover:text-on-chassis sm:text-ink-muted sm:hover:bg-surface-hover sm:hover:text-ink"
          />
        }
      >
        <BellIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <EmptyState
          icon={<BellIcon />}
          title="Nenhum aviso"
          description="Acessos negados e quedas de conexão da fechadura vão aparecer aqui."
          className="px-4 py-6"
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
