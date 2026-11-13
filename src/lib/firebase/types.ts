import type { z } from "zod";

import type {
  accessLogSchema,
  commandTypeSchema,
  deviceCapabilitySchema,
  deviceCommandSchema,
  deviceInventorySchema,
  deviceOutageSchema,
  deviceStatusSchema,
  memberMetaSchema,
  memberRoleSchema,
  pendingRegistrationSchema,
  registrationModeSchema,
  registrationStepSchema,
  systemModeSchema,
  userRecordSchema,
} from "./schemas";

export type SystemMode = z.infer<typeof systemModeSchema>;
export type RegistrationMode = z.infer<typeof registrationModeSchema>;
export type RegistrationStep = z.infer<typeof registrationStepSchema>;
export type PendingRegistration = z.infer<typeof pendingRegistrationSchema>;
export type UserRecord = z.infer<typeof userRecordSchema>;
export type AccessLog = z.infer<typeof accessLogSchema>;
export type MemberRole = z.infer<typeof memberRoleSchema>;
export type MemberMeta = z.infer<typeof memberMetaSchema>;
export type DeviceCapability = z.infer<typeof deviceCapabilitySchema>;
export type DeviceStatus = z.infer<typeof deviceStatusSchema>;
export type DeviceInventory = z.infer<typeof deviceInventorySchema>;
export type DeviceOutage = z.infer<typeof deviceOutageSchema>;
export type CommandType = z.infer<typeof commandTypeSchema>;
export type DeviceCommand = z.infer<typeof deviceCommandSchema>;

/**
 * Estado de uma leitura em tempo real.
 * - `loading`: esperando o primeiro valor.
 * - `ready`: valor válido em `data`.
 * - `missing`: o caminho não existe (ex.: `devices/*` com firmware 2.0 → mostrar fallback).
 * - `error`: sem permissão, falha de rede ou dado fora do esquema.
 */
export type RtdbState<T> =
  | { status: "loading"; data: undefined; error: undefined }
  | { status: "ready"; data: T; error: undefined }
  | { status: "missing"; data: undefined; error: undefined }
  | { status: "error"; data: undefined; error: Error };
