import React, { createContext, useContext } from "react";

import { useVersionGate } from "@/hooks/use-version-gate";

type VersionGateContextValue = ReturnType<typeof useVersionGate>;

const VersionGateContext = createContext<VersionGateContextValue | undefined>(
  undefined,
);

/** Mount once at the app root so all screens share one gate (snooze + fetch state). */
export function VersionGateProvider({ children }: { children: React.ReactNode }) {
  const value = useVersionGate();
  return (
    <VersionGateContext.Provider value={value}>{children}</VersionGateContext.Provider>
  );
}

export function useVersionGateContext(): VersionGateContextValue {
  const ctx = useContext(VersionGateContext);
  if (ctx === undefined) {
    throw new Error(
      "useVersionGateContext must be used within VersionGateProvider",
    );
  }
  return ctx;
}
