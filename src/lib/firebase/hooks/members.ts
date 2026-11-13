"use client";

import { equalTo, limitToLast, orderByChild, query, ref } from "firebase/database";
import { useMemo } from "react";

import { useNow } from "@/hooks/use-now";
import { sortLogs, type TimedLog } from "@/lib/lock-state";
import { buildMembers, type MemberRow } from "@/lib/members";

import { paths } from "../paths";
import { memberMetaSchema, userRecordSchema } from "../schemas";
import type { AccessLog, DeviceInventory, DeviceStatus, MemberMeta, UserRecord } from "../types";
import { useRtdbValue } from "../use-rtdb-value";

import { parseLogs, useDeviceInventory, useDeviceStatus, useUsers } from "./index";

/** `members/*` tolerante: uma entrada fora do esquema é ignorada, não derruba a lista. */
function parseMembers(raw: unknown): Record<string, MemberMeta> {
  const out: Record<string, MemberMeta> = {};
  if (raw && typeof raw === "object") {
    for (const [key, value] of Object.entries(raw)) {
      const parsed = memberMetaSchema.safeParse(value);
      if (parsed.success) out[key] = parsed.data;
    }
  }
  return out;
}

export function useMemberMetas() {
  return useRtdbValue(paths.members, parseMembers);
}

export type MembersState = {
  status: "loading" | "ready" | "error";
  rows: MemberRow[];
  inventory: DeviceInventory | undefined;
  device: DeviceStatus | undefined;
  error?: Error;
};

const EMPTY: MemberRow[] = [];

/**
 * Lista de membros: `users` + `members` + os últimos `logLimit` registros (último acesso e
 * UID do cartão no firmware 2.0) + inventário quando existir (firmware 2.1).
 */
export function useMembers(logLimit = 1000): MembersState {
  const users = useUsers();
  const metas = useMemberMetas();
  const logs = useRtdbValue(`${paths.logs}?last=${logLimit}`, parseLogs, (db) =>
    query(ref(db, paths.logs), limitToLast(logLimit)),
  );
  const inventory = useDeviceInventory();
  const device = useDeviceStatus();
  const minute = useNow(60_000);

  return useMemo<MembersState>(() => {
    const inv = inventory.status === "ready" ? inventory.data : undefined;
    const dev = device.status === "ready" ? device.data : undefined;
    const error = users.status === "error" ? users.error : metas.status === "error" ? metas.error : undefined;
    if (error) return { status: "error", rows: EMPTY, inventory: inv, device: dev, error };
    if (users.status === "loading" || metas.status === "loading" || logs.status === "loading") {
      return { status: "loading", rows: EMPTY, inventory: inv, device: dev };
    }
    const rows = buildMembers(
      users.status === "ready" ? users.data : {},
      metas.status === "ready" ? metas.data : {},
      logs.status === "ready" ? sortLogs(logs.data) : [],
      inv,
      new Date(minute),
    );
    return { status: "ready", rows, inventory: inv, device: dev };
  }, [users, metas, logs, inventory, device, minute]);
}

export type MemberState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; error: Error }
  | {
      status: "ready";
      user: UserRecord;
      meta: MemberMeta | undefined;
      logs: TimedLog[];
      inventory: DeviceInventory | undefined;
      device: DeviceStatus | undefined;
    };

/**
 * Um membro com o histórico dele. Os registros vêm por `userPath` (índice nas regras) e, como
 * reserva, pelo e-mail: se o firmware gravar um `userPath` diferente da chave, o e-mail acha.
 */
export function useMember(key: string): MemberState {
  const user = useRtdbValue(paths.user(key), (raw) => userRecordSchema.parse(raw));
  const meta = useRtdbValue(paths.member(key), (raw) => memberMetaSchema.parse(raw));
  const email = user.status === "ready" ? user.data.email : null;
  const byPath = useRtdbValue(`${paths.logs}?userPath=${key}`, parseLogs, (db) =>
    query(ref(db, paths.logs), orderByChild("userPath"), equalTo(`/users/${key}`)),
  );
  const byEmail = useRtdbValue(email ? `${paths.logs}?userEmail=${email}` : null, parseLogs, (db) =>
    query(ref(db, paths.logs), orderByChild("userEmail"), equalTo(email ?? "")),
  );
  const inventory = useDeviceInventory();
  const device = useDeviceStatus();

  return useMemo<MemberState>(() => {
    if (user.status === "loading") return { status: "loading" };
    if (user.status === "missing") return { status: "missing" };
    if (user.status === "error") return { status: "error", error: user.error };
    const merged: Record<string, AccessLog> = {
      ...(byEmail.status === "ready" ? byEmail.data : {}),
      ...(byPath.status === "ready" ? byPath.data : {}),
    };
    return {
      status: "ready",
      user: user.data,
      meta: meta.status === "ready" ? meta.data : undefined,
      logs: sortLogs(merged),
      inventory: inventory.status === "ready" ? inventory.data : undefined,
      device: device.status === "ready" ? device.data : undefined,
    };
  }, [user, meta, byPath, byEmail, inventory, device]);
}
