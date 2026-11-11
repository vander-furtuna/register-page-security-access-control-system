"use client";

import { useSyncExternalStore } from "react";

import { formatLockLongDate } from "@/lib/format";

const noop = () => () => {};

/** Data de hoje ("Terça, 10 de novembro"), só no navegador: a página é pré-renderizada no build. */
export function Today() {
  const today = useSyncExternalStore(
    noop,
    () => formatLockLongDate(new Date()),
    () => null,
  );
  return today ?? <span className="invisible">Carregando data</span>;
}
