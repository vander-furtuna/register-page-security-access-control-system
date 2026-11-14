"use client";

import type { ReactNode } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { AccessToaster } from "./access-toaster";
import { AppSidebar } from "./app-sidebar";
import { MobileNav } from "./mobile-nav";

/** Shell do painel: Sidebar (drawer < 1024px) + conteúdo + barra inferior no celular. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      {/* primeiro item do Tab: pula a navegação (WCAG 2.4.1) */}
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-surface px-4 py-2 font-medium text-ink shadow-md focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:ring-2 focus:ring-ring focus:outline-none"
      >
        Pular para o conteúdo
      </a>
      <AppSidebar />
      <SidebarInset
        id="conteudo"
        tabIndex={-1}
        className="min-h-svh min-w-0 pb-[calc(4rem+env(safe-area-inset-bottom))] outline-none sm:pb-0"
      >
        {children}
      </SidebarInset>
      <MobileNav />
      <AccessToaster />
    </SidebarProvider>
  );
}
