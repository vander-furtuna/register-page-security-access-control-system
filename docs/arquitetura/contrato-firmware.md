# Contrato site ↔ firmware

O que o painel espera da fechadura. A **parte 1** já funciona com o firmware 2.0.0. A **parte 2** precisa ser implementada no repositório `pet-lock-new` (firmware 2.1); até lá o site mostra esses recursos como "não disponível nesta versão do firmware".

Regras para os dois lados:

- A fechadura nunca espera o site para abrir a porta. Tudo que o site pede é assíncrono.
- O site detecta recursos por `devices/<id>/status.capabilities`, nunca pela versão do firmware.
- Campos novos são aditivos: nenhum caminho da parte 1 muda de formato.

## Parte 1 — já existe (2.0.0)

| Caminho | Quem escreve | Quem lê | Uso no site |
|---|---|---|---|
| `system/mode` | ESP | site | Pílula Modo mestre / Em espera; libera "Iniciar cadastro" |
| `pendingRegistration/current` | site (cria/cancela), ESP (apaga ao concluir/cancelar) | ESP | Cadastro guiado |
| `pendingUser/current` | site (espelho legado) | ESP (fallback) | — manter enquanto o firmware ler |
| `users/*` | ESP | site | Lista de membros e credenciais |
| `logs/*` | ESP | site | Registros, visão geral, toasts |

Detalhes e armadilhas: `dados-firebase.md`.

## Parte 2 — proposta para o firmware 2.1

### 2.1 Heartbeat e espelho do LCD — `devices/sala-pet/status`

Escrito pelo Core 0 a cada 10 s e sempre que o LCD muda (com debounce de 500 ms).

```json
{
  "online": true,
  "lastSeen": 1794352632000,
  "firmware": "2.1.0",
  "ip": "10.0.4.37",
  "rssi": -58,
  "freeHeap": 145320,
  "mode": "STANDBY",
  "lcd": ["Aguardando", "acesso..."],
  "queue": 0,
  "fingerCapacity": 127,
  "fingerCount": 34,
  "cardCapacity": 126,
  "cardCount": 21,
  "capabilities": ["status", "inventory", "commands", "registrationStep", "persistentQueue"]
}
```

- `lastSeen` em ms Unix (servidor: `{".sv": "timestamp"}`). O site considera **offline** se `now - lastSeen > 30 s`.
- `lcd` = as duas linhas exatamente como `DisplayService::showLines` escreveu (já cortadas em 16).

### 2.2 Inventário da memória — `devices/sala-pet/inventory`

Escrito no boot, depois de cada cadastro/remoção e quando o site pede (`commands`).

```json
{
  "updatedAt": 1794352632000,
  "fingers": { "1": true, "2": true, "12": true, "27": true },
  "cards": { "1": "E2:40:0B:13", "7": "04:9B:7E:21", "22": "A3:F2:1C:9D" },
  "masterCard": true
}
```

O site cruza com `users/*`: posição ocupada sem `users/*` correspondente = **sem dono**; `users/*` apontando para posição vazia = **fantasma** (ex.: depois de um wipe).

### 2.3 Progresso do cadastro — `pendingRegistration/current.step`

O ESP atualiza o pedido em andamento, para o site mostrar o passo ativo:

```json
{ "step": "WAIT_CARD" }        // WAIT_CARD | CARD_OK | WAIT_FINGER_1 | WAIT_FINGER_2 | DONE | FAILED_CARD_EXISTS | FAILED_FINGER | CANCELLED
```

Com `DONE`/`CANCELLED` o ESP grava também `result` (`{ "userKey": "user_card_22_finger_12" }`) **antes** de apagar o nó, ou move o pedido para `registrations/history/<pushId>`. Isso resolve a ambiguidade "pendente sumiu = sucesso ou cancelamento?".

### 2.4 Comandos remotos — `devices/sala-pet/commands/<pushId>`

Escritos pelo site (só admins). O ESP processa em ordem e grava o resultado no mesmo nó.

```json
{ "type": "DELETE_FINGER", "fingerId": 12, "requestedBy": "uid…", "requestedAt": 1794352632000,
  "status": "PENDING" }   // ESP muda para DONE ou ERROR (+ "error": "…")
```

Tipos: `DELETE_FINGER`, `DELETE_CARD` (`slot`), `REFRESH_INVENTORY`, `REBOOT`, `SET_UNLOCK_SECONDS` (`seconds`), `SET_SHOW_NAME` (`enabled`), `SET_REGISTRATION_SECONDS` (`seconds`, proposta da fase 5, ver 2.7).

**O que o site faz depois do `DONE`** (v2, fase 3, `src/lib/commands.ts`). O site só mexe no banco depois que a fechadura confirma; se o firmware 2.1 já fizer alguma destas escritas, o site apenas repete o mesmo valor:

| Ação no painel | Comandos | Escrita do site após todos `DONE` |
|---|---|---|
| Remover digital | `DELETE_FINGER` | `users/{key}/fingerId = null` (se era a única credencial: apaga `users/{key}` e `members/{key}`) |
| Remover cartão | `DELETE_CARD` (`slot` = `rfid`) | `users/{key}/rfid = null` (idem) |
| Desativar acesso | os dois | `users/{key}/fingerId` e `rfid` = `null`; `members/{key}.active = false` (a pessoa e o histórico ficam) |
| Remover membro | os dois | apaga `users/{key}` e `members/{key}` (os `logs/*` antigos ficam) |
| Apagar credencial sem dono (tela 06) | `DELETE_FINGER` ou `DELETE_CARD` | nada: não há `users/*`; o inventário seguinte mostra a posição livre |
| Ler inventário agora (tela 06) | `REFRESH_INVENTORY` | nada: o ESP regrava `inventory` |
| Reiniciar (tela 08) | `REBOOT` | nada; o ESP marca `DONE` antes de reiniciar |
| Salvar ajustes (tela 08) | `SET_*` só dos campos alterados | nada: o valor novo aparece quando o ESP publica `status.settings` |

**Vincular uma credencial sem dono** (tela 06, sem comando): a credencial já está na fechadura, então o site grava direto `users/{key}/fingerId = <ID>` (ou `rfid = <slot>`) num membro que ainda não tem esse tipo de credencial. O firmware passa a achar o membro pelo campo e grava os próximos acessos com o nome. **Tirar do cadastro** (posição "no banco, fora da fechadura", só com inventário) apaga o campo do `users/{key}`.

Com `ERROR`, nada muda no banco e o painel mostra o `error`. A chave `users/{key}` não é renomeada depois de remover uma credencial (ex.: `user_card_22_finger_12` sem `fingerId`); o firmware deve continuar achando o membro pelos campos `rfid`/`fingerId`, não pela chave.

Fica de fora de propósito: entrar/sair do Modo mestre e limpar a memória inteira continuam **só na porta** (cartão mestre / botão de wipe). O botão "Limpar memória" do site só existe se um dia houver `WIPE` com confirmação física.

### 2.5 Fila offline persistente e horário real

- Trocar a `accessQueue` em RAM (20 eventos) por uma fila na flash (LittleFS/NVS), com limite de ~500 eventos.
- Gravar no evento o horário real (`time(nullptr)`, epoch) além de `millis()`; se o NTP nunca sincronizou, marcar `clockSynced: false` em vez de mandar `1970-01-01`.
- Chave do log única, não por `millis()`, para não sobrescrever logs depois de reboot. O firmware 2.1 usa `log_<epoch em s>_<6 hex aleatórios>` (sem relógio: `log_t<millis>_<hex>`). Em ordem de texto essas chaves ficam antes das `log_<millis>` do 2.0, por isso **o painel consulta os registros sempre por `timestamp`**, nunca pela chave.
- Campos novos no log: `epoch`, `queuedOffline: true` quando o evento passou pela fila, `deviceId`, `credentialId` (slot do cartão ou ID da digital, também nos negados quando houver).
- `syncedAt` (ms, `{".sv": "timestamp"}`) nos eventos que passaram pela fila: o painel mostra "Enviado às 09:20 (estava offline)" e conta os "chegaram atrasados" (v2, fase 4).
- Manter `timestamp` ("AAAA-MM-DD HH:MM:SS", hora local) em todo evento: o painel consulta os registros por esse campo (`orderByChild("timestamp")`, índice nas regras). Sem NTP, manter o `1970-01-01 …` que o painel já trata como "sem horário confiável".

### 2.6 Autenticação do dispositivo

Trocar `Firebase.signUp(&config, &auth, "", "")` (anônimo) por uma conta própria do dispositivo (e-mail/senha), para as regras do banco distinguirem a fechadura de qualquer visitante anônimo.

- As credenciais da conta ficam no `secrets.h` (fora do git), como o Wi-Fi.
- O uid da conta é liberado em `config/deviceUids/{uid}: true` (pelo console). As regras da fase 6 já aceitam essa conta e, enquanto `config/legacyAnonymousDevice` não for `false`, também o login anônimo do firmware 2.0 (`dados-firebase.md` › 3).
- Depois que o 2.1 estiver na porta, o admin desliga o legado (`config/legacyAnonymousDevice: false`) e um login anônimo qualquer deixa de ler ou escrever no banco.

### 2.7 Saúde da fechadura (proposta da fase 5, tela 08)

Campos **aditivos** em `devices/sala-pet/status`, cada grupo anunciado por uma capability:

```json
{
  "onlineSince": 1794341112000,
  "ssid": "PET-UFC",
  "board": "ESP32 DOIT DevKit v1",
  "bootAt": 1794260000000,
  "settings": { "unlockSeconds": 2, "showName": true, "registrationSeconds": 120 },
  "peripherals": { "dy50": true, "rc522": true, "lcd": true, "relay": true, "buzzer": true },
  "capabilities": ["…", "outages", "settings", "peripherals"]
}
```

- `onlineSince` (ms): quando a conexão atual começou; o painel mostra "Online há 3 h 12 min". `bootAt`: último boot.
- `settings` (capability `settings`): os valores **em uso** na fechadura. O site só os altera por comando (`SET_UNLOCK_SECONDS`, `SET_SHOW_NAME`, `SET_REGISTRATION_SECONDS`) e só mostra o valor novo depois que o ESP o publica aqui. Os ajustes precisam sobreviver a reboot (NVS).
- `peripherals` (capability `peripherals`): diagnóstico do boot, periférico → respondeu. Chaves: `dy50`, `rc522`, `lcd`, `relay`, `buzzer`. O firmware 2.1 publica só `dy50` (`verifyPassword`) e `rc522` (registrador de versão no SPI); LCD, relé e buzzer não têm como responder e aparecem como "Sem diagnóstico".

Quedas de conexão em `devices/sala-pet/outages/<pushId>` (capability `outages`), escritas pelo ESP ao reconectar:

```json
{ "start": 1794330000000, "end": 1794331440000, "queued": 6 }
```

- `start`/`end` em ms (relógio do ESP sincronizado por NTP); `queued` = eventos que ficaram na fila durante a queda. O painel lê as últimas 24 h; o ESP pode apagar as quedas com mais de 7 dias.
- Uma queda em andamento não aparece (o ESP está offline); o painel já mostra "Offline há X" por `lastSeen`.

## Parte 3 — como o firmware 2.1 implementa (branch `feat/firmware-2.1` do `pet-lock-new`)

Decisões que o painel precisa conhecer. Ainda **não testado na fechadura real**.

- **Capabilities** publicadas: `status`, `inventory`, `commands`, `registrationStep`, `persistentQueue`, `outages`, `settings`, `peripherals`.
- **Heartbeat** a cada 10 s e quando o LCD muda (500 ms de folga); `lastSeen` com a hora do servidor (`{".sv": "timestamp"}`).
- **Inventário** publicado no boot, depois de cada cadastro, remoção ou wipe, e no `REFRESH_INVENTORY` (que relê as digitais do DY50 pela tabela de índices, comando 0x1F, com consulta posição por posição como plano B). Cartões: slots estáveis na EEPROM (apagar zera só o slot; cartão novo vai depois do maior slot já usado).
- **Comandos** consultados a cada 3 s (`orderBy requestedAt`, últimos 10), um por vez. `DELETE_*` e `REFRESH_INVENTORY` são executados pelo núcleo dos sensores entre uma leitura e outra; se ele estiver ocupado (cadastro em andamento) por 30 s, o comando volta como `ERROR` "A fechadura estava ocupada; tente de novo". Erros possíveis: "Posicao vazia no sensor", "Slot vazio", "Sensor de digitais sem resposta", "Tempo fora da faixa (1 a 30 s)", "Prazo fora da faixa (30 a 600 s)", "Comando desconhecido nesta versao do firmware". O firmware **não** mexe em `users/*` depois de `DELETE_*`: a escrita de acompanhamento é do site (2.4).
- **Cadastro pelo site:** `WAIT_CARD` → `CARD_OK` → `WAIT_FINGER_1` → `WAIT_FINGER_2` → `DONE` (com `result.userKey`, gravado antes de apagar o pedido). Cartão já cadastrado → `FAILED_CARD_EXISTS`; digital que não fecha → `FAILED_FINGER` (no modo cartão + digital o cartão fica e o pedido termina em `DONE` só com cartão, como no 2.0). Em falha o firmware espera 1,5 s e apaga o pedido, para não repetir. Cartão mestre ou prazo esgotado (`settings.registrationSeconds`) → `CANCELLED` e o pedido é apagado; se o cancelamento vem depois do cartão, o cartão é desfeito. Se o site apaga o pedido, a fechadura percebe em até 2 s e para.
- **Registros:** chave `log_<epoch>_<hex>`; `timestamp` e `epoch` são do momento do acesso; sem internet os eventos vão para a flash (LittleFS, até 500) e são enviados em ordem quando a conexão volta, com `queuedOffline` e `syncedAt`. Evento de um boot anterior sem relógio vai com `clockSynced: false`.
- **Quedas:** registradas ao reconectar, se duraram 15 s ou mais e o relógio estava sincronizado; `queued` = acessos durante a queda.
- **Conta própria:** `DEVICE_EMAIL`/`DEVICE_PASSWORD` no `secrets.h`; sem eles, login anônimo como no 2.0.
- **Membro do acesso:** procurado por `users/<chave direta>` e, se não achar, por consulta `orderBy rfid|fingerId equalTo <n>` (índice nas regras), com varredura completa como último recurso.
