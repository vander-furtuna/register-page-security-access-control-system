"use client";

import { ref, update } from "firebase/database";
import {
  CircleAlertIcon,
  InfoIcon,
  LinkIcon,
  Loader2Icon,
  SearchIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { FingerIcon, RfidIcon } from "@/components/brand/icons";
import { formatFingerId } from "@/components/pet/credential-chip";
import { EmptyState } from "@/components/pet/empty-state";
import { MemberActionDialog } from "@/components/pet/member-action-dialog";
import { Alert, AlertContent, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth/auth-provider";
import type { LogRow } from "@/lib/access-logs";
import { AT_THE_DOOR } from "@/lib/commands";
import { getDb } from "@/lib/firebase/client";
import { useCommandBatch } from "@/lib/firebase/hooks/use-command-batch";
import { paths } from "@/lib/firebase/paths";
import type { UserRecord } from "@/lib/firebase/types";
import { formatLockDate, formatUid, normalizeUid, parseLockTimestamp, shortName } from "@/lib/format";
import { initials } from "@/lib/member-links";
import { formatLastAccess, matchesQuery, type MemberRow } from "@/lib/members";
import type { Slot, SlotKind } from "@/lib/slots";
import { cn } from "@/lib/utils";

type SlotPanelProps = {
  kind: SlotKind;
  slot: Slot | null;
  capacity: number;
  /** Registros dos últimos 7 dias. */
  logs: LogRow[];
  users: Record<string, UserRecord>;
  members: MemberRow[];
  supportsCommands: boolean;
  now: Date;
};

function usageOf(kind: SlotKind, slot: Slot, logs: LogRow[]) {
  const own = logs.filter((r) =>
    kind === "finger"
      ? r.accessType === "fingerId" && r.fingerId === slot.n
      : r.accessType === "rfid" &&
        ((slot.uid && r.cardUID && normalizeUid(r.cardUID) === normalizeUid(slot.uid)) ||
          (slot.memberKey !== undefined && r.memberKey === slot.memberKey)),
  );
  const allowed = own.filter((r) => r.status === "ALLOWED" && r.at);
  return { lastUsedAt: allowed[0]?.at ?? null, uses: allowed.length };
}

/** Painel da posição selecionada (tela 06): sem dono, vinculada, fantasma, livre ou sem informação. */
export function SlotPanel({
  kind,
  slot,
  capacity,
  logs,
  users,
  members,
  supportsCommands,
  now,
}: SlotPanelProps) {
  const finger = kind === "finger";

  if (!slot) {
    return (
      <div className="rounded-md border border-line bg-surface shadow-sm">
        <EmptyState
          icon={finger ? <FingerIcon /> : <RfidIcon />}
          title="Escolha uma posição"
          description="Clique num quadrado do mapa para ver quem ocupa a posição, vincular uma credencial sem dono ou começar um cadastro."
        />
      </div>
    );
  }

  const title = finger ? `Digital ${formatFingerId(slot.n)}` : `Cartão slot ${slot.n}`;
  const usage = usageOf(kind, slot, logs);

  return (
    <section
      aria-label={title}
      className="overflow-hidden rounded-md border border-line bg-surface shadow-sm"
    >
      <div className="flex items-center gap-3 border-b border-line px-6 py-5">
        <span
          aria-hidden="true"
          className={cn(
            "grid size-12 shrink-0 place-items-center rounded-lg",
            finger ? "bg-finger-soft text-finger-ink" : "bg-rfid-soft text-rfid-ink",
          )}
        >
          {finger ? <FingerIcon size={26} /> : <RfidIcon size={26} />}
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-h2 text-ink">{title}</h2>
          <p className="text-caption text-ink-muted">
            {finger
              ? `Sensor DY50 · posição ${slot.n} de ${capacity}`
              : `EEPROM · slot ${slot.n} de ${capacity}`}
            {slot.uid ? <span className="block font-mono">{formatUid(slot.uid)}</span> : null}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-5 px-6 py-5">
        {slot.state === "orphan" ? (
          <OrphanBody
            kind={kind}
            slot={slot}
            usage={usage}
            members={members}
            supportsCommands={supportsCommands}
            now={now}
          />
        ) : slot.state === "linked" && slot.memberKey ? (
          <LinkedBody
            kind={kind}
            slot={slot}
            user={users[slot.memberKey]}
            usage={usage}
            supportsCommands={supportsCommands}
            now={now}
          />
        ) : slot.state === "ghost" && slot.memberKey ? (
          <GhostBody kind={kind} slot={slot} />
        ) : (
          <FreeBody state={slot.state} />
        )}
      </div>
    </section>
  );
}

function Usage({ usage, now }: { usage: { lastUsedAt: Date | null; uses: number }; now: Date }) {
  return (
    <dl className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-0.5">
        <dt className="text-caption text-ink-subtle">Último uso</dt>
        <dd className="font-mono text-label font-medium text-ink">
          {formatLastAccess(usage.lastUsedAt, now)}
        </dd>
      </div>
      <div className="flex flex-col gap-0.5">
        <dt className="text-caption text-ink-subtle">Usos em 7 dias</dt>
        <dd className="font-mono text-label font-medium text-ink">{usage.uses}</dd>
      </div>
    </dl>
  );
}

function OrphanBody({
  kind,
  slot,
  usage,
  members,
  supportsCommands,
  now,
}: {
  kind: SlotKind;
  slot: Slot;
  usage: { lastUsedAt: Date | null; uses: number };
  members: MemberRow[];
  supportsCommands: boolean;
  now: Date;
}) {
  const auth = useAuth();
  const batch = useCommandBatch(auth.user?.uid);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const finger = kind === "finger";
  const what = finger ? `a digital ${formatFingerId(slot.n)}` : `o cartão slot ${slot.n}`;

  // só quem está ativo e ainda não tem esse tipo de credencial
  const candidates = members
    .filter((m) => m.status === "active" && (finger ? m.fingerId === undefined : m.rfid === undefined))
    .filter((m) => matchesQuery(m, query))
    .slice(0, 5);
  const chosen = members.find((m) => m.key === picked);

  async function link() {
    if (!chosen) return;
    setSaving(true);
    try {
      await update(ref(getDb()), { [`${paths.user(chosen.key)}/${finger ? "fingerId" : "rfid"}`]: slot.n });
      toast.success(`${finger ? "Digital" : "Cartão"} vinculado a ${shortName(chosen.username)}`, {
        description: `Os próximos acessos com ${what} aparecem com o nome.`,
      });
      setPicked(null);
      setQuery("");
    } catch {
      toast.error("Não foi possível vincular", { description: "Confira a internet e tente de novo." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Alert variant="offline">
        <LinkIcon aria-hidden="true" />
        <AlertContent>
          <AlertTitle>Sem dono no banco</AlertTitle>
          <AlertDescription>
            Gravada na fechadura pelo cartão mestre, sem cadastro pelo site. Ela abre a porta, mas os acessos
            aparecem como “Desconhecido”.
          </AlertDescription>
        </AlertContent>
      </Alert>
      <Usage usage={usage} now={now} />

      <div className="flex flex-col gap-2">
        <label htmlFor="vincular-busca" className="text-label text-ink">
          Vincular a um membro
        </label>
        <div className="relative">
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-ink-subtle"
          />
          <Input
            id="vincular-busca"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nome ou e-mail"
            className="pl-10"
            autoComplete="off"
          />
        </div>
        <div
          role="radiogroup"
          aria-label="Membros sem essa credencial"
          className="flex flex-col gap-1 rounded-md border border-line p-1"
        >
          {candidates.length === 0 ? (
            <p className="px-2 py-2 text-label text-ink-muted">
              {query
                ? "Ninguém ativo sem essa credencial com esse nome."
                : `Todos os membros ativos já têm ${finger ? "digital" : "cartão"}.`}
            </p>
          ) : (
            candidates.map((m) => (
              <button
                key={m.key}
                type="button"
                role="radio"
                aria-checked={picked === m.key}
                onClick={() => setPicked(m.key)}
                className={cn(
                  "flex items-center gap-3 rounded-sm px-2 py-2 text-left outline-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring",
                  picked === m.key && "bg-surface-sunken ring-1 ring-lock-ink",
                )}
              >
                <span
                  aria-hidden="true"
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-sunken font-display text-caption font-semibold text-ink-muted"
                >
                  {initials(m.username)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink">{m.username}</span>
                  <span className="block truncate text-caption text-ink-muted">
                    {m.rfid !== undefined
                      ? `só cartão · slot ${m.rfid}`
                      : m.fingerId !== undefined
                        ? `só digital · ${formatFingerId(m.fingerId)}`
                        : m.email}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => void link()} disabled={!chosen || saving}>
          {saving ? (
            <Loader2Icon aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
          ) : (
            <LinkIcon aria-hidden="true" />
          )}
          {chosen ? `Vincular a ${shortName(chosen.username).split(" ")[0]}` : "Vincular"}
        </Button>
        <Button
          variant="ghost"
          className="text-danger-ink hover:bg-danger-soft hover:text-danger-ink"
          disabled={!supportsCommands || batch.state.phase === "sending" || batch.state.phase === "waiting"}
          onClick={() =>
            void batch.start(
              [finger ? { type: "DELETE_FINGER", fingerId: slot.n } : { type: "DELETE_CARD", slot: slot.n }],
              {},
            )
          }
        >
          <Trash2Icon aria-hidden="true" />
          Apagar
        </Button>
      </div>
      <p aria-live="polite" className="text-caption text-ink-muted">
        {batch.state.phase === "waiting" || batch.state.phase === "sending"
          ? "Aguardando a fechadura apagar…"
          : batch.state.phase === "done"
            ? "A fechadura apagou a posição."
            : batch.state.phase === "error"
              ? batch.state.message
              : !supportsCommands
                ? AT_THE_DOOR
                : usage.lastUsedAt
                  ? `Dica: o último acesso foi ${formatLastAccess(usage.lastUsedAt, now)}. Confira quem estava na sala nesse horário.`
                  : null}
      </p>
    </>
  );
}

function LinkedBody({
  kind,
  slot,
  user,
  usage,
  supportsCommands,
  now,
}: {
  kind: SlotKind;
  slot: Slot;
  user: UserRecord | undefined;
  usage: { lastUsedAt: Date | null; uses: number };
  supportsCommands: boolean;
  now: Date;
}) {
  const [removing, setRemoving] = useState(false);
  const createdAt = parseLockTimestamp(user?.createdAt);
  return (
    <>
      <Link
        href={`/membros/${slot.memberKey}`}
        className="flex items-center gap-3 rounded-md border border-line p-3 outline-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-sunken font-display text-label font-semibold text-ink-muted"
        >
          {initials(slot.memberName ?? "?")}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-semibold text-ink">{slot.memberName}</span>
          <span className="block truncate text-caption text-ink-muted">
            {createdAt ? `Cadastro em ${formatLockDate(createdAt)}` : user?.email}
          </span>
        </span>
      </Link>
      <Usage usage={usage} now={now} />
      <div className="flex flex-wrap gap-2">
        <Link href={`/membros/${slot.memberKey}`} className={buttonVariants({ variant: "secondary" })}>
          Ver membro
        </Link>
        <Button
          variant="ghost"
          className="text-danger-ink hover:bg-danger-soft hover:text-danger-ink"
          disabled={!supportsCommands}
          onClick={() => setRemoving(true)}
        >
          <Trash2Icon aria-hidden="true" />
          {kind === "finger" ? "Remover digital" : "Remover cartão"}
        </Button>
      </div>
      {!supportsCommands ? <p className="text-caption text-ink-muted">{AT_THE_DOOR}</p> : null}
      {removing && user && slot.memberKey ? (
        <MemberActionDialog
          action={kind === "finger" ? "remove-finger" : "remove-card"}
          member={{ key: slot.memberKey, username: user.username, fingerId: user.fingerId, rfid: user.rfid }}
          onClose={() => setRemoving(false)}
        />
      ) : null}
    </>
  );
}

function GhostBody({ kind, slot }: { kind: SlotKind; slot: Slot }) {
  const finger = kind === "finger";
  const name = shortName(slot.memberName ?? "");
  async function clear() {
    try {
      await update(ref(getDb()), {
        [`${paths.user(slot.memberKey!)}/${finger ? "fingerId" : "rfid"}`]: null,
      });
      toast.success(`${finger ? "Digital" : "Cartão"} tirado do cadastro de ${name}`);
    } catch {
      toast.error("Não foi possível atualizar", { description: "Confira a internet e tente de novo." });
    }
  }
  return (
    <>
      <Alert variant="info">
        <TriangleAlertIcon aria-hidden="true" />
        <AlertContent>
          <AlertTitle className="text-ink">No banco, fora da fechadura</AlertTitle>
          <AlertDescription>
            O cadastro de {name} aponta para esta posição, mas ela está vazia na fechadura. Isso acontece
            depois de limpar a memória ou de remover a credencial na porta.
          </AlertDescription>
        </AlertContent>
      </Alert>
      <div className="flex flex-wrap gap-2">
        <Link href={`/membros/${slot.memberKey}`} className={buttonVariants({ variant: "secondary" })}>
          Ver membro
        </Link>
        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="destructive-soft" />}>
            Tirar do cadastro de {name.split(" ")[0]}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Tirar {finger ? `a digital ${formatFingerId(slot.n)}` : `o cartão slot ${slot.n}`} do cadastro
                de {name}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                A fechadura já não tem essa credencial. O painel só para de mostrar a credencial no cadastro;
                a pessoa e o histórico continuam.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={() => void clear()}>
                Tirar do cadastro
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}

function FreeBody({ state }: { state: Slot["state"] }) {
  return (
    <>
      {state === "unknown" ? (
        <Alert variant="info">
          <InfoIcon aria-hidden="true" />
          <AlertContent>
            <AlertDescription className="mt-0">
              Esta versão do firmware não publica o inventário: não dá para saber se a posição está livre.
            </AlertDescription>
          </AlertContent>
        </Alert>
      ) : (
        <p className="flex items-center gap-2 text-body text-ink-muted">
          <CircleAlertIcon aria-hidden="true" className="size-4" />
          Posição livre na fechadura.
        </p>
      )}
      <Link href="/cadastro" className={cn(buttonVariants(), "self-start")}>
        Novo cadastro
      </Link>
    </>
  );
}
