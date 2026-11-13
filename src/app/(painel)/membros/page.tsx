import type { Metadata } from "next";
import { Suspense } from "react";

import { MembersScreen } from "./members-screen";

export const metadata: Metadata = { title: "Membros" };

/** Tela 03 · Membros (`docs/design/telas/03-membros.png`). `?q=` vem da busca global. */
export default function MembrosPage() {
  return (
    <Suspense fallback={null}>
      <MembersScreen />
    </Suspense>
  );
}
