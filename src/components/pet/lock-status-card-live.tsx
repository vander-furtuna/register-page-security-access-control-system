"use client";

import { useLockSnapshot } from "@/lib/firebase/hooks";

import { LockStatusCard } from "./lock-status-card";

/** `LockStatusCard` ligado ao banco em tempo real. */
export function LockStatusCardLive({ className }: { className?: string }) {
  const snapshot = useLockSnapshot();
  return <LockStatusCard snapshot={snapshot} className={className} />;
}
