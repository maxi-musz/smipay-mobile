import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSmileBootstrap } from "@/api/services/smileai";
import type { SmileBootstrap } from "@/types/smileai";

const BOOTSTRAP_CACHE_KEY = "smileai.bootstrap.cache";

// Last-known bootstrap, kept across mounts (and on disk) so the welcome
// screen renders the correct on/off variant instantly instead of flashing
// the AI layout while the fetch is in flight.
let memoryCache: SmileBootstrap | null = null;

/**
 * Self-contained hook that fetches the admin-controlled chat-behaviour config
 * once (GET /smileai/bootstrap) and exposes the client-side pacing helpers.
 *
 * It is intentionally standalone (no app-wide store, its own local state) so it
 * can be dropped into the chat screen without touching shared production code.
 * Everything degrades gracefully: until the fetch resolves, `canSendNow()`
 * returns true and there is no cooldown, so the composer never locks up if the
 * endpoint is slow or unavailable.
 */
export interface SmileBehaviourController {
  bootstrap: SmileBootstrap | null;
  /** Seconds the user must wait before the next send, 0 when clear. */
  cooldownRemaining: number;
  /** True when a fresh send is allowed right now. */
  canSendNow: () => boolean;
  /** Record that a message was just sent, arming the min-interval cooldown. */
  markSent: () => void;
  /** Copy to surface when a send is blocked by the local cooldown. */
  throttleMessage: string;
  reload: () => void;
}

export function useSmileBehaviour(enabled = true): SmileBehaviourController {
  const [bootstrap, setBootstrap] = useState<SmileBootstrap | null>(memoryCache);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const lastSentAtRef = useRef<number>(0);
  const resolvedFreshRef = useRef(false);

  const load = useCallback(() => {
    if (!enabled) return;
    let cancelled = false;

    if (!memoryCache) {
      void AsyncStorage.getItem(BOOTSTRAP_CACHE_KEY)
        .then((raw) => {
          if (cancelled || resolvedFreshRef.current || !raw) return;
          const parsed = JSON.parse(raw) as SmileBootstrap;
          if (parsed && typeof parsed === "object") {
            memoryCache = parsed;
            setBootstrap((current) => current ?? parsed);
          }
        })
        .catch(() => undefined);
    }

    void getSmileBootstrap()
      .then((res) => {
        if (!cancelled && res?.success && res.data) {
          resolvedFreshRef.current = true;
          memoryCache = res.data;
          setBootstrap(res.data);
          void AsyncStorage.setItem(
            BOOTSTRAP_CACHE_KEY,
            JSON.stringify(res.data),
          ).catch(() => undefined);
        }
      })
      .catch(() => {
        // Non-fatal: the engine still enforces everything server-side.
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => load(), [load]);

  const minGapMs =
    (bootstrap?.behaviour.min_seconds_between_messages ?? 0) * 1000;

  // Tick the visible cooldown down once a second while it is active.
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const t = setInterval(() => {
      const elapsed = Date.now() - lastSentAtRef.current;
      const remainingMs = Math.max(0, minGapMs - elapsed);
      setCooldownRemaining(Math.ceil(remainingMs / 1000));
      if (remainingMs <= 0) clearInterval(t);
    }, 500);
    return () => clearInterval(t);
  }, [cooldownRemaining, minGapMs]);

  const canSendNow = useCallback(() => {
    if (minGapMs <= 0) return true;
    return Date.now() - lastSentAtRef.current >= minGapMs;
  }, [minGapMs]);

  const markSent = useCallback(() => {
    lastSentAtRef.current = Date.now();
    if (minGapMs > 0) setCooldownRemaining(Math.ceil(minGapMs / 1000));
  }, [minGapMs]);

  return {
    bootstrap,
    cooldownRemaining,
    canSendNow,
    markSent,
    throttleMessage:
      bootstrap?.behaviour.throttle_message ??
      "Give me a moment and I'll get right back to you.",
    reload: load,
  };
}
