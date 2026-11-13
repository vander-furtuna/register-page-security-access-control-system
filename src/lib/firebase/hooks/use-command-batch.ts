"use client";

import { onValue, push, ref, serverTimestamp, set, update } from "firebase/database";
import { useCallback, useEffect, useRef, useState } from "react";

import { batchStatus, type CommandRequest } from "@/lib/commands";

import { getDb } from "../client";
import { paths } from "../paths";
import { deviceCommandSchema } from "../schemas";
import type { DeviceCommand } from "../types";

export type BatchState =
  | { phase: "idle" }
  | { phase: "sending" }
  /** Comandos na fila da fechadura: ela processa quando estiver online. */
  | { phase: "waiting"; total: number; done: number }
  | { phase: "applying" }
  | { phase: "done" }
  | { phase: "error"; message: string };

const SEND_ERROR = "Não foi possível enviar o pedido à fechadura. Confira a internet e tente de novo.";
const APPLY_ERROR =
  "A fechadura concluiu, mas não foi possível atualizar o painel. Recarregue a página e confira o membro.";

/**
 * Envia comandos à fechadura e acompanha cada um. Quando todos ficam `DONE`, aplica
 * `followUp` (escrita multi-caminho). Sem comandos, aplica `followUp` direto.
 */
export function useCommandBatch(actorUid: string | undefined) {
  const [state, setState] = useState<BatchState>({ phase: "idle" });
  const unsubscribers = useRef<(() => void)[]>([]);

  const stop = () => {
    unsubscribers.current.forEach((off) => off());
    unsubscribers.current = [];
  };
  useEffect(() => stop, []);

  const apply = useCallback(async (followUp: Record<string, unknown>) => {
    setState({ phase: "applying" });
    try {
      if (Object.keys(followUp).length) await update(ref(getDb()), followUp);
      setState({ phase: "done" });
    } catch {
      setState({ phase: "error", message: APPLY_ERROR });
    }
  }, []);

  const start = useCallback(
    async (requests: CommandRequest[], followUp: Record<string, unknown>) => {
      stop();
      if (requests.length === 0) return apply(followUp);
      setState({ phase: "sending" });
      const statuses = new Map<string, DeviceCommand | undefined>();
      try {
        const db = getDb();
        for (const request of requests) {
          const node = push(ref(db, paths.deviceCommands));
          await set(node, {
            ...request,
            requestedBy: actorUid ?? "desconhecido",
            requestedAt: serverTimestamp(),
            status: "PENDING",
          });
          statuses.set(node.key!, undefined);
        }
      } catch {
        setState({ phase: "error", message: SEND_ERROR });
        return;
      }

      setState({ phase: "waiting", total: statuses.size, done: 0 });
      let finished = false;
      for (const id of statuses.keys()) {
        const off = onValue(ref(getDb(), paths.deviceCommand(id)), (snap) => {
          const parsed = deviceCommandSchema.safeParse(snap.val());
          statuses.set(id, parsed.success ? parsed.data : undefined);
          if (finished) return;
          const list = [...statuses.values()];
          const status = batchStatus(list.map((c) => c?.status));
          if (status === "error") {
            finished = true;
            stop();
            const error = list.find((c) => c?.status === "ERROR")?.error;
            setState({
              phase: "error",
              message: error
                ? `A fechadura recusou: ${error}`
                : "A fechadura não conseguiu executar o pedido.",
            });
          } else if (status === "done") {
            finished = true;
            stop();
            void apply(followUp);
          } else {
            setState({
              phase: "waiting",
              total: list.length,
              done: list.filter((c) => c?.status === "DONE").length,
            });
          }
        });
        unsubscribers.current.push(off);
      }
    },
    [actorUid, apply],
  );

  const reset = useCallback(() => {
    stop();
    setState({ phase: "idle" });
  }, []);

  return { state, start, reset };
}
