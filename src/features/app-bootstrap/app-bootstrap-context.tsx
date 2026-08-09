import React, { createContext, useContext } from "react";

import { useAppBootstrap } from "./use-app-bootstrap";
import { PERMISSIVE_BOOTSTRAP, type AreaAvailability, type BootstrapArea } from "./types";

type AppBootstrapContextValue = ReturnType<typeof useAppBootstrap>;

const AppBootstrapContext = createContext<AppBootstrapContextValue | undefined>(
  undefined,
);

/**
 * Mount once at the app root. One fetch is shared by every screen, so a
 * launch costs a single request no matter how many places read the payload.
 */
export function AppBootstrapProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const value = useAppBootstrap();
  return (
    <AppBootstrapContext.Provider value={value}>
      {children}
    </AppBootstrapContext.Provider>
  );
}

/**
 * Read the bootstrap payload from anywhere under the provider.
 *
 * Deliberately does **not** throw when the provider is missing. This payload
 * decorates the interface; a screen rendered outside the tree (a modal host, a
 * test, a storybook) should degrade to "everything is available", not crash.
 */
export function useAppBootstrapContext(): AppBootstrapContextValue {
  const ctx = useContext(AppBootstrapContext);
  if (ctx) return ctx;

  return {
    data: PERMISSIVE_BOOTSTRAP,
    loading: false,
    fromCache: false,
    lastFetchedAt: 0,
    refresh: async () => {},
    availabilityFor: (): AreaAvailability => ({ available: true }),
    isAvailable: (_area: BootstrapArea) => true,
  };
}

/**
 * The one thing most screens need: "is this area on, and what do I say if it
 * isn't". Reads the shared payload — no extra request.
 */
export function useServiceAvailability(area: BootstrapArea): AreaAvailability {
  return useAppBootstrapContext().availabilityFor(area);
}

/** OTP timings, for rendering a real countdown instead of a guessed one. */
export function useOtpTimings() {
  return useAppBootstrapContext().data.otp;
}
