import { useMemo, useRef } from "react";

export interface KeypadPressGuard {
  /** Claim the keypad for `id`. Returns false if another key is already down. */
  acquire(id: string): boolean;
  /** Release the claim. Safe to call for a key that never acquired. */
  release(id: string): void;
  /** Runs `action` unless it arrives faster than a human tap. */
  commit(action: () => void): boolean;
}

/** A press held longer than this is assumed stuck (lost `onPressOut`). */
const STUCK_PRESS_MS = 1500;

/**
 * Guards the two failure modes that make hand-rolled keypads unreliable on
 * Android:
 *
 * 1. **Multi-touch double entry.** Two fingers (or one fat one) landing on
 *    adjacent keys fires both `onPressIn` handlers. Only the first claim wins
 *    until it is released — same as a real keyboard.
 * 2. **Digitizer bounce.** Cheap panels occasionally report a single tap twice
 *    within a few milliseconds. Commits closer together than `minIntervalMs`
 *    are dropped.
 *
 * A claim that is never released (component unmounted mid-press, gesture
 * swallowed by a parent) is force-expired so the keypad can't deadlock.
 */
export function useKeypadPressGuard(minIntervalMs = 40): KeypadPressGuard {
  const ownerRef = useRef<string | null>(null);
  const ownerSinceRef = useRef(0);
  const lastCommitRef = useRef(0);

  return useMemo<KeypadPressGuard>(
    () => ({
      acquire(id) {
        const now = Date.now();
        if (
          ownerRef.current !== null &&
          ownerRef.current !== id &&
          now - ownerSinceRef.current < STUCK_PRESS_MS
        ) {
          return false;
        }
        ownerRef.current = id;
        ownerSinceRef.current = now;
        return true;
      },
      release(id) {
        if (ownerRef.current === id) ownerRef.current = null;
      },
      commit(action) {
        const now = Date.now();
        if (now - lastCommitRef.current < minIntervalMs) return false;
        lastCommitRef.current = now;
        action();
        return true;
      },
    }),
    [minIntervalMs],
  );
}
