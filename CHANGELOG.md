# Changelog

Todas as mudanças relevantes deste projeto. Formato [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), versões [SemVer](https://semver.org/lang/pt-BR/). Fluxo de branches e releases: [`docs/versionamento.md`](docs/versionamento.md).

## [Não lançado] — v2

### Adicionado
- Fase 6 — segurança. `database.rules.json` de produção: leitura só para admin (`admins/{uid}` + e-mail da UFC) ou para a fechadura; cada caminho com um único dono (o site não liga o Modo mestre nem grava registros; a fechadura não mexe em `members/*`); formato conferido em `pendingRegistration`, `members` e `devices/*/commands` (só a fechadura marca `DONE`/`ERROR`, comandos em nome de quem pediu).
- Conta própria da fechadura: as regras aceitam `config/deviceUids/{uid}` (firmware 2.1) e mantêm o login anônimo do firmware 2.0 até `config/legacyAnonymousDevice: false`.
- Testes das regras contra o emulador (`pnpm test:rules`, 19 casos), também num job do CI.
- Acessibilidade: varredura axe (WCAG 2.2 AA) de todas as telas nos dois temas, no desktop e em 390px; testes de teclado; link "Pular para o conteúdo".
- Cabeçalhos de segurança (`frame-ancestors 'none'`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP para o popup do Google); README com o passo a passo de publicação.

### Corrigido
- Últimos acessos, sem dono e último acesso dos membros consultam os registros pelo `timestamp`, não pela chave: as chaves do firmware 2.1 (`log_<epoch>_…`) ficam antes das `log_<millis>` do 2.0 em ordem de texto e sumiriam das listas.
- Seed: horários "de hoje" que ainda não chegaram vão para o dia anterior (rodando de madrugada, gravava acessos no futuro).
- Contraste das pílulas sobre o chassis (em espera, offline, Modo mestre, negado) abaixo de 4,5:1 na sidebar e no card da fechadura; o ponto mantém a cor do estado.
- Tabelas com rolagem lateral (histórico do membro, registros, periféricos) agora recebem foco pelo teclado.
- Busca global: a escolha de um membro não se perde quando chega um acesso novo no meio dela.
- e2e estável com a suíte inteira em paralelo no `pnpm dev` (tempo de `expect` de 15 s).

### Alterado
- Dependência de desenvolvimento: `@axe-core/playwright`.

## [2.0.0-beta.0] — 2026-11-13

Fase 5 — credenciais na fechadura e dispositivo. Todas as telas prontas; o teste com a fechadura real fica para depois da fase 6.

### Adicionado
- Fase 5 — fechadura. `/credenciais` (tela 06): abas Digitais, Cartões e Sem dono com o `SlotMap` (navegação por setas, posição na URL), painel da posição para vincular uma credencial sem dono a um membro, apagar, remover, tirar do cadastro uma posição que não está mais na fechadura ou começar um cadastro; "Ler inventário agora" (`REFRESH_INVENTORY`); mapa parcial com aviso no firmware 2.0; limpar a memória indicado como presencial.
- `/dispositivo` (tela 08): cabeçalho com "Online há…", placa, firmware, IP, LCD e métricas; conexão nas últimas 24 h com a lista das quedas; "Quando a internet cai"; periféricos com ligações e diagnóstico; ajustes por comando (tempo da tranca, prazo do cadastro, nome no display) que só mudam depois que a fechadura publica; reiniciar com confirmação; fila de comandos com pendente, feito e erro. Tudo com fallback para o firmware 2.0.
- `useDeviceOutages`, `useDeviceCommands`, regras puras de slots (`src/lib/slots.ts`) e da tela de dispositivo (`src/lib/device.ts`) com testes; e2e das duas telas no projeto `fechadura` do Playwright (roda depois dos outros, porque troca `devices/*`).
- Seed `--firmware-2.1` com quedas, ajustes, periféricos e comandos.

### Alterado
- Contrato com o firmware: proposta 2.7 (`onlineSince`, `ssid`, `board`, `bootAt`, `settings`, `peripherals`, `devices/*/outages`, comando `SET_REGISTRATION_SECONDS`) e as escritas do site ao vincular uma credencial sem dono.
- Regras: `devices/*/outages` gravável pelo dispositivo; índice `requestedAt` nos comandos.

## [2.0.0-alpha.4] — 2026-11-13

Fase 4 — registros de acesso e visão geral.

### Adicionado
- Fase 4 — registros e visão geral. `/registros` (tela 07): resumo do período, filtros na URL (Hoje, 7 e 30 dias, intervalo de datas, credencial, resultado), tabela agrupada por dia com observações ("Cadastrar este cartão", "Vincular digital #27", "Enviado às … (estava offline)"), grupo "Sem horário confiável" para `1970-01-01`, "Carregar mais" e CSV.
- `/` Visão geral (tela 02): banner de offline (firmware 2.1) ou Modo mestre, números com link para a lista filtrada, gráfico de acessos por hora (shadcn Chart/Recharts) com tabela equivalente, últimos acessos ao vivo, card da porta com "Cadastrar membro agora" em Modo mestre e "Precisa de atenção".
- Toast de cada acesso em tempo real, com opção de desligar e de manter negados na tela; sino com os negados do dia.
- `useLogs({ since, limit })` por `timestamp` (índice nas regras), `useUnsyncedLogs` e funções puras de registros (`src/lib/access-logs.ts`) com testes; `?aba=` na tela de Membros; e2e de registros, visão geral e avisos.
- Cores do gráfico validadas com o dataviz nos dois temas (`--chart-allowed`, `--chart-denied`).

### Alterado
- Dependências: `recharts` 3.8.0 (via shadcn Chart) e `react-is`.
- Contrato com o firmware: proposta de `syncedAt` nos eventos da fila offline.

## [2.0.0-alpha.3] — 2026-11-13

Fase 3 — membros.

### Adicionado
- Fase 3 — membros. `/membros` (tela 03): resumo de digitais, cartões e sem dono; abas com contagem; filtro de vínculo; tabela com TanStack Table 9 (ordenação por nome e último acesso, paginação); busca por `?q=`; Exportar CSV (`;` + BOM).
- `/membros/[key]` (tela 04): cabeçalho com status e vínculo, cards de digital e cartão (último uso, usos em 30 dias, "Na fechadura" com inventário), histórico com Hoje/7/30 dias, mapa de presença de 5 semanas e edição de vínculo e validade.
- Busca global na Topbar (combobox do shadcn com Base UI): nome, e-mail, UID em qualquer formato e `#ID`; Enter abre Membros filtrado.
- Desativar, remover membro e remover credencial com comandos para a fechadura (firmware 2.1): o painel envia, acompanha pendente/feito/erro e só atualiza o banco depois do `DONE`. Sem firmware 2.1, desabilitado com a instrução de remover na porta.
- "Recadastrar", "Trocar cartão" e "Adicionar digital/cartão" abrem o cadastro preenchido (`?nome=&email=&modo=`).
- Funções puras de membros (`src/lib/members.ts`) e comandos (`src/lib/commands.ts`) com testes; índice de `logs` por `userPath`/`userEmail` nas regras; `pnpm seed:emulator --muitos` (40 membros); e2e de membros contra o emulador.

### Corrigido
- Tabelas com rolagem horizontal faziam a página inteira rolar no celular: o `sr-only` do cabeçalho escapava do contêiner de rolagem.

## [2.0.0-alpha.2] — 2026-11-13

Fase 2 — novo cadastro. Testado contra o emulador; ainda falta o teste ponta a ponta com a fechadura real.

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

[Não lançado]: https://github.com/vander-furtuna/register-page-security-access-control-system/compare/v2.0.0-beta.0...v2
[2.0.0-beta.0]: https://github.com/vander-furtuna/register-page-security-access-control-system/compare/v2.0.0-alpha.4...v2.0.0-beta.0
[2.0.0-alpha.4]: https://github.com/vander-furtuna/register-page-security-access-control-system/compare/v2.0.0-alpha.3...v2.0.0-alpha.4
[2.0.0-alpha.3]: https://github.com/vander-furtuna/register-page-security-access-control-system/compare/v2.0.0-alpha.2...v2.0.0-alpha.3
[2.0.0-alpha.2]: https://github.com/vander-furtuna/register-page-security-access-control-system/compare/v2.0.0-alpha.1...v2.0.0-alpha.2
[2.0.0-alpha.1]: https://github.com/vander-furtuna/register-page-security-access-control-system/compare/v2.0.0-alpha.0...v2.0.0-alpha.1
[2.0.0-alpha.0]: https://github.com/vander-furtuna/register-page-security-access-control-system/releases/tag/v2.0.0-alpha.0
[1.1.0]: https://github.com/JonasFortes12/register-page-security-access-control-system/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/JonasFortes12/register-page-security-access-control-system/releases/tag/v1.0.0
