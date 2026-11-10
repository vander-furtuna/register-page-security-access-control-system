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

Tipos: `DELETE_FINGER`, `DELETE_CARD` (`slot`), `REFRESH_INVENTORY`, `REBOOT`, `SET_UNLOCK_SECONDS` (`seconds`), `SET_SHOW_NAME` (`enabled`).

Fica de fora de propósito: entrar/sair do Modo mestre e limpar a memória inteira continuam **só na porta** (cartão mestre / botão de wipe). O botão "Limpar memória" do site só existe se um dia houver `WIPE` com confirmação física.

### 2.5 Fila offline persistente e horário real

- Trocar a `accessQueue` em RAM (20 eventos) por uma fila na flash (LittleFS/NVS), com limite de ~500 eventos.
- Gravar no evento o horário real (`time(nullptr)`, epoch) além de `millis()`; se o NTP nunca sincronizou, marcar `clockSynced: false` em vez de mandar `1970-01-01`.
- Chave do log por `push()` (ou `log_<epoch>_<seq>`), não por `millis()`, para não sobrescrever logs depois de reboot.
- Campos novos no log: `epoch`, `queuedOffline: true` quando o evento passou pela fila, `deviceId`, `credentialId` (slot do cartão ou ID da digital, também nos negados quando houver).

### 2.6 Autenticação do dispositivo

Trocar `Firebase.signUp(&config, &auth, "", "")` (anônimo) por uma conta própria do dispositivo (e-mail/senha), para as regras do banco distinguirem a fechadura de qualquer visitante anônimo.
