# Roadmap da v2

Uma fase por vez, em ordem, na branch `v2` (cada tarefa numa branch `feat/…` com PR para `v2`). Com o Claude Code: `/fase 0`, `/fase 1`… Marque `[x]` ao concluir. No fim de cada fase, pré-release `v2.0.0-alpha.N` (ver `docs/versionamento.md`).

Legenda: 🔌 depende do firmware 2.1 (`docs/arquitetura/contrato-firmware.md`) — implementar com fallback.

---

## Fase 0 — Nova base (→ `v2.0.0-alpha.0`)

Objetivo: trocar a fundação inteira sem perder o que funciona. Nenhuma tela nova ainda; a página de cadastro antiga é removida (ela vive em `release/v1` e volta reescrita na fase 2).

**Limpeza**
- [ ] Remover HeroUI e tudo que vem com ele: `@heroui/react`, `framer-motion`, `src/app/providers.tsx`, `tailwind.config.js`, `postcss.config.js`, `autoprefixer`, `bun.lock`, `src/app/firebase.js`. Guardar a lógica de `src/app/page.tsx` como referência para a fase 2 (está em `release/v1`) e substituir a página por um placeholder.
- [ ] `.gitattributes` com `* text=auto eol=lf` (o repo é editado no Windows e em Linux) e normalizar finais de linha num commit separado `chore: normalizar finais de linha`.

**Atualização**
- [ ] `package.json`: `name: "pet-lock-web"`, `version: "2.0.0-alpha.0"`, `engines.node: ">=24"`, `.nvmrc` = 24.
- [ ] Next.js 16, React 19, React DOM, `eslint-config-next` na última estável. TypeScript strict. Conferir `next.config.ts` e breaking changes do 15→16 (`next lint` foi removido: usar `eslint .`).
- [ ] Tailwind CSS 4 + `@tailwindcss/postcss` (único `postcss.config.mjs`), `globals.css` no formato de `docs/arquitetura/stack.md`.
- [ ] Firebase JS SDK 13.

**Design system**
- [ ] `npx shadcn@latest init` (base **Base UI**, estilo padrão, `src/components/ui`, alias `@/`). Apagar os blocos de cor `:root`/`.dark` que ele gerar.
- [ ] Copiar `docs/design-system/tokens.css` para `src/styles/tokens.css` e ligar no `globals.css` (`@theme inline` completo de `stack.md`).
- [ ] Fontes em `src/app/fonts.ts` (Sora, IBM Plex Sans, IBM Plex Mono via `next/font/google`); `layout.tsx` com `lang="pt-BR"`, título "PET Lock", `ThemeProvider` do `next-themes` (`attribute="data-theme"`, padrão `light`), `Toaster` do sonner.
- [ ] Componentes base do shadcn: `button`, `badge`, `input`, `label`, `select`, `checkbox`, `radio-group`, `tabs`, `toggle-group`, `card`, `table`, `dialog`, `alert-dialog`, `alert`, `dropdown-menu`, `tooltip`, `sheet`, `sidebar`, `skeleton`, `separator`, `avatar`, `sonner`, `field`/`form`. Ajustar variantes ao design system (ver `docs/design-system/componentes.md`): Button `default | secondary | ghost | destructive | destructive-soft`, tamanhos `sm | default | lg | icon`, raios 4/8/12.
- [ ] `src/components/brand/`: `Logo` (claro/escuro), `FingerIcon`, `RfidIcon`, `LockDeviceIcon` a partir de `docs/design-system/assets/*.svg` (`stroke="currentColor"`). SVGs em `public/brand/`, favicon/`icon.svg` com o símbolo.
- [ ] Página `/dev/ui` (só em desenvolvimento) mostrando os componentes nos dois temas, para comparar com `docs/design-system/componentes/*.html`.

**Dados**
- [ ] `src/lib/firebase/{client,paths,schemas,types}.ts` e `use-rtdb-value.ts` conforme `dados-firebase.md` e `stack.md`. Config só por `NEXT_PUBLIC_*`; `.env.example` com `NEXT_PUBLIC_LOCK_DEVICE_ID` e `NEXT_PUBLIC_USE_EMULATOR`.
- [ ] Emulador: `firebase.json` (database + auth), `database.rules.json` inicial, `firebase-tools` como devDependency, `scripts/seed-emulator.ts` (recusa rodar fora do emulador) com os mesmos dados das telas de referência. Scripts `emulators` e `seed:emulator`.
- [ ] `src/lib/format.ts` com testes: `formatUid("A3:F2:1C:9D") → "A3 F2 1C 9D"`, `normalizeUid`, `parseLockTimestamp("2026-11-10 14:32:08")` (UTC-3), `relativeTime` pt-BR, `lcdName(nome)` (sem acento, 16 colunas).

**Qualidade e versionamento**
- [ ] ESLint 9 flat + Prettier + `prettier-plugin-tailwindcss`; scripts `lint`, `format`, `typecheck`.
- [ ] Vitest + Testing Library (`test`), Playwright (`test:e2e`) com um teste de fumaça da página inicial.
- [ ] Husky + lint-staged (lint/format nos arquivos alterados) + commitlint (`@commitlint/config-conventional`, escopos de `docs/versionamento.md`).
- [ ] GitHub Actions `ci.yml`: em PR e push para `v2`, Node 24, `npm ci`, lint, typecheck, test, build.
- [ ] `CHANGELOG.md` com as versões instaladas; pré-release `v2.0.0-alpha.0`.

## Fase 1 — Shell e autenticação (→ `alpha.1`)

- [ ] Firebase Auth: Google (restrito a `@ufc.br`/`@alu.ufc.br`) + e-mail/senha. `AuthProvider` + `useAuth`.
- [ ] Autorização por `admins/{uid} === true`; tela "sem permissão".
- [ ] `/login` (tela 01).
- [ ] `(painel)/layout.tsx` protegido: `AppSidebar` (shadcn Sidebar com tokens `chassis`, mini status da porta com LCD, badge de sem dono), `Topbar` (busca, notificações, ação principal), `MobileNav` ≤ 640px, drawer (Sheet) ≤ 1024px, `ThemeToggle`.
- [ ] Componentes do domínio em `components/pet/`: `StatusPill`, `CredentialChip`, `LcdMirror`, `LockStatusCard`, `EmptyState`, `StatTile`.
- [ ] Hooks `useSystemMode`, `useDeviceStatus` (`missing` sem `devices/*`).

## Fase 2 — Novo cadastro (→ `alpha.2`)

- [ ] `/cadastro` (tela 05) reescrevendo a lógica da v1 (`release/v1:src/app/page.tsx`) com react-hook-form + zod, `MethodPicker` e `RegistrationStepper`.
- [ ] `usePendingRegistration` (criar, cancelar, observar); manter o espelho `pendingUser/current`.
- [ ] Bloquear sem `MASTER`; reagir se o modo cair no meio; timer de 120 s.
- [ ] Distinguir concluído × cancelado na porta; "Cartão salvo, digital falhou".
- [ ] Gravar `members/{key}` (vínculo, validade) após concluir.
- [ ] 🔌 `step` do cadastro e LCD espelhado quando existirem.
- [ ] Layout de celular (tela 09). Teste ponta a ponta com a fechadura real (combinar com o usuário) e e2e com emulador.
- [ ] Abrir issue/PR rascunho no upstream apresentando a v2 (ver `versionamento.md`).

## Fase 3 — Membros (→ `alpha.3`)

- [ ] `useMembers` (`users` + `members` + último log).
- [ ] `/membros` (tela 03) com TanStack Table: filtros, busca normalizada (nome, e-mail, UID, `#ID`), ordenação, Exportar CSV.
- [ ] `/membros/[key]` (tela 04): credenciais, histórico, presença, editar metadados.
- [ ] Desativar/remover: 🔌 `commands`; sem firmware 2.1, desabilitado com a instrução de remoção na porta.
- [ ] Busca global da Topbar (Command/combobox do shadcn).

## Fase 4 — Registros e visão geral (→ `alpha.4`)

- [ ] `useLogs({ since, limit })` ordenando por horário real e tratando `1970-01-01`.
- [ ] `/registros` (tela 07): filtros, agrupamento por dia, paginação, CSV.
- [ ] `/` (tela 02): stat tiles, gráfico por hora (shadcn Chart), feed ao vivo, card da fechadura, "Precisa de atenção".
- [ ] Toast (sonner) de acesso em tempo real, com opção de desligar.
- [ ] Detecção de sem dono pelos logs (`ALLOWED` + `Desconhecido`).

## Fase 5 — Fechadura (→ `beta.0`)

- [ ] `/credenciais` (tela 06): `SlotMap`, painel da posição, vincular sem dono.
- [ ] 🔌 `useInventory`; sem inventário, mapa parcial com aviso.
- [ ] `/dispositivo` (tela 08): cabeçalho, conexão 24 h (🔌), periféricos, ajustes e manutenção (🔌 `commands`).
- [ ] Fila de comandos com estado (pendente/feito/erro).

## Fase 6 — Segurança, entrega e PR (→ `rc.N` → PR → `v2.0.0`)

- [ ] `database.rules.json` de produção + testes de regras no emulador.
- [ ] 🔌 Conta própria do dispositivo no lugar do login anônimo.
- [ ] Revisão de acessibilidade (teclado, foco, contraste nos dois temas, leitor de tela no LCD e no mapa de slots).
- [ ] Deploy de preview (Vercel ou Firebase Hosting) com variáveis de ambiente; atualizar `README.md`.
- [ ] Sincronizar com `upstream/main`, gerar `v2.0.0-rc.1`, abrir o PR para o upstream com o template e as capturas.

## Firmware 2.1 (repositório `pet-lock-new`, em paralelo)

Itens do `contrato-firmware.md` › Parte 2: heartbeat/LCD, inventário, `step` do cadastro, comandos, fila persistente com horário real e chave de log única, conta do dispositivo.
