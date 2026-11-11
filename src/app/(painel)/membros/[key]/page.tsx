import type { Metadata } from "next";

import { ComingSoon } from "@/components/layout/coming-soon";
import { PageContent } from "@/components/layout/page-content";
import { Topbar } from "@/components/layout/topbar";

export const metadata: Metadata = { title: "Membro" };

/** Tela 04 · Detalhe do membro: chega na fase 3. `key` é a chave de `users/*`. */
export default async function MembroPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return (
    <>
      <Topbar title="Membro" subtitle={decodeURIComponent(key)} />
      <PageContent>
        <ComingSoon what="A página do membro com credenciais, histórico e presença" />
      </PageContent>
    </>
  );
}
