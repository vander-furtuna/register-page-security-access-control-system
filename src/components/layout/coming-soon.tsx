import { ConstructionIcon } from "lucide-react";

import { EmptyState } from "@/components/pet/empty-state";

/** Rota do menu cuja tela ainda não foi construída (evita 404 nos links da navegação). */
export function ComingSoon({ what }: { what: string }) {
  return (
    <div className="rounded-md border border-line bg-surface shadow-sm">
      <EmptyState
        icon={<ConstructionIcon />}
        title="Em construção"
        description={`${what} chega numa próxima versão do painel. A fechadura continua funcionando normalmente.`}
        headingLevel={2}
      />
    </div>
  );
}
