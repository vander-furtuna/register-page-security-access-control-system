# Configuração do Claude Code

Arquivos que vão para `.claude/`, `.mcp.json` e `.github/` (não puderam ser gravados direto lá). Depois de instalar, commite os arquivos instalados (`chore: configurar claude code e template de pr`) e apague esta pasta.

- `claude/settings.json` → `.claude/settings.json`: permissões (lint/typecheck/build liberados; commit, push, install e firebase pedem confirmação; leitura de `.env*` e `firebase deploy` bloqueados).
- `claude/commands/` → `.claude/commands/`: `/fase <n>`, `/tela <nn>`, `/revisar-ui`.
- `claude/skills/petlock-ui/` → `.claude/skills/petlock-ui/`: regras de UI do design system.
- `github/pull_request_template.md` → `.github/pull_request_template.md`: template dos PRs (inclusive o PR final para o repositório original).
- `mcp.json` → `.mcp.json`: servidores MCP do Figma (remoto, OAuth) e do Firebase (`firebase-tools mcp`).

Instalar (na raiz do repo): `powershell -ExecutionPolicy Bypass -File claude-setup\instalar.ps1` ou `sh claude-setup/instalar.sh`. Ou peça ao Claude Code: "instale a configuração de claude-setup/".
