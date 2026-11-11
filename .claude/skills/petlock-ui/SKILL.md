---
name: petlock-ui
description: Use ao criar ou alterar qualquer tela, componente ou estilo do painel PET Lock (cores, tipografia, textos da interface, ícones, estados da fechadura). Garante que a UI siga o design system do repo.
---

# UI do PET Lock

Fonte da verdade: `docs/design-system/` (tokens, CSS dos componentes, guia) e `docs/design/telas/` (PNG + HTML de cada tela). Leia `docs/design-system/README.md` uma vez por sessão e a seção do componente em `docs/design-system/componentes.md` antes de usá-lo.

## Como aplicar

- Stack de UI: Tailwind CSS 4 + shadcn/ui (Base UI) + lucide-react. Nada de HeroUI ou outra lib de componentes.
- Tokens: variáveis de `src/styles/tokens.css`, expostas como utilitários pelo `@theme inline` do `globals.css` (`bg-surface`, `text-ink-muted`, `bg-lock text-on-lock`, `bg-finger-soft text-finger-ink`, `bg-rfid-soft text-rfid-ink`, `border-line-strong`, `rounded-md`…). As variáveis semânticas do shadcn (`primary`, `muted`, `destructive`, `sidebar`…) já apontam para os tokens. **Nunca** escreva hex.
- Precisa de um componente? `pnpm dlx shadcn@latest add <nome>` (troque `from "cn"` por `from "@/lib/utils"` no que ele gerar), depois ajuste variantes/classes ao design system. Remova qualquer bloco de cor `:root`/`.dark` que o CLI adicionar ao `globals.css`.
- As classes `pl-*` em `docs/design-system/petlock.css` e os `.html` de `docs/design/telas/` são **referência visual**: leia para copiar medidas, espaçamentos e estrutura, e reproduza com utilitários Tailwind. Não importe `petlock.css` no app.

## Significado das cores (não negociável)

| Cor | Token | Só para |
|---|---|---|
| Verde | `lock`, `lock-ink`, `lock-soft` | ação primária, online, acesso liberado, sucesso |
| Azul | `finger`, `finger-ink`, `finger-soft` | digital (sensor DY50) |
| Amarelo | `rfid`, `rfid-ink`, `rfid-soft` (o nome não é `card` para não colidir com o shadcn) | cartão RFID |
| Vermelho | `danger`, `danger-ink`, `danger-soft` | acesso negado, erro, ação destrutiva |
| Laranja | `offline`, `offline-ink`, `offline-soft` | offline, pendente, credencial sem dono |
| Roxo | `master`, `master-soft` | Modo mestre |
| Aço | `chassis`, `on-chassis` | sidebar, cabeçalho do card da fechadura |

Texto sobre `lock` = `on-lock` (`bg-lock text-on-lock`). Cor como texto usa sempre a versão `-ink`. A cor nunca está sozinha: sempre com ícone e palavra.

## Tipografia

`font-display` (Sora, via `next/font`) em títulos e números grandes; `font-sans` (IBM Plex Sans) no resto; `font-mono` (IBM Plex Mono) em UID, ID de digital, slot, horário, RSSI e no LCD.

## Componentes do domínio

- `LcdMirror`: 2 linhas × 16 colunas, texto exatamente como o firmware publicou, `role="img"` + `aria-label`. Sem status → variante `off`.
- `LockStatusCard`: topo `chassis`, pílula online/offline/mestre, LCD, métricas em mono. Modo mestre → contorno `master`.
- `CredentialChip`: `finger` "Digital #12", `rfid` "Cartão slot 22" ou UID, `orphan` tracejado (clicável → vincular), `none` ("Sem cartão").
- `RegistrationStepper`, `SlotMap`, `AccessFeed`, `MembersTable`, `StatTile`, `StatusPill`: ver `componentes.md`.

## Textos

Português do Brasil, frases curtas. Botões no infinitivo com objeto ("Remover digital"). Instruções descrevem o gesto físico ("Encoste o mesmo dedo de novo"). Erro diz o que houve e o que fazer. Offline sempre diz que a porta continua funcionando. Sem emoji, sem exclamação.

## Checklist antes de entregar

- [ ] Igual ao PNG de referência (espaçamentos de 4px, raios 4/8/12, sombras do token).
- [ ] Tema escuro (`next-themes`, `data-theme="dark"`) sem cor fixa quebrando.
- [ ] 390px: sidebar vira barra inferior, tabelas com rolagem horizontal, alvos ≥ 44px.
- [ ] Estados: carregando, vazio, erro, offline, recurso do firmware ausente.
- [ ] Teclado e foco visível; `aria-label` em botões só de ícone.
