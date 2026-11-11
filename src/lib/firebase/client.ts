import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectDatabaseEmulator, getDatabase, type Database } from "firebase/database";

/**
 * Cliente Firebase do navegador. Configuração só por `NEXT_PUBLIC_*` (`.env.local`), sem valores
 * reais no código. Com `NEXT_PUBLIC_USE_EMULATOR=true`, conecta no emulador local
 * (`npm run emulators`) e usa o projeto de demonstração `demo-pet-lock`.
 */

export const useEmulator = process.env.NEXT_PUBLIC_USE_EMULATOR === "true";

export const EMULATOR_PROJECT_ID = "demo-pet-lock";
const EMULATOR_HOST = "127.0.0.1";
const EMULATOR_DATABASE_PORT = 9000;
const EMULATOR_AUTH_PORT = 9099;

// Next só embute variáveis NEXT_PUBLIC_* acessadas de forma literal.
const envConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const emulatorConfig: FirebaseOptions = {
  apiKey: "demo-api-key",
  projectId: EMULATOR_PROJECT_ID,
  databaseURL: `http://${EMULATOR_HOST}:${EMULATOR_DATABASE_PORT}?ns=${EMULATOR_PROJECT_ID}-default-rtdb`,
};

export function getFirebaseConfig(): FirebaseOptions {
  if (useEmulator) return emulatorConfig;
  if (!envConfig.databaseURL || !envConfig.apiKey) {
    throw new Error(
      "Configuração do Firebase ausente. Copie .env.example para .env.local e preencha as variáveis NEXT_PUBLIC_FIREBASE_*, ou use NEXT_PUBLIC_USE_EMULATOR=true.",
    );
  }
  return envConfig;
}

let app: FirebaseApp | undefined;
let db: Database | undefined;
let auth: Auth | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  app = getApps().length ? getApp() : initializeApp(getFirebaseConfig());
  return app;
}

export function getDb(): Database {
  if (db) return db;
  db = getDatabase(getFirebaseApp());
  if (useEmulator) connectDatabaseEmulator(db, EMULATOR_HOST, EMULATOR_DATABASE_PORT);
  return db;
}

export function getFirebaseAuth(): Auth {
  if (auth) return auth;
  auth = getAuth(getFirebaseApp());
  if (useEmulator) {
    connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${EMULATOR_AUTH_PORT}`, { disableWarnings: true });
  }
  return auth;
}
