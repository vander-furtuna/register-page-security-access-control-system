---
description: Implementa ou ajusta uma tela específica seguindo a referência visual
argument-hint: <número ou nome da tela, ex. 05 cadastro>
---

Trabalhe na tela **$ARGUMENTS**.

1. Encontre a seção correspondente em `docs/produto/telas.md` e abra `docs/design/telas/<nn>-*.png` e o `.html` de mesmo nome (a marcação e as classes `pl-*` exatas estão lá).
2. Reaproveite componentes de `src/components/` antes de criar novos; se precisar de um novo, siga o guia em `docs/design-system/componentes.md`.
3. Implemente os estados: carregando, vazio, erro, fechadura offline, firmware sem o recurso (🔌).
4. Confira tema claro, escuro e 390px. Rode lint, typecheck e build.
5. Resuma as diferenças que ficaram em relação à referência, se houver, e por quê.
