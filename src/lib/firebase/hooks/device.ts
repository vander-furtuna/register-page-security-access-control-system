"use client";

import { limitToLast, orderByChild, query, ref } from "firebase/database";
import { useMemo } from "react";

import { paths } from "../paths";
import { deviceCommandSchema, deviceOutageSchema } from "../schemas";
import type { DeviceCommand, DeviceOutage, RtdbState } from "../types";
import { useRtdbValue } from "../use-rtdb-value";

function parseRecord<T>(schema: {
  safeParse: (v: unknown) => { success: true; data: T } | { success: false };
}) {
  return (raw: unknown): Record<string, T> => {
    const out: Record<string, T> = {};
    if (raw && typeof raw === "object") {
      for (const [key, value] of Object.entries(raw)) {
        const parsed = schema.safeParse(value);
        if (parsed.success) out[key] = parsed.data;
      }
    }
    return out;
  };
}

const parseOutages = parseRecord<DeviceOutage>(deviceOutageSchema);
const parseCommands = parseRecord<DeviceCommand>(deviceCommandSchema);

/** `devices/<id>/outages` (proposta 2.1): quedas registradas pela fechadura. `missing` no 2.0. */
export function useDeviceOutages(): RtdbState<DeviceOutage[]> {
  const state = useRtdbValue(paths.deviceOutages, parseOutages);
  return useMemo(
    () => (state.status === "ready" ? { ...state, data: Object.values(state.data) } : state),
    [state],
  );
}

export type CommandRow = DeviceCommand & { id: string };

/** Últimos comandos enviados à fechadura, do mais recente para o mais antigo. */
export function useDeviceCommands(limit = 10): RtdbState<CommandRow[]> {
  const state = useRtdbValue(`${paths.deviceCommands}?last=${limit}`, parseCommands, (db) =>
    query(ref(db, paths.deviceCommands), orderByChild("requestedAt"), limitToLast(limit)),
  );
  return useMemo(() => {
    if (state.status !== "ready") return state;
    const rows = Object.entries(state.data)
      .map(([id, command]) => ({ ...command, id }))
      .sort((a, b) => b.requestedAt - a.requestedAt);
    return { ...state, data: rows };
  }, [state]);
}
