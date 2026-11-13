"use client";

import { CircleAlertIcon, InfoIcon, Loader2Icon, RefreshCwIcon, TriangleAlertIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { FingerIcon, RfidIcon } from "@/components/brand/icons";
import { PageContent } from "@/components/layout/page-content";
import { Topbar } from "@/components/layout/topbar";
import { formatFingerId } from "@/components/pet/credential-chip";
import { EmptyState } from "@/components/pet/empty-state";
import { SlotMap } from "@/components/pet/slot-map";
import { Alert, AlertContent, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNow } from "@/hooks/use-now";
import { periodStart } from "@/lib/access-logs";
import { useDeviceInventory, useDeviceStatus, useOrphans, useUsers } from "@/lib/firebase/hooks";
import { useLogs } from "@/lib/firebase/hooks/logs";
import { useMembers } from "@/lib/firebase/hooks/members";
import { useCommandBatch } from "@/lib/firebase/hooks/use-command-batch";
import { formatLockTime, formatUid } from "@/lib/format";
import { dayLabel } from "@/lib/members";
import { buildSlots, DEFAULT_CAPACITY, slotCounts, usedCount, type SlotKind } from "@/lib/slots";
import { cn } from "@/lib/utils";

import { SlotPanel } from "./slot-panel";

type Tab = "digitais" | "cartoes" | "sem-dono";
const TAB_KIND: Record<Exclude<Tab, "sem-dono">, SlotKind> = { digitais: "finger", cartoes: "card" };
const isTab = (value: string | null): value is Tab =>
  value === "digitais" || value === "cartoes" || value === "sem-dono";

/** Tela 06 · Credenciais na fechadura. */
export function CredenciaisScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const minute = useNow(60_000);
  const now = useMemo(() => new Date(minute), [minute]);

  const tabParam = params.get("aba");
  const tab: Tab = isTab(tabParam) ? tabParam : "digitais";
  // `?pos=d27` / `?pos=c22`: posição selecionada (digital ou cartão)
  const pos = /^([dc])(\d+)$/.exec(params.get("pos") ?? "");
  const selected = pos ? { kind: (pos[1] === "d" ? "finger" : "card") as SlotKind, n: Number(pos[2]) } : null;
  const mapKind: SlotKind = tab === "sem-dono" ? (selected?.kind ?? "finger") : TAB_KIND[tab];

  const users = useUsers();
  const inventory = useDeviceInventory();
  const device = useDeviceStatus();
  const orphans = useOrphans();
  const members = useMembers();
  const since = useMemo(() => periodStart("7d", new Date(minute)), [minute]);
  const logs = useLogs({ since, limit: 1000 });

  const status = device.status === "ready" ? device.data : undefined;
  const inv = inventory.status === "ready" ? inventory.data : undefined;
  const userMap = useMemo(() => (users.status === "ready" ? users.data : {}), [users]);
  const supportsCommands = status?.capabilities.includes("commands") ?? false;
  const logOrphans = useMemo(() => (orphans.source === "logs" ? orphans.orphans : []), [orphans]);

  const capacity = {
    finger: status?.fingerCapacity ?? DEFAULT_CAPACITY.finger,
    card: status?.cardCapacity ?? DEFAULT_CAPACITY.card,
  };
  const fingers = useMemo(
    () => buildSlots("finger", { capacity: capacity.finger, inventory: inv, users: userMap, logOrphans }),
    [capacity.finger, inv, userMap, logOrphans],
  );
  const cards = useMemo(
    () => buildSlots("card", { capacity: capacity.card, inventory: inv, users: userMap, logOrphans }),
    [capacity.card, inv, userMap, logOrphans],
  );
  const slotsOf = (kind: SlotKind) => (kind === "finger" ? fingers : cards);
  const fingerCounts = slotCounts(fingers);
  const cardCounts = slotCounts(cards);
  const orphanSlots = [
    ...fingers.filter((s) => s.state === "orphan").map((slot) => ({ kind: "finger" as const, slot })),
    ...cards.filter((s) => s.state === "orphan").map((slot) => ({ kind: "card" as const, slot })),
  ];
  const selectedSlot = selected ? (slotsOf(selected.kind).find((s) => s.n === selected.n) ?? null) : null;

  const partial = inventory.status === "missing";
  const loading =
    users.status === "loading" || inventory.status === "loading" || orphans.status === "loading";
  const error =
    users.status === "error" ? users.error : inventory.status === "error" ? inventory.error : undefined;

  function setParams(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }
  const panelRef = useRef<HTMLDivElement>(null);
  function select(kind: SlotKind, n: number, via: "click" | "key" = "click") {
    setParams({ pos: `${kind === "finger" ? "d" : "c"}${n}` });
    // no celular o painel fica abaixo do mapa: leva até ele (só no clique, não ao navegar por setas)
    if (via === "click" && window.matchMedia("(max-width: 1279px)").matches) {
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      requestAnimationFrame(() =>
        panelRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" }),
      );
    }
  }

  const auth = useAuth();
  const refresh = useCommandBatch(auth.user?.uid);
  const refreshing = refresh.state.phase === "sending" || refresh.state.phase === "waiting";
  useEffect(() => {
    if (refresh.state.phase === "done") toast.success("Inventário lido da fechadura");
    if (refresh.state.phase === "error")
      toast.error("Não foi possível ler o inventário", { description: refresh.state.message });
  }, [refresh.state]);

  const inventoryTime = inv
    ? `${dayLabel(new Date(inv.updatedAt), now) === "hoje" ? "" : `${dayLabel(new Date(inv.updatedAt), now)} `}às ${formatLockTime(new Date(inv.updatedAt), { seconds: false })}`
    : null;

  return (
    <>
      <Topbar
        title="Credenciais na fechadura"
        mobileTitle="Credenciais"
        subtitle="O que está gravado no sensor e na EEPROM, e de quem é"
        action={
          <Button
            variant="secondary"
            disabled={!supportsCommands || refreshing}
            title={supportsCommands ? undefined : "Não disponível nesta versão do firmware"}
            onClick={() => void refresh.start([{ type: "REFRESH_INVENTORY" }], {})}
          >
            {refreshing ? (
              <Loader2Icon aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
            ) : (
              <RefreshCwIcon aria-hidden="true" />
            )}
            {refreshing ? "Lendo inventário…" : "Ler inventário agora"}
          </Button>
        }
      />
      <PageContent>
        {error ? (
          <Alert variant="danger">
            <CircleAlertIcon aria-hidden="true" />
            <AlertContent>
              <AlertTitle>Não foi possível carregar as credenciais</AlertTitle>
              <AlertDescription>Confira a internet e recarregue a página.</AlertDescription>
            </AlertContent>
          </Alert>
        ) : null}

        {/* celular: mapa, painel, limpar memória; a partir de 1280px: painel na coluna da direita */}
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 xl:col-start-1 xl:row-start-1">
            <section
              aria-label="Memória da fechadura"
              className="overflow-hidden rounded-md border border-line bg-surface shadow-sm"
            >
              <div className="border-b border-line px-6">
                <Tabs
                  value={tab}
                  onValueChange={(value) =>
                    setParams({ aba: value === "digitais" ? null : (value as string) })
                  }
                  className="relative max-w-full min-w-0 overflow-x-auto"
                >
                  <TabsList className="border-b-0">
                    <TabsTrigger value="digitais">
                      <FingerIcon size={16} />
                      Digitais
                      <span className="font-mono text-caption text-ink-subtle">
                        {usedCount(fingerCounts)}/{capacity.finger}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="cartoes">
                      <RfidIcon size={16} />
                      Cartões
                      <span className="font-mono text-caption text-ink-subtle">
                        {usedCount(cardCounts)}/{capacity.card}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="sem-dono">
                      Sem dono
                      <span className="font-mono text-caption text-ink-subtle">{orphanSlots.length}</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="flex flex-col gap-4 px-6 py-5">
                {tab === "sem-dono" ? (
                  <OrphanList
                    items={orphanSlots}
                    partial={partial}
                    selected={selected}
                    onSelect={select}
                    loading={loading}
                  />
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="max-w-[560px] text-body text-ink-muted">
                        {mapKind === "finger"
                          ? "Cada quadrado é uma posição de memória do sensor DY50. O número é o ID que aparece nos registros de acesso."
                          : "Cada quadrado é um slot de cartão na EEPROM da fechadura. O UID do cartão aparece ao passar o mouse."}
                      </p>
                      {inventoryTime ? (
                        <span className="inline-flex items-center gap-1.5 text-caption text-ink-subtle">
                          <RefreshCwIcon aria-hidden="true" className="size-3.5" />
                          Inventário lido da fechadura {inventoryTime}
                        </span>
                      ) : null}
                    </div>
                    {partial ? (
                      <Alert variant="info">
                        <InfoIcon aria-hidden="true" />
                        <AlertContent>
                          <AlertTitle className="text-ink">
                            Mapa parcial: atualize o firmware para ver a memória completa
                          </AlertTitle>
                          <AlertDescription>
                            Esta versão do firmware não publica o inventário. O mapa mostra as posições dos
                            membros cadastrados e as sem dono que apareceram nos registros recentes.
                          </AlertDescription>
                        </AlertContent>
                      </Alert>
                    ) : null}
                    {loading ? (
                      <Skeleton className="h-64 w-full" />
                    ) : (
                      <SlotMap
                        kind={mapKind}
                        slots={slotsOf(mapKind)}
                        selected={selected?.kind === mapKind ? selected.n : null}
                        onSelect={(n, via) => select(mapKind, n, via)}
                        partial={partial}
                      />
                    )}
                  </>
                )}
              </div>
            </section>
          </div>

          <div
            ref={panelRef}
            className="min-w-0 scroll-mt-20 xl:sticky xl:top-24 xl:col-start-2 xl:row-span-2 xl:row-start-1"
          >
            <SlotPanel
              kind={selected?.kind ?? mapKind}
              slot={selectedSlot}
              capacity={capacity[selected?.kind ?? mapKind]}
              logs={logs.rows}
              users={userMap}
              members={members.rows}
              supportsCommands={supportsCommands}
              now={now}
            />
          </div>

          <div className="min-w-0 xl:col-start-1 xl:row-start-2">
            <WipeCard />
          </div>
        </div>
      </PageContent>
    </>
  );
}

function OrphanList({
  items,
  partial,
  selected,
  onSelect,
  loading,
}: {
  items: { kind: SlotKind; slot: { n: number; uid?: string } }[];
  partial: boolean;
  selected: { kind: SlotKind; n: number } | null;
  onSelect: (kind: SlotKind, n: number) => void;
  loading: boolean;
}) {
  if (loading) return <Skeleton className="h-32 w-full" />;
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<FingerIcon />}
        title="Nenhuma credencial sem dono"
        description={
          partial
            ? "Nenhuma apareceu nos registros recentes. Sem o inventário do firmware 2.1, só dá para ver as que foram usadas."
            : "Tudo o que está gravado na fechadura tem um membro no banco."
        }
      />
    );
  }
  return (
    <>
      <p className="max-w-[560px] text-body text-ink-muted">
        Gravadas na fechadura pelo cartão mestre, sem cadastro pelo site. Abrem a porta, mas os acessos
        aparecem como “Desconhecido”. Escolha uma para vincular a um membro ou apagar.
      </p>
      <ul className="flex flex-col divide-y divide-line rounded-md border border-line">
        {items.map(({ kind, slot }) => {
          const finger = kind === "finger";
          const active = selected?.kind === kind && selected.n === slot.n;
          return (
            <li key={`${kind}${slot.n}`}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(kind, slot.n)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left outline-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  active && "bg-surface-hover",
                )}
              >
                <span
                  aria-hidden="true"
                  className="grid size-9 shrink-0 place-items-center rounded-sm border-[1.5px] border-dashed border-offline text-offline-ink"
                >
                  {finger ? <FingerIcon size={18} /> : <RfidIcon size={18} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink">
                    {finger ? (
                      <>
                        Digital <span className="font-mono">{formatFingerId(slot.n)}</span>
                      </>
                    ) : (
                      <>
                        Cartão no slot <span className="font-mono">{slot.n}</span>
                      </>
                    )}
                  </span>
                  <span className="block truncate text-caption text-ink-muted">
                    {finger ? (
                      "Sensor DY50"
                    ) : slot.uid ? (
                      <span className="font-mono">{formatUid(slot.uid)}</span>
                    ) : (
                      "EEPROM"
                    )}
                  </span>
                </span>
                <span className="text-label font-medium text-lock-ink">Vincular</span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** Limpar a memória toda fica na porta (botão de wipe), de propósito: não existe comando remoto. */
function WipeCard() {
  return (
    <section
      aria-label="Limpar memória"
      className="flex flex-wrap items-center gap-4 rounded-md border border-danger bg-surface px-6 py-5 shadow-sm"
    >
      <span
        aria-hidden="true"
        className="grid size-8 shrink-0 place-items-center rounded-sm bg-danger-soft text-danger-ink"
      >
        <TriangleAlertIcon className="size-[18px]" />
      </span>
      <div className="min-w-0 flex-[1_1_320px]">
        <h2 className="font-semibold text-ink">Limpar toda a memória da fechadura</h2>
        <p className="text-caption text-ink-muted">
          Apaga todas as digitais e cartões. É feito na porta: segure o botão de wipe por 10 s. O cartão
          mestre continua.
        </p>
      </div>
      <Badge>Presencial</Badge>
    </section>
  );
}
