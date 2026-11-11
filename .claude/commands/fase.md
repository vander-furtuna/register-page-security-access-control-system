---
description: Implementa uma fase do docs/roadmap.md do início ao fim
argument-hint: <número da fase, ex. 0>
---

Implemente a **Fase $ARGUMENTS** de `docs/roadmap.md`.

1. Leia `CLAUDE.md`, a seção da Fase $ARGUMENTS em `docs/roadmap.md` e os documentos que ela cita (`docs/produto/telas.md`, `docs/arquitetura/*.md`, `docs/design-system/*`). Abra os PNGs de referência das telas envolvidas em `docs/design/telas/`.
2. Verifique o estado do repo (`git status`, `git branch --show-current`). Se houver alterações não commitadas que não são suas, pare e pergunte. Crie a branch `feat/fase-$ARGUMENTS-<tema>` **a partir de `v2`** (`git switch v2 && git switch -c …`). Nunca trabalhe em `main` nem em `release/v1`.
3. Apresente um plano curto (arquivos a criar/alterar, dependências novas, itens 🔌 que ficarão com fallback) e siga.
4. Implemente item por item. Para UI, siga a skill `petlock-ui`. Para Firebase, use só `src/lib/firebase/paths.ts` e desenvolva contra o emulador.
5. Rode `pnpm lint`, `pnpm typecheck` e `pnpm build` e corrija até passarem. Se a fase tem tela, rode `pnpm dev` e compare com o PNG (claro, escuro, 390px).
6. Marque os itens concluídos em `docs/roadmap.md` e adicione as linhas em `CHANGELOG.md` › Não lançado. Itens que não deu para fazer ficam desmarcados com uma nota do motivo.
7. Termine com um resumo: o que foi feito, o que ficou pendente, o que precisa do firmware 2.1, a sugestão de commits (Conventional Commits) e, se a fase fechou, a sugestão da pré-release `v2.0.0-alpha.N` com os comandos de `docs/versionamento.md`. Não faça commit, tag nem push sem o usuário pedir.
