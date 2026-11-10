# Changelog

Todas as mudanças relevantes deste projeto. Formato [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), versões [SemVer](https://semver.org/lang/pt-BR/). Fluxo de branches e releases: [`docs/versionamento.md`](docs/versionamento.md).

## [Não lançado] — v2

Reescrita do painel com Next.js 16, Tailwind CSS 4 e shadcn/ui, no lugar de Next.js 15, Tailwind 3 e HeroUI. Plano em [`docs/roadmap.md`](docs/roadmap.md).

### Adicionado
- Documentação da v2: visão do produto, especificação das telas, dados do Firebase, contrato com o firmware, stack e versionamento (`docs/`).
- Design system PET Lock (tokens, componentes de referência, logos e ícones) em `docs/design-system/`.
- Referências visuais das 10 telas (PNG + HTML) em `docs/design/telas/`.
- Contexto e configuração para o Claude Code (`CLAUDE.md`, `claude-setup/`).
- Template de pull request e guia de contribuição.

## [1.1.0] — 2026-11-10

### Adicionado
- Cadastro com três modos (cartão + digital, só cartão, só digital) por `pendingRegistration/current.mode`, exigido pelo firmware 2.0 da fechadura.
- Status em tempo real do Modo mestre (`system/mode`), confirmação de cadastro concluído e cancelamento do pedido pendente.

## [1.0.0] — 2025-07-17

Versão original de JonasFortes12: formulário de cadastro com HeroUI que grava `pendingUser/current` no Firebase.

[Não lançado]: https://github.com/JonasFortes12/register-page-security-access-control-system/compare/v1.1.0...v2
[1.1.0]: https://github.com/JonasFortes12/register-page-security-access-control-system/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/JonasFortes12/register-page-security-access-control-system/releases/tag/v1.0.0
