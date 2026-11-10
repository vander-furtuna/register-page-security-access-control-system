#!/usr/bin/env sh
# Instala a configuração do Claude Code deste projeto: sh claude-setup/instalar.sh
set -e
root="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$root/.claude"
cp -R "$(dirname "$0")/claude/." "$root/.claude/"
cp "$(dirname "$0")/mcp.json" "$root/.mcp.json"
mkdir -p "$root/.github"
cp "$(dirname "$0")/github/pull_request_template.md" "$root/.github/pull_request_template.md"
echo "Pronto: .claude/, .mcp.json e .github/pull_request_template.md instalados. Pode apagar a pasta claude-setup."
