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
      <AppSidebar />
      <SidebarInset className="min-h-svh min-w-0 pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-0">
        {children}
      </SidebarInset>
      <MobileNav />
      <AccessToaster />
    </SidebarProvider>
  );
}
