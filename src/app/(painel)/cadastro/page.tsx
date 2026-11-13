import type { Metadata } from "next";
import { Suspense } from "react";

import { Topbar } from "@/components/layout/topbar";

import { RegistrationScreen } from "./registration-screen";

export const metadata: Metadata = { title: "Novo cadastro" };

/** Tela 05 · Novo cadastro (`docs/design/telas/05-*.png`, celular em `09-celular-cadastro.png`). */
export default function CadastroPage() {
  return (
    <>
      <Topbar
        title="Novo cadastro"
        subtitle="O site envia o pedido; a fechadura grava a credencial"
        action={null}
      />
      <Suspense fallback={null}>
        <RegistrationScreen />
      </Suspense>
    </>
  );
}
