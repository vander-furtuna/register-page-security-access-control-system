"use client";

import { SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CredentialChip } from "@/components/pet/credential-chip";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { InputGroupAddon } from "@/components/ui/input-group";
import { useMembers } from "@/lib/firebase/hooks/members";
import { initials } from "@/lib/member-links";
import { matchesQuery, type MemberRow } from "@/lib/members";

const LABEL = "Buscar membro, UID ou ID da digital";

/**
 * Busca global (Topbar): nome, e-mail, UID do cartão (`A3F2`, `a3:f2`) ou `#12`.
 * Escolher um resultado abre o membro; Enter sem escolher abre Membros filtrado (`?q=`).
 */
export function GlobalSearch({ className }: { className?: string }) {
  const router = useRouter();
  const members = useMembers(200);
  const [query, setQuery] = useState("");

  return (
    <form
      role="search"
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        const q = query.trim();
        router.push(q ? `/membros?q=${encodeURIComponent(q)}` : "/membros");
      }}
    >
      <Combobox<MemberRow>
        items={members.rows}
        filter={(item, q) => matchesQuery(item, q)}
        itemToStringLabel={(item) => item.username}
        // a lista é refeita a cada acesso novo no banco: compara pela chave, não pelo objeto
        isItemEqualToValue={(item, value) => item.key === value.key}
        itemToStringValue={(item) => item.key}
        limit={8}
        inputValue={query}
        onInputValueChange={setQuery}
        onValueChange={(item) => {
          if (!item) return;
          setQuery("");
          router.push(`/membros/${item.key}`);
        }}
      >
        <ComboboxInput aria-label={LABEL} placeholder={LABEL} showTrigger={false} className="w-64 xl:w-80">
          <InputGroupAddon align="inline-start">
            <SearchIcon aria-hidden="true" className="size-[18px] text-ink-subtle" />
          </InputGroupAddon>
        </ComboboxInput>
        <ComboboxContent className="w-[min(26rem,calc(100vw-2rem))]">
          <ComboboxEmpty>
            {members.status === "loading"
              ? "Carregando membros…"
              : "Nenhum membro encontrado. Enter busca em Membros."}
          </ComboboxEmpty>
          <ComboboxList>
            {(item: MemberRow) => (
              <ComboboxItem key={item.key} value={item} className="gap-3 py-2">
                <span
                  aria-hidden="true"
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-sunken font-display text-caption font-semibold text-ink-muted"
                >
                  {initials(item.username)}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-semibold text-ink">{item.username}</span>
                  <span className="truncate text-caption text-ink-subtle">{item.email}</span>
                </span>
                <span className="hidden shrink-0 gap-1 sm:flex">
                  {item.fingerId !== undefined ? (
                    <CredentialChip kind="finger" id={item.fingerId} hideLabel />
                  ) : null}
                  {item.rfid !== undefined ? (
                    <CredentialChip
                      kind="rfid"
                      id={item.cardUID ? undefined : item.rfid}
                      uid={item.cardUID}
                      hideLabel
                    />
                  ) : null}
                </span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </form>
  );
}
