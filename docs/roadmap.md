# Roadmap da v2

Uma fase por vez, em ordem, na branch `v2` (cada tarefa numa branch `feat/…` com PR para `v2`). Com o Claude Code: `/fase 0`, `/fase 1`… Marque `[x]` ao concluir. No fim de cada fase, pré-release `v2.0.0-alpha.N` (ver `docs/versionamento.md`).

Legenda: 🔌 depende do firmware 2.1 (`docs/arquitetura/contrato-firmware.md`) — implementar com fallback.

---

## Fase 0 — Nova base (→ `v2.0.0-alpha.0`)

Objetivo: trocar a fundação inteira sem perder o que funciona. Nenhuma tela nova ainda; a página de cadastro antiga é removida (ela vive em `release/v1` e volta reescrita na fase 2).

**Limpeza**
- [x] Remover HeroUI e tudo que vem com ele: `@heroui/react`, `framer-motion`, `src/app/providers.tsx`, `tailwind.config.js`, `postcss.config.js`, `autoprefixer`, `bun.lock`, `src/app/firebase.js`. Guardar a lógica de `src/app/page.tsx` como referência para a fase 2 (está em `release/v1`) e substituir a página por um placeholder.
- [x] `.gitattributes` com `* text=auto eol=lf` (o repo é editado no Windows e em Linux) e normalizar finais de linha num commit separado `chore: normalizar finais de linha`.

**Atualização**
- [x] `package.json`: `name: "pet-lock-web"`, `version: "2.0.0-alpha.0"`, `engines.node: ">=24"`, `.nvmrc` = 24.
- [x] Next.js 16, React 19, React DOM, `eslint-config-next` na última estável. TypeScript strict. Conferir `next.config.ts` e breaking changes do 15→16 (`next lint` foi removido: usar `eslint .`).
- [x] Tailwind CSS 4 + `@tailwindcss/postcss` (único `postcss.config.mjs`), `globals.css` no formato de `docs/arquitetura/stack.md`.
- [x] Firebase JS SDK 13.

**Design system**
- [x] `npx shadcn@latest init` (base **Base UI**, estilo padrão, `src/components/ui`, alias `@/`). Apagar os blocos de cor `:root`/`.dark` que ele gerar.
- [x] Copiar `docs/design-system/tokens.css` para `src/styles/tokens.css` e ligar no `globals.css` (`@theme inline` completo de `stack.md`).
- [x] Fontes em `src/app/fonts.ts` (Sora, IBM Plex Sans, IBM Plex Mono via `next/font/google`); `layout.tsx` com `lang="pt-BR"`, título "PET Lock", `ThemeProvider` do `next-themes` (`attribute="data-theme"`, padrão `light`), `Toaster` do sonner.
- [x] Componentes base do shadcn: `button`, `badge`, `input`, `label`, `select`, `checkbox`, `radio-group`, `tabs`, `toggle-group`, `card`, `table`, `dialog`, `alert-dialog`, `alert`, `dropdown-menu`, `tooltip`, `sheet`, `sidebar`, `skeleton`, `separator`, `avatar`, `sonner`, `field`/`form`. Ajustar variantes ao design system (ver `docs/design-system/componentes.md`): Button `default | secondary | ghost | destructive | destructive-soft`, tamanhos `sm | default | lg | icon`, raios 4/8/12.
- [x] `src/components/brand/`: `Logo` (claro/escuro), `FingerIcon`, `RfidIcon`, `LockDeviceIcon` a partir de `docs/design-system/assets/*.svg` (`stroke="currentColor"`). SVGs em `public/brand/`, favicon/`icon.svg` com o símbolo.
- [x] Página `/dev/ui` (só em desenvolvimento) mostrando os componentes nos dois temas, para comparar com `docs/design-system/componentes/*.html`.

**Dados**
- [x] `src/lib/firebase/{client,paths,schemas,types}.ts` e `use-rtdb-value.ts` conforme `dados-firebase.md` e `stack.md`. Config só por `NEXT_PUBLIC_*`; `.env.example` com `NEXT_PUBLIC_LOCK_DEVICE_ID` e `NEXT_PUBLIC_USE_EMULATOR`.
- [x] Emulador: `firebase.json` (database + auth), `database.rules.json` inicial, `firebase-tools` como devDependency, `scripts/seed-emulator.ts` (recusa rodar fora do emulador) com os mesmos dados das telas de referência. Scripts `emulators` e `seed:emulator`.
- [x] `src/lib/format.ts` com testes: `formatUid("A3:F2:1C:9D") → "A3 F2 1C 9D"`, `normalizeUid`, `parseLockTimestamp("2026-11-10 14:32:08")` (UTC-3), `relativeTime` pt-BR, `lcdName(nome)` (sem acento, 16 colunas).

**Qualidade e versionamento**
- [x] ESLint 9 flat + Prettier + `prettier-plugin-tailwindcss`; scripts `lint`, `format`, `typecheck`.
- [x] Vitest + Testing Library (`test`), Playwright (`test:e2e`) com um teste de fumaça da página inicial.
- [x] Husky + lint-staged (lint/format nos arquivos alterados) + commitlint (`@commitlint/config-conventional`, escopos de `docs/versionamento.md`).
- [x] GitHub Actions `ci.yml`: em PR e push para `v2`, Node 24, `npm ci`, lint, typecheck, test, build.
- [x] `CHANGELOG.md` com as versões instaladas; pré-release `v2.0.0-alpha.0`.

## Fase 1 — Shell e autenticação (→ `alpha.1`)

- [x] Firebase Auth: Google (restrito a `@ufc.br`/`@alu.ufc.br`) + e-mail/senha. `AuthProvider` + `useAuth`.
- [x] Autorização por `admins/{uid} === true`; tela "sem permissão".
- [x] `/login` (tela 01).
- [x] `(painel)/layout.tsx` protegido: `AppSidebar` (shadcn Sidebar com tokens `chassis`, mini status da porta com LCD, badge de sem dono), `Topbar` (busca, notificações, ação principal), `MobileNav` ≤ 640px, drawer (Sheet) ≤ 1024px, `ThemeToggle`. _(Busca da Topbar envia para `/membros?q=`, que é implementada na fase 3; avisos mostram estado vazio até a fase 4.)_
- [x] Componentes do domínio em `components/pet/`: `StatusPill`, `CredentialChip`, `LcdMirror`, `LockStatusCard`, `EmptyState`, `StatTile`.
- [x] Hooks `useSystemMode`, `useDeviceStatus` (`missing` sem `devices/*`).

## Fase 2 — Novo cadastro (→ `alpha.2`)

- [x] `/cadastro` (tela 05) reescrevendo a lógica da v1 (`release/v1:src/app/page.tsx`) com react-hook-form + zod, `MethodPicker` e `RegistrationStepper`.
- [x] `usePendingRegistration` (criar, cancelar, observar); manter o espelho `pendingUser/current`.
- [x] Bloquear sem `MASTER`; reagir se o modo cair no meio; timer de 120 s.
- [x] Distinguir concluído × cancelado na porta; "Cartão salvo, digital falhou".
- [x] Gravar `members/{key}` (vínculo, validade) após concluir.
- [x] 🔌 `step` do cadastro e LCD espelhado quando existirem. _(Pronto e testado com dados simulados; falta o firmware 2.1 publicar `step`/`result` e `devices/*/status.lcd`.)_
- [ ] Layout de celular (tela 09). Teste ponta a ponta com a fechadura real (combinar com o usuário) e e2e com emulador. _(Layout de celular e e2e com emulador prontos (`e2e/cadastro.spec.ts`); falta o teste com a fechadura real, a combinar.)_
- [x] Abrir issue/PR rascunho no upstream apresentando a v2 (ver `versionamento.md`). _(Issue [#1](https://github.com/JonasFortes12/register-page-security-access-control-system/issues/1), aberta em 13/11/2026.)_

## Fase 3 — Membros (→ `alpha.3`)

- [x] `useMembers` (`users` + `members` + último log).
- [x] `/membros` (tela 03) com TanStack Table: filtros, busca normalizada (nome, e-mail, UID, `#ID`), ordenação, Exportar CSV.
- [x] `/membros/[key]` (tela 04): credenciais, histórico, presença, editar metadados.
- [x] Desativar/remover: 🔌 `commands`; sem firmware 2.1, desabilitado com a instrução de remoção na porta. _(Fluxo com comandos testado contra o emulador simulando o firmware 2.1; o que o site grava após `DONE` está em `contrato-firmware.md` › 2.4.)_
- [x] Busca global da Topbar (Command/combobox do shadcn). _(Combobox do shadcn com Base UI, sem `cmdk`.)_

## Fase 4 — Registros e visão geral (→ `alpha.4`)

- [x] `useLogs({ since, limit })` ordenando por horário real e tratando `1970-01-01`.
- [x] `/registros` (tela 07): filtros, agrupamento por dia, paginação, CSV.
- [x] `/` (tela 02): stat tiles, gráfico por hora (shadcn Chart), feed ao vivo, card da fechadura, "Precisa de atenção".
- [x] Toast (sonner) de acesso em tempo real, com opção de desligar.
- [x] Detecção de sem dono pelos logs (`ALLOWED` + `Desconhecido`). _(Desde a fase 1 em `lock-state.ts`; agora também no feed, nos registros e em "Precisa de atenção".)_

## Fase 5 — Fechadura (→ `beta.0`)

- [x] `/credenciais` (tela 06): `SlotMap`, painel da posição, vincular sem dono.
- [x] 🔌 `useInventory`; sem inventário, mapa parcial com aviso. _(`useDeviceInventory` + `buildSlots` em `src/lib/slots.ts`.)_
- [x] `/dispositivo` (tela 08): cabeçalho, conexão 24 h (🔌), periféricos, ajustes e manutenção (🔌 `commands`). _(Quedas, ajustes e diagnóstico dos periféricos dependem da proposta 2.7 do contrato. "Avisar acessos negados" por e-mail ficou de fora: precisa de backend; o toast já existe desde a fase 4.)_
- [x] Fila de comandos com estado (pendente/feito/erro).

## Fase 6 — Segurança, entrega e PR (→ `rc.N` → PR → `v2.0.0`)

- [x] `database.rules.json` de produção + testes de regras no emulador. _(19 testes em `tests/rules/`, `pnpm test:rules`, também no CI. **Publicar** as regras no projeto real fica para o admin, com o passo a passo de `dados-firebase.md` › 3; conferir na porta real que o firmware 2.0 segue gravando.)_
- [x] 🔌 Conta própria do dispositivo no lugar do login anônimo. _(Lado do site pronto: as regras aceitam `config/deviceUids/{uid}` e mantêm o anônimo do firmware 2.0 até `config/legacyAnonymousDevice: false`. Falta o firmware 2.1 usar a conta: `contrato-firmware.md` › 2.6.)_
- [x] Revisão de acessibilidade (teclado, foco, contraste nos dois temas, leitor de tela no LCD e no mapa de slots). _(axe em todas as telas, claro/escuro, desktop/390px, nos estados firmware 2.0, 2.1, offline e Modo mestre; "Pular para o conteúdo"; setas/Home/End no mapa. O teste com leitor de tela de verdade (NVDA/TalkBack) fica para a rodada com a fechadura real.)_
- [ ] Deploy de preview (Vercel ou Firebase Hosting) com variáveis de ambiente; atualizar `README.md`. _(README com o passo a passo e cabeçalhos de segurança prontos; o deploy precisa da conta e das chaves do projeto real: decisão e execução com o mantenedor.)_
- [ ] Sincronizar com `upstream/main`, gerar `v2.0.0-rc.1`, abrir o PR para o upstream com o template e as capturas. _(Depois do merge desta fase e do deploy de preview, quando o mantenedor pedir.)_

## Firmware 2.1 (repositório `pet-lock-new`, em paralelo)

Itens do `contrato-firmware.md` › Parte 2: heartbeat/LCD, inventário, `step` do cadastro, comandos, fila persistente com horário real e chave de log única, conta do dispositivo, saúde da fechadura (2.7: quedas, ajustes, periféricos).

- [x] Implementado na branch `feat/firmware-2.1` do `pet-lock-new` (contrato › Parte 3), com correções de bugs da EEPROM, da fila offline e da remoção na porta. _(Compila; falta gravar e testar na fechadura real.)_
