import type { Metadata } from "next";

import { AuthProvider } from "@/components/auth/auth-provider";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { plexMono, plexSans, sora } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "PET Lock", template: "%s · PET Lock" },
  description:
    "Painel de cadastro e administração da fechadura da sala do PET Engenharia de Computação (UFC Sobral).",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={cn(sora.variable, plexSans.variable, plexMono.variable)}
    >
      <body>
        <ThemeProvider>
          <AuthProvider>
            <TooltipProvider>
              {children}
              <Toaster />
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
