/**
 * Única fonte de caminhos do Realtime Database (`docs/arquitetura/dados-firebase.md`).
 * Os caminhos da parte 1 são lidos/escritos pelo firmware 2.0: não mude o formato sem
 * combinar com o firmware (`docs/arquitetura/contrato-firmware.md`).
 */
export const DEVICE_ID = process.env.NEXT_PUBLIC_LOCK_DEVICE_ID || "sala-pet";

export const paths = {
  // firmware 2.0 (parte 1 do contrato)
  systemMode: "system/mode",
  pendingRegistration: "pendingRegistration/current",
  pendingUserLegacy: "pendingUser/current",
  users: "users",
  user: (key: string) => `users/${key}`,
  logs: "logs",
  // firmware 2.1+ (parte 2 do contrato) — podem não existir
  deviceStatus: `devices/${DEVICE_ID}/status`,
  deviceInventory: `devices/${DEVICE_ID}/inventory`,
  deviceCommands: `devices/${DEVICE_ID}/commands`,
  // só do site
  members: "members",
  member: (key: string) => `members/${key}`,
  admins: "admins",
  admin: (uid: string) => `admins/${uid}`,
} as const;
