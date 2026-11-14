# Dados no Firebase Realtime Database

Fonte: leitura de `pet-lock-new/src/firebase_service.cpp`, `src/main.cpp` e do `src/app/page.tsx` atual (novembro/2026).

## 1. O que existe hoje (firmware 2.0.0)

```jsonc
{
  "system": {
    "mode": "STANDBY"            // ou "MASTER". Escrito pelo ESP32 ao entrar/sair do Modo mestre.
  },

  "pendingRegistration": {
    "current": {                 // Escrito pelo SITE. Lido pelo ESP a cada 1,5 s enquanto está em MASTER.
      "username": "Maria Clara Sousa",
      "email": "mariaclara@alu.ufc.br",
      "mode": "CARD_AND_FINGER", // "CARD_ONLY" | "FINGER_ONLY" | "CARD_AND_FINGER"
      "timestamp": "2026-11-10T17:02:11.000Z"
    }
  },
  "pendingUser": { "current": { "username": "…", "email": "…", "timestamp": "…" } }, // espelho legado, sem "mode"

  "users": {
    // Chave criada PELO ESP no fim do cadastro, derivada das credenciais:
    "user_card_id_7":          { "username": "João Pedro Lima", "email": "…", "rfid": 7, "createdAt": "2026-03-14 10:21:00" },
    "user_finger_id_12":       { "username": "…", "email": "…", "fingerId": 12, "createdAt": "…" },
    "user_card_22_finger_12":  { "username": "…", "email": "…", "rfid": 22, "fingerId": 12, "createdAt": "…" }
  },

  "logs": {
    "log_8423311": {             // "log_" + millis() do ESP — reinicia a cada boot!
      "userName": "Maria Clara Sousa",   // "Desconhecido" se não achou dono
      "userEmail": "…",                  // "N/A" se não achou
      "userPath": "/users/user_finger_id_12",
      "accessType": "fingerId",          // ou "rfid"
      "status": "ALLOWED",               // ou "DENIED"
      "cardUID": "A3:F2:1C:9D",          // só em RFID (RFIDService::formatUID). Exiba como "A3 F2 1C 9D"
      "timestamp": "2026-11-10 14:32:08" // hora local (UTC-3) via NTP; "1970-01-01 00:00:00" se NTP falhou
    }
  }
}
```

### Fluxo de cadastro atual

1. Admin aproxima o **cartão mestre** na porta → ESP escreve `system/mode = "MASTER"`.
2. Site (só se `MASTER`) escreve `pendingRegistration/current` (+ espelho `pendingUser/current`).
3. ESP lê o pedido, guia a pessoa no LCD (`Passo 1/2: Cartao` / `Aproxime <nome>`, `Passo 2/2: Dedo` / `1. Encoste o dedo`…), grava cartão na EEPROM e/ou digital no DY50.
4. ESP escreve `users/<chave>` e **apaga** `pendingRegistration/current` e `pendingUser/current`.
5. Site interpreta "pendente sumiu" como sucesso. Timeout no site: 120 s → site apaga o pendente (cancelar).
6. Cartão mestre de novo → `system/mode = "STANDBY"`.

### Comportamentos do firmware que o site precisa respeitar

- **Nome no LCD:** `showLines` corta em 16 colunas e o LCD não tem acentos. Avise no formulário.
- **Falha de digital no modo CARD_AND_FINGER:** o cartão é salvo mesmo assim (`users/user_card_id_N` só com `rfid`). O site deve mostrar "Cartão salvo, digital falhou".
- **Cancelamento pela porta:** aproximar o cartão mestre durante um cadastro apaga o pendente → para o site isso parece "sucesso". Diferencie checando se apareceu um `users/*` com o e-mail do pedido nos segundos seguintes; se não apareceu, é cancelamento. A v2 espera até **10 s** depois que o pedido some (`src/lib/registration/controller.ts`); por isso o firmware deve gravar o `users/*` **antes** de apagar o pedido, como faz hoje.
- **Modo mestre caindo no meio:** se `system/mode` sai de `MASTER` com o pedido ainda no banco, o site apaga o pedido (e o espelho) e avisa. O mesmo vale para um pedido esquecido quando a porta já está em espera.
- **Prazo:** o site conta 120 s a partir do `timestamp` do pedido (não de quando a tela abriu) e apaga o pedido ao fim. Qualquer aba aberta pode fazer isso.
- **Acesso negado** grava `id = 0` → `userPath` aponta para `user_*_id_0` e `userName = "Desconhecido"`. Use `cardUID` para identificar o cartão.
- **Credencial sem dono:** cadastro autônomo (cartão mestre + passar cartão/dedo, sem pedido web) grava na fechadura mas **não cria `users/*`**. Os acessos dela chegam como `status: "ALLOWED"` e `userName: "Desconhecido"`. → Dá para detectar "sem dono" a partir dos logs mesmo sem firmware novo: `ALLOWED` + `Desconhecido` + (`accessType`, id do `userPath`).
- **Exclusão autônoma** (no Modo mestre, passar um cartão/dedo já cadastrado) apaga da fechadura e o `users/*` correspondente.
- **Wipe** (botão 10 s) apaga tudo na fechadura mas **não** limpa `users/*` → todos viram "fantasmas". Exiba isso como inconsistência quando houver inventário (fase 5).
- **Offline:** a fila `accessQueue` tem 20 posições em RAM. Acessos durante queda longa ou reboot se perdem. Não prometa histórico completo.
- **IDs de log colidem** após reboot (`millis()` recomeça). Ordene por `timestamp`, não pela chave.

## 2. Camada de acesso no site

Tudo em `src/lib/firebase/`:

```ts
// paths.ts — única fonte de caminhos
export const DEVICE_ID = process.env.NEXT_PUBLIC_LOCK_DEVICE_ID ?? "sala-pet";
export const paths = {
  systemMode: "system/mode",
  pendingRegistration: "pendingRegistration/current",
  pendingUserLegacy: "pendingUser/current",
  users: "users",
  user: (key: string) => `users/${key}`,
  logs: "logs",
  // firmware 2.1+ (ver contrato-firmware.md)
  deviceStatus: `devices/${DEVICE_ID}/status`,
  deviceInventory: `devices/${DEVICE_ID}/inventory`,
  deviceCommands: `devices/${DEVICE_ID}/commands`,
  deviceOutages: `devices/${DEVICE_ID}/outages`,
  // só do site
  members: "members",           // metadados extras por chave de users/* (vínculo, validade, ativo)
  admins: "admins",             // admins/{authUid}: true
} as const;
```

```ts
// types.ts
export type SystemMode = "STANDBY" | "MASTER";
export type RegistrationMode = "CARD_AND_FINGER" | "CARD_ONLY" | "FINGER_ONLY";
export interface UserRecord { username: string; email: string; rfid?: number; fingerId?: number; createdAt?: string }
export interface AccessLog {
  userName: string; userEmail: string; userPath: string;
  accessType: "rfid" | "fingerId"; status: "ALLOWED" | "DENIED";
  cardUID?: string; timestamp: string;
}
export interface MemberMeta { role: "petiano" | "tutor" | "visitante" | "egresso"; active: boolean; validUntil?: string; updatedBy?: string }
```

Hooks sugeridos (todos com cleanup de `onValue`): `useSystemMode()`, `usePendingRegistration()`, `useUsers()`, `useLogs({ since, limit })`, `useDeviceStatus()` (retorna `{ status: "unsupported" }` se o caminho não existe), `useInventory()`.

### Membros = `users/*` + `members/*`

Não crie outra coleção de pessoas. `users/{key}` continua sendo o registro que o firmware lê. Metadados que só o site usa ficam em `members/{mesma key}`. O firmware ignora campos extras, então também é aceitável gravá-los direto em `users/{key}`, mas `members/` evita conflito quando o ESP reescreve o nó.

Depois de um cadastro concluído, o site encontra o novo `users/*` pelo e-mail do pedido e grava `members/{key}` com vínculo/validade escolhidos no formulário.

## 3. Regras de segurança (fase 6)

`database.rules.json` (fase 6) separa três papéis. Testes: `tests/rules/database-rules.test.ts` (`pnpm emulators` + `pnpm test:rules`).

- **Admin:** `admins/{auth.uid} === true` **e** `auth.token.email` em `@ufc.br`/`@alu.ufc.br`.
- **Fechadura:** `config/deviceUids/{auth.uid} === true` (conta própria, firmware 2.1) **ou** login anônimo enquanto `config/legacyAnonymousDevice` não for `false` (firmware 2.0). Sem o campo, o anônimo continua valendo: as regras novas não derrubam a porta.
- **Qualquer outro login** (não-admin, e-mail fora da UFC, anônimo com o legado desligado): só lê o próprio `admins/{uid}`, para a tela "sem permissão".

| Caminho | Lê | Escreve |
|---|---|---|
| tudo | admin, fechadura | — |
| `admins/{uid}` | o próprio uid | ninguém (console) |
| `config/*` | admin, fechadura | ninguém (console) |
| `system/mode` | | fechadura (`STANDBY`/`MASTER`); o site nunca liga o Modo mestre |
| `users/*` | | fechadura; admin só altera ou apaga um `users/{key}` que já existe (vincular, remover) |
| `logs/*` | | fechadura |
| `pendingRegistration/current` | | admin cria e apaga (formato conferido); fechadura atualiza (`step`, `result`) e apaga |
| `pendingUser/current` | | admin; fechadura só apaga |
| `members/{key}` | | admin (`role`, `active`, `validUntil` AAAA-MM-DD, `updatedBy` = o próprio uid; nada além) |
| `devices/*/status`, `inventory`, `outages` | | fechadura |
| `devices/*/commands/{id}` | | admin cria `PENDING` em nome próprio; só a fechadura muda para `DONE`/`ERROR` |

**Implantar (Console › Realtime Database › Regras, ou `firebase deploy --only database`):**

1. Antes de publicar, confira que cada admin está em `admins/{uid}` e entra com e-mail da UFC.
2. Publique as regras. O firmware 2.0 segue funcionando pelo login anônimo.
3. Com o firmware 2.1 usando a conta própria (`contrato-firmware.md` › 2.6): crie a conta em Authentication, grave `config/deviceUids/{uid}: true` e, quando a porta estiver estável, `config/legacyAnonymousDevice: false`.
