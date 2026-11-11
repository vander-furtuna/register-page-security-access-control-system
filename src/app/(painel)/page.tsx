import { UserPlusIcon } from "lucide-react";
import Link from "next/link";

import { ComingSoon } from "@/components/layout/coming-soon";
import { PageContent } from "@/components/layout/page-content";
import { Today } from "@/components/layout/today";
import { Topbar } from "@/components/layout/topbar";
import { LockStatusCardLive } from "@/components/pet/lock-status-card-live";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Tela 02 · Visão geral. Estatísticas, gráfico e últimos acessos chegam na fase 4. */
export default function VisaoGeralPage() {
  return (
    <>
      <Topbar title="Visão geral" mobileTitle="PET Lock" subtitle={<Today />} />
      <PageContent>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <LockStatusCardLive className="lg:order-2" />
          <ComingSoon what="A visão geral com acessos do dia, gráfico por hora e últimos acessos" />
        </div>
        <Link href="/cadastro" className={cn(buttonVariants({ size: "lg" }), "w-full sm:hidden")}>
          <UserPlusIcon aria-hidden="true" />
          Cadastrar membro
        </Link>
      </PageContent>
    </>
  );
}
