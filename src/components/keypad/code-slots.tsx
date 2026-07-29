import { useEffect, useRef } from "react";
import {
  Pressable,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useKeypadColors, type KeypadColorOverrides } from "./keypad-theme";

export interface CodeSlotsProps {
  value: string;
  length: number;
  variant?: "underline" | "box";
  /** Masks entered digits with dots (PIN, not OTP). */
  secure?: boolean;
  /** Truthy triggers a shake; pair with `shakeKey` to replay on repeat errors. */
  error?: boolean;
  shakeKey?: string | number;
  /** Shows the blinking caret on the next empty slot. */
  focused?: boolean;
  slotHeight?: number;
  maxSlotWidth?: number;
  colors?: KeypadColorOverrides;
  scheme?: "light" | "dark";
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * The value display that pairs with `<Keypad />`: one slot per expected digit,
 * an animated caret on the active slot, and a shake on error.
 *
 * Slots flex to fill the available width (capped by `maxSlotWidth`), so the row
 * fits a 320 dp screen and a tablet without per-device tuning.
 */
export function CodeSlots({
  value,
  length,
  variant = "underline",
  secure = false,
  error = false,
  shakeKey,
  focused = true,
  slotHeight = 56,
  maxSlotWidth = 64,
  colors: colorOverrides,
  scheme,
  onPress,
  style,
  accessibilityLabel,
  testID,
}: CodeSlotsProps) {
  const palette = useKeypadColors(colorOverrides, scheme);

  const shake = useSharedValue(0);
  const caret = useSharedValue(1);
  const wasErrored = useRef(false);

  useEffect(() => {
    const shouldShake = error && (!wasErrored.current || shakeKey !== undefined);
    wasErrored.current = error;
    if (!shouldShake) return;

    cancelAnimation(shake);
    shake.value = withSequence(
      withTiming(-7, { duration: 45 }),
      withRepeat(withTiming(7, { duration: 80 }), 3, true),
      withTiming(0, { duration: 45 }),
    );
  }, [error, shake, shakeKey]);

  useEffect(() => {
    if (!focused) {
      cancelAnimation(caret);
      caret.value = withTiming(0, { duration: 120 });
      return;
    }
    caret.value = 1;
    caret.value = withRepeat(withTiming(0, { duration: 520 }), -1, true);
    return () => cancelAnimation(caret);
  }, [caret, focused]);

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  const caretStyle = useAnimatedStyle(() => ({ opacity: caret.value }));

  const activeIndex = Math.min(value.length, length - 1);
  const idleColor = error ? palette.danger : palette.separator;
  const activeColor = error ? palette.danger : palette.accent;
  const digitSize = Math.round(slotHeight * 0.46);

  const content = (
    <Animated.View
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={
        accessibilityLabel ?? `${value.length} of ${length} digits entered`
      }
      style={[
        { flexDirection: "row", gap: 10, justifyContent: "space-between" },
        rowStyle,
        style,
      ]}
    >
      {Array.from({ length }).map((_, index) => {
        const digit = value[index];
        const filled = digit !== undefined;
        const isActive = focused && index === activeIndex && !filled;
        const edgeColor = filled || isActive ? activeColor : idleColor;

        return (
          <View
            key={index}
            style={[
              {
                flex: 1,
                maxWidth: maxSlotWidth,
                height: slotHeight,
                alignItems: "center",
                justifyContent: "center",
              },
              variant === "underline"
                ? { borderBottomWidth: 2, borderBottomColor: edgeColor }
                : {
                    borderWidth: 1.5,
                    borderColor: edgeColor,
                    borderRadius: 14,
                    backgroundColor: filled ? "transparent" : palette.key,
                  },
            ]}
          >
            {filled ? (
              secure ? (
                <View
                  style={{
                    width: Math.round(digitSize * 0.5),
                    height: Math.round(digitSize * 0.5),
                    borderRadius: digitSize,
                    backgroundColor: error ? palette.danger : palette.filled,
                  }}
                />
              ) : (
                <Animated.Text
                  maxFontSizeMultiplier={1.15}
                  style={{
                    color: error ? palette.danger : palette.filled,
                    fontSize: digitSize,
                    fontWeight: "600",
                    fontVariant: ["tabular-nums"],
                    includeFontPadding: false,
                  }}
                >
                  {digit}
                </Animated.Text>
              )
            ) : isActive ? (
              <Animated.View
                style={[
                  {
                    width: 2,
                    height: Math.round(slotHeight * 0.42),
                    borderRadius: 1,
                    backgroundColor: activeColor,
                  },
                  caretStyle,
                ]}
              />
            ) : null}
          </View>
        );
      })}
    </Animated.View>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {content}
    </Pressable>
  );
}
