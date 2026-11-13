"use client";

import {
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
  useTable,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, EllipsisIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { CredentialChip } from "@/components/pet/credential-chip";
import { EditMemberDialog } from "@/components/pet/edit-member-dialog";
import { MemberActionDialog } from "@/components/pet/member-action-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AT_THE_DOOR, type MemberAction } from "@/lib/commands";
import { formatLastAccess, ROLE_LABEL, STATUS_LABEL, type MemberRow, type MemberStatus } from "@/lib/members";
import { cadastroHref, initials } from "@/lib/member-links";
import { cn } from "@/lib/utils";

const features = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortFns: { text: sortFn_text, basic: sortFn_basic },
});
const helper = createColumnHelper<typeof features, MemberRow>();

export const STATUS_BADGE: Record<MemberStatus, "allowed" | "neutral" | "pending"> = {
  active: "allowed",
  inactive: "neutral",
  alumni: "neutral",
  expired: "pending",
};

type MembersTableProps = {
  rows: MemberRow[];
  now: Date;
  supportsCommands: boolean;
};

export function MembersTable({ rows, now, supportsCommands }: MembersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "username", desc: false }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [action, setAction] = useState<{ type: MemberAction; row: MemberRow } | null>(null);
  const [editing, setEditing] = useState<MemberRow | null>(null);

  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor("username", {
          header: "Membro",
          sortFn: "text",
          cell: ({ row }) => (
            <div className="flex min-w-0 items-center gap-3">
              <Avatar>
                <AvatarFallback className="font-display text-caption font-semibold text-ink-muted">
                  {initials(row.original.username)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <Link
                  href={`/membros/${row.original.key}`}
                  className="block truncate rounded-sm font-semibold text-ink outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {row.original.username}
                </Link>
                <span className="block truncate text-caption text-ink-subtle">{row.original.email}</span>
              </div>
            </div>
          ),
        }),
        helper.accessor((r) => (r.role ? ROLE_LABEL[r.role] : "—"), {
          id: "role",
          header: "Vínculo",
          enableSorting: false,
          cell: ({ getValue }) => <span className="text-ink-muted">{getValue()}</span>,
        }),
        helper.display({
          id: "credentials",
          header: "Credenciais na fechadura",
          cell: ({ row }) => (
            <div className="flex gap-2">
              {row.original.fingerId !== undefined ? (
                <CredentialChip kind="finger" id={row.original.fingerId} />
              ) : (
                <CredentialChip kind="finger" state="none" />
              )}
              {row.original.rfid !== undefined ? (
                <CredentialChip kind="rfid" id={row.original.rfid} />
              ) : (
                <CredentialChip kind="rfid" state="none" />
              )}
            </div>
          ),
        }),
        helper.accessor((r) => r.lastAccessAt?.getTime() ?? 0, {
          id: "lastAccess",
          header: "Último acesso",
          sortFn: "basic",
          sortDescFirst: true,
          cell: ({ row }) => (
            <span className="font-mono text-label whitespace-nowrap text-ink">
              {formatLastAccess(row.original.lastAccessAt, now)}
            </span>
          ),
        }),
        helper.accessor("status", {
          header: "Status",
          enableSorting: false,
          cell: ({ getValue }) => (
            <Badge variant={STATUS_BADGE[getValue()]} dot>
              {STATUS_LABEL[getValue()]}
            </Badge>
          ),
        }),
        helper.display({
          id: "actions",
          header: () => <span className="sr-only">Ações</span>,
          cell: ({ row }) => (
            <RowMenu
              row={row.original}
              supportsCommands={supportsCommands}
              onAction={(type) => setAction({ type, row: row.original })}
              onEdit={() => setEditing(row.original)}
            />
          ),
        }),
      ]),
    [now, supportsCommands],
  );

  const table = useTable({
    features,
    columns,
    data: rows,
    getRowId: (row) => row.key,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
  });

  const total = rows.length;
  const first = total === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1;
  const last = Math.min(total, (pagination.pageIndex + 1) * pagination.pageSize);

  return (
    <>
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-body">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id} className="bg-surface-sunken">
                {group.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={
                        sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined
                      }
                      className="h-11 px-4 text-left text-overline font-semibold tracking-[0.08em] whitespace-nowrap text-ink-muted uppercase first:pl-6"
                    >
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 rounded-sm uppercase outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <table.FlexRender header={header} />
                          {sorted === "asc" ? (
                            <ArrowUpIcon aria-hidden="true" className="size-3.5" />
                          ) : sorted === "desc" ? (
                            <ArrowDownIcon aria-hidden="true" className="size-3.5" />
                          ) : (
                            <ArrowUpDownIcon aria-hidden="true" className="size-3.5 opacity-50" />
                          )}
                        </button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="h-14 border-t border-line hover:bg-surface-hover">
                {row.getAllCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={cn(
                      "px-4 py-2 first:pl-6",
                      cell.column.id === "actions" && "w-12 pr-4 text-right",
                    )}
                  >
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line px-6 py-3">
        <p className="text-label text-ink-muted" aria-live="polite">
          Mostrando {first}–{last} de {total}
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Próxima
          </Button>
        </div>
      </div>

      {action ? (
        <MemberActionDialog action={action.type} member={{ ...action.row }} onClose={() => setAction(null)} />
      ) : null}
      {editing ? (
        <EditMemberDialog
          open
          onOpenChange={(open) => !open && setEditing(null)}
          memberKey={editing.key}
          username={editing.username}
          meta={editing.meta}
        />
      ) : null}
    </>
  );
}

function RowMenu({
  row,
  supportsCommands,
  onAction,
  onEdit,
}: {
  row: MemberRow;
  supportsCommands: boolean;
  onAction: (action: MemberAction) => void;
  onEdit: () => void;
}) {
  const hasCredentials = row.fingerId !== undefined || row.rfid !== undefined;
  const lockActionsBlocked = hasCredentials && !supportsCommands;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button size="icon-sm" variant="ghost" aria-label={`Ações de ${row.username}`} />}
      >
        <EllipsisIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem render={<Link href={`/membros/${row.key}`} />}>Ver detalhes</DropdownMenuItem>
        {row.fingerId === undefined && row.status === "active" ? (
          <DropdownMenuItem render={<Link href={cadastroHref(row, "FINGER_ONLY")} />}>
            Adicionar digital
          </DropdownMenuItem>
        ) : null}
        {row.rfid === undefined && row.status === "active" ? (
          <DropdownMenuItem render={<Link href={cadastroHref(row, "CARD_ONLY")} />}>
            Adicionar cartão
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onClick={onEdit}>Editar vínculo e validade</DropdownMenuItem>
        <DropdownMenuSeparator />
        {row.status !== "inactive" && hasCredentials ? (
          <DropdownMenuItem disabled={lockActionsBlocked} onClick={() => onAction("deactivate")}>
            Desativar acesso
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          variant="destructive"
          disabled={lockActionsBlocked}
          onClick={() => onAction("remove")}
        >
          Remover membro
        </DropdownMenuItem>
        {lockActionsBlocked ? (
          <p className="px-2 pt-1 pb-1.5 text-caption text-ink-subtle">{AT_THE_DOOR}</p>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
