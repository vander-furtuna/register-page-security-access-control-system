import type { Metadata } from "next";
import { Suspense } from "react";

import { RegistrosScreen } from "./registros-screen";

export const metadata: Metadata = { title: "Registros de acesso" };

/** Tela 07 · Registros de acesso (`docs/design/telas/07-registros.png`). Filtros na URL. */
export default function RegistrosPage() {
  return (
    <Suspense fallback={null}>
      <RegistrosScreen />
    </Suspense>
  );
}
