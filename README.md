# PET Lock — painel web

Painel de cadastro e controle de acesso da fechadura eletrônica da sala do PET Engenharia de Computação (UFC Sobral), ligado à fechadura pelo Firebase Realtime Database.

> **v2** (branch `v2`): reescrita com Next.js 16, Tailwind CSS 4 e shadcn/ui. Visão geral, membros, cadastro guiado, registros de acesso, credenciais na fechadura e dispositivo. Funciona com o firmware 2.0 e melhora com o 2.1. A v1 fica preservada na branch `release/v1` (tags `v1.0.0` e `v1.1.0`; para voltar: `git checkout v1.1.0`). Plano em [`docs/`](docs/README.md), histórico em [`CHANGELOG.md`](CHANGELOG.md).

## Rodando

```bash
nvm use                      # Node 24 (.nvmrc)
cp .env.example .env.local   # credenciais do Firebase; NEXT_PUBLIC_USE_EMULATOR=true em desenvolvimento
pnpm install                 # pnpm 12; a versão exata vem de packageManager no package.json
pnpm emulators               # outro terminal: Realtime Database + Auth locais (UI em http://127.0.0.1:4000)
pnpm seed:emulator           # dados de exemplo das telas (--firmware-2.1 para incluir devices/*)
pnpm dev                     # http://localhost:3000 · componentes em /dev/ui
```

Outros comandos: `pnpm lint`, `pnpm format`, `pnpm typecheck`, `pnpm test`, `pnpm test:rules` (regras do banco, com o emulador ligado), `pnpm test:e2e` (na primeira vez: `pnpm exec playwright install chromium`; inclui a varredura de acessibilidade com axe), `pnpm build`. Argumentos vão direto, sem `--`: `pnpm dev -p 3001`.

O emulador usa o projeto `demo-pet-lock` e nunca toca o banco de produção. O seed cria o admin `admin@ufc.br` / `petlock-dev` no Auth do emulador.

Contribuindo: [`CONTRIBUTING.md`](CONTRIBUTING.md) · branches, tags e PR para o repositório original: [`docs/versionamento.md`](docs/versionamento.md).

## Publicando

O painel é um app Next.js comum (`pnpm build` + `pnpm start`, ou qualquer hospedagem com suporte a Next.js, como a Vercel). Antes do primeiro deploy:

1. **Variáveis de ambiente** (as mesmas do `.env.example`): `NEXT_PUBLIC_FIREBASE_*` do app Web do projeto, `NEXT_PUBLIC_LOCK_DEVICE_ID` (padrão `sala-pet`) e **`NEXT_PUBLIC_USE_EMULATOR=false`** (ou ausente). Elas entram no build: mudou, refaça o deploy.
2. **Firebase Authentication:** ative E-mail/senha e Google; em _Settings › Authorized domains_, adicione o domínio do deploy (e o de preview, se houver).
3. **Admins:** cada pessoa que administra entra uma vez e alguém grava `admins/{uid}: true` pelo console. Só e-mails `@ufc.br` e `@alu.ufc.br` passam nas regras.
4. **Regras do banco:** publique o `database.rules.json` (`firebase deploy --only database` ou Console › Realtime Database › Regras). A fechadura com o firmware 2.0 continua funcionando pelo login anônimo; o passo a passo da conta própria do firmware 2.1 está em [`dados-firebase.md`](docs/arquitetura/dados-firebase.md#3-regras-de-segurança-fase-6).

## Documentação

- [Visão do produto](docs/produto/visao.md)
- [Telas](docs/produto/telas.md) · [referências visuais](docs/design/telas/index.html)
- [Design system](docs/design-system/README.md)
- [Stack da v2](docs/arquitetura/stack.md) · [Dados no Firebase](docs/arquitetura/dados-firebase.md) · [Contrato com o firmware](docs/arquitetura/contrato-firmware.md)
- [Versionamento](docs/versionamento.md)
- [Roadmap](docs/roadmap.md)

## Desenvolvendo com o Claude Code

O repositório já vem com `CLAUDE.md` (contexto) e `.claude/` (permissões, skill `petlock-ui` e comandos). Na pasta do projeto:

```bash
claude
/fase 6           # implementa uma fase do roadmap
/tela 05          # trabalha numa tela específica
/revisar-ui       # revisa a UI contra o design system
```

Na primeira vez, aprove os servidores MCP do projeto (`.mcp.json`) e autentique o Figma em `/mcp`. O servidor do Firebase usa o login do `firebase login`.
