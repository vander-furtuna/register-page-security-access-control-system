import type { Metadata } from "next";

import { DispositivoScreen } from "./dispositivo-screen";

export const metadata: Metadata = { title: "Dispositivo" };

/** Tela 08 · Dispositivo (`docs/design/telas/08-dispositivo.png`). */
export default function DispositivoPage() {
  return <DispositivoScreen />;
}
