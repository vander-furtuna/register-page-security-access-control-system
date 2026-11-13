"use client";

import { BellIcon } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNow } from "@/hooks/use-now";
import { setAccessAlerts, useAccessAlerts } from "@/lib/access-alerts";
import { useLogs } from "@/lib/firebase/hooks/logs";
import { formatLockTime, lockStartOfDay } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Sino da Topbar: negados de hoje e as preferências dos avisos em tempo real. */
export function Notifications({ className }: { className?: string }) {
  const settings = useAccessAlerts();
  const minute = useNow(60_000);
  const since = useMemo(() => lockStartOfDay(new Date(minute)), [minute]);
  const logs = useLogs({ since, limit: 300 });
  const denied = logs.rows.filter((r) => r.status === "DENIED");
  const label = denied.length
    ? `Avisos: ${denied.length} ${denied.length === 1 ? "acesso negado" : "acessos negados"} hoje`
    : "Avisos";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label={label} className={cn("relative", className)} />
        }
      >
        <BellIcon />
        {denied.length ? (
          <span
            aria-hidden="true"
            className="absolute top-2 right-2 size-2 rounded-full bg-danger ring-2 ring-surface"
          />
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Negados hoje</DropdownMenuLabel>
          {denied.length === 0 ? (
            <p className="px-2 pb-2 text-label text-ink-muted">Nenhum acesso negado hoje.</p>
          ) : (
            denied.slice(0, 5).map((row) => (
              <DropdownMenuItem key={row.key} render={<Link href="/registros?resultado=negados" />}>
                <span className="flex-1 truncate text-danger-ink">{row.displayName}</span>
                <span className="font-mono text-caption text-ink-muted">
                  {row.at ? formatLockTime(row.at) : ""}
                </span>
              </DropdownMenuItem>
            ))
          )}
          {denied.length > 5 ? (
            <DropdownMenuItem render={<Link href="/registros?resultado=negados" />}>
              Ver os {denied.length} negados de hoje
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Avisos em tempo real</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={settings.enabled}
            onCheckedChange={(checked) => setAccessAlerts({ enabled: Boolean(checked) })}
          >
            Avisar cada acesso na porta
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={settings.keepDenied}
            disabled={!settings.enabled}
            onCheckedChange={(checked) => setAccessAlerts({ keepDenied: Boolean(checked) })}
          >
            Manter negados na tela até dispensar
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
