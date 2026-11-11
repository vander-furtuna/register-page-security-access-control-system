# PET Lock — painel web da fechadura do PET

Painel de cadastro e administração da fechadura eletrônica da sala do PET Engenharia de Computação (UFC Sobral). A fechadura é um ESP32 com sensor de digitais óptico DY50, leitor RFID RC522, LCD 16x2 e Firebase Realtime Database. O firmware fica em outro repositório (`pet-lock-new`, PlatformIO + FreeRTOS).

**A v2 é uma reescrita com atualização de stack** (Next.js 16, Tailwind CSS 4, shadcn/ui; sai o HeroUI). Ela é desenvolvida na branch `v2` de um fork e vai virar um pull request para o repositório original (`upstream`). A v1 (HeroUI, só a página de cadastro) fica preservada nas tags `v1.0.0`/`v1.1.0` e na branch `release/v1`.

## Primeira sessão

Se `.claude/` ou `.mcp.json` ainda não existem, copie `claude-setup/claude/*` para `.claude/`, `claude-setup/mcp.json` para `.mcp.json` e `claude-setup/github/pull_request_template.md` para `.github/` (ou rode `claude-setup/instalar.ps1`). Proponha o commit `chore: configurar claude code e template de pr`, apague `claude-setup/` e peça ao usuário para reiniciar a sessão.

## Antes de qualquer tarefa

1. Confirme a branch: trabalho novo sai de `v2` numa branch `feat/…` (nunca commite em `main` nem em `release/v1`). Veja `docs/versionamento.md`.
2. Leia a fase/tarefa em `docs/roadmap.md`.
3. Leia a tela em `docs/produto/telas.md` e **abra o PNG de referência** em `docs/design/telas/` (o `.html` ao lado tem a marcação exata).
4. UI: `docs/design-system/README.md`, `docs/design-system/componentes.md` e `docs/arquitetura/stack.md` (skill `petlock-ui`).
5. Firebase: `docs/arquitetura/dados-firebase.md` e `contrato-firmware.md`.

## Regra de ouro: a fechadura é independente

A porta valida digitais (no DY50) e cartões (na EEPROM) **sem internet**. O site espelha e comanda, nunca é requisito para abrir a porta.

- Nunca mostre algo como feito na porta antes de a fechadura confirmar no banco.
- Toda tela funciona quando os dados novos do firmware (`devices/*`) ainda não existem: mostre "não disponível nesta versão do firmware", nunca quebre.
- O cadastro só começa com `system/mode === "MASTER"` (cartão mestre aproximado na porta). Não existe forma de ativar o Modo mestre pelo site, de propósito.
- Mantenha os caminhos que o firmware 2.0 lê e escreve (`users/*`, `logs/*`, `system/mode`, `pendingRegistration/current`, `pendingUser/current`). Mudança de formato exige mudança combinada no firmware, registrada em `docs/arquitetura/contrato-firmware.md`.

## Stack (detalhes e motivos em `docs/arquitetura/stack.md`)

- Node.js 24 LTS · pnpm 12 (só `pnpm-lock.yaml`; versão em `packageManager`). Script de instalação de dependência nova só roda com aprovação em `allowBuilds` (`pnpm-workspace.yaml`, via `pnpm approve-builds`)
- Next.js 16 (App Router, Turbopack) · React 19 · TypeScript strict
- Tailwind CSS 4 (configuração no CSS com `@theme`; sem `tailwind.config.js`)
- shadcn/ui (CLI v4, primitivas Base UI) em `src/components/ui/` · lucide-react · next-themes · sonner
- react-hook-form + zod · @tanstack/react-table · shadcn Chart (Recharts) · date-fns (`ptBR`)
- Firebase JS SDK 13 (Realtime Database + Auth), hooks próprios em `src/lib/firebase/`
- Vitest + Testing Library · Playwright · ESLint 9 + Prettier · Husky + lint-staged + commitlint
- **Não use** HeroUI, framer-motion, styled-components, MUI, Chakra ou outra lib de componentes. Precisa de um componente? `pnpm dlx shadcn@latest add <nome>` (troque `from "cn"` por `from "@/lib/utils"`) e adapte ao design system.

## Comandos (a partir da fase 0)

```bash
pnpm install
pnpm dev               # http://localhost:3000
pnpm lint
pnpm typecheck         # tsc --noEmit
pnpm test              # vitest
pnpm test:e2e          # playwright
pnpm build             # precisa passar antes de considerar uma tarefa pronta
pnpm emulators         # Firebase emulator (RTDB + Auth)
pnpm seed:emulator     # dados de exemplo no emulador (--firmware-2.1, --master)
```

Desenvolva contra o emulador. **Nunca** escreva no banco de produção em testes nem rode seed contra ele.

## Estrutura alvo

```
src/
  app/
    (auth)/login/page.tsx
    (painel)/layout.tsx            # shell: Sidebar + Topbar, protegido por auth
    (painel)/page.tsx              # Visão geral
    (painel)/membros/page.tsx
    (painel)/membros/[key]/page.tsx
    (painel)/cadastro/page.tsx
    (painel)/registros/page.tsx
    (painel)/credenciais/page.tsx
    (painel)/dispositivo/page.tsx
    fonts.ts  globals.css  layout.tsx
  components/
    ui/        # shadcn/ui adaptado ao design system (button, badge, alert, dialog, tabs…)
    pet/       # componentes do domínio: credential-chip, status-pill, lcd-mirror, lock-status-card,
               # slot-map, registration-stepper, method-picker, access-feed, stat-tile
    brand/     # logo, finger-icon, rfid-icon, lock-device-icon
    layout/    # app-sidebar, topbar, mobile-nav, theme-toggle
  lib/
    firebase/  # client.ts, paths.ts, schemas.ts (zod), types.ts, use-rtdb-value.ts, hooks/
    format.ts  # UID em grupos de 2, datas pt-BR, "há 3 min", nome para o LCD
    utils.ts   # cn() do shadcn
  styles/
    tokens.css # cópia de docs/design-system/tokens.css (gerada, não editar)
```

Arquivos em kebab-case (padrão shadcn); componentes exportados em PascalCase.

## Convenções

- **Interface em português do Brasil.** Botões no infinitivo ("Cadastrar membro"), sem emoji, sem exclamação. Vocabulário: membro, credencial, digital, cartão, Modo mestre, sem dono, registro de acesso.
- **Cor tem significado único:** verde `lock` = primário/online/liberado; azul `finger` = digital; amarelo `rfid` = cartão; vermelho `danger` = negado/destrutivo; laranja `offline` = offline/pendente/sem dono; roxo `master` = Modo mestre. Use as classes geradas (`bg-lock`, `text-finger-ink`, `bg-rfid-soft`…), nunca hex.
- Texto sobre o verde é `text-on-lock` (escuro), nunca branco.
- UID, ID de digital, slot e horários em `font-mono`; UID em grupos de 2 com espaço (`A3 F2 1C 9D`).
- Server Components por padrão; `"use client"` só onde há listener do Firebase, estado ou interação. Listeners sempre com cleanup.
- Caminhos do banco só em `src/lib/firebase/paths.ts`; todo dado lido do banco passa por um esquema zod.
- Acessibilidade: elementos nativos (`<button>`, `<a>`), `aria-label` em botões só de ícone, foco visível (`ring-ring`), sem cores novas.
- Tema claro é o padrão; escuro via `next-themes` (`data-theme="dark"` no `<html>`).

## Segredos

- `.env.local` tem as chaves do Firebase: **não leia, não imprima, não commite**. Nomes em `.env.example`.
- Config do Firebase só por `process.env.NEXT_PUBLIC_*`, sem valores reais como fallback no código. (O `src/app/firebase.js` da v1 tem fallbacks com valores reais no working tree: não commite esse arquivo; ele é apagado na fase 0.)

## Git e versionamento (`docs/versionamento.md`)

- Branch por tarefa a partir de `v2`; commits Conventional Commits em português (`feat(cadastro): …`).
- Só faça commit/push quando o usuário pedir. Nunca force-push em `v2`, `release/v1` ou `main`.
- Ao terminar uma tarefa: marque o checkbox em `docs/roadmap.md` e adicione uma linha em `CHANGELOG.md` › Não lançado.
- Ao fechar uma fase: sugerir a pré-release `v2.0.0-alpha.N` (o usuário decide).

## Definição de pronto

- `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build` passam.
- A tela bate com o PNG de referência nos temas claro e escuro e em 390px.
- Estados de carregando, vazio, erro e fechadura offline existem.
- Funciona com o firmware 2.0 (sem `devices/*`) e melhora quando os dados novos existem.
