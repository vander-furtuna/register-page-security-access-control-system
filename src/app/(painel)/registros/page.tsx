import type { Metadata } from "next";

import { ComingSoon } from "@/components/layout/coming-soon";
import { PageContent } from "@/components/layout/page-content";
import { Topbar } from "@/components/layout/topbar";

export const metadata: Metadata = { title: "Registros de acesso" };

export default function Page() {
  return (
    <>
      <Topbar title="Registros de acesso" />
      <PageContent>
        <ComingSoon what="O histórico de acessos com filtros" />
      </PageContent>
    </>
  );
}
