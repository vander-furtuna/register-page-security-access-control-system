"use client";

import {
  CircleAlertIcon,
  DownloadIcon,
  LinkIcon,
  SearchIcon,
  UserPlusIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

import { FingerIcon, RfidIcon } from "@/components/brand/icons";
import { PageContent } from "@/components/layout/page-content";
import { Topbar } from "@/components/layout/topbar";
import { EmptyState } from "@/components/pet/empty-state";
import { Alert, AlertContent, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNow } from "@/hooks/use-now";
import { useOrphans } from "@/lib/firebase/hooks";
import { useMembers } from "@/lib/firebase/hooks/members";
import type { MemberRole } from "@/lib/firebase/types";
import { inTab, matchesQuery, membersCsv, tabCounts, TABS, type MemberTab } from "@/lib/members";
import { cn } from "@/lib/utils";

import { MembersTable } from "./members-table";

const ROLE_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "petiano", label: "Petianos" },
  { value: "tutor", label: "Tutores" },
  { value: "visitante", label: "Visitantes" },
  { value: "egresso", label: "Egressos" },
] as const;
type RoleFilter = (typeof ROLE_FILTERS)[number]["value"];

const TAB_PARAM: Record<string, MemberTab> = {
  ativos: "active",
  "so-cartao": "card-only",
  "so-digital": "finger-only",
  egressos: "alumni",
};

/** Tela 03 · Membros. */
export function MembersScreen() {
  const members = useMembers();
  const orphans = useOrphans();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  // ?aba=so-cartao etc. (links do "Precisa de atenção" na Visão geral)
  const [tab, setTab] = useState<MemberTab>(() => TAB_PARAM[searchParams.get("aba") ?? ""] ?? "all");
  const [role, setRole] = useState<RoleFilter>("all");
  const minute = useNow(60_000);
  const now = useMemo(() => new Date(minute), [minute]);

  const searched = useMemo(() => members.rows.filter((r) => matchesQuery(r, query)), [members.rows, query]);
  const byRole = useMemo(
    () =>
      role === "all" ? searched : searched.filter((r) => (r.role ?? "petiano") === (role as MemberRole)),
    [searched, role],
  );
  const counts = useMemo(() => tabCounts(byRole), [byRole]);
  const visible = useMemo(() => byRole.filter((r) => inTab(r, tab)), [byRole, tab]);

  const total = members.rows.length;
  const active = members.rows.filter((r) => r.status === "active").length;
  const fingers = members.rows.filter((r) => r.fingerId !== undefined).length;
  const cards = members.rows.filter((r) => r.rfid !== undefined).length;
  const supportsCommands = Boolean(members.device?.capabilities.includes("commands"));
  const filtered = query !== "" || role !== "all" || tab !== "all";

  function exportCsv() {
    const blob = new Blob(["﻿" + membersCsv(visible, new Date())], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `membros-pet-lock-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const clearFilters = () => {
    setTab("all");
    setRole("all");
    if (query) router.replace(pathname);
  };

  return (
    <>
      <Topbar
        title="Membros"
        subtitle={
          members.status === "ready"
            ? `${total} ${total === 1 ? "pessoa" : "pessoas"} · ${active} com acesso ativo`
            : undefined
        }
      />
      <PageContent>
        {members.status === "error" ? (
          <Alert variant="danger">
            <CircleAlertIcon aria-hidden="true" />
            <AlertContent>
              <AlertTitle>Não foi possível carregar os membros</AlertTitle>
              <AlertDescription className="text-danger-ink">
                Confira a internet e recarregue a página. A porta continua funcionando normalmente.
              </AlertDescription>
            </AlertContent>
          </Alert>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            icon={<FingerIcon size={20} />}
            tone="finger"
            loading={members.status === "loading"}
            value={fingers}
            capacity={members.device?.fingerCapacity}
            where="no sensor"
            label="digitais cadastradas"
          />
          <SummaryCard
            icon={<RfidIcon size={20} />}
            tone="rfid"
            loading={members.status === "loading"}
            value={cards}
            capacity={members.device?.cardCapacity}
            where="na EEPROM"
            label="cartões cadastrados"
          />
          <Link
            href="/credenciais"
            className="flex items-center gap-4 rounded-md border border-dashed border-offline bg-surface px-5 py-4 outline-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-md bg-offline-soft text-offline-ink"
            >
              <LinkIcon className="size-5" />
            </span>
            <span className="flex flex-col">
              <span className="font-display text-h2 text-ink">
                {orphans.status === "ready" ? orphans.orphans.length : "—"}
              </span>
              <span className="text-caption text-ink-muted">
                {orphans.status === "ready" && orphans.orphans.length === 1
                  ? "credencial sem dono — vincular"
                  : "credenciais sem dono — vincular"}
              </span>
            </span>
          </Link>
        </div>

        <section
          aria-label="Lista de membros"
          className="overflow-hidden rounded-md border border-line bg-surface shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-4">
            {/* No celular as abas rolam de lado em vez de quebrar linha. */}
            <Tabs
              value={tab}
              onValueChange={(value) => setTab(value as MemberTab)}
              className="relative max-w-full min-w-0 overflow-x-auto"
            >
              <TabsList className="border-b-0">
                {TABS.map((t) => (
                  <TabsTrigger key={t.value} value={t.value}>
                    {t.label}
                    <span className="font-mono text-caption text-ink-subtle">{counts[t.value]}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="flex flex-wrap items-center gap-3 pb-2">
              <label className="flex items-center gap-2 text-label text-ink-muted">
                Vínculo
                <Select
                  items={ROLE_FILTERS}
                  value={role}
                  onValueChange={(value) => value && setRole(value as RoleFilter)}
                >
                  <SelectTrigger size="sm" className="w-40" aria-label="Filtrar por vínculo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_FILTERS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <Button variant="secondary" size="sm" onClick={exportCsv} disabled={visible.length === 0}>
                <DownloadIcon aria-hidden="true" />
                Exportar CSV
              </Button>
            </div>
          </div>

          {query ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-sunken px-6 py-2 text-label text-ink-muted">
              <SearchIcon aria-hidden="true" className="size-4" />
              Busca: <span className="font-semibold text-ink">“{query}”</span> · {searched.length}{" "}
              {searched.length === 1 ? "resultado" : "resultados"}
              <Link
                href={pathname}
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "ml-auto")}
                replace
              >
                <XIcon aria-hidden="true" />
                Limpar busca
              </Link>
            </div>
          ) : null}

          <div className="mt-2 border-t border-line">
            {members.status === "loading" ? (
              <div className="flex flex-col gap-3 p-6" role="status" aria-label="Carregando membros">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : visible.length === 0 ? (
              total === 0 ? (
                <EmptyState
                  icon={<UsersIcon />}
                  title="Nenhum membro ainda"
                  description="Quem for cadastrado na fechadura aparece aqui, com as credenciais e o último acesso."
                  action={
                    <Link href="/cadastro" className={buttonVariants()}>
                      <UserPlusIcon aria-hidden="true" />
                      Cadastrar membro
                    </Link>
                  }
                />
              ) : (
                <EmptyState
                  icon={<SearchIcon />}
                  title="Nenhum membro com esse filtro"
                  description={
                    query
                      ? `Nada encontrado para “${query}” com os filtros atuais.`
                      : "Ninguém se encaixa nos filtros escolhidos."
                  }
                  action={
                    filtered ? (
                      <Button variant="secondary" onClick={clearFilters}>
                        Limpar filtros
                      </Button>
                    ) : null
                  }
                />
              )
            ) : (
              <MembersTable
                key={`${tab}-${role}-${query}`}
                rows={visible}
                now={now}
                supportsCommands={supportsCommands}
              />
            )}
          </div>
        </section>
      </PageContent>
    </>
  );
}

function SummaryCard({
  icon,
  tone,
  loading,
  value,
  capacity,
  where,
  label,
}: {
  icon: ReactNode;
  tone: "finger" | "rfid";
  loading: boolean;
  value: number;
  capacity: number | undefined;
  where: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-md border border-line bg-surface px-5 py-4 shadow-sm">
      <span
        aria-hidden="true"
        className={cn(
          "grid size-9 place-items-center rounded-md",
          tone === "finger" ? "bg-finger-soft text-finger-ink" : "bg-rfid-soft text-rfid-ink",
        )}
      >
        {icon}
      </span>
      <span className="flex flex-col">
        {loading ? (
          <Skeleton className="h-6 w-20" />
        ) : (
          <span className="text-body text-ink-muted">
            <span className="font-display text-h2 text-ink">{value}</span>
            {capacity ? ` de ${capacity} ${where}` : null}
          </span>
        )}
        <span className="text-caption text-ink-muted">{label}</span>
      </span>
    </div>
  );
}
