import { useCallback, useMemo, useRef, useState } from "react";

import { keypadHaptic } from "./keypad-haptics";

export interface UseNumericInputOptions {
  /** Fixed-length entry (OTP / PIN). Enables `isComplete` and `onComplete`. */
  length?: number;
  /** Cap for free-length entry (amounts). Ignored when `length` is set. */
  maxLength?: number;
  initialValue?: string;
  /** Fires once, on the keystroke that fills the last slot. */
  onComplete?: (value: string) => void;
  onChange?: (value: string) => void;
  /** Fires when a digit is pressed while already full. */
  onOverflow?: () => void;
  /** Buzz on overflow. Key/delete feedback comes from the keypad itself. */
  haptics?: boolean;
}

export interface NumericInputController {
  value: string;
  digits: string[];
  length?: number;
  isComplete: boolean;
  isEmpty: boolean;
  isFull: boolean;
  push: (digit: string) => void;
  backspace: () => void;
  clear: () => void;
  setValue: (value: string) => void;
}

/**
 * Owns the value behind a keypad: append, delete, clear, and a one-shot
 * completion callback.
 *
 * State is mirrored into a ref so bursts of fast taps read the true current
 * value instead of a batched, stale render value — the bug that shows up as
 * "the last digit sometimes doesn't register".
 */
export function useNumericInput(
  options: UseNumericInputOptions = {},
): NumericInputController {
  const {
    length,
    maxLength,
    initialValue = "",
    haptics = true,
  } = options;

  const limit = length ?? maxLength ?? Number.POSITIVE_INFINITY;

  const valueRef = useRef(initialValue.slice(0, Number.isFinite(limit) ? limit : undefined));
  const [value, setValueState] = useState(valueRef.current);

  const onCompleteRef = useRef(options.onComplete);
  onCompleteRef.current = options.onComplete;
  const onChangeRef = useRef(options.onChange);
  onChangeRef.current = options.onChange;
  const onOverflowRef = useRef(options.onOverflow);
  onOverflowRef.current = options.onOverflow;

  const commit = useCallback((next: string) => {
    valueRef.current = next;
    setValueState(next);
    onChangeRef.current?.(next);
  }, []);

  const push = useCallback(
    (digit: string) => {
      const clean = digit.replace(/\D/g, "");
      if (!clean) return;

      const prev = valueRef.current;
      if (prev.length >= limit) {
        if (haptics) keypadHaptic("reject");
        onOverflowRef.current?.();
        return;
      }

      const next = (prev + clean).slice(0, Number.isFinite(limit) ? limit : undefined);
      commit(next);

      if (length != null && next.length === length) {
        onCompleteRef.current?.(next);
      }
    },
    [commit, haptics, length, limit],
  );

  const backspace = useCallback(() => {
    const prev = valueRef.current;
    if (!prev) return;
    commit(prev.slice(0, -1));
  }, [commit]);

  const clear = useCallback(() => {
    if (!valueRef.current) return;
    commit("");
  }, [commit]);

  const setValue = useCallback(
    (next: string) => {
      const clean = next
        .replace(/\D/g, "")
        .slice(0, Number.isFinite(limit) ? limit : undefined);
      if (clean === valueRef.current) return;
      commit(clean);
      if (length != null && clean.length === length) {
        onCompleteRef.current?.(clean);
      }
    },
    [commit, length, limit],
  );

  return useMemo<NumericInputController>(
    () => ({
      value,
      digits: value.split(""),
      length,
      isComplete: length != null && value.length === length,
      isEmpty: value.length === 0,
      isFull: value.length >= limit,
      push,
      backspace,
      clear,
      setValue,
    }),
    [backspace, clear, length, limit, push, setValue, value],
  );
}
