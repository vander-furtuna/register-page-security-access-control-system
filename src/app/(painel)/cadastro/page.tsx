import type { Metadata } from "next";

import { ComingSoon } from "@/components/layout/coming-soon";
import { PageContent } from "@/components/layout/page-content";
import { Topbar } from "@/components/layout/topbar";

export const metadata: Metadata = { title: "Novo cadastro" };

export default function Page() {
  return (
    <>
      <Topbar title="Novo cadastro" action={null} />
      <PageContent>
        <ComingSoon what="O novo cadastro guiado pela fechadura" />
      </PageContent>
    </>
  );
}
