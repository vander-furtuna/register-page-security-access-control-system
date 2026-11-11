"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "./auth-provider";
import { AuthFailure, AuthLoading, NoPermission } from "./auth-screens";

/** Protege o painel: só admins passam; sem sessão vai para `/login?next=<rota atual>`. */
export function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (auth.status === "signed-out") {
      const next = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${next}`);
    }
  }, [auth.status, pathname, router]);

  if (auth.status === "admin") return <>{children}</>;
  if (auth.status === "no-permission") return <NoPermission />;
  if (auth.status === "error") return <AuthFailure error={auth.error} />;
  return <AuthLoading />;
}
