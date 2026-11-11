"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import {
  RegistrationController,
  type FormValues,
  type RegistrationSnapshot,
} from "@/lib/registration/controller";

import { createFirebaseRegistrationAdapter, localMetaStorage } from "../registration";

const SERVER_SNAPSHOT: RegistrationSnapshot = {
  ready: false,
  mode: undefined,
  pending: undefined,
  phase: "idle",
};

/**
 * Cadastro guiado pela fechadura: estado ao vivo + ações. Um controlador por tela; os
 * listeners do Firebase existem enquanto a tela está montada.
 */
export function usePendingRegistration(actorUid: string | undefined) {
  const [controller] = useState(
    () => new RegistrationController(createFirebaseRegistrationAdapter(), { storage: localMetaStorage }),
  );
  useEffect(() => controller.setActor(actorUid), [controller, actorUid]);
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, () => SERVER_SNAPSHOT);

  return {
    ...snapshot,
    start: (values: FormValues) => controller.start(values),
    cancel: () => controller.cancel(),
    reset: () => controller.reset(),
  };
}
