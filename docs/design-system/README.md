# PET Lock

Sistema visual do painel de cadastro e administração da fechadura eletrônica da sala do PET Engenharia de Computação (UFC Sobral). Tudo aqui nasce do logo: o corpo de aço da fechadura, a tela verde do LCD, a janela azul da digital e a janela amarela do cartão RFID.

## Princípios

1. **A fechadura é a fonte da verdade.** A porta valida sozinha, pela EEPROM (cartões) e pelo banco interno do sensor DY50 (digitais), com ou sem internet. O site espelha e comanda — nunca finge que algo aconteceu na porta antes de a porta confirmar.
2. **Estado sempre à vista.** Em qualquer tela dá para saber se a fechadura está online, em espera ou em Modo mestre, e o que o LCD está mostrando agora.
3. **Cor tem um único significado.** Azul é digital, amarelo é cartão, verde é liberado/online, vermelho é negado/erro, laranja é offline/pendente, roxo é Modo mestre. Nenhuma dessas cores é decoração.
4. **Dado técnico em mono.** UID de cartão, ID de digital, slot da memória, horário de acesso e RSSI usam IBM Plex Mono, para que `#12`, `slot 22` e `A3 F2 1C 9D` sejam lidos e comparados sem erro.
5. **Offline não é erro.** Queda de internet é laranja, explica que a porta continua funcionando e conta os eventos na fila.

## Voz e tom

Português do Brasil, direto e calmo, como um colega explicando a porta.

- Botões: verbo no infinitivo + objeto, sentence case — "Cadastrar membro", "Remover digital", "Vincular a um membro".
- Instruções descrevem o gesto físico: "Aproxime o cartão do leitor", "Encoste o mesmo dedo de novo".
- Erros dizem o que aconteceu e como resolver: "O cartão 04 9B 7E 21 já pertence a João Pedro. Use outro cartão."
- Sem emoji, sem exclamação, sem CAIXA ALTA (exceto `overline`, aplicado por CSS).
- Vocabulário fixo: **membro** (pessoa com acesso), **credencial** (digital ou cartão), **digital** (não "biometria" na UI), **cartão** (carteirinha ou tag), **Modo mestre** (fechadura aceitando cadastros), **sem dono** (credencial na fechadura sem membro no banco), **registro de acesso** (cada tentativa).

## Cores

Os valores vêm do arquivo Figma do logo (nó 1461:763).

| Papel | Tokens | Do logo |
|---|---|---|
| Marca / liberado / online | `lock`, `on-lock`, `lock-ink`, `lock-soft` | "LOCK" em gradiente `lock-teal` #15E2AF → `lock` #3ED56F → `lock-lime` #68C72D |
| Digital | `finger`, `finger-ink`, `finger-soft` | janela da digital #10A9FF → #137EE2 |
| Cartão RFID | `rfid`, `on-rfid`, `rfid-ink`, `rfid-soft` | janela do RFID #F9D700 → #F9BB0F |
| Corpo da fechadura | `chassis`, `chassis-raised`, `steel` | aço #798C9F → #556677 |
| Negado / destrutivo | `danger`, `danger-ink`, `danger-soft` | — |
| Offline / pendente | `offline`, `offline-ink`, `offline-soft` | — |
| Modo mestre | `master`, `master-soft` | — |
| Neutros | `bg`, `surface`, `surface-sunken`, `surface-hover`, `line`, `line-strong`, `ink`, `ink-muted`, `ink-subtle` | derivados do aço |

Regras de uso:

- O botão primário é verde `lock` com texto `on-lock` (8:1) — **nunca texto branco** sobre o verde.
- Verde, azul e amarelo como texto usam a versão `-ink` (≥4.7:1 em `surface` e no fundo `-soft`, nos dois temas).
- O gradiente da marca (`lock-teal` → `lock` → `lock-lime`) aparece só no logo, no LCD espelhado e em `pl-gradient-text` no login. Em nenhum outro lugar.
- Bordas de controles usam `line-strong` (≥3:1); `line` é só para divisores.
- Tema claro é o padrão; o escuro existe para o monitor que fica ligado na sala.

## Tipografia

Três famílias do Google Fonts, carregadas no app por `next/font/google` (os exemplos HTML usam o `@import` do `petlock.css`):

- **Sora** (`--font-display`) — geométrica e larga como o "PET LOCK" do logo. Títulos, números de stat e nome da porta.
- **IBM Plex Sans** (`--font-sans`) — toda a interface.
- **IBM Plex Mono** (`--font-mono`) — UIDs, IDs, slots, horários e o espelho do LCD.

Escala: `display-xl` 40, `display` 28, `h1` 24, `h2` 18, `h3` 15 (Sora); `body-lg` 16, `body` 14, `body-strong` 14, `label` 13, `caption` 12, `overline` 11 (Plex Sans); `mono` 13, `mono-sm` 12, `lcd` 15 (Plex Mono). Um `h1` por tela.

## Espaço, raio e layout

- Grade de 4px: `space-1` 4 … `space-16` 64. Card usa `space-6` de padding; gutter do grid `space-6`.
- Raios saem do símbolo: `radius-md` 8px é o canto do corpo da fechadura (8.56 em 137px) e vai em botões, inputs e cards; `radius-sm` 4px é o canto das janelas internas e vai em chips e slots; `radius-lg` 12px em modais e no card da fechadura; `radius-full` em pílulas e avatares.
- Controles: `control-sm` 32, `control-md` 40, `control-lg` 48 (alvo de toque no celular).
- Shell: sidebar `chassis` de 248px + topbar 64px + conteúdo até 1280px. Abaixo de 1024px a sidebar vira drawer; no celular, barra inferior com Visão geral, Membros, Cadastro e Registros.
- Sombras discretas: `shadow-sm` em cards, `shadow-md` em toasts/popovers, `shadow-lg` em modais.

## Iconografia

- **Ícones de marca** (em `assets/`): `digital` e `cartao-rfid`, recortados das janelas do logo, e `fechadura`, o símbolo simplificado. Sempre em tile `pl-cred-ico` (fundo `-soft`, traço `-ink`).
- **Ícones gerais**: [Lucide](https://lucide.dev) (`lucide-react`), traço 2px, cantos arredondados, 18px na UI e 14px em chips. Use os ícones de marca no lugar de `Fingerprint` e `Nfc` do Lucide.
- Ícone nunca carrega significado sozinho: vem com rótulo ou `aria-label`.

## Logos

- `petlock-logo` — fundo claro. `petlock-logo-fundo-escuro` — a palavra "PET" clareada para a sidebar e o tema escuro. `petlock-simbolo` — só a fechadura, para favicon e avatar do app.
- Área de respiro: a altura da janela da digital em volta. Altura mínima do logo completo: 32px.

## Mapa estado → interface

Como cada dado do Firebase atual aparece na tela:

| Dado | Onde aparece |
|---|---|
| `system/mode` = `STANDBY` / `MASTER` | `StatusPill` "Em espera" / "Modo mestre"; contorno `master` no `LockStatusCard`; libera o botão "Iniciar cadastro" |
| `pendingRegistration/current` (`username`, `email`, `mode`) | `MethodPicker` + `RegistrationStepper` |
| `users/*` (`username`, `email`, `rfid`, `fingerId`, `createdAt`) | `MembersTable` com `CredentialChip` |
| `logs/*` (`userName`, `accessType`, `status`, `cardUID`, `timestamp`) | `AccessFeed`, `Toast`, `StatTile` |
| credencial na fechadura sem `users/*` correspondente | `CredentialChip.orphan`, `SlotMap` tracejado, badge em Credenciais |

Para a plataforma nova ficar vinculada à porta sem perder a independência offline, o firmware precisa publicar alguns dados que hoje não publica: heartbeat (`devices/<id>/status`: online, RSSI, firmware, última mensagem do LCD), inventário da memória (`devices/<id>/inventory`: IDs do DY50 e slots/UIDs da EEPROM), progresso do cadastro (`pendingRegistration/current.step`) e eventos com horário real guardados localmente enquanto não há rede.

## Usando no front (Next.js 16 + Tailwind CSS 4 + shadcn/ui)

1. Copie `tokens.css` para `src/styles/` e importe no `globals.css` depois de `@import "tailwindcss"`.
2. Exponha os tokens ao Tailwind com `@theme inline` (gera `bg-surface`, `text-ink-muted`, `bg-finger-soft`, `text-rfid-ink`…) e aponte as variáveis semânticas do shadcn/ui para eles: `--color-primary: var(--lock)`, `--color-primary-foreground: var(--on-lock)`, `--color-background: var(--bg)`, `--color-foreground: var(--ink)`, `--color-card: var(--surface)`, `--color-muted-foreground: var(--ink-muted)`, `--color-destructive: var(--danger)`, `--color-border: var(--line)`, `--color-input: var(--line-strong)`, `--color-ring: var(--focus)`, `--color-sidebar: var(--chassis)`.
3. Apague os blocos `:root`/`.dark` de cores que o `shadcn init` gera: as cores vêm só de `tokens.css`.
4. O token do cartão se chama `rfid` (e não `card`) justamente para não colidir com o `--card` do shadcn.
5. Tema escuro: `next-themes` com `attribute="data-theme"`, e `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));`.
6. As classes `pl-*` de `petlock.css` são a referência visual de cada componente: reproduza com utilitários Tailwind e componentes shadcn/ui, em vez de importar o CSS inteiro.
7. Fontes com `next/font/google` (Sora, IBM Plex Sans, IBM Plex Mono), ligadas a `--font-display`, `--font-sans` e `--font-mono`.

## Arquivos desta pasta

| Arquivo | O que é |
|---|---|
| `tokens.json` | Fonte da verdade dos tokens (cores por tema, tipografia, espaço, raio, sombra, tamanhos). |
| `tokens.css` | Os mesmos tokens como variáveis CSS (`:root`/`[data-theme="light"]` e `[data-theme="dark"]`). Gerado do `tokens.json`. |
| `petlock.css` | Referência visual dos componentes em CSS puro (classes `pl-*`). Não importar no app. |
| `componentes.md` | Guia de uso de cada componente. |
| `componentes/*.html` | Exemplo vivo de cada componente. |
| `assets/` | Logos (`petlock-logo`, `petlock-logo-fundo-escuro`, `petlock-simbolo`) e ícones de marca (`digital`, `cartao-rfid`, `fechadura`). |

Versão online (privada) do design system: https://claude.ai/artifact/Hm5YSPGcjU9rkhWdXFVVbQ
