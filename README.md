# PET Lock — painel web

Painel de cadastro e controle de acesso da fechadura eletrônica da sala do PET Engenharia de Computação (UFC Sobral), ligado à fechadura pelo Firebase Realtime Database.

> **v2 em desenvolvimento** na branch `v2`: reescrita com Next.js 16, Tailwind CSS 4 e shadcn/ui (o HeroUI sai). A versão anterior fica preservada na branch `release/v1` (tags `v1.0.0` e `v1.1.0`). Plano em [`docs/`](docs/README.md), histórico em [`CHANGELOG.md`](CHANGELOG.md).

## Rodando

```bash
nvm use                      # Node 24 (.nvmrc)
cp .env.example .env.local   # preencha com as credenciais do Firebase
npm install
npm run dev                  # http://localhost:3000
```

Contribuindo: [`CONTRIBUTING.md`](CONTRIBUTING.md) · branches, tags e PR para o repositório original: [`docs/versionamento.md`](docs/versionamento.md).

## Documentação

- [Visão do produto](docs/produto/visao.md)
- [Telas](docs/produto/telas.md) · [referências visuais](docs/design/telas/index.html)
- [Design system](docs/design-system/README.md)
- [Stack da v2](docs/arquitetura/stack.md) · [Dados no Firebase](docs/arquitetura/dados-firebase.md) · [Contrato com o firmware](docs/arquitetura/contrato-firmware.md)
- [Versionamento](docs/versionamento.md)
- [Roadmap](docs/roadmap.md)

## Desenvolvendo com o Claude Code

O repositório já vem com `CLAUDE.md` (contexto). Instale uma vez a configuração extra (permissões, skill `petlock-ui`, comandos e MCP do Figma/Firebase):

```powershell
powershell -ExecutionPolicy Bypass -File claude-setup\instalar.ps1
```

Depois:

```bash
claude            # na pasta do projeto
/fase 0           # implementa a fase 0 do roadmap
/tela 05          # trabalha numa tela específica
/revisar-ui       # revisa a UI contra o design system
```

Na primeira vez, aprove os servidores MCP do projeto e autentique o Figma em `/mcp`. O servidor do Firebase usa o login do `firebase login`.
