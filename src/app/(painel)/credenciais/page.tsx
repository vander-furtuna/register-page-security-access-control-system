import type { Metadata } from "next";
import { Suspense } from "react";

import { CredenciaisScreen } from "./credenciais-screen";

export const metadata: Metadata = { title: "Credenciais" };

/** Tela 06 · Credenciais na fechadura (`docs/design/telas/06-credenciais.png`). Aba e posição na URL. */
export default function CredenciaisPage() {
  return (
    <Suspense fallback={null}>
      <CredenciaisScreen />
    </Suspense>
  );
}
