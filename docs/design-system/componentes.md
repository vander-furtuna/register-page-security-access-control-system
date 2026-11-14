# Componentes PET Lock

Cada componente tem uma página de exemplo em `componentes/<Nome>.html` (abra no navegador) que usa só `tokens.css` + `petlock.css`. As classes `pl-*` são a **referência visual**: no app, reproduza com Tailwind + shadcn/ui (veja `docs/arquitetura/stack.md`).

## AccessFeed

Exemplo: [`componentes/AccessFeed.html`](componentes/AccessFeed.html)

Lista cronológica de entradas na sala — uma linha por evento de `logs/*`.

- Linha: avatar (iniciais), nome, chip da credencial usada, horário em mono (`HH:MM:SS`) e pílula Liberado/Negado.
- Negado: nome em `danger-ink`; cartão desconhecido mostra o UID e o atalho "Cadastrar este cartão" (abre o cadastro já com o cartão pré-vinculado).
- Eventos guardados durante queda de internet chegam depois: mostre a hora real do acesso e uma pílula `pending` "Sincronizado às …". Requer timestamp real no evento (hoje o firmware usa `millis()` como ID e `1970-01-01` sem NTP).
- Na Visão geral: 6–8 itens e "Ver todos". Em Registros: versão tabela com filtros.

## Alert

Exemplo: [`componentes/Alert.html`](componentes/Alert.html)

Mensagem em bloco, dentro da página, sobre o estado do sistema ou o resultado de uma ação.

- **offline** — fechadura sem conexão; sempre diga que a porta segue funcionando e quantos eventos estão na fila.
- **master** — fechadura em Modo mestre; traz a ação "Cadastrar membro".
- **danger** — erro que bloqueia; diga o que aconteceu e o que fazer (com `role="alert"`).
- **success** — conclusão de algo demorado (cadastro). Ações rápidas usam Toast.
- **info** — dica neutra.
- Título curto (`t`) + uma frase. Sem "Erro!" nem exclamações.

## Button

Exemplo: [`componentes/Button.html`](componentes/Button.html)

Botões disparam ações; o primário verde (`lock`, texto `on-lock`) aparece no máximo uma vez por tela, para a ação que a tela existe para fazer.

### Variantes
- **primary** — fundo `lock`, texto `on-lock` (nunca branco). Ex.: "Cadastrar membro", "Iniciar cadastro na fechadura".
- **secondary** (padrão) — fundo `surface`, borda `line-strong`. Ações de apoio: exportar, filtrar.
- **ghost** — sem borda. Cancelar, ações em toolbars e menus de linha.
- **danger** — fundo `danger`. Só dentro de modal de confirmação: remover credencial, limpar memória.
- **danger-soft** — interromper algo em andamento sem perda de dados (cancelar cadastro pendente).

### Tamanhos
`pl-btn-sm` (32px, tabelas/toolbars), padrão (40px), `pl-btn-lg` (48px, CTA do cadastro, login e celular).

### Regras
- Verbo no infinitivo + objeto, sentence case: "Remover digital", não "REMOVER" nem "Remova".
- Estado de espera usa `pl-spinner` e descreve o que se espera ("Aguardando fechadura…"), com `aria-disabled`.
- Botão só de ícone exige `aria-label`.
- Foco: anel 2px `focus`, offset 2px.

## ConfirmModal

Exemplo: [`componentes/ConfirmModal.html`](componentes/ConfirmModal.html)

Confirmação de ação destrutiva ou que mexe na memória da fechadura.

- Título é a pergunta com o objeto exato ("Remover a digital #12 de Maria Clara?").
- Corpo: a consequência e o que continua valendo.
- Botões: "Cancelar" (ghost) à esquerda, ação `danger` com o mesmo verbo do título à direita.
- "Limpar toda a memória" (equivalente ao botão wipe de 10 s) exige digitar `LIMPAR` para habilitar o botão.

## CredentialChip

Exemplo: [`componentes/CredentialChip.html`](componentes/CredentialChip.html)

Mostra uma credencial guardada na fechadura: azul é sempre digital (sensor DY50), amarelo é sempre cartão (leitor RC522).

- **finger** — `finger-soft` + `finger-ink`. Rótulo "Digital" + ID do sensor em mono (`#12` = `fingerId`).
- **rfid** — `rfid-soft` + `rfid-ink`. Rótulo "Cartão" + slot da EEPROM (`rfid`) ou o UID em hex (`cardUID`), sempre em mono, em grupos de 2 com espaço.
- **orphan** — borda tracejada: a credencial existe na memória da fechadura mas não está ligada a nenhum membro no banco (cadastro feito pelo cartão mestre sem internet). Sempre clicável → "Vincular a um membro".
- **none** — o membro não tem aquele tipo de credencial.
- `pl-cred-ico` é o tile quadrado do ícone, retirado das duas janelas do símbolo do logo. Use `lg` (48px) em cabeçalhos de detalhe e no cadastro ao vivo.
- A cor nunca está sozinha: todo chip tem ícone + palavra.

## EmptyState

Exemplo: [`componentes/EmptyState.html`](componentes/EmptyState.html)

O que mostrar quando uma lista está vazia: o que esta área vai conter e, se houver, a ação que a preenche.

- Ícone em tile `lg`, título `h3`, uma frase `ink-muted`, ação opcional.
- Vazio por filtro diz qual filtro e oferece "Limpar filtros".

## Field

Exemplo: [`componentes/Field.html`](componentes/Field.html)

Rótulo em cima, campo, e uma linha de ajuda que vira mensagem de erro — sempre nessa ordem.

- Rótulo `label` (13/500) em `ink`; obrigatório marcado com `*` em `danger-ink`.
- Campo 40px, borda `line-strong` (≥3:1), fundo `surface`, raio `radius-md`.
- Ajuda em `caption` `ink-subtle`; no erro, a borda vira `danger` e a ajuda vira `danger-ink` dizendo como corrigir, não só o que está errado.
- O nome tem limite útil de 16 caracteres porque é o que cabe numa linha do LCD; avise, não corte em silêncio.
- Busca com ícone à esquerda aceita nome, e-mail, UID de cartão (`A3 F2 1C 9D`) e ID de digital (`#12`).

## LcdMirror

Exemplo: [`componentes/LcdMirror.html`](componentes/LcdMirror.html)

Espelho das 2 linhas × 16 colunas do LCD HD44780 da fechadura, no gradiente lima→turquesa da tela do logo.

- Fonte `lcd` (Plex Mono 15/20, 600, +0.06em); texto `lcd-ink` sobre gradiente `lock-lime` → `lock-teal` (≥7:1).
- Mostra exatamente o que `DisplayService::showLines` escreveu — sem acentos e cortado em 16 colunas ("Passe cartao/dedo" vira "Passe cartao/ded") — é a "verdade" do que a pessoa vê na porta. Use no card da fechadura, na sidebar e no cadastro ao vivo.
- Sempre com `role="img"` e `aria-label` com o texto legível.
- `off`: fechadura sem comunicação há mais de 2 min — mostra a tela apagada em vez de texto velho.
- Requer que o firmware publique a última mensagem do LCD (ex.: `devices/<id>/lcd`).

## LockStatusCard

Exemplo: [`componentes/LockStatusCard.html`](componentes/LockStatusCard.html)

O estado da fechadura física em um bloco: o topo usa a cor `chassis` do corpo do aparelho no logo, com o LCD espelhado logo abaixo do nome.

- Cabeçalho: nome da porta, firmware e a pílula de conexão/modo (`online`, `offline`, `master`).
- LCD: `LcdMirror` com a última mensagem.
- Métricas em `dl` de 2 colunas, valores em mono: último contato, Wi-Fi (RSSI), ocupação da memória (digitais do DY50 e slots de cartão da EEPROM), fila de eventos offline.
- Em Modo mestre o card inteiro ganha contorno `master` — é o sinal para a tela de cadastro liberar o botão "Iniciar cadastro".
- Offline: pílula laranja + "Último contato: há 14 min" + "N eventos aguardando envio". Nunca diga que a porta está "fora do ar".

## MembersTable

Exemplo: [`componentes/MembersTable.html`](componentes/MembersTable.html)

Tabela de pessoas com acesso: quem é, quais credenciais tem na fechadura, quando entrou pela última vez.

- Cabeçalho `overline` sobre `surface-sunken`; linhas 56px, hover `surface-hover`.
- Coluna Credenciais sempre com os dois chips (digital e cartão) na mesma ordem; o que falta aparece como `none` — o buraco é informação.
- Datas relativas até 7 dias ("hoje 14:32"), absolutas depois; em mono.
- Ações por linha num menu: Ver detalhes, Adicionar credencial, Desativar, Remover.
- Desativar ≠ remover: desativar mantém o histórico e apaga as credenciais da fechadura; remover também apaga a pessoa.

## MethodPicker

Exemplo: [`componentes/MethodPicker.html`](componentes/MethodPicker.html)

Escolha do modo de cadastro enviado para a fechadura — mapeia 1:1 para `pendingRegistration/current.mode`.

| Opção | Valor no Firebase |
|---|---|
| Cartão + digital | `CARD_AND_FINGER` |
| Só cartão | `CARD_ONLY` |
| Só digital | `FINGER_ONLY` |

- Cards-rádio com os ícones de credencial do logo (`rfid` amarelo, `finger` azul) — substitui os emojis 🔐💳👆 do site atual.
- Selecionado: borda 2px `lock-ink` e rádio preenchido. Nunca use só cor de fundo para indicar seleção.
- Descreva o que a pessoa vai fazer fisicamente na fechadura, não a tecnologia.
- Em telas < 640px, empilhe os três cards.

## RegistrationStepper

Exemplo: [`componentes/RegistrationStepper.html`](componentes/RegistrationStepper.html)

Acompanha, ao vivo, o cadastro que a fechadura está executando — a pessoa olha para a porta, o site confirma cada passo.

- Estados: `is-done` (verde `lock`, check), `is-active` (anel pulsante `lock-ink`), padrão (cinza), `is-error` (`danger`, ex.: "Cartão já cadastrado — use outro").
- Passos por modo: CARD_ONLY = enviar → cartão → concluído; FINGER_ONLY = enviar → 1ª leitura → 2ª leitura → concluído; CARD_AND_FINGER = enviar → cartão → digital → concluído.
- Ao lado, o `LcdMirror` mostra o mesmo texto que a porta, e uma pílula com o tempo restante (padrão 120 s).
- O texto do passo ativo diz o gesto físico ("Encoste o dedo…"), em `body-lg` no layout grande.
- Para funcionar passo a passo o firmware precisa publicar o progresso (`pendingRegistration/current.step`); hoje só sabemos início e fim.

## SegmentedControl

Exemplo: [`componentes/SegmentedControl.html`](componentes/SegmentedControl.html)

Alterna filtros mutuamente exclusivos e curtos (período, tipo de acesso) sem abrir menu.

- Trilho `surface-sunken`; opção ativa em `surface` com `shadow-sm` e `aria-pressed="true"`.
- No máximo 5 opções; mais que isso, use um select.
- Ícones de credencial (digital/cartão) mantêm a cor de texto — a cor semântica fica nos chips do resultado.

## Sidebar

Exemplo: [`componentes/Sidebar.html`](componentes/Sidebar.html)

Navegação principal do painel, na cor `chassis` do corpo da fechadura, com o logo para fundo escuro no topo e um mini-status da porta no rodapé.

- 248px (`sidebar-width`). Item ativo: `chassis-raised` + filete de 3px `lock` à esquerda + `aria-current="page"`.
- Grupo "Fechadura" separa o que mexe na memória do aparelho.
- Badge laranja em Credenciais = credenciais sem dono para vincular.
- Rodapé: nome da porta, pílula de conexão e o LCD espelhado — o estado da porta fica visível em todas as telas.
- Abaixo de 1024px vira drawer; no celular, barra inferior com 4 itens (Visão geral, Membros, Cadastro, Registros).

## SlotMap

Exemplo: [`componentes/SlotMap.html`](componentes/SlotMap.html)

Mapa da memória da fechadura: um quadrado por posição do sensor DY50 (digitais) ou da EEPROM (cartões), para identificar quem ocupa cada slot.

- Cada slot mostra o número em mono; `title`/tooltip traz o dono.
- **finger / rfid**: ocupado e vinculado a um membro.
- **orphan** (tracejado `offline`): ocupado na fechadura, sem dono no banco — aconteceu um cadastro pelo cartão mestre sem web ou o banco foi apagado. Clique abre "Vincular a um membro".
- Livre: `surface-sunken`.
- Selecionado: anel `focus`. Clique abre o painel lateral do slot (dono, data de cadastro, último uso, remover).
- Precisa que o firmware publique o inventário (`devices/<id>/inventory`): lista de IDs ocupados no DY50 e slots da EEPROM com UID.

## StatTile

Exemplo: [`componentes/StatTile.html`](componentes/StatTile.html)

Um número com rótulo e uma linha de contexto, para o topo da Visão geral.

- Rótulo `label` `ink-muted` com ícone; valor `display` (Sora 28/34); contexto `caption` `ink-subtle`.
- Variação em `lock-ink` (melhor) ou `danger-ink` (pior), sempre com sinal e base de comparação ("vs. ontem").
- No máximo 4 por linha. Cada um é clicável e leva à lista filtrada (ex.: "Negados" → Registros filtrados por negado).

## StatusPill

Exemplo: [`componentes/StatusPill.html`](componentes/StatusPill.html)

Uma ou poucas palavras de estado com um ponto colorido; cada cor tem um único significado na plataforma.

| Pílula | Token | Origem no firmware |
|---|---|---|
| Online | `lock-soft` / `lock-ink` | `FirebaseService::isReady()` verdadeiro, heartbeat recente |
| Offline | `offline-soft` / `offline-ink` | Sem heartbeat; a fechadura segue validando pela EEPROM e pelo DY50 |
| Modo mestre | `master-soft` / `master` | `system/mode = MASTER` |
| Em espera | `surface-sunken` / `ink-muted` | `system/mode = STANDBY` |
| Liberado / Negado | `lock` / `danger` | `logs/*.status = ALLOWED / DENIED` |
| Pendente | `offline` | Evento ainda na fila local (`accessQueue`) |

- `live` pulsa o ponto: só para estados que estão acontecendo agora (online, modo mestre). Respeita `prefers-reduced-motion`.
- Offline é laranja, não vermelho: a porta continua funcionando. Vermelho é reservado para acesso negado e erro.
- Sobre o `chassis` (sidebar, topo do LockStatusCard) as versões `-soft` somem: o fundo é `on-chassis` a 10% e o **texto** é o token misturado com `on-chassis` (offline 30%, master 15%, negado 20%; em espera usa `on-chassis`), para ficar ≥ 4,5:1 também sobre `chassis-raised`. O **ponto** mantém a cor cheia do estado. Proporções conferidas com o axe (fase 6).

## Tabs

Exemplo: [`componentes/Tabs.html`](componentes/Tabs.html)

Alterna vistas da mesma entidade (Digitais / Cartões / Sem dono; Dados / Credenciais / Histórico).

- Sublinhado 2px `lock` na aba ativa; contagem em mono `ink-subtle`.
- `role="tablist"` / `tab` / `aria-selected`; setas do teclado trocam de aba.

## Toast

Exemplo: [`componentes/Toast.html`](componentes/Toast.html)

Aviso passageiro no canto inferior direito, em `chassis`: acesso que acabou de acontecer ou confirmação de ação rápida.

- Barra lateral `lock` (liberado/sucesso) ou `danger` (negado/erro) + ícone da credencial.
- Some em 5 s; negados ficam até serem dispensados se o admin ligou "Avisar acessos negados".
- No máximo 3 empilhados; o mais novo em cima.
