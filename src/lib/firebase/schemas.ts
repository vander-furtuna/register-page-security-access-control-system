import { z } from "zod";

/**
 * Esquemas zod de tudo que o site lê do banco. Todo dado do Firebase passa por aqui antes de
 * chegar à UI. O firmware ignora campos extras e o site também (`z.object` não é estrito),
 * para aceitar versões novas do firmware sem quebrar.
 */

export const systemModeSchema = z.enum(["STANDBY", "MASTER"]);

export const registrationModeSchema = z.enum(["CARD_AND_FINGER", "CARD_ONLY", "FINGER_ONLY"]);

/** Passo publicado pelo firmware 2.1 em `pendingRegistration/current.step`. */
export const registrationStepSchema = z.enum([
  "WAIT_CARD",
  "CARD_OK",
  "WAIT_FINGER_1",
  "WAIT_FINGER_2",
  "DONE",
  "FAILED_CARD_EXISTS",
  "FAILED_FINGER",
  "CANCELLED",
]);

export const pendingRegistrationSchema = z.object({
  username: z.string(),
  email: z.string(),
  mode: registrationModeSchema,
  timestamp: z.string(),
  // firmware 2.1
  step: registrationStepSchema.optional(),
  result: z.object({ userKey: z.string() }).partial().optional(),
});

/** `pendingUser/current`: espelho legado, sem `mode`. */
export const pendingUserLegacySchema = z.object({
  username: z.string(),
  email: z.string(),
  timestamp: z.string(),
});

/** Números vindos do ESP às vezes chegam como string; aceitamos os dois. */
const credentialId = z.coerce.number().int().nonnegative();

export const userRecordSchema = z.object({
  username: z.string(),
  email: z.string(),
  rfid: credentialId.optional(),
  fingerId: credentialId.optional(),
  createdAt: z.string().optional(),
});

export const usersSchema = z.record(z.string(), userRecordSchema);

export const accessLogSchema = z.object({
  userName: z.string(),
  userEmail: z.string(),
  userPath: z.string(),
  accessType: z.enum(["rfid", "fingerId"]),
  status: z.enum(["ALLOWED", "DENIED"]),
  cardUID: z.string().optional(),
  timestamp: z.string(),
  // firmware 2.1
  epoch: z.number().optional(),
  clockSynced: z.boolean().optional(),
  queuedOffline: z.boolean().optional(),
  /** Quando o evento chegou ao banco (ms), se passou pela fila offline (proposta 2.1). */
  syncedAt: z.number().optional(),
  deviceId: z.string().optional(),
  credentialId: z.number().optional(),
});

export const logsSchema = z.record(z.string(), accessLogSchema);

export const memberRoleSchema = z.enum(["petiano", "tutor", "visitante", "egresso"]);

export const memberMetaSchema = z.object({
  role: memberRoleSchema,
  active: z.boolean(),
  validUntil: z.string().optional(),
  updatedBy: z.string().optional(),
});

export const membersSchema = z.record(z.string(), memberMetaSchema);

export const deviceCapabilitySchema = z.enum([
  "status",
  "inventory",
  "commands",
  "registrationStep",
  "persistentQueue",
]);

/** `devices/<id>/status` (firmware 2.1). */
export const deviceStatusSchema = z.object({
  online: z.boolean(),
  lastSeen: z.number(),
  firmware: z.string().optional(),
  ip: z.string().optional(),
  rssi: z.number().optional(),
  freeHeap: z.number().optional(),
  mode: systemModeSchema.optional(),
  lcd: z.array(z.string()).optional(),
  queue: z.number().optional(),
  fingerCapacity: z.number().optional(),
  fingerCount: z.number().optional(),
  cardCapacity: z.number().optional(),
  cardCount: z.number().optional(),
  // capacidades desconhecidas são descartadas em vez de invalidar o status inteiro
  capabilities: z
    .array(z.string())
    .optional()
    .transform((list) =>
      (list ?? []).filter(
        (c): c is z.infer<typeof deviceCapabilitySchema> => deviceCapabilitySchema.safeParse(c).success,
      ),
    ),
});

/** `devices/<id>/inventory` (firmware 2.1). */
export const deviceInventorySchema = z.object({
  updatedAt: z.number(),
  fingers: z.record(z.string(), z.literal(true)).default({}),
  cards: z.record(z.string(), z.string()).default({}),
  masterCard: z.boolean().optional(),
});

export const commandTypeSchema = z.enum([
  "DELETE_FINGER",
  "DELETE_CARD",
  "REFRESH_INVENTORY",
  "REBOOT",
  "SET_UNLOCK_SECONDS",
  "SET_SHOW_NAME",
]);

export const deviceCommandSchema = z.object({
  type: commandTypeSchema,
  requestedBy: z.string(),
  requestedAt: z.number(),
  status: z.enum(["PENDING", "DONE", "ERROR"]),
  error: z.string().optional(),
  fingerId: z.number().optional(),
  slot: z.number().optional(),
  seconds: z.number().optional(),
  enabled: z.boolean().optional(),
});

export const adminsSchema = z.record(z.string(), z.literal(true));
