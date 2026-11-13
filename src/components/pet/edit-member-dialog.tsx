"use client";

import { ref, update } from "firebase/database";
import { CircleAlertIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { Alert, AlertContent, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getDb } from "@/lib/firebase/client";
import { paths } from "@/lib/firebase/paths";
import type { MemberMeta, MemberRole } from "@/lib/firebase/types";
import { shortName } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/members";

const ROLES = (Object.keys(ROLE_LABEL) as MemberRole[]).map((value) => ({ value, label: ROLE_LABEL[value] }));

type EditMemberDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberKey: string;
  username: string;
  meta: MemberMeta | undefined;
};

/**
 * Edita só os metadados do site (`members/{key}`): vínculo e validade. Nome, e-mail e
 * credenciais vêm da fechadura (`users/*`) e mudam pelo cadastro.
 */
export function EditMemberDialog({ open, onOpenChange, memberKey, username, meta }: EditMemberDialogProps) {
  const auth = useAuth();
  const [role, setRole] = useState<MemberRole>(meta?.role ?? "petiano");
  const [validUntil, setValidUntil] = useState(meta?.validUntil ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await update(ref(getDb(), paths.member(memberKey)), {
        role,
        active: meta?.active ?? true,
        validUntil: validUntil || null,
        ...(auth.user ? { updatedBy: auth.user.uid } : {}),
      });
      onOpenChange(false);
    } catch {
      setError("Não foi possível salvar. Confira a internet e tente de novo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setRole(meta?.role ?? "petiano");
          setValidUntil(meta?.validUntil ?? "");
          setError(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar {shortName(username)}</DialogTitle>
          <DialogDescription>
            Vínculo e validade ficam só no painel. Nome, e-mail e credenciais vêm da fechadura.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-5">
          <Field>
            <FieldLabel htmlFor="edit-role">Vínculo</FieldLabel>
            <Select
              items={ROLES}
              value={role}
              onValueChange={(value) => value && setRole(value as MemberRole)}
            >
              <SelectTrigger id="edit-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {role === "egresso" ? (
              <FieldDescription>
                Egresso não muda a fechadura: para tirar o acesso, use &quot;Desativar acesso&quot;.
              </FieldDescription>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-valid">Acesso válido até</FieldLabel>
            <Input
              id="edit-valid"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
            <FieldDescription>
              Em branco, sem data de término. A data fica no painel; a fechadura não a conhece.
            </FieldDescription>
          </Field>
          {error ? (
            <Alert variant="danger">
              <CircleAlertIcon aria-hidden="true" />
              <AlertContent>
                <AlertDescription className="mt-0 text-danger-ink">{error}</AlertDescription>
              </AlertContent>
            </Alert>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? (
              <Loader2Icon aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
            ) : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
