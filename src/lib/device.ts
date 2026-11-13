import type { CommandType, DeviceCommand, DeviceOutage } from "@/lib/firebase/types";

/** Regras da tela Dispositivo (tela 08), sem React. */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "agora", "24 min", "3 h 12 min", "2 d 4 h". */
export function formatDuration(ms: number): string {
  if (ms < MINUTE) return "menos de 1 min";
  if (ms < HOUR) return `${Math.floor(ms / MINUTE)} min`;
  if (ms < DAY) {
    const h = Math.floor(ms / HOUR);
    const m = Math.floor((ms % HOUR) / MINUTE);
    return m ? `${h} h ${m} min` : `${h} h`;
  }
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / HOUR);
  return h ? `${d} d ${h} h` : `${d} d`;
}

export type TimelineOutage = {
  start: number;
  end: number;
  ongoing: boolean;
  queued: number | undefined;
  durationMs: number;
};

export type Timeline = {
  from: number;
  to: number;
  /** Trechos offline dentro da janela, em fração da janela (0–1), para desenhar a faixa. */
  segments: { left: number; width: number }[];
  /** Percentual online na janela, ex.: "97,3%". */
  uptime: string;
  /** Quedas na janela, da mais recente para a mais antiga. */
  outages: TimelineOutage[];
};

/** Conexão nas últimas `windowMs` (padrão 24 h) a partir das quedas registradas pela fechadura. */
export function connectionTimeline(outages: DeviceOutage[], now: number, windowMs = DAY): Timeline {
  const from = now - windowMs;
  const clipped: TimelineOutage[] = outages
    .map((o) => {
      const ongoing = o.end === null || o.end === undefined;
      const start = Math.max(o.start, from);
      const end = Math.min(ongoing ? now : o.end!, now);
      return { start, end, ongoing, queued: o.queued, durationMs: (ongoing ? now : o.end!) - o.start };
    })
    .filter((o) => o.end > from && o.end > o.start)
    .sort((a, b) => b.start - a.start);

  const offlineMs = clipped.reduce((sum, o) => sum + (o.end - o.start), 0);
  const pct = Math.max(0, Math.min(100, ((windowMs - offlineMs) / windowMs) * 100));
  return {
    from,
    to: now,
    segments: clipped.map((o) => ({
      left: (o.start - from) / windowMs,
      width: (o.end - o.start) / windowMs,
    })),
    uptime: `${pct.toFixed(1).replace(".", ",")}%`,
    outages: clipped,
  };
}

export const COMMAND_LABEL: Record<CommandType, string> = {
  DELETE_FINGER: "Remover digital",
  DELETE_CARD: "Remover cartão",
  REFRESH_INVENTORY: "Ler inventário",
  REBOOT: "Reiniciar a fechadura",
  SET_UNLOCK_SECONDS: "Tempo com a tranca aberta",
  SET_SHOW_NAME: "Nome no display",
  SET_REGISTRATION_SECONDS: "Prazo do cadastro",
};

/** Detalhe curto do comando: "#12", "slot 22", "3 s", "ligado". */
export function commandDetail(command: DeviceCommand): string | undefined {
  switch (command.type) {
    case "DELETE_FINGER":
      return command.fingerId !== undefined ? `#${String(command.fingerId).padStart(2, "0")}` : undefined;
    case "DELETE_CARD":
      return command.slot !== undefined ? `slot ${command.slot}` : undefined;
    case "SET_UNLOCK_SECONDS":
    case "SET_REGISTRATION_SECONDS":
      return command.seconds !== undefined ? `${command.seconds} s` : undefined;
    case "SET_SHOW_NAME":
      return command.enabled === undefined ? undefined : command.enabled ? "ligado" : "desligado";
    default:
      return undefined;
  }
}

/** Opções do tempo com a tranca aberta (segundos). */
export const UNLOCK_SECONDS = [1, 2, 3, 5, 8, 10] as const;

/** Opções do prazo para concluir um cadastro na porta (segundos). */
export const REGISTRATION_SECONDS = [60, 120, 180, 300] as const;
