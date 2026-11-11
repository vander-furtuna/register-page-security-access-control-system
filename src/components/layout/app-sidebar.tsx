"use client";

import { LogOutIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { userDisplay, useAuth } from "@/components/auth/auth-provider";
import { Logo } from "@/components/brand/logo";
import { LcdMirror } from "@/components/pet/lcd-mirror";
import { lockPill } from "@/components/pet/lock-status-card";
import { StatusPill } from "@/components/pet/status-pill";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useLockSnapshot, useOrphans } from "@/lib/firebase/hooks";

import { isActive, lockNav, mainNav, type NavItem } from "./nav";

/**
 * Navegação principal (`componentes.md` › Sidebar): cor `chassis`, logo para fundo escuro,
 * grupo "Fechadura", badge laranja de credenciais sem dono e o estado da porta no rodapé.
 */
export function AppSidebar() {
  const pathname = usePathname();
  const orphans = useOrphans();
  const orphanCount = orphans.status === "ready" ? orphans.orphans.length : 0;

  return (
    <Sidebar collapsible="offcanvas" className="border-r-0">
      <SidebarHeader className="px-6 pt-5 pb-2">
        <Link
          href="/"
          className="inline-flex self-start rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <Logo tone="dark" height={44} priority />
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarGroup className="px-0">
          <SidebarGroupContent>
            <NavList items={mainNav} pathname={pathname} label="Principal" />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="px-0">
          <SidebarGroupLabel className="h-auto px-3 pt-4 pb-2 text-overline text-on-chassis-muted uppercase">
            Fechadura
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <NavList
              items={lockNav}
              pathname={pathname}
              label="Fechadura"
              badges={{
                "/credenciais":
                  orphanCount > 0
                    ? {
                        value: orphanCount,
                        label: `${orphanCount} ${orphanCount === 1 ? "credencial sem dono" : "credenciais sem dono"}`,
                      }
                    : undefined,
              }}
            />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-4 px-3 pt-2 pb-5">
        <SidebarLockStatus />
        <SidebarUser />
      </SidebarFooter>
    </Sidebar>
  );
}

type Badge = { value: number; label: string } | undefined;

function NavList({
  items,
  pathname,
  label,
  badges = {},
}: {
  items: NavItem[];
  pathname: string;
  label: string;
  badges?: Record<string, Badge>;
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <nav aria-label={label}>
      <SidebarMenu className="gap-0.5">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const badge = badges[item.href];
          const Icon = item.icon;
          return (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                isActive={active}
                className="h-9 gap-3 px-3 text-body font-medium text-on-chassis-muted hover:bg-chassis-raised hover:text-on-chassis data-active:bg-chassis-raised data-active:font-medium data-active:text-on-chassis data-active:shadow-[inset_3px_0_0_var(--lock)] [&_svg]:size-[18px]"
                render={
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => isMobile && setOpenMobile(false)}
                  />
                }
              >
                <Icon aria-hidden="true" />
                <span>{item.label}</span>
              </SidebarMenuButton>
              {badge ? (
                <SidebarMenuBadge
                  aria-label={badge.label}
                  className="top-2 right-2 h-[18px] min-w-[18px] rounded-full bg-offline px-1.5 font-mono text-[11px] font-semibold text-on-rfid"
                >
                  {badge.value}
                </SidebarMenuBadge>
              ) : null}
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </nav>
  );
}

/** Mini estado da porta: visível em todas as telas. Leva para Dispositivo. */
function SidebarLockStatus() {
  const snapshot = useLockSnapshot();
  return (
    <Link
      href="/dispositivo"
      className="flex flex-col gap-2 rounded-md bg-chassis-raised p-3 text-caption text-on-chassis outline-none hover:bg-chassis-raised/80 focus-visible:ring-2 focus-visible:ring-sidebar-ring"
    >
      <span className="flex items-center justify-between gap-2">
        <span>Sala do PET</span>
        {snapshot.loading ? (
          <Skeleton className="h-5 w-16 rounded-full bg-chassis" />
        ) : (
          <StatusPill status={lockPill(snapshot)} onChassis size="sm" />
        )}
      </span>
      {snapshot.status ? (
        <LcdMirror lines={snapshot.lcd} size="sm" className="w-full" />
      ) : !snapshot.loading ? (
        <span className="text-on-chassis-muted">
          Display ao vivo não disponível nesta versão do firmware.
        </span>
      ) : null}
    </Link>
  );
}

function SidebarUser() {
  const auth = useAuth();
  const { name, initials, email } = userDisplay(auth.user);
  return (
    <div className="flex items-center gap-2.5 px-3">
      <Avatar>
        <AvatarFallback className="bg-chassis-raised font-display text-caption font-semibold text-on-chassis">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-label font-semibold text-on-chassis" title={email}>
          {name}
        </span>
        <span className="text-caption text-on-chassis-muted">Administrador</span>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Sair do painel"
        className="text-on-chassis-muted hover:bg-chassis-raised hover:text-on-chassis"
        onClick={() => void auth.signOut()}
      >
        <LogOutIcon />
      </Button>
    </div>
  );
}
