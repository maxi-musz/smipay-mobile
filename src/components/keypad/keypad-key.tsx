import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import type { KeypadPressGuard } from "./use-keypad-press-guard";

/** Hold-to-repeat pacing, tuned to feel like the system keyboard's backspace. */
const HOLD_START_MS = 420;
const HOLD_REPEAT_MS = 75;

export type KeypadKeyHold =
  | { kind: "repeat"; onRepeat: () => void }
  | { kind: "once"; delayMs?: number; onHold: () => void }
  | null;

export interface KeypadKeyViewProps {
  /** Unique within one keypad — the press lock keys off this. */
  id: string;
  width: number;
  height: number;
  radius: number;
  restColor: string;
  pressedColor: string;
  disabled?: boolean;
  guard: KeypadPressGuard;
  onActivate: () => void;
  commitOn: "press-in" | "press-out";
  hold?: KeypadKeyHold;
  /** Extends the touch area into the gutters so gaps aren't dead zones. */
  hitSlop?: number;
  accessibilityLabel: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * A single key.
 *
 * Presses commit on *press-in* by default, which is what makes a keypad feel
 * instant — the same contract as the iOS and Android system keyboards. The
 * highlight runs on the UI thread via Reanimated, so it never stutters behind a
 * busy JS thread (the usual cause of "my keypad feels laggy on Android").
 *
 * Ripple is deliberately disabled: the shared scale + tint animation gives every
 * device the same feedback instead of the wildly varying OEM ripple styles.
 */
export function KeypadKeyView({
  id,
  width,
  height,
  radius,
  restColor,
  pressedColor,
  disabled = false,
  guard,
  onActivate,
  commitOn,
  hold = null,
  hitSlop = 0,
  accessibilityLabel,
  children,
  style,
  testID,
}: KeypadKeyViewProps) {
  const pressed = useSharedValue(0);
  const ownsPressRef = useRef(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Latest-value refs so timers and press handlers never fire a stale closure.
  const onActivateRef = useRef(onActivate);
  onActivateRef.current = onActivate;
  const holdRef = useRef(hold);
  holdRef.current = hold;

  const stopHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (repeatTimerRef.current) {
      clearInterval(repeatTimerRef.current);
      repeatTimerRef.current = null;
    }
  }, []);

  const startHold = useCallback(() => {
    const config = holdRef.current;
    if (!config) return;
    stopHold();

    if (config.kind === "repeat") {
      holdTimerRef.current = setTimeout(() => {
        repeatTimerRef.current = setInterval(() => {
          const current = holdRef.current;
          if (current?.kind === "repeat") current.onRepeat();
        }, HOLD_REPEAT_MS);
      }, HOLD_START_MS);
      return;
    }

    holdTimerRef.current = setTimeout(() => {
      const current = holdRef.current;
      if (current?.kind === "once") current.onHold();
    }, config.delayMs ?? 500);
  }, [stopHold]);

  // Release the lock and kill timers if we unmount mid-press.
  useEffect(
    () => () => {
      stopHold();
      if (ownsPressRef.current) guard.release(id);
    },
    [guard, id, stopHold],
  );

  const handlePressIn = useCallback(() => {
    if (disabled) return;
    // Another key is already down — ignore this touch entirely.
    if (!guard.acquire(id)) return;
    ownsPressRef.current = true;
    pressed.value = withTiming(1, { duration: 55 });
    if (commitOn === "press-in") guard.commit(() => onActivateRef.current());
    startHold();
  }, [commitOn, disabled, guard, id, pressed, startHold]);

  const handlePress = useCallback(() => {
    if (!ownsPressRef.current || commitOn !== "press-out") return;
    guard.commit(() => onActivateRef.current());
  }, [commitOn, guard]);

  const handlePressOut = useCallback(() => {
    stopHold();
    if (!ownsPressRef.current) return;
    ownsPressRef.current = false;
    guard.release(id);
    pressed.value = withTiming(0, { duration: 140 });
  }, [guard, id, pressed, stopHold]);

  const animatedStyle = useAnimatedStyle(
    () => ({
      backgroundColor: interpolateColor(
        pressed.value,
        [0, 1],
        [restColor, pressedColor],
      ),
      transform: [{ scale: 1 - pressed.value * 0.045 }],
    }),
    [restColor, pressedColor],
  );

  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPress={handlePress}
      onPressOut={handlePressOut}
      hitSlop={hitSlop}
      android_ripple={null}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={{
        width,
        height,
        // Centres the tile when it is smaller than its cell (flat appearance
        // renders a circle inside a wider cell).
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            width: "100%",
            height: "100%",
            borderRadius: radius,
            alignItems: "center",
            justifyContent: "center",
          },
          animatedStyle,
          style,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}
