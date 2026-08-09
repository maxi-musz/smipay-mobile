import { api } from "@/lib/api";
import type { ApiResponse } from "@/types";

import type { BootstrapData } from "./types";

const BOOTSTRAP_URL = "/app/bootstrap";

/**
 * One unauthenticated call that tells the app which areas are switched off and
 * what the current OTP timings are.
 *
 * Public on purpose — the logged-out screens are exactly the ones that need to
 * know registration is paused. Callers must treat any rejection as "everything
 * is available"; see `PERMISSIVE_BOOTSTRAP`.
 */
export async function fetchAppBootstrap(): Promise<BootstrapData | null> {
  const { data } = await api.get<ApiResponse<BootstrapData>>(BOOTSTRAP_URL, {
    // Short on purpose. This call decorates the UI; it must never be the
    // reason a launch feels slow.
    timeout: 8000,
  });
  return data?.data ?? null;
}
