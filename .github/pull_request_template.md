## O que muda

<!-- Resumo em 1–3 frases. Link para a fase/tarefa do docs/roadmap.md. -->

## Tipo

- [ ] feat · [ ] fix · [ ] refactor · [ ] docs · [ ] chore/ci/deps
- [ ] Quebra compatibilidade (banco, variáveis de ambiente, firmware) — descreva abaixo

## Telas

<!-- Prints: claro, escuro e 390px. Compare com docs/design/telas/*.png -->

## Firebase e firmware

- [ ] Não muda caminhos nem formatos do Realtime Database
- [ ] Muda — atualizei `docs/arquitetura/dados-firebase.md` e/ou `contrato-firmware.md`
- [ ] Funciona com o firmware 2.0 (sem `devices/*`)

## Checklist

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build` passam
- [ ] Estados de carregando, vazio, erro e fechadura offline
- [ ] Linha no `CHANGELOG.md` (Não lançado)
- [ ] Nenhum segredo ou `.env` no diff
