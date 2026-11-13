"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

import { formatUid } from "@/lib/format";
import { slotCounts, type Slot, type SlotKind, type SlotState } from "@/lib/slots";
import { cn } from "@/lib/utils";

/**
 * Mapa da memória da fechadura (`componentes.md` › SlotMap). Uma célula por posição; vinculada
 * (azul/amarelo), sem dono (tracejado laranja), fantasma (pontilhado), livre ou desconhecida
 * (cinza). Teclado: setas movem entre posições (só a selecionada entra no Tab).
 */
type SlotMapProps = {
  kind: SlotKind;
  slots: Slot[];
  selected: number | null;
  /** `via`: clique ou setas do teclado (a tela só rola até o painel no clique). */
  onSelect: (n: number, via: "click" | "key") => void;
  /** Firmware 2.0: sem inventário, o cinza é "sem informação", não "livre". */
  partial: boolean;
};

const STATE_CLASS: Record<SlotState, string> = {
  linked: "",
  orphan: "border-[1.5px] border-dashed border-offline bg-surface text-offline-ink",
  ghost: "border border-dotted border-line-strong bg-surface text-ink-subtle line-through",
  free: "border border-transparent bg-surface-sunken text-ink-subtle",
  unknown: "border border-transparent bg-surface-sunken text-ink-subtle",
};

function label(kind: SlotKind, slot: Slot): string {
  const what = kind === "finger" ? `Digital ${slot.n}` : `Cartão slot ${slot.n}`;
  const uid = slot.uid ? `, UID ${formatUid(slot.uid)}` : "";
  switch (slot.state) {
    case "linked":
      return `${what}${uid}: ${slot.memberName}`;
    case "orphan":
      return `${what}${uid}: sem dono`;
    case "ghost":
      return `${what}: no banco (${slot.memberName}), mas não está na fechadura`;
    case "free":
      return `${what}: livre`;
    case "unknown":
      return `${what}: sem informação`;
  }
}

export function SlotMap({ kind, slots, selected, onSelect, partial }: SlotMapProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const counts = slotCounts(slots);
  const focusIndex =
    selected !== null
      ? Math.max(
          0,
          slots.findIndex((s) => s.n === selected),
        )
      : 0;
  const linkedClass =
    kind === "finger"
      ? "border border-finger/35 bg-finger-soft text-finger-ink"
      : "border border-rfid/45 bg-rfid-soft text-rfid-ink";

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const columns = Math.max(
      1,
      Math.round(
        (event.currentTarget.parentElement?.clientWidth ?? 0) / (event.currentTarget.offsetWidth + 4),
      ),
    );
    const moves: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: columns,
      ArrowUp: -columns,
      Home: -index,
      End: slots.length - 1 - index,
    };
    const delta = moves[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    const next = Math.min(slots.length - 1, Math.max(0, index + delta));
    refs.current[next]?.focus();
    onSelect(slots[next]!.n, "key");
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        role="group"
        aria-label={kind === "finger" ? "Posições do sensor de digitais" : "Slots de cartão da EEPROM"}
        className="grid grid-cols-[repeat(auto-fill,minmax(36px,1fr))] gap-1"
      >
        {slots.map((slot, index) => (
          <button
            key={slot.n}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            tabIndex={index === focusIndex ? 0 : -1}
            aria-pressed={selected === slot.n}
            aria-label={label(kind, slot)}
            title={label(kind, slot)}
            onClick={() => onSelect(slot.n, "click")}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "h-9 rounded-sm font-mono text-[11px] leading-none font-medium",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus focus-visible:outline-solid",
              slot.state === "linked" ? linkedClass : STATE_CLASS[slot.state],
              selected === slot.n && "outline-2 outline-offset-1 outline-focus outline-solid",
            )}
          >
            {slot.n}
          </button>
        ))}
      </div>

      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-caption text-ink-muted" aria-label="Legenda">
        <Legend className={linkedClass}>Vinculada a um membro ({counts.linked})</Legend>
        <Legend className={STATE_CLASS.orphan}>Sem dono ({counts.orphan})</Legend>
        {counts.ghost ? (
          <Legend className={STATE_CLASS.ghost}>No banco, fora da fechadura ({counts.ghost})</Legend>
        ) : null}
        {partial ? (
          <Legend className={STATE_CLASS.unknown}>Sem informação ({counts.unknown})</Legend>
        ) : (
          <Legend className={STATE_CLASS.free}>Livre ({counts.free})</Legend>
        )}
      </ul>
    </div>
  );
}

function Legend({ className, children }: { className: string; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden="true" className={cn("size-3 rounded-[3px] no-underline", className)} />
      {children}
    </li>
  );
}
