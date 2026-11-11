# Changelog

Todas as mudanças relevantes deste projeto. Formato [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), versões [SemVer](https://semver.org/lang/pt-BR/). Fluxo de branches e releases: [`docs/versionamento.md`](docs/versionamento.md).

## [Não lançado] — v2

### Adicionado
- Fase 2 — novo cadastro (`/cadastro`, telas 05 e 09): formulário com react-hook-form + zod (nome com prévia do LCD, e-mail da UFC exceto visitantes, vínculo, validade), `MethodPicker` e `RegistrationStepper`, painel da porta com tempo restante e instrução em destaque no celular.
- Máquina de estados do cadastro em `src/lib/registration/` (testada com fakes): pedido em `pendingRegistration/current` + espelho `pendingUser/current` numa escrita só; retomada de pedido em andamento; prazo de 120 s pelo horário do pedido; cancelamento se a fechadura sai do Modo mestre; concluído × cancelado na porta pelo `users/*` novo com o e-mail do pedido; "Cartão salvo, digital falhou"; `members/{key}` com vínculo, validade e quem cadastrou.
- Firmware 2.1 (com fallback): passo ativo e erros pelo `step`, `result.userKey` e LCD espelhado no painel.
- E2E do cadastro contra o emulador, com o teste fazendo o papel da fechadura (concluído, digital falhou, cancelado na porta e pelo site, Modo mestre caindo, celular).

### Corrigido
- `buttonVariants()` agora passa pelo `cn`: links com cara de botão perdiam a borda (`border-transparent` da base disputava com a da variante).

## [2.0.0-alpha.1] — 2026-11-11

Fase 1 — shell e autenticação. Também troca o gerenciador de pacotes para o pnpm 12.

### Adicionado
- Fase 1 — shell e autenticação: login com Google (só `@ufc.br`/`@alu.ufc.br`) e e-mail/senha, com "Esqueci a senha" (`/login`, tela 01); autorização por `admins/{uid}` com tela "Sem permissão"; `AuthProvider`/`useAuth` e `AuthGate` no painel.
- Shell do painel: `AppSidebar` em `chassis` (248px, drawer abaixo de 1024px) com badge de credenciais sem dono e mini estado da porta com LCD, `Topbar` (busca, avisos, ação principal; header `chassis` no celular), `MobileNav` (≤ 640px) e telas provisórias "Em construção" para as rotas do menu.
- Componentes do domínio em `components/pet/`: `StatusPill`, `CredentialChip`, `LcdMirror`, `LockStatusCard`, `EmptyState`, `StatTile` (vitrine em `/dev/ui`).
- Hooks `useSystemMode`, `useDeviceStatus` (`missing` no firmware 2.0), `useRecentLogs`, `useOrphans` e `useLockSnapshot`; regras puras em `src/lib/lock-state.ts` (offline após 30 s sem heartbeat, LCD apagado após 2 min, logs pelo horário real, sem dono pelo inventário ou pelos logs), com testes.
- E2E de login contra o emulador (admin, senha errada, conta sem permissão).

### Alterado
- `database.rules.json`: escritas de admin também exigem e-mail `@ufc.br`/`@alu.ufc.br`.
- Gerenciador de pacotes: npm → pnpm 12.18.0 (`packageManager`, `pnpm-lock.yaml`). Scripts de instalação só com aprovação em `allowBuilds` (`pnpm-workspace.yaml`): `esbuild` liberado; `@firebase/util`, `protobufjs` e `re2` negados. CI com `pnpm/action-setup@v6`, hooks do Husky e docs atualizados.

## [2.0.0-alpha.0] — 2026-11-10

Fase 0 — nova base. Reescrita do painel com Next.js 16, Tailwind CSS 4 e shadcn/ui, no lugar de Next.js 15, Tailwind 3 e HeroUI. Plano em [`docs/roadmap.md`](docs/roadmap.md).

### Adicionado
- Nova base (fase 0): Next.js 16.4.6, React 19.3.1, TypeScript 6.0.3 (strict), Tailwind CSS 4.3.5 (`@tailwindcss/postcss` 4.3.5, configuração no CSS), shadcn/ui CLI 4.23.0 com Base UI 1.9.0, Firebase JS SDK 13.2.0, zod 4.6.7, react-hook-form 7.91.0, lucide-react 1.71.0, next-themes 0.4.6, sonner 2.0.8, date-fns 4.4.0. Node.js 24 (`engines`, `.nvmrc`).
- Design system ligado ao Tailwind: `src/styles/tokens.css`, `@theme inline` com os tokens PET Lock e as variáveis do shadcn, escala tipográfica (`text-h1`, `text-label`, `text-lcd`…), fontes Sora, IBM Plex Sans e IBM Plex Mono, tema claro/escuro por `data-theme`.
- Componentes base do shadcn adaptados (Button `default | secondary | ghost | destructive | destructive-soft`, Badge com as pílulas de estado, Alert `info | offline | master | danger | success`, Input, Select, Field, Tabs, ToggleGroup segmentado, Card, Table, Dialog, AlertDialog, Sheet, Sidebar, Toast em `chassis`…) e vitrine em `/dev/ui` (só em desenvolvimento).
- Marca: `Logo`, `LogoSymbol`, `FingerIcon`, `RfidIcon`, `LockDeviceIcon`, SVGs em `public/brand/` e favicon com o símbolo.
- Camada do Firebase em `src/lib/firebase/` (`client`, `paths`, `schemas` zod, `types`, `useRtdbValue` com estado `missing` para o firmware 2.0) e emulador local (`firebase.json`, `database.rules.json` inicial, `npm run emulators`, `npm run seed:emulator` com os dados das telas de referência).
- `src/lib/format.ts` com testes: UID em grupos de 2, normalização de UID, horário da fechadura (UTC-3, `1970-01-01` = sem NTP), tempo relativo em pt-BR e nome para o LCD.
- Qualidade: ESLint 9.39.5 (flat, `eslint-config-next` 16.4.6) + Prettier 3.9.10 com `prettier-plugin-tailwindcss`, Vitest 5.1.0 + Testing Library, Playwright 1.65.0 (fumaça da página inicial, desktop e 390px), Husky 9.1.7 + lint-staged 17.6.0 + commitlint 21.2.4 com os escopos do projeto, GitHub Actions (`ci.yml`), `.gitattributes` com LF.
- Documentação da v2: visão do produto, especificação das telas, dados do Firebase, contrato com o firmware, stack e versionamento (`docs/`).
- Design system PET Lock (tokens, componentes de referência, logos e ícones) em `docs/design-system/`.
- Referências visuais das 10 telas (PNG + HTML) em `docs/design/telas/`.
- Contexto e configuração para o Claude Code (`CLAUDE.md`, `claude-setup/`).
- Template de pull request e guia de contribuição.

### Removido
- HeroUI, framer-motion, autoprefixer, `tailwind.config.js`, `postcss.config.js`, `src/app/providers.tsx`, `src/app/firebase.js` e `bun.lock`. A página de cadastro da v1 sai da v2 (continua em `release/v1`) e volta reescrita na fase 2.

## [1.1.0] — 2026-11-10

### Adicionado
- Cadastro com três modos (cartão + digital, só cartão, só digital) por `pendingRegistration/current.mode`, exigido pelo firmware 2.0 da fechadura.
- Status em tempo real do Modo mestre (`system/mode`), confirmação de cadastro concluído e cancelamento do pedido pendente.

## [1.0.0] — 2025-07-17

Versão original de JonasFortes12: formulário de cadastro com HeroUI que grava `pendingUser/current` no Firebase.

[Não lançado]: https://github.com/vander-furtuna/register-page-security-access-control-system/compare/v2.0.0-alpha.1...v2
[2.0.0-alpha.1]: https://github.com/vander-furtuna/register-page-security-access-control-system/compare/v2.0.0-alpha.0...v2.0.0-alpha.1
[2.0.0-alpha.0]: https://github.com/vander-furtuna/register-page-security-access-control-system/releases/tag/v2.0.0-alpha.0
[1.1.0]: https://github.com/JonasFortes12/register-page-security-access-control-system/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/JonasFortes12/register-page-security-access-control-system/releases/tag/v1.0.0
