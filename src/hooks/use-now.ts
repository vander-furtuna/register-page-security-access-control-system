"use client";

import { useEffect, useState } from "react";

/**
 * Relógio que atualiza a cada `intervalMs`, para "há 4 s" e para detectar fechadura offline
 * (heartbeat parado) mesmo sem nenhuma mudança no banco.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
