---
description: Revisa as mudanças de UI contra o design system PET Lock
---

Revise as alterações de UI da branch atual (`git diff main...HEAD` e mudanças não commitadas) contra `docs/design-system/README.md` e a skill `petlock-ui`. Liste problemas por arquivo e linha, do mais grave ao menos grave:

- Cor usada fora do significado (azul que não é digital, amarelo que não é cartão, vermelho para offline…), hex solto em vez de token, texto branco sobre `lock`.
- Texto da interface fora do padrão (inglês, emoji, exclamação, caixa alta, verbo errado no botão, vocabulário diferente do glossário).
- UID/ID/horário sem fonte mono ou UID fora do formato `A3 F2 1C 9D`.
- Acessibilidade: elemento clicável que não é `<button>`/`<a>`, botão só de ícone sem `aria-label`, foco invisível, LCD sem `aria-label`.
- Falta de estado (carregando, vazio, erro, offline, recurso 🔌 ausente).
- Quebra em 390px ou no tema escuro.

Depois pergunte se deve corrigir.
