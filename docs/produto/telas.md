# Telas

Cada tela tem uma imagem (`.png`) e a marcação exata (`.html`, abre direto no navegador) em `docs/design/telas/`. Os dados das imagens são de exemplo. Os textos do LCD nas imagens são aproximados: em produção, o `LcdMirror` mostra exatamente o que o firmware publicar.

Shell comum (todas as telas do painel): `Sidebar` (cor `chassis`, logo para fundo escuro, mini status da porta com LCD no rodapé, usuário + sair) + `Topbar` (título, subtítulo, busca global, notificações, ação principal). Abaixo de 1024px a sidebar vira drawer; no celular, barra inferior (ver telas 09 e 10).

---

## 01 · Login — `/login`
Ref.: `01-login.png`

- Esquerda em `chassis`: logo, card da porta com LCD e status, frase sobre funcionamento offline.
- Direita: "Entrar com Google" e e-mail/senha (Firebase Auth). Sem cadastro aberto: quem não é admin vê "Peça a um administrador do PET".
- Restringir Google a `@ufc.br` / `@alu.ufc.br` (checar no client e nas regras).
- **Aceite:** usuário logado e presente em `admins/` vai para `/`; não-admin vê mensagem de acesso negado e botão sair.

## 02 · Visão geral — `/`
Ref.: `02-visao-geral.png`, `02b-visao-geral-offline.png`, `02c-visao-geral-modo-mestre.png`

- Banner contextual: offline (laranja, com nº de eventos na fila) ou Modo mestre (roxo, com "Cadastrar membro").
- 4 `StatTile`: acessos hoje (vs. ontem), negados, membros ativos (digitais/cartões), credenciais sem dono. Cada um leva à lista filtrada.
- Gráfico de barras por hora (liberados verde, negados vermelho empilhado), filtro Hoje/7/30 dias.
- `AccessFeed` com 5 últimos acessos (tempo real via `onValue` em `logs` com `limitToLast`).
- `LockStatusCard` (online/offline/mestre) e card "Precisa de atenção" (sem dono, cartão desconhecido repetido, membros sem digital de reserva).
- **Dados:** `logs`, `users`, `system/mode`, `devices/*/status` (opcional).
- **Aceite:** sem `devices/*/status`, o card mostra o modo e "Último acesso registrado há X" no lugar de "Último contato"; não exibe Wi-Fi/memória.

## 03 · Membros — `/membros`
Ref.: `03-membros.png`

- Resumo: digitais usadas/capacidade, cartões usados/capacidade, atalho "sem dono".
- Abas de filtro (Todos, Ativos, Só cartão, Só digital, Egressos) + vínculo + Exportar CSV.
- `MembersTable`: membro (avatar com iniciais, nome, e-mail), vínculo, credenciais (dois `CredentialChip`, faltante como `none`), último acesso (mono), status, menu de ações.
- Busca global encontra por nome, e-mail, UID (`A3F2`, `A3:F2`, `a3 f2` — normalizar) e `#12`.
- **Dados:** `users` + `members` + último log por `userPath`.
- **Aceite:** 40 membros renderizam sem travar; ordenação por nome e por último acesso.

## 04 · Detalhe do membro — `/membros/[key]`
Ref.: `04-membro.png`

- Cabeçalho: avatar, nome, status, e-mail, vínculo, quem cadastrou; Editar, Desativar.
- Dois cards de credencial (digital: ID, data, último uso, usos 30 dias; cartão: UID, slot, …) com Recadastrar/Trocar e Remover.
- Histórico de acessos (tabela, 7 dias padrão) e mapa de presença (5 semanas).
- "Remover"/"Desativar" usam `ConfirmModal`. Enquanto o firmware não tiver `commands`, os botões ficam desabilitados com a explicação "Para remover, aproxime o cartão mestre e passe o cartão/dedo na porta".
- `[key]` é a chave de `users/*` (ex.: `user_card_22_finger_12`).

## 05 · Novo cadastro — `/cadastro`
Ref.: `05-cadastro-formulario.png`, `05b-cadastro-ao-vivo.png`, `05c-cadastro-concluido.png`

Substitui o `src/app/page.tsx` atual, mantendo a lógica que já funciona.

- Formulário: nome (aviso de 16 caracteres no LCD), e-mail institucional, vínculo, validade.
- `MethodPicker` com 3 cards-rádio → `mode` do pedido.
- Painel direito: `LockStatusCard` em Modo mestre + `RegistrationStepper`.
  - Antes de enviar: "O que vai acontecer na porta" (passos em cinza).
  - Ao vivo: formulário travado, passo ativo pulsando, LCD espelhado, timer 2:00, "Cancelar cadastro".
  - Concluído: alerta de sucesso, "Ver membro", "Cadastrar outra pessoa".
- Se `system/mode !== "MASTER"`: botão desabilitado e instrução "Aproxime o cartão mestre da fechadura".
- **Firmware 2.0:** só existem "enviado" e "concluído". Mostre os passos como instruções (sem marcar o intermediário como feito) e use o LCD só se `devices/*/status.lcd` existir. **Firmware 2.1:** usar `step`.
- Erros a tratar: cartão já cadastrado, digital falhou (cartão salvo), cancelado na porta, tempo esgotado, fechadura saiu do Modo mestre no meio.

## 06 · Credenciais na fechadura — `/credenciais`
Ref.: `06-credenciais.png`

- Abas Digitais (x/127) · Cartões (x/126) · Sem dono.
- `SlotMap`: uma célula por posição; vinculada (azul/amarelo), sem dono (tracejado laranja), livre (cinza). Clique seleciona.
- Painel lateral da posição: sem dono → buscar membro e "Vincular" (grava o `users/*`/`members/*`) ou "Apagar"; vinculada → dono, datas, remover; livre → "Novo cadastro".
- "Ler inventário agora" (comando `REFRESH_INVENTORY`).
- **Firmware 2.0:** sem inventário, mostrar só as posições conhecidas por `users/*` + as "sem dono" deduzidas dos logs (`ALLOWED` + `Desconhecido`), com aviso "Mapa parcial: atualize o firmware para ver a memória completa".

## 07 · Registros de acesso — `/registros`
Ref.: `07-registros.png`

- Resumo do dia (tentativas, por digital, por cartão, chegaram atrasados).
- Filtros: período, credencial, resultado; Exportar CSV.
- Tabela agrupada por dia: hora (mono), quem, credencial, resultado, observação (atalho "Cadastrar este cartão" para UID desconhecido, "Vincular digital #27" para sem dono, "Enviado às 09:20 (estava offline)").
- Paginação por `limitToLast` + "Carregar mais". Ordenar por `timestamp`/`epoch`.

## 08 · Dispositivo — `/dispositivo`
Ref.: `08-dispositivo.png`

- Cabeçalho da fechadura (símbolo, nome, status, firmware, IP, LCD) + métricas.
- Conexão nas últimas 24 h (faixa online/offline) com lista das quedas.
- "Quando a internet cai": explicação fixa em 4 blocos.
- Periféricos (DY50, RC522, LCD, relé, buzzer) com pinos e estado.
- Ajustes (tempo da tranca, prazo do cadastro, avisos, nome no display) → comandos.
- Manutenção: reiniciar (comando), trocar cartão mestre (presencial), limpar memória (presencial / desabilitado).
- Tudo que depende de `devices/*` some com uma explicação se o firmware for 2.0.

## 09 e 10 · Celular
Ref.: `09-celular-cadastro.png`, `10-celular-inicio.png`

- Mesmas rotas, layout de 390px: header `chassis` com símbolo, conteúdo em coluna, barra inferior (Início, Membros, Cadastro, Registros), alvos ≥ 44px.
- O cadastro no celular é o caso principal: o admin fica na porta segurando o telefone. Instrução do passo ativo em destaque (ícone 88px, título 20px).
