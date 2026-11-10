# Instala a configuração do Claude Code deste projeto (rode na raiz do repo):
#   powershell -ExecutionPolicy Bypass -File claude-setup\instalar.ps1
$root = Split-Path -Parent $PSScriptRoot
New-Item -ItemType Directory -Force -Path "$root\.claude" | Out-Null
Copy-Item -Recurse -Force "$PSScriptRoot\claude\*" "$root\.claude\"
Copy-Item -Force "$PSScriptRoot\mcp.json" "$root\.mcp.json"
New-Item -ItemType Directory -Force -Path "$root\.github" | Out-Null
Copy-Item -Force "$PSScriptRoot\github\pull_request_template.md" "$root\.github\pull_request_template.md"
Write-Host "Pronto: .claude\, .mcp.json e .github\pull_request_template.md instalados. Pode apagar a pasta claude-setup."
