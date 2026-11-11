"use client";

import { onValue, ref, type Query } from "firebase/database";
import { useEffect, useRef, useState } from "react";

import { getDb } from "./client";
import type { RtdbState } from "./types";

const LOADING = { status: "loading", data: undefined, error: undefined } as const;

/**
 * Assina um caminho do Realtime Database com `onValue` e valida cada valor com `parse`
 * (normalmente `schema.parse`). Remove o listener no cleanup.
 *
 * - `path = null` não assina nada (fica em `loading`), útil enquanto falta um parâmetro.
 * - Caminho inexistente → `missing` (ex.: `devices/*` com firmware 2.0).
 * - Erro do Firebase ou dado fora do esquema → `error`.
 * - `query` permite passar uma consulta pronta (`query(ref(db, "logs"), limitToLast(5))`);
 *   quando presente, `path` serve só como chave para reassinar.
 */
export function useRtdbValue<T>(
  path: string | null,
  parse: (raw: unknown) => T,
  query?: (db: ReturnType<typeof getDb>) => Query,
): RtdbState<T> {
  const [state, setState] = useState<{ key: string | null; value: RtdbState<T> }>({
    key: path,
    value: LOADING,
  });

  // `parse`/`query` costumam ser funções inline; só o caminho decide quando reassinar.
  const parseRef = useRef(parse);
  const queryRef = useRef(query);
  useEffect(() => {
    parseRef.current = parse;
    queryRef.current = query;
  });

  useEffect(() => {
    if (path === null) return;
    let target: Query;
    try {
      const db = getDb();
      target = queryRef.current ? queryRef.current(db) : ref(db, path);
    } catch (error) {
      // Config ausente ou caminho inválido: avisa fora do corpo do efeito, como faria um listener.
      const timer = setTimeout(() =>
        setState({ key: path, value: { status: "error", data: undefined, error: toError(error) } }),
      );
      return () => clearTimeout(timer);
    }

    const unsubscribe = onValue(
      target,
      (snapshot) => {
        if (!snapshot.exists()) {
          setState({ key: path, value: { status: "missing", data: undefined, error: undefined } });
          return;
        }
        try {
          const data = parseRef.current(snapshot.val());
          setState({ key: path, value: { status: "ready", data, error: undefined } });
        } catch (error) {
          setState({ key: path, value: { status: "error", data: undefined, error: toError(error) } });
        }
      },
      (error) => {
        setState({ key: path, value: { status: "error", data: undefined, error: toError(error) } });
      },
    );

    return () => unsubscribe();
  }, [path]);

  // Ao trocar de caminho, não mostrar o valor do caminho anterior.
  return state.key === path ? state.value : LOADING;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
