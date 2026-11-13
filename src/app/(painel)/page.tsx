import { UserPlusIcon } from "lucide-react";
import Link from "next/link";

import { PageContent } from "@/components/layout/page-content";
import { Today } from "@/components/layout/today";
import { Topbar } from "@/components/layout/topbar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { OverviewScreen } from "./overview-screen";

/** Tela 02 · Visão geral (celular: tela 10). */
export default function VisaoGeralPage() {
  return (
    <>
      <Topbar title="Visão geral" mobileTitle="PET Lock" subtitle={<Today />} />
      <PageContent>
        <OverviewScreen />
        <Link href="/cadastro" className={cn(buttonVariants({ size: "lg" }), "w-full sm:hidden")}>
          <UserPlusIcon aria-hidden="true" />
          Cadastrar membro
        </Link>
      </PageContent>
    </>
  );
}
