import { paths } from "@/lib/firebase/paths";
import type { CommandType, DeviceCommand, MemberRole } from "@/lib/firebase/types";

/**
 * Ações sobre a memória da fechadura (`contrato-firmware.md` › 2.4, firmware 2.1).
 * O site pede (comando `PENDING`), a fechadura executa e marca `DONE`/`ERROR`. Só depois do
 * `DONE` o site atualiza `users/*`/`members/*`: nunca mostramos como feito o que a porta não fez.
 */
export type MemberAction = "remove-finger" | "remove-card" | "deactivate" | "remove";
export type CommandRequest = {
  type: CommandType;
  fingerId?: number;
  slot?: number;
  seconds?: number;
  enabled?: boolean;
};

type Credentials = { fingerId?: number; rfid?: number };

export function commandsFor(action: MemberAction, c: Credentials): CommandRequest[] {
  const finger: CommandRequest[] =
    c.fingerId !== undefined ? [{ type: "DELETE_FINGER", fingerId: c.fingerId }] : [];
  const card: CommandRequest[] = c.rfid !== undefined ? [{ type: "DELETE_CARD", slot: c.rfid }] : [];
  if (action === "remove-finger") return finger;
  if (action === "remove-card") return card;
  return [...finger, ...card];
}

/**
 * O que gravar no banco depois que a fechadura confirma (escrita multi-caminho).
 * - remover uma credencial: some do `users/*`; se era a única, o membro sai do banco;
 * - desativar: as credenciais saem do `users/*`, a pessoa fica (histórico) com `active: false`;
 * - remover: `users/*` e `members/*` saem.
 */
export function followUpFor(
  action: MemberAction,
  key: string,
  c: Credentials,
  role: MemberRole | undefined,
  actor: string | undefined,
): Record<string, unknown> {
  const user = paths.user(key);
  const member = paths.member(key);
  const removeAll = { [user]: null, [member]: null };
  if (action === "remove") return removeAll;
  if (action === "remove-finger") return c.rfid !== undefined ? { [`${user}/fingerId`]: null } : removeAll;
  if (action === "remove-card") return c.fingerId !== undefined ? { [`${user}/rfid`]: null } : removeAll;
  return {
    [`${user}/fingerId`]: null,
    [`${user}/rfid`]: null,
    [`${member}/role`]: role ?? "petiano",
    [`${member}/active`]: false,
    ...(actor ? { [`${member}/updatedBy`]: actor } : {}),
  };
}

export type BatchStatus = "pending" | "done" | "error";

export function batchStatus(statuses: (DeviceCommand["status"] | undefined)[]): BatchStatus {
  if (statuses.some((s) => s === "ERROR")) return "error";
  if (statuses.length > 0 && statuses.every((s) => s === "DONE")) return "done";
  return "pending";
}

export const ACTION_COPY: Record<MemberAction, { verb: string; done: string }> = {
  "remove-finger": { verb: "Remover digital", done: "Digital removida da fechadura" },
  "remove-card": { verb: "Remover cartão", done: "Cartão removido da fechadura" },
  deactivate: { verb: "Desativar acesso", done: "Acesso desativado" },
  remove: { verb: "Remover membro", done: "Membro removido" },
};

/** Instrução para quando o firmware não aceita comandos (2.0): a remoção é feita na porta. */
export const AT_THE_DOOR =
  "Para remover, aproxime o cartão mestre e passe o cartão ou o dedo na porta. Esta versão do firmware não aceita remoção pelo site.";
