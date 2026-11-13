"use client";

import { CircleAlertIcon, CircleCheckIcon, InfoIcon, Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import { Alert, AlertContent, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCommandBatch } from "@/lib/firebase/hooks/use-command-batch";
import type { MemberRole } from "@/lib/firebase/types";
import { shortName } from "@/lib/format";
import { ACTION_COPY, commandsFor, followUpFor, type MemberAction } from "@/lib/commands";

import { formatFingerId } from "./credential-chip";

export type ActionTarget = {
  key: string;
  username: string;
  fingerId?: number;
  rfid?: number;
  role?: MemberRole;
};

type MemberActionDialogProps = {
  action: MemberAction | null;
  member: ActionTarget;
  onClose: () => void;
};

/**
 * Confirmação de ação que mexe na memória da fechadura (`componentes.md` › ConfirmModal).
 * Envia o comando (firmware 2.1), espera a porta confirmar e só então atualiza o banco.
 */
export function MemberActionDialog({ action, member, onClose }: MemberActionDialogProps) {
  const auth = useAuth();
  const router = useRouter();
  const batch = useCommandBatch(auth.user?.uid);
  const name = shortName(member.username);
  const { phase } = batch.state;
  const busy = phase === "sending" || phase === "waiting" || phase === "applying";

  const close = () => {
    if (action === "remove" && phase === "done") router.push("/membros");
    batch.reset();
    onClose();
  };

  const copy = action ? ACTION_COPY[action] : undefined;
  const onlyCredential =
    (action === "remove-finger" && member.rfid === undefined) ||
    (action === "remove-card" && member.fingerId === undefined);

  const title =
    action === "remove-finger"
      ? `Remover a digital ${member.fingerId !== undefined ? formatFingerId(member.fingerId) : ""} de ${name}?`
      : action === "remove-card"
        ? `Remover o cartão slot ${member.rfid ?? ""} de ${name}?`
        : action === "deactivate"
          ? `Desativar o acesso de ${name}?`
          : `Remover ${name} do painel?`;

  const body =
    action === "remove-finger"
      ? `${name} deixa de abrir a porta com o dedo. ${onlyCredential ? "Como era a única credencial, o membro sai do painel." : "O cartão continua valendo."} Os registros de acesso antigos continuam.`
      : action === "remove-card"
        ? `${name} deixa de abrir a porta com o cartão. ${onlyCredential ? "Como era a única credencial, o membro sai do painel." : "A digital continua valendo."} Os registros de acesso antigos continuam.`
        : action === "deactivate"
          ? `A digital e o cartão de ${name} são apagados da fechadura. A pessoa continua no painel, com o histórico, marcada como desativada.`
          : `A digital e o cartão de ${name} são apagados da fechadura e a pessoa sai do painel. Os registros de acesso antigos continuam.`;

  return (
    <Dialog open={action !== null} onOpenChange={(open) => !open && !busy && close()}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>

        <div aria-live="polite" className="flex flex-col gap-3">
          {phase === "sending" || phase === "waiting" || phase === "applying" ? (
            <Alert variant="info" role="status">
              <Loader2Icon aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
              <AlertContent>
                <AlertTitle className="text-ink">
                  {phase === "applying"
                    ? "Atualizando o painel…"
                    : phase === "waiting" && batch.state.phase === "waiting" && batch.state.total > 1
                      ? `Aguardando a fechadura (${batch.state.done} de ${batch.state.total})…`
                      : "Aguardando a fechadura…"}
                </AlertTitle>
                <AlertDescription>
                  A fechadura executa o pedido quando estiver online. Mantenha esta janela aberta até ela
                  confirmar.
                </AlertDescription>
              </AlertContent>
            </Alert>
          ) : null}
          {phase === "done" && copy ? (
            <Alert variant="success" role="status">
              <CircleCheckIcon aria-hidden="true" />
              <AlertContent>
                <AlertTitle>{copy.done}</AlertTitle>
                <AlertDescription>A fechadura confirmou e o painel foi atualizado.</AlertDescription>
              </AlertContent>
            </Alert>
          ) : null}
          {batch.state.phase === "error" ? (
            <Alert variant="danger">
              <CircleAlertIcon aria-hidden="true" />
              <AlertContent>
                <AlertTitle>Não foi possível concluir</AlertTitle>
                <AlertDescription className="text-danger-ink">{batch.state.message}</AlertDescription>
              </AlertContent>
            </Alert>
          ) : null}
          {phase === "idle" && action !== "remove-finger" && action !== "remove-card" ? (
            <Alert variant="info">
              <InfoIcon aria-hidden="true" />
              <AlertContent>
                <AlertDescription className="mt-0">
                  Para voltar a ter acesso depois, a pessoa precisa ser cadastrada de novo na porta.
                </AlertDescription>
              </AlertContent>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          {phase === "done" || phase === "error" ? (
            <Button onClick={close}>Fechar</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={close} disabled={busy}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={busy || !action}
                onClick={() => {
                  if (!action) return;
                  void batch.start(
                    commandsFor(action, member),
                    followUpFor(action, member.key, member, member.role, auth.user?.uid),
                  );
                }}
              >
                {busy ? (
                  <Loader2Icon aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
                ) : null}
                {copy?.verb}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
