import type { Metadata } from "next";

import { ComingSoon } from "@/components/layout/coming-soon";
import { PageContent } from "@/components/layout/page-content";
import { Topbar } from "@/components/layout/topbar";
import { LockStatusCardLive } from "@/components/pet/lock-status-card-live";

export const metadata: Metadata = { title: "Dispositivo" };

export default function Page() {
  return (
    <>
      <Topbar title="Dispositivo" />
      <PageContent>
        <LockStatusCardLive className="max-w-xl" />
        <ComingSoon what="A tela do dispositivo com conexão, periféricos e ajustes" />
      </PageContent>
    </>
  );
}
