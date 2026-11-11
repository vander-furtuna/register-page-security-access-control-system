/**
 * Popula o EMULADOR do Firebase com os mesmos dados das telas de referência
 * (`docs/design/telas/`). Recusa rodar contra qualquer coisa que não seja o emulador local.
 *
 *   npm run emulators                     # em outro terminal
 *   npm run seed:emulator                 # firmware 2.0 (sem devices/*)
 *   npm run seed:emulator -- --firmware-2.1   # também devices/sala-pet/status e inventory
 *   npm run seed:emulator -- --master     # fechadura em Modo mestre
 *
 * Cria também um admin no emulador de Auth: admin@ufc.br / petlock-dev.
 */
import { z } from "zod";

import {
  accessLogSchema,
  deviceInventorySchema,
  deviceStatusSchema,
  memberMetaSchema,
  systemModeSchema,
  userRecordSchema,
} from "../src/lib/firebase/schemas";

const PROJECT_ID = "demo-pet-lock";
const DEVICE_ID = process.env.NEXT_PUBLIC_LOCK_DEVICE_ID || "sala-pet";
const DATABASE_HOST = process.env.FIREBASE_DATABASE_EMULATOR_HOST ?? "127.0.0.1:9000";
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
const NAMESPACE = `${PROJECT_ID}-default-rtdb`;

const args = new Set(process.argv.slice(2));
const withFirmware21 = args.has("--firmware-2.1");
const masterMode = args.has("--master");

// ---------------------------------------------------------------------------
// Trava de segurança: só emulador local, só projeto demo-*.

function assertEmulator() {
  const local = /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/;
  for (const [name, host] of [
    ["FIREBASE_DATABASE_EMULATOR_HOST", DATABASE_HOST],
    ["FIREBASE_AUTH_EMULATOR_HOST", AUTH_HOST],
  ] as const) {
    if (!local.test(host)) {
      throw new Error(`${name}=${host} não é um emulador local. O seed só roda contra o emulador.`);
    }
  }
  if (!PROJECT_ID.startsWith("demo-")) {
    throw new Error("O seed só roda em projetos demo-* do emulador.");
  }
}

async function assertEmulatorRunning() {
  try {
    const res = await fetch(`http://${DATABASE_HOST}/.json?ns=${NAMESPACE}&shallow=true`, {
      headers: { Authorization: "Bearer owner" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (error) {
    throw new Error(
      `Emulador do Realtime Database não respondeu em ${DATABASE_HOST} (${String(error)}). Rode "npm run emulators" antes.`,
    );
  }
}

// ---------------------------------------------------------------------------
// Datas: os registros são gerados para "hoje" e "ontem" no fuso da sala (UTC-3).

const OFFSET_MS = -3 * 60 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, "0");

function lockDate(daysAgo: number, time: string): { text: string; epoch: number } {
  const local = new Date(Date.now() + OFFSET_MS - daysAgo * 24 * 60 * 60 * 1000);
  const day = `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`;
  const text = `${day} ${time}`;
  const [h, m, s] = time.split(":").map(Number) as [number, number, number];
  const epoch =
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), h, m, s) - OFFSET_MS;
  return { text, epoch };
}

// ---------------------------------------------------------------------------
// Dados (tela 03 · Membros e tela 07 · Registros)

type Person = {
  key: string;
  username: string;
  email: string;
  rfid?: number;
  fingerId?: number;
  uid?: string;
  role: "petiano" | "tutor" | "visitante" | "egresso";
  active: boolean;
  createdAt: string;
};

const people: Person[] = [
  {
    key: "user_card_22_finger_12",
    username: "Maria Clara Sousa",
    email: "mariaclara@alu.ufc.br",
    rfid: 22,
    fingerId: 12,
    uid: "A3:F2:1C:9D",
    role: "petiano",
    active: true,
    createdAt: "2026-03-14 10:21:00",
  },
  {
    key: "user_card_id_7",
    username: "João Pedro Lima",
    email: "joaopedro@alu.ufc.br",
    rfid: 7,
    uid: "04:9B:7E:21",
    role: "petiano",
    active: true,
    createdAt: "2026-03-14 10:40:12",
  },
  {
    key: "user_card_4_finger_3",
    username: "Rafael Albuquerque",
    email: "rafael.alb@alu.ufc.br",
    rfid: 4,
    fingerId: 3,
    uid: "5B:0C:91:E4",
    role: "petiano",
    active: true,
    createdAt: "2025-08-02 15:03:44",
  },
  {
    key: "user_card_11_finger_5",
    username: "Ana Beatriz Rocha",
    email: "anabeatriz@alu.ufc.br",
    rfid: 11,
    fingerId: 5,
    uid: "9E:47:3A:10",
    role: "petiano",
    active: true,
    createdAt: "2025-08-02 15:20:09",
  },
  {
    key: "user_finger_id_18",
    username: "Isabela Martins",
    email: "isabela.m@alu.ufc.br",
    fingerId: 18,
    role: "petiano",
    active: true,
    createdAt: "2026-04-22 09:12:30",
  },
  {
    key: "user_card_1_finger_1",
    username: "Prof. Gustavo Teixeira",
    email: "gustavo.teixeira@ufc.br",
    rfid: 1,
    fingerId: 1,
    uid: "E2:40:0B:13",
    role: "tutor",
    active: true,
    createdAt: "2025-03-10 08:00:00",
  },
  {
    key: "user_card_15_finger_21",
    username: "Larissa Souza",
    email: "larissa.souza@alu.ufc.br",
    rfid: 15,
    fingerId: 21,
    uid: "C1:88:2F:6B",
    role: "petiano",
    active: true,
    createdAt: "2026-05-05 14:45:18",
  },
  {
    key: "user_card_id_19",
    username: "Thiago Carvalho",
    email: "thiago.c@alu.ufc.br",
    rfid: 19,
    uid: "3D:E5:72:A8",
    role: "petiano",
    active: true,
    createdAt: "2026-06-01 11:30:00",
  },
  {
    key: "user_finger_id_9",
    username: "Lucas Ferreira",
    email: "lucasf@alu.ufc.br",
    fingerId: 9,
    role: "egresso",
    active: false,
    createdAt: "2024-09-16 16:10:51",
  },
];

const users = Object.fromEntries(
  people.map((p) => [
    p.key,
    userRecordSchema.parse({
      username: p.username,
      email: p.email,
      ...(p.rfid !== undefined && { rfid: p.rfid }),
      ...(p.fingerId !== undefined && { fingerId: p.fingerId }),
      createdAt: p.createdAt,
    }),
  ]),
);

const members = Object.fromEntries(
  people.map((p) => [p.key, memberMetaSchema.parse({ role: p.role, active: p.active, updatedBy: "seed" })]),
);

const byKey = (key: string) => people.find((p) => p.key === key)!;

type LogInput = {
  daysAgo: number;
  time: string;
  status: "ALLOWED" | "DENIED";
  accessType: "rfid" | "fingerId";
  person?: string; // chave de users/*
  orphanId?: number; // credencial sem dono (ALLOWED + Desconhecido)
  cardUID?: string; // cartão desconhecido
};

const logInputs: LogInput[] = [
  // hoje (tela 07)
  {
    daysAgo: 0,
    time: "14:32:08",
    status: "ALLOWED",
    accessType: "fingerId",
    person: "user_card_22_finger_12",
  },
  { daysAgo: 0, time: "14:10:51", status: "ALLOWED", accessType: "rfid", person: "user_card_id_7" },
  { daysAgo: 0, time: "13:58:40", status: "DENIED", accessType: "rfid", cardUID: "7C:11:E0:5A" },
  { daysAgo: 0, time: "13:57:12", status: "DENIED", accessType: "rfid", cardUID: "7C:11:E0:5A" },
  { daysAgo: 0, time: "13:41:02", status: "ALLOWED", accessType: "fingerId", person: "user_card_4_finger_3" },
  { daysAgo: 0, time: "11:05:33", status: "ALLOWED", accessType: "fingerId", orphanId: 27 },
  { daysAgo: 0, time: "10:22:47", status: "ALLOWED", accessType: "rfid", person: "user_card_1_finger_1" },
  { daysAgo: 0, time: "09:48:19", status: "DENIED", accessType: "fingerId" },
  {
    daysAgo: 0,
    time: "08:41:55",
    status: "ALLOWED",
    accessType: "fingerId",
    person: "user_card_22_finger_12",
  },
  {
    daysAgo: 0,
    time: "08:03:17",
    status: "ALLOWED",
    accessType: "fingerId",
    person: "user_card_11_finger_5",
  },
  {
    daysAgo: 0,
    time: "07:58:02",
    status: "ALLOWED",
    accessType: "fingerId",
    person: "user_card_15_finger_21",
  },
  // ontem
  { daysAgo: 1, time: "17:55:40", status: "ALLOWED", accessType: "fingerId", person: "user_finger_id_18" },
  { daysAgo: 1, time: "16:02:11", status: "ALLOWED", accessType: "rfid", person: "user_card_id_19" },
  { daysAgo: 1, time: "10:12:03", status: "ALLOWED", accessType: "fingerId", person: "user_card_1_finger_1" },
  { daysAgo: 1, time: "09:30:27", status: "DENIED", accessType: "rfid", cardUID: "7C:11:E0:5A" },
];

function buildLog(input: LogInput, index: number) {
  const { text, epoch } = lockDate(input.daysAgo, input.time);
  const person = input.person ? byKey(input.person) : undefined;
  const id = person ? (input.accessType === "rfid" ? person.rfid : person.fingerId) : (input.orphanId ?? 0);
  const userPath = `/users/user_${input.accessType === "rfid" ? "card" : "finger"}_id_${id}`;
  const uid = input.accessType === "rfid" ? (person?.uid ?? input.cardUID) : undefined;

  const log = accessLogSchema.parse({
    userName: person?.username ?? "Desconhecido",
    userEmail: person?.email ?? "N/A",
    userPath: person ? `/users/${person.key}` : userPath,
    accessType: input.accessType,
    status: input.status,
    ...(uid && { cardUID: uid }),
    timestamp: text,
    ...(withFirmware21 && { epoch, clockSynced: true, deviceId: DEVICE_ID }),
  });
  // firmware 2.0: "log_" + millis(); números crescentes como num ESP ligado há algumas horas
  const key = withFirmware21
    ? `log_${Math.floor(epoch / 1000)}_${index}`
    : `log_${8_000_000 + index * 37_411}`;
  return [key, log] as const;
}

const logs = Object.fromEntries(
  [
    ...logInputs.map(buildLog),
    // Acesso gravado sem NTP (firmware 2.0): o site precisa tratar 1970-01-01.
    [
      "log_93120",
      accessLogSchema.parse({
        userName: "Maria Clara Sousa",
        userEmail: "mariaclara@alu.ufc.br",
        userPath: "/users/user_card_22_finger_12",
        accessType: "fingerId",
        status: "ALLOWED",
        timestamp: "1970-01-01 00:01:33",
      }),
    ] as const,
  ].sort(([a], [b]) => a.localeCompare(b)),
);

function firmware21Nodes() {
  const fingers = Object.fromEntries(
    [...people.flatMap((p) => (p.fingerId !== undefined ? [p.fingerId] : [])), 27].map((id) => [
      String(id),
      true,
    ]),
  );
  const cards = Object.fromEntries([
    ...people.flatMap((p) => (p.rfid !== undefined && p.uid ? [[String(p.rfid), p.uid] as const] : [])),
    ["30", "5D:22:A0:7F"] as const, // cartão sem dono
  ]);
  const now = Date.now();
  return {
    status: deviceStatusSchema.parse({
      online: true,
      lastSeen: now,
      firmware: "2.1.0",
      ip: "10.0.4.37",
      rssi: -58,
      freeHeap: 145320,
      mode: masterMode ? "MASTER" : "STANDBY",
      lcd: masterMode ? ["Modo mestre", "Aguardando..."] : ["Aguardando", "acesso..."],
      queue: 0,
      fingerCapacity: 127,
      fingerCount: Object.keys(fingers).length,
      cardCapacity: 126,
      cardCount: Object.keys(cards).length,
      capabilities: ["status", "inventory", "commands", "registrationStep", "persistentQueue"],
    }),
    inventory: deviceInventorySchema.parse({ updatedAt: now, fingers, cards, masterCard: true }),
  };
}

// ---------------------------------------------------------------------------
// Auth: um admin para as próximas fases.

const ADMIN_EMAIL = "admin@ufc.br";
const ADMIN_PASSWORD = "petlock-dev";

async function ensureAdmin(): Promise<string> {
  const base = `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1`;
  const body = JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, returnSecureToken: true });
  const headers = { "Content-Type": "application/json" };
  const signIn = await fetch(`${base}/accounts:signInWithPassword?key=demo-api-key`, {
    method: "POST",
    headers,
    body,
  });
  const res = signIn.ok
    ? signIn
    : await fetch(`${base}/accounts:signUp?key=demo-api-key`, { method: "POST", headers, body });
  if (!res.ok) throw new Error(`Emulador de Auth recusou o admin: HTTP ${res.status} ${await res.text()}`);
  const { localId } = z.object({ localId: z.string() }).parse(await res.json());
  return localId;
}

// ---------------------------------------------------------------------------

async function main() {
  assertEmulator();
  await assertEmulatorRunning();

  let adminUid: string | undefined;
  try {
    adminUid = await ensureAdmin();
  } catch (error) {
    console.warn(`Aviso: admin não criado (${String(error)}). O emulador de Auth está rodando?`);
  }

  const data: Record<string, unknown> = {
    system: { mode: systemModeSchema.parse(masterMode ? "MASTER" : "STANDBY") },
    users,
    members,
    logs,
    ...(adminUid && { admins: { [adminUid]: true } }),
    ...(withFirmware21 && { devices: { [DEVICE_ID]: firmware21Nodes() } }),
  };

  const res = await fetch(`http://${DATABASE_HOST}/.json?ns=${NAMESPACE}`, {
    method: "PUT",
    headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Falha ao gravar no emulador: HTTP ${res.status} ${await res.text()}`);

  console.log(
    [
      `Emulador populado (${NAMESPACE}):`,
      `  ${Object.keys(users).length} membros, ${Object.keys(logs).length} registros de acesso`,
      `  system/mode = ${masterMode ? "MASTER" : "STANDBY"}`,
      `  devices/${DEVICE_ID}: ${withFirmware21 ? "status + inventory (firmware 2.1)" : "ausente (firmware 2.0)"}`,
      adminUid ? `  admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD} (uid ${adminUid})` : "  admin: não criado",
    ].join("\n"),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
