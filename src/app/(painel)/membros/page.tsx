import type { Metadata } from "next";

import { ComingSoon } from "@/components/layout/coming-soon";
import { PageContent } from "@/components/layout/page-content";
import { Topbar } from "@/components/layout/topbar";

export const metadata: Metadata = { title: "Membros" };

export default function Page() {
  return (
    <>
      <Topbar title="Membros" />
      <PageContent>
        <ComingSoon what="A lista de membros com credenciais e último acesso" />
      </PageContent>
    </>
  );
}
