"use client";

import { BellIcon, ClockIcon, KeyRoundIcon, LockIcon, LockOpenIcon, RefreshCwIcon } from "lucide-react";
import type { ReactNode } from "react";

import { FingerIcon, LockDeviceIcon, RfidIcon } from "@/components/brand/icons";
import { PageContent } from "@/components/layout/page-content";
import { Topbar } from "@/components/layout/topbar";
import { StatusPill } from "@/components/pet/status-pill";
import { useDeviceInventory, useLockSnapshot } from "@/lib/firebase/hooks";
import type { DeviceInventory, DeviceStatus } from "@/lib/firebase/types";
import { formatLockTime } from "@/lib/format";
import { dayLabel } from "@/lib/members";
import { cn } from "@/lib/utils";

import { ConnectionCard } from "./connection-card";
import { CommandQueueCard, MaintenanceCard, SettingsCard } from "./device-controls";
import { DeviceHeader } from "./device-header";

/** Tela 08 · Dispositivo. Tudo que depende de `devices/*` tem fallback para o firmware 2.0. */
export function DispositivoScreen() {
  const snapshot = useLockSnapshot();
  const inventory = useDeviceInventory();
  const status = snapshot.status;
  const supportsCommands = status?.capabilities.includes("commands") ?? false;

  return (
    <>
      <Topbar title="Dispositivo" subtitle="Saúde da fechadura e funcionamento sem internet" action={null} />
      <PageContent>
        <DeviceHeader snapshot={snapshot} />
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-6">
            <ConnectionCard now={snapshot.now} />
            <OfflineExplainer />
            <PeripheralsCard
              status={status}
              inventory={inventory.status === "ready" ? inventory.data : undefined}
              lcd={snapshot.lcd}
              now={snapshot.now}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-6">
            <SettingsCard status={status} />
            <MaintenanceCard supportsCommands={supportsCommands} />
            {supportsCommands ? <CommandQueueCard now={snapshot.now} /> : null}
          </div>
        </div>
      </PageContent>
    </>
  );
}

const OFFLINE_FACTS: { icon: ReactNode; tone: string; title: string; text: string }[] = [
  {
    icon: <LockOpenIcon />,
    tone: "bg-lock-soft text-lock-ink",
    title: "A porta continua abrindo",
    text: "Cartões são conferidos na EEPROM e digitais no próprio sensor. Nada depende do Firebase.",
  },
  {
    icon: <ClockIcon />,
    tone: "bg-offline-soft text-offline-ink",
    title: "Os acessos ficam guardados",
    text: "Cada evento entra na fila local com o horário do relógio interno, sincronizado por NTP.",
  },
  {
    icon: <RefreshCwIcon />,
    tone: "bg-surface-sunken text-ink-muted",
    title: "Tudo chega quando voltar",
    text: "A fila é enviada em ordem e o painel marca os registros como “chegou atrasado”.",
  },
  {
    icon: <KeyRoundIcon />,
    tone: "bg-master-soft text-master",
    title: "Cadastro pelo cartão mestre",
    text: "Ainda funciona offline. A credencial aparece como “sem dono” até alguém vinculá-la aqui.",
  },
];

function OfflineExplainer() {
  return (
    <section aria-labelledby="sem-internet" className="rounded-md border border-line bg-surface shadow-sm">
      <h2 id="sem-internet" className="border-b border-line px-6 py-4 font-display text-h2 text-ink">
        Quando a internet cai
      </h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5 px-6 py-5">
        {OFFLINE_FACTS.map((fact) => (
          <div key={fact.title} className="flex flex-col gap-2">
            <span
              aria-hidden="true"
              className={cn("grid size-8 place-items-center rounded-sm [&_svg]:size-[18px]", fact.tone)}
            >
              {fact.icon}
            </span>
            <h3 className="font-semibold text-ink">{fact.title}</h3>
            <p className="text-label text-ink-muted">{fact.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

type Peripheral = {
  key: string;
  name: string;
  icon: ReactNode;
  tone: string;
  pins: string;
  detail: (s: DeviceStatus, inv: DeviceInventory | undefined, lcd: [string, string] | null) => string | null;
};

/** Ligações do hardware atual (tela de referência 08); confira no firmware se mudar a placa. */
const PERIPHERALS: Peripheral[] = [
  {
    key: "dy50",
    name: "Sensor de digitais DY50",
    icon: <FingerIcon />,
    tone: "bg-finger-soft text-finger-ink",
    pins: "UART2 · GPIO 16/17",
    detail: (s) =>
      s.fingerCount !== undefined ? `${s.fingerCount} de ${s.fingerCapacity ?? 127} posições` : null,
  },
  {
    key: "rc522",
    name: "Leitor RFID RC522",
    icon: <RfidIcon />,
    tone: "bg-rfid-soft text-rfid-ink",
    pins: "SPI · GPIO 18/19/21/22/23",
    detail: (s, inv) =>
      s.cardCount !== undefined
        ? `${s.cardCount} de ${s.cardCapacity ?? 126} slots${inv?.masterCard ? " + mestre" : ""}`
        : null,
  },
  {
    key: "lcd",
    name: "Display LCD 16x2",
    icon: <LockDeviceIcon />,
    tone: "bg-surface-sunken text-ink-muted",
    pins: "GPIO 15/2/13/25/14/27",
    detail: (_s, _inv, lcd) => (lcd ? `${lcd[0]} ${lcd[1]}`.trim() || "em branco" : null),
  },
  {
    key: "relay",
    name: "Relé da tranca",
    icon: <LockIcon />,
    tone: "bg-surface-sunken text-ink-muted",
    pins: "GPIO 4",
    detail: (s) =>
      s.settings?.unlockSeconds !== undefined ? `abre por ${s.settings.unlockSeconds} s` : null,
  },
  {
    key: "buzzer",
    name: "Buzzer",
    icon: <BellIcon />,
    tone: "bg-surface-sunken text-ink-muted",
    pins: "GPIO 33",
    detail: () => null,
  },
];

function PeripheralsCard({
  status,
  inventory,
  lcd,
  now,
}: {
  status: DeviceStatus | undefined;
  inventory: DeviceInventory | undefined;
  lcd: [string, string] | null;
  now: number;
}) {
  const diagnosis = status?.peripherals;
  const bootAt = status?.bootAt;
  const bootLabel = bootAt
    ? `verificado no boot ${dayLabel(new Date(bootAt), new Date(now)) === "hoje" ? "" : `${dayLabel(new Date(bootAt), new Date(now))} `}às ${formatLockTime(new Date(bootAt), { seconds: false })}`
    : null;

  return (
    <section
      aria-labelledby="perifericos"
      className="overflow-hidden rounded-md border border-line bg-surface shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
        <h2 id="perifericos" className="font-display text-h2 text-ink">
          Periféricos
        </h2>
        {bootLabel ? <span className="text-caption text-ink-subtle">{bootLabel}</span> : null}
      </div>
      {!diagnosis ? (
        <p className="border-b border-line px-6 py-3 text-label text-ink-muted">
          O diagnóstico dos periféricos não está disponível nesta versão do firmware. As ligações abaixo são
          as do hardware atual.
        </p>
      ) : null}
      <div
        role="region"
        aria-label="Tabela de periféricos"
        tabIndex={0}
        className="relative overflow-x-auto outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <table className="w-full min-w-[640px] text-body">
          <thead className="bg-surface-sunken">
            <tr>
              {["Componente", "Ligação", "Estado"].map((label) => (
                <th
                  key={label}
                  scope="col"
                  className="h-10 px-4 text-left text-overline font-semibold tracking-[0.08em] text-ink-muted uppercase first:pl-6"
                >
                  {label}
                </th>
              ))}
              <th scope="col" className="pr-6">
                <span className="sr-only">Diagnóstico</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {PERIPHERALS.map((p) => {
              const ok = diagnosis?.[p.key];
              const detail = status ? p.detail(status, inventory, lcd) : null;
              return (
                <tr key={p.key} className="border-t border-line">
                  <td className="px-4 py-3 pl-6">
                    <div className="flex items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "grid size-8 shrink-0 place-items-center rounded-sm [&_svg]:size-[18px]",
                          p.tone,
                        )}
                      >
                        {p.icon}
                      </span>
                      <span className="font-semibold text-ink">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-label text-ink-muted">{p.pins}</td>
                  <td className="px-4 py-3 text-ink">
                    {detail ?? (p.key === "buzzer" && ok ? "ativo" : "—")}
                  </td>
                  <td className="py-3 pr-6 text-right">
                    {ok === undefined ? (
                      <StatusPill status="standby">Sem diagnóstico</StatusPill>
                    ) : ok ? (
                      <StatusPill status="allowed">Funcionando</StatusPill>
                    ) : (
                      <StatusPill status="denied">Não respondeu</StatusPill>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
