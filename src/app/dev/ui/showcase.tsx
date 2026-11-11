"use client";

import {
  CircleCheckIcon,
  DownloadIcon,
  EllipsisIcon,
  FilterIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  SearchIcon,
  UserPlusIcon,
  WifiOffIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { FingerIcon, LockDeviceIcon, RfidIcon } from "@/components/brand/icons";
import { Logo, LogoSymbol } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Alert, AlertAction, AlertContent, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatUid, lcdName, lcdNameChanges } from "@/lib/format";

const roles = [
  { value: "petiano", label: "Petiano(a)" },
  { value: "tutor", label: "Tutor(a)" },
  { value: "visitante", label: "Visitante" },
  { value: "egresso", label: "Egresso(a)" },
];

export function Showcase() {
  const [name, setName] = useState("Maria Clara Sousa Araújo");
  const [period, setPeriod] = useState<string[]>(["hoje"]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Logo height={36} priority />
          <div>
            <h1 className="font-display text-h1 text-ink">Componentes base</h1>
            <p className="text-body text-ink-muted">
              Compare com <code className="font-mono text-label">docs/design-system/componentes/*.html</code>{" "}
              nos dois temas.
            </p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <Section title="Marca" reference="assets/">
        <div className="flex flex-wrap items-center gap-6">
          <Logo tone="light" height={32} />
          <div className="rounded-md bg-chassis p-3">
            <Logo tone="dark" height={32} />
          </div>
          <LogoSymbol size={40} />
          <IconTile tone="finger" label="Digital">
            <FingerIcon size={24} />
          </IconTile>
          <IconTile tone="rfid" label="Cartão">
            <RfidIcon size={24} />
          </IconTile>
          <IconTile tone="lock" label="Fechadura">
            <LockDeviceIcon size={24} />
          </IconTile>
          <LockDeviceIcon size={40} colored className="text-steel" aria-label="Fechadura" />
        </div>
      </Section>

      <Section title="Button" reference="Button.html">
        <Row label="Variantes">
          <Button>
            <UserPlusIcon />
            Cadastrar membro
          </Button>
          <Button variant="secondary">
            <DownloadIcon />
            Exportar CSV
          </Button>
          <Button variant="ghost">Cancelar</Button>
          <Button variant="destructive">Remover digital</Button>
          <Button variant="destructive-soft">Cancelar cadastro</Button>
        </Row>
        <Row label="Tamanhos">
          <Button size="sm" variant="secondary">
            <FilterIcon />
            Filtrar
          </Button>
          <Button variant="secondary">Padrão</Button>
          <Button size="lg">Iniciar cadastro na fechadura</Button>
          <Button size="icon" variant="ghost" aria-label="Mais ações">
            <EllipsisIcon />
          </Button>
          <Button size="icon-sm" variant="secondary" aria-label="Buscar">
            <SearchIcon />
          </Button>
        </Row>
        <Row label="Estados">
          <Button disabled>Cadastrar membro</Button>
          <Button aria-disabled="true">
            <Loader2Icon className="animate-spin motion-reduce:animate-none" />
            Aguardando fechadura…
          </Button>
        </Row>
      </Section>

      <Section title="StatusPill (Badge)" reference="StatusPill.html">
        <Row>
          <Badge variant="online" live>
            Online
          </Badge>
          <Badge variant="offline" dot>
            Offline
          </Badge>
          <Badge variant="master" live>
            Modo mestre
          </Badge>
          <Badge variant="neutral" dot>
            Em espera
          </Badge>
          <Badge variant="allowed" dot>
            Liberado
          </Badge>
          <Badge variant="denied" dot>
            Negado
          </Badge>
          <Badge variant="pending" dot>
            Pendente
          </Badge>
        </Row>
        <Row label="Credenciais (prévia do CredentialChip da fase 1)">
          <Badge variant="finger" className="rounded-sm">
            <FingerIcon />
            Digital <span className="font-mono">#12</span>
          </Badge>
          <Badge variant="rfid" className="rounded-sm">
            <RfidIcon />
            Cartão <span className="font-mono">{formatUid("A3:F2:1C:9D")}</span>
          </Badge>
        </Row>
      </Section>

      <Section title="Alert" reference="Alert.html">
        <div className="flex flex-col gap-3">
          <Alert variant="offline">
            <WifiOffIcon />
            <AlertContent>
              <AlertTitle>Fechadura sem conexão há 14 min</AlertTitle>
              <AlertDescription>
                A porta continua abrindo com digitais e cartões. 3 eventos aguardam envio.
              </AlertDescription>
            </AlertContent>
          </Alert>
          <Alert variant="master">
            <LockDeviceIcon />
            <AlertContent>
              <AlertTitle>Fechadura em Modo mestre</AlertTitle>
              <AlertDescription>Ela está aceitando novos cadastros agora.</AlertDescription>
            </AlertContent>
            <AlertAction>
              <Button size="sm">Cadastrar membro</Button>
            </AlertAction>
          </Alert>
          <Alert variant="danger">
            <OctagonXIcon />
            <AlertContent>
              <AlertTitle>Cartão já cadastrado</AlertTitle>
              <AlertDescription>
                O cartão {formatUid("04:9B:7E:21")} já pertence a João Pedro. Use outro cartão.
              </AlertDescription>
            </AlertContent>
          </Alert>
          <Alert variant="success">
            <CircleCheckIcon />
            <AlertContent>
              <AlertTitle>Cadastro concluído</AlertTitle>
              <AlertDescription>Maria Clara já pode entrar com a digital #12 e o cartão.</AlertDescription>
            </AlertContent>
          </Alert>
          <Alert variant="info">
            <InfoIcon />
            <AlertContent>
              <AlertTitle>Dica</AlertTitle>
              <AlertDescription>O LCD da porta não mostra acentos.</AlertDescription>
            </AlertContent>
          </Alert>
        </div>
      </Section>

      <Section title="Field" reference="Field.html">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="dev-name">
              Nome <span className="text-danger-ink">*</span>
            </FieldLabel>
            <Input id="dev-name" value={name} onChange={(e) => setName(e.target.value)} />
            <FieldDescription>
              No LCD: <span className="font-mono">{lcdName(name) || "—"}</span>
              {lcdNameChanges(name) ? " (cabem 16 caracteres, sem acento)" : null}
            </FieldDescription>
          </Field>
          <Field data-invalid="true">
            <FieldLabel htmlFor="dev-email">E-mail institucional</FieldLabel>
            <Input id="dev-email" aria-invalid="true" defaultValue="maria@gmail.com" />
            <FieldError>Use o e-mail @alu.ufc.br ou @ufc.br.</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="dev-search">Busca</FieldLabel>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-ink-subtle" />
              <Input id="dev-search" className="pl-10" placeholder="Nome, e-mail, UID ou #ID" />
            </div>
          </Field>
          <Field>
            <FieldLabel>Vínculo</FieldLabel>
            <Select items={roles} defaultValue="petiano">
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="dev-disabled">Desabilitado</FieldLabel>
            <Input id="dev-disabled" disabled defaultValue="Formulário travado durante o cadastro" />
          </Field>
          <div className="flex flex-col gap-3">
            <Label className="gap-3">
              <Checkbox defaultChecked />
              Avisar acessos negados
            </Label>
            <RadioGroup defaultValue="CARD_AND_FINGER" aria-label="Modo de cadastro">
              <Label className="gap-3">
                <RadioGroupItem value="CARD_AND_FINGER" />
                Cartão + digital
              </Label>
              <Label className="gap-3">
                <RadioGroupItem value="CARD_ONLY" />
                Só cartão
              </Label>
              <Label className="gap-3">
                <RadioGroupItem value="FINGER_ONLY" />
                Só digital
              </Label>
            </RadioGroup>
          </div>
        </div>
      </Section>

      <Section title="Tabs e SegmentedControl" reference="Tabs.html · SegmentedControl.html">
        <Tabs defaultValue="digitais">
          <TabsList>
            <TabsTrigger value="digitais">
              Digitais <span className="font-mono text-caption text-ink-subtle">34/127</span>
            </TabsTrigger>
            <TabsTrigger value="cartoes">
              Cartões <span className="font-mono text-caption text-ink-subtle">21/126</span>
            </TabsTrigger>
            <TabsTrigger value="sem-dono">
              Sem dono <span className="font-mono text-caption text-ink-subtle">2</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="digitais" className="pt-3 text-ink-muted">
            Posições do sensor DY50.
          </TabsContent>
          <TabsContent value="cartoes" className="pt-3 text-ink-muted">
            Slots da EEPROM.
          </TabsContent>
          <TabsContent value="sem-dono" className="pt-3 text-ink-muted">
            Credenciais na fechadura sem membro no banco.
          </TabsContent>
        </Tabs>
        <ToggleGroup
          variant="segmented"
          spacing={1}
          value={period}
          onValueChange={(value) => value.length && setPeriod(value)}
          aria-label="Período"
        >
          <ToggleGroupItem value="hoje">Hoje</ToggleGroupItem>
          <ToggleGroupItem value="7d">7 dias</ToggleGroupItem>
          <ToggleGroupItem value="30d">30 dias</ToggleGroupItem>
        </ToggleGroup>
      </Section>

      <Section title="Card e Table" reference="MembersTable.html">
        <Card className="gap-0 py-0">
          <CardHeader className="border-b py-4">
            <CardTitle>Membros</CardTitle>
            <CardDescription>3 de 40 pessoas</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membro</TableHead>
                  <TableHead>Credenciais</TableHead>
                  <TableHead>Último acesso</TableHead>
                  <TableHead>
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  {
                    name: "Maria Clara Sousa",
                    email: "mariaclara@alu.ufc.br",
                    finger: "#12",
                    card: "slot 22",
                    last: "hoje 14:32",
                  },
                  {
                    name: "João Pedro Lima",
                    email: "joaopedro@alu.ufc.br",
                    finger: null,
                    card: "slot 7",
                    last: "hoje 14:10",
                  },
                  {
                    name: "Isabela Martins",
                    email: "isabela.m@alu.ufc.br",
                    finger: "#18",
                    card: null,
                    last: "ontem 17:55",
                  },
                ].map((m) => (
                  <TableRow key={m.email}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{initials(m.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-ink">{m.name}</div>
                          <div className="text-caption text-ink-subtle">{m.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {m.finger ? (
                          <Badge variant="finger" className="rounded-sm">
                            <FingerIcon />
                            Digital <span className="font-mono">{m.finger}</span>
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="rounded-sm border-dashed text-ink-subtle">
                            Sem digital
                          </Badge>
                        )}
                        {m.card ? (
                          <Badge variant="rfid" className="rounded-sm">
                            <RfidIcon />
                            Cartão <span className="font-mono">{m.card}</span>
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="rounded-sm border-dashed text-ink-subtle">
                            Sem cartão
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{m.last}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={<Button size="icon-sm" variant="ghost" aria-label={`Ações de ${m.name}`} />}
                        >
                          <EllipsisIcon />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
                          <DropdownMenuItem>Adicionar credencial</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive">Remover</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Section>

      <Section title="Dialog, ConfirmModal, Sheet, Tooltip, Toast" reference="ConfirmModal.html · Toast.html">
        <Row>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="secondary" />}>Remover digital</AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover a digital #12 de Maria Clara?</AlertDialogTitle>
                <AlertDialogDescription>
                  Ela deixa de abrir a porta com o dedo. O cartão e o histórico de acessos continuam valendo.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction variant="destructive">Remover digital</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Dialog>
            <DialogTrigger render={<Button variant="secondary" />}>Abrir diálogo</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Vincular a um membro</DialogTitle>
                <DialogDescription>
                  A digital #27 está na fechadura, mas não tem dono no banco.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter showCloseButton>
                <Button>Vincular</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Sheet>
            <SheetTrigger render={<Button variant="secondary" />}>Abrir painel</SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Slot 22</SheetTitle>
                <SheetDescription>Cartão {formatUid("A3F21C9D")} de Maria Clara Sousa.</SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>

          <Tooltip>
            <TooltipTrigger render={<Button variant="ghost" size="icon" aria-label="Informação" />}>
              <InfoIcon />
            </TooltipTrigger>
            <TooltipContent>Maria Clara Sousa</TooltipContent>
          </Tooltip>

          <Button
            variant="secondary"
            onClick={() => toast.success("Maria Clara entrou", { description: "Digital #12 · 14:32:08" })}
          >
            Toast liberado
          </Button>
          <Button
            variant="secondary"
            onClick={() => toast.error("Acesso negado", { description: `Cartão ${formatUid("7C11E05A")}` })}
          >
            Toast negado
          </Button>
        </Row>
      </Section>

      <Section title="Skeleton e Separator">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <Separator />
      </Section>
    </div>
  );
}

function Section({ title, reference, children }: { title: string; reference?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4 border-b border-line pb-2">
        <h2 className="font-display text-h2 text-ink">{title}</h2>
        {reference ? <span className="font-mono text-caption text-ink-subtle">{reference}</span> : null}
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      {label ? <span className="text-overline text-ink-subtle uppercase">{label}</span> : null}
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

const tileTones = {
  finger: "bg-finger-soft text-finger-ink",
  rfid: "bg-rfid-soft text-rfid-ink",
  lock: "bg-lock-soft text-lock-ink",
} as const;

function IconTile({
  tone,
  label,
  children,
}: {
  tone: keyof typeof tileTones;
  label: string;
  children: ReactNode;
}) {
  return (
    <span className="flex flex-col items-center gap-1">
      <span className={`flex size-12 items-center justify-center rounded-sm ${tileTones[tone]}`}>
        {children}
      </span>
      <span className="text-caption text-ink-muted">{label}</span>
    </span>
  );
}

function initials(name: string) {
  return name
    .replace(/^Prof\.\s*/, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
