import { CircleAlertIcon, KeyRoundIcon, WifiOffIcon } from "lucide-react";

import { LockDeviceIcon } from "@/components/brand/icons";
import { Alert, AlertContent, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import type { Connection } from "@/lib/lock-state";
import type { RegistrationRequest } from "@/lib/registration/controller";
import { MODE_LABEL } from "@/lib/registration/steps";
import type { SystemMode } from "@/lib/firebase/types";
import { shortName } from "@/lib/format";

type ModeBannerProps = {
  ready: boolean;
  mode: SystemMode | undefined;
  connection: Connection;
  request: RegistrationRequest | undefined;
  live: boolean;
  readError?: Error;
};

/**
 * Banner do topo do cadastro: Modo mestre (roxo), em espera (neutro), offline (laranja) ou
 * erro de leitura. O Modo mestre só é ativado na porta, com o cartão mestre (de propósito).
 */
export function ModeBanner({ ready, mode, connection, request, live, readError }: ModeBannerProps) {
  if (readError) {
    return (
      <Alert variant="danger">
        <CircleAlertIcon aria-hidden="true" />
        <AlertContent>
          <AlertTitle>Não foi possível ler o estado da fechadura</AlertTitle>
          <AlertDescription className="text-danger-ink">
            Confira a internet e recarregue a página. A porta continua funcionando normalmente.
          </AlertDescription>
        </AlertContent>
      </Alert>
    );
  }
  if (!ready) return <Skeleton className="h-[62px] w-full" />;

  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      {connection === "offline" ? (
        <Alert variant="offline">
          <WifiOffIcon aria-hidden="true" />
          <AlertContent>
            <AlertTitle>Fechadura sem conexão</AlertTitle>
            <AlertDescription>
              O pedido só chega à porta quando ela voltar a ficar online. A porta continua abrindo com
              digitais e cartões.
            </AlertDescription>
          </AlertContent>
        </Alert>
      ) : null}
      {mode === "MASTER" ? (
        <Alert variant="master">
          <KeyRoundIcon aria-hidden="true" />
          <AlertContent>
            <AlertTitle>Modo mestre ativo</AlertTitle>
            <AlertDescription>
              {live && request
                ? `Cadastrando ${shortName(request.username)} · ${MODE_LABEL[request.mode]}`
                : "Quem aproximou o cartão mestre precisa ficar perto da porta para acompanhar o cadastro."}
            </AlertDescription>
          </AlertContent>
        </Alert>
      ) : (
        <Alert variant="info">
          <LockDeviceIcon aria-hidden="true" />
          <AlertContent>
            <AlertTitle className="text-ink">Fechadura em espera</AlertTitle>
            <AlertDescription>
              Aproxime o cartão mestre da fechadura para liberar o cadastro. Por segurança, o Modo mestre só é
              ativado na porta.
            </AlertDescription>
          </AlertContent>
        </Alert>
      )}
    </div>
  );
}
