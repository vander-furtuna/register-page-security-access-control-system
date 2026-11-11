import { onValue, ref, set, update } from "firebase/database";

import type { MetaStorage, RegistrationAdapter } from "@/lib/registration/controller";

import { getDb } from "./client";
import { paths } from "./paths";
import { memberRoleSchema, pendingRegistrationSchema, systemModeSchema, userRecordSchema } from "./schemas";
import type { UserRecord } from "./types";

/**
 * Adaptador do cadastro para o Realtime Database. Mantém os caminhos e formatos do firmware 2.0:
 * `pendingRegistration/current` (com `mode`) + o espelho legado `pendingUser/current`, gravados
 * e apagados juntos numa escrita multi-caminho.
 */
export function createFirebaseRegistrationAdapter(): RegistrationAdapter {
  return {
    subscribe(handlers) {
      try {
        const db = getDb();
        const fail = (error: Error) => handlers.error(error);
        const offMode = onValue(
          ref(db, paths.systemMode),
          (snap) => {
            const parsed = systemModeSchema.safeParse(snap.val());
            handlers.mode(parsed.success ? parsed.data : null);
          },
          fail,
        );
        const offPending = onValue(
          ref(db, paths.pendingRegistration),
          (snap) => {
            if (!snap.exists()) return handlers.pending(null);
            const parsed = pendingRegistrationSchema.safeParse(snap.val());
            if (parsed.success) handlers.pending(parsed.data);
            else handlers.error(new Error("Pedido de cadastro em formato desconhecido."));
          },
          fail,
        );
        const offUsers = onValue(
          ref(db, paths.users),
          (snap) => {
            const users: Record<string, UserRecord> = {};
            const raw: unknown = snap.val();
            if (raw && typeof raw === "object") {
              for (const [key, value] of Object.entries(raw)) {
                const parsed = userRecordSchema.safeParse(value);
                if (parsed.success) users[key] = parsed.data;
              }
            }
            handlers.users(users);
          },
          fail,
        );
        return () => {
          offMode();
          offPending();
          offUsers();
        };
      } catch (error) {
        handlers.error(error instanceof Error ? error : new Error(String(error)));
        return () => {};
      }
    },
    writePending(pending, legacy) {
      return update(ref(getDb()), {
        [paths.pendingRegistration]: pending,
        [paths.pendingUserLegacy]: legacy,
      });
    },
    clearPending() {
      return update(ref(getDb()), {
        [paths.pendingRegistration]: null,
        [paths.pendingUserLegacy]: null,
      });
    },
    writeMember(key, meta) {
      return set(ref(getDb(), paths.member(key)), meta);
    },
  };
}

const STORAGE_KEY = "petlock:cadastro";

/** Vínculo/validade do pedido em andamento, para sobreviver a um recarregar da página. */
export const localMetaStorage: MetaStorage = {
  save(timestamp, meta) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ timestamp, ...meta }));
    } catch {
      // modo privado ou armazenamento bloqueado: segue sem lembrar
    }
  },
  load(timestamp) {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Record<string, unknown> | null;
      if (!raw || raw.timestamp !== timestamp) return undefined;
      const role = memberRoleSchema.safeParse(raw.role);
      if (!role.success) return undefined;
      return {
        role: role.data,
        ...(typeof raw.validUntil === "string" ? { validUntil: raw.validUntil } : {}),
      };
    } catch {
      return undefined;
    }
  },
};
