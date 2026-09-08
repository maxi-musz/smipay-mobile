import { useCallback, useEffect, useRef, useState } from "react";

import { fetchActiveRegistrationFlow, type RegistrationFlow } from "@/api";
import { useRegistrationFlowStore } from "@/store/registration-flow.store";

/**
 * Resolves the active registration flow, robustly:
 *   • Uses the persisted last-known-good value INSTANTLY when present, then
 *     revalidates in the background (stale-while-revalidate) — no flicker.
 *   • With no cache, retries with backoff behind a "resolving" state (a calm
 *     spinner, never an error) before giving up.
 *   • Only when retries exhaust AND there is no cache does it report
 *     "unavailable" — the client never falls back to a guessed default, so it
 *     can never render the wrong flow.
 */
export type FlowStatus = "resolving" | "ready" | "unavailable";

const MAX_ATTEMPTS = 4;
const BACKOFF_MS = [800, 1500, 2500, 4000];

export function useRegistrationFlow() {
  const cachedFlow = useRegistrationFlowStore((s) => s.cachedFlow);
  const setCachedFlow = useRegistrationFlowStore((s) => s.setCachedFlow);

  const [flow, setFlow] = useState<RegistrationFlow | null>(cachedFlow);
  const [status, setStatus] = useState<FlowStatus>(
    cachedFlow ? "ready" : "resolving",
  );
  const cancelled = useRef(false);

  const resolve = useCallback(
    async (opts: { silent: boolean }) => {
      // With a cached value we revalidate silently and never downgrade the UI.
      if (!opts.silent) setStatus(cachedFlow ? "ready" : "resolving");

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        if (cancelled.current) return;
        try {
          const res = await fetchActiveRegistrationFlow();
          if (res.success && res.data?.active_flow) {
            setCachedFlow(res.data.active_flow);
            setFlow(res.data.active_flow);
            setStatus("ready");
            return;
          }
        } catch {
          /* network / server error — fall through to retry */
        }
        // Wait before the next attempt (skip the wait on the last one).
        if (attempt < MAX_ATTEMPTS - 1) {
          await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt]));
        }
      }

      if (cancelled.current) return;
      // Exhausted. If we have a cached value, keep using it; otherwise block.
      if (cachedFlow) {
        setFlow(cachedFlow);
        setStatus("ready");
      } else {
        setStatus("unavailable");
      }
    },
    [cachedFlow, setCachedFlow],
  );

  useEffect(() => {
    cancelled.current = false;
    void resolve({ silent: !!cachedFlow });
    return () => {
      cancelled.current = true;
    };
    // Resolve once on mount; `retry` handles manual refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retry = useCallback(() => {
    cancelled.current = false;
    void resolve({ silent: false });
  }, [resolve]);

  return { flow, status, retry };
}
