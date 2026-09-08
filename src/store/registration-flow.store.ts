import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createPersistConfig } from "./middleware";
import type { RegistrationFlow } from "@/api";

interface RegistrationFlowState {
  /** Last value the SERVER gave us. Never a client-side guess. */
  cachedFlow: RegistrationFlow | null;
  /** When we last confirmed it with the server. */
  lastConfirmedAt: number | null;
  setCachedFlow: (flow: RegistrationFlow) => void;
}

/**
 * Persists the last-known-good registration flow so returning users resolve it
 * instantly (offline included) instead of waiting on the network. Only ever
 * holds a value the server actually returned.
 */
export const useRegistrationFlowStore = create<RegistrationFlowState>()(
  persist(
    (set) => ({
      cachedFlow: null,
      lastConfirmedAt: null,
      setCachedFlow: (flow) =>
        set({ cachedFlow: flow, lastConfirmedAt: Date.now() }),
    }),
    createPersistConfig<RegistrationFlowState>("registration-flow"),
  ),
);
