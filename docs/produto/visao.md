# Visão do produto

## Problema

A sala do PET tem uma fechadura com digital e cartão, mas o site atual só inicia cadastros. Não dá para saber quem tem acesso, que digital pertence a quem, quem entrou, nem se a fechadura está online. Cadastros feitos direto na porta (cartão mestre) ficam invisíveis.

## Objetivo

Um painel único, ligado à fechadura em tempo real, para:

1. **Cadastrar** membros guiando o processo na porta, passo a passo.
2. **Identificar** cada digital e cartão gravado na fechadura e a quem pertence, incluindo os "sem dono".
3. **Acompanhar** quem entrou, quando e como, e as tentativas negadas.
4. **Cuidar** da fechadura: conexão, memória, periféricos, ajustes.

Sem tirar a independência da porta: sem internet a fechadura continua abrindo e guarda os eventos.

## Quem usa

| Pessoa | O que faz | Acesso no painel |
|---|---|---|
| Admin (petiano responsável, tutor) | Cadastra, remove, vincula credenciais, vê tudo | Total |
| Petiano | Vê o próprio cadastro e histórico; pode ver quem está na sala (futuro) | Leitura do próprio perfil |
| Visitante | Não usa o painel | — |

Nas fases iniciais, só admins entram (`admins/{uid}`).

## Fora do escopo

- Ativar o Modo mestre ou abrir a porta pelo site (segurança física fica na porta).
- Várias portas/fechaduras (o modelo usa `devices/<id>` para permitir no futuro, mas a UI é de uma porta só).
- App nativo: o painel é responsivo e funciona no celular do admin ao lado da porta.

## Métricas de sucesso

- 100% das credenciais na fechadura com dono identificado (zero "sem dono" após a fase 5).
- Cadastro completo na porta em menos de 1 minuto, sem precisar olhar o computador.
- Nenhum acesso perdido em quedas de internet de até 1 hora (depende da fila persistente do firmware 2.1).

## Referências

- Design system: `docs/design-system/` (online: https://claude.ai/artifact/Hm5YSPGcjU9rkhWdXFVVbQ)
- Telas: `docs/design/telas/` (canvas online: https://claude.ai/artifact/Jg7FjjKy1568rb1KdBfdee)
- Logo no Figma: https://www.figma.com/design/ibS8nODKTZW4Q7jdrUQaas/PET---Designs?node-id=1461-763
