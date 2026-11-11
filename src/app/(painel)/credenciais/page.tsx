import type { Metadata } from "next";

import { ComingSoon } from "@/components/layout/coming-soon";
import { PageContent } from "@/components/layout/page-content";
import { Topbar } from "@/components/layout/topbar";

export const metadata: Metadata = { title: "Credenciais" };

export default function Page() {
  return (
    <>
      <Topbar title="Credenciais" />
      <PageContent>
        <ComingSoon what="O mapa da memória da fechadura" />
      </PageContent>
    </>
  );
}
