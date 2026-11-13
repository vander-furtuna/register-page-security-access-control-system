"use client";

import {
  CalendarIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  InfoIcon,
  LockIcon,
  MailIcon,
  PencilIcon,
  Trash2Icon,
  UserXIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { PageContent } from "@/components/layout/page-content";
import { Topbar } from "@/components/layout/topbar";
import { EditMemberDialog } from "@/components/pet/edit-member-dialog";
import { EmptyState } from "@/components/pet/empty-state";
import { MemberActionDialog } from "@/components/pet/member-action-dialog";
import { Alert, AlertAction, AlertContent, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNow } from "@/hooks/use-now";
import { AT_THE_DOOR, type MemberAction } from "@/lib/commands";
import { useMember } from "@/lib/firebase/hooks/members";
import { formatLockDate, parseLockTimestamp, shortName } from "@/lib/format";
import { cadastroHref, initials } from "@/lib/member-links";
import { credentialUsage, memberStatus, ROLE_LABEL, STATUS_LABEL } from "@/lib/members";

import { STATUS_BADGE } from "../members-table";

import { AccessHistory, CredentialCard, PresenceMap } from "./member-parts";

/** Tela 04 · Detalhe do membro. `memberKey` é a chave de `users/*`. */
export function MemberScreen({ memberKey }: { memberKey: string }) {
  const state = useMember(memberKey);
  const auth = useAuth();
  const minute = useNow(60_000);
  const now = useMemo(() => new Date(minute), [minute]);
  const [action, setAction] = useState<MemberAction | null>(null);
  const [editing, setEditing] = useState(false);

  if (state.status === "loading") {
    return (
      <>
        <Topbar title="Membro" />
        <PageContent>
          <Skeleton className="h-24 w-full" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
          </div>
        </PageContent>
      </>
    );
  }

  if (state.status === "missing" || state.status === "error") {
    return (
      <>
        <Topbar title="Membro" />
        <PageContent>
          <div className="rounded-md border border-line bg-surface shadow-sm">
            <EmptyState
              icon={state.status === "error" ? <CircleAlertIcon /> : <UserXIcon />}
              headingLevel={2}
              title={
                state.status === "error" ? "Não foi possível carregar o membro" : "Membro não encontrado"
              }
              description={
                state.status === "error"
                  ? "Confira a internet e recarregue a página. A porta continua funcionando normalmente."
                  : "Ele pode ter sido removido na porta ou pelo painel."
              }
              action={
                <Link href="/membros" className={buttonVariants({ variant: "secondary" })}>
                  Ver membros
                </Link>
              }
            />
          </div>
        </PageContent>
      </>
    );
  }

  const { user, meta, logs, inventory, device } = state;
  const status = memberStatus(meta, now);
  const active = status !== "inactive";
  const supportsCommands = Boolean(device?.capabilities.includes("commands"));
  const hasCredentials = user.fingerId !== undefined || user.rfid !== undefined;
  const createdAt = parseLockTimestamp(user.createdAt);
  const role = meta?.role;
  const credentialCount = (user.fingerId !== undefined ? 1 : 0) + (user.rfid !== undefined ? 1 : 0);
  const cardUID =
    (user.rfid !== undefined ? inventory?.cards[String(user.rfid)] : undefined) ??
    logs.find((l) => l.accessType === "rfid" && l.cardUID)?.cardUID;
  const target = { key: memberKey, username: user.username, fingerId: user.fingerId, rfid: user.rfid, role };
  const name = shortName(user.username);

  return (
    <>
      <Topbar
        title={user.username}
        subtitle={`${role ? ROLE_LABEL[role] : "Sem vínculo"} · ${credentialCount} ${credentialCount === 1 ? "credencial" : "credenciais"}`}
      />
      <PageContent>
        <nav aria-label="Trilha" className="flex items-center gap-2 text-label">
          <Link
            href="/membros"
            className="rounded-sm text-lock-ink underline underline-offset-2 hover:text-ink"
          >
            Membros
          </Link>
          <ChevronRightIcon aria-hidden="true" className="size-4 text-ink-subtle" />
          <span aria-current="page" className="text-ink-muted">
            {user.username}
          </span>
        </nav>

        <section className="flex flex-wrap items-center gap-5 rounded-md border border-line bg-surface p-6 shadow-sm">
          <Avatar className="size-14">
            <AvatarFallback className="font-display text-h2 text-ink-muted">
              {initials(user.username)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-h1 text-ink">{user.username}</h2>
              <Badge variant={STATUS_BADGE[status]} dot>
                {status === "active" ? "Acesso ativo" : STATUS_LABEL[status]}
              </Badge>
            </div>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-label text-ink-muted">
              <span className="inline-flex items-center gap-1.5">
                <MailIcon aria-hidden="true" className="size-4" />
                {user.email}
              </span>
              {role ? (
                <span>
                  {ROLE_LABEL[role]}
                  {createdAt ? ` desde ${formatLockDate(createdAt).slice(3)}` : ""}
                </span>
              ) : null}
              {createdAt ? (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarIcon aria-hidden="true" className="size-4" />
                  Cadastro em {formatLockDate(createdAt)}
                  {meta?.updatedBy && meta.updatedBy === auth.user?.uid ? " por você" : ""}
                </span>
              ) : null}
              {meta?.validUntil ? (
                <span>Válido até {meta.validUntil.split("-").reverse().join("/")}</span>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <PencilIcon aria-hidden="true" />
              Editar
            </Button>
            {active && hasCredentials ? (
              <Button
                variant="destructive-soft"
                disabled={!supportsCommands}
                aria-describedby={!supportsCommands ? "at-the-door" : undefined}
                onClick={() => setAction("deactivate")}
              >
                <LockIcon aria-hidden="true" />
                Desativar acesso
              </Button>
            ) : null}
          </div>
        </section>

        {!active ? (
          <Alert variant="info">
            <InfoIcon aria-hidden="true" />
            <AlertContent>
              <AlertTitle className="text-ink">Acesso desativado</AlertTitle>
              <AlertDescription>
                As credenciais de {name} foram apagadas da fechadura. O histórico continua aqui. Para voltar a
                ter acesso, cadastre de novo na porta.
              </AlertDescription>
            </AlertContent>
            <AlertAction>
              <Link href={cadastroHref(user, "CARD_AND_FINGER")} className={buttonVariants({ size: "sm" })}>
                Cadastrar de novo
              </Link>
            </AlertAction>
          </Alert>
        ) : null}

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col gap-6">
            <section aria-labelledby="credenciais" className="flex flex-col gap-4">
              <h2 id="credenciais" className="font-display text-h2 text-ink">
                Credenciais
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <CredentialCard
                  kind="finger"
                  id={user.fingerId}
                  createdAt={createdAt}
                  usage={credentialUsage(logs, "fingerId", now)}
                  inLock={
                    inventory && user.fingerId !== undefined
                      ? Boolean(inventory.fingers[String(user.fingerId)])
                      : undefined
                  }
                  member={user}
                  active={active}
                  canRemove={supportsCommands}
                  onRemove={() => setAction("remove-finger")}
                  now={now}
                />
                <CredentialCard
                  kind="rfid"
                  id={user.rfid}
                  uid={cardUID}
                  createdAt={createdAt}
                  usage={credentialUsage(logs, "rfid", now)}
                  inLock={
                    inventory && user.rfid !== undefined
                      ? Boolean(inventory.cards[String(user.rfid)])
                      : undefined
                  }
                  member={user}
                  active={active}
                  canRemove={supportsCommands}
                  onRemove={() => setAction("remove-card")}
                  now={now}
                />
              </div>
            </section>
            <AccessHistory logs={logs} now={now} fingerId={user.fingerId} />
          </div>

          <aside className="flex flex-col gap-4">
            <PresenceMap logs={logs} now={now} />
            <Alert variant="info">
              <InfoIcon aria-hidden="true" />
              <AlertContent>
                <AlertTitle className="text-ink">Desativar ou remover?</AlertTitle>
                <AlertDescription>
                  Desativar apaga a digital e o cartão da fechadura mas guarda o histórico. Remover apaga
                  também a pessoa do painel.
                </AlertDescription>
                {!supportsCommands && hasCredentials ? (
                  <AlertDescription id="at-the-door" className="mt-2">
                    {AT_THE_DOOR}
                  </AlertDescription>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 -ml-3 text-danger-ink hover:bg-danger-soft hover:text-danger-ink"
                  disabled={hasCredentials && !supportsCommands}
                  onClick={() => setAction("remove")}
                >
                  <Trash2Icon aria-hidden="true" />
                  Remover membro
                </Button>
              </AlertContent>
            </Alert>
          </aside>
        </div>
      </PageContent>

      {action ? <MemberActionDialog action={action} member={target} onClose={() => setAction(null)} /> : null}
      <EditMemberDialog
        open={editing}
        onOpenChange={setEditing}
        memberKey={memberKey}
        username={user.username}
        meta={meta}
      />
    </>
  );
}
