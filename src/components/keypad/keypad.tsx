import { useMemo } from "react";
import {
  Text as RNText,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { keypadHaptic } from "./keypad-haptics";
import { KeypadKeyView, type KeypadKeyHold } from "./keypad-key";
import { useKeypadColors, type KeypadColorOverrides } from "./keypad-theme";
import { useKeypadMetrics, type KeypadMetricsOptions } from "./use-keypad-metrics";
import { useKeypadPressGuard } from "./use-keypad-press-guard";
import type { NumericInputController } from "./use-numeric-input";
import type {
  KeypadAppearance,
  KeypadBackspaceBehavior,
  KeypadKey,
  KeypadLayout,
} from "./types";

const ORDERED_DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

/**
 * Fisher–Yates. This is a shoulder-surfing deterrent (the finger path no longer
 * spells the PIN), not a cryptographic primitive — `Math.random` is the right
 * tool for it.
 */
function shuffled(source: string[]): string[] {
  const out = [...source];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface KeypadProps {
  /**
   * Wire the keypad to a `useNumericInput` controller and it handles digits,
   * backspace and clear for you. Individual callbacks below still win if given.
   */
  controller?: NumericInputController;
  onDigitPress?: (digit: string) => void;
  onBackspace?: () => void;
  onClear?: () => void;

  /** Bottom-left cell. Defaults to an empty spacer. */
  leftKey?: KeypadKey;
  /** Bottom-right cell. Defaults to backspace. */
  rightKey?: KeypadKey;
  /** Full manual control — overrides `leftKey` / `rightKey` and shuffling. */
  layout?: KeypadLayout;

  disabled?: boolean;
  appearance?: KeypadAppearance;
  /** Randomise digit positions (PIN entry). */
  shuffle?: boolean;
  /** Change this to re-shuffle — e.g. bump it after a failed attempt. */
  shuffleSeed?: string | number;
  haptics?: boolean;
  commitOn?: "press-in" | "press-out";
  backspaceBehavior?: KeypadBackspaceBehavior;
  colors?: KeypadColorOverrides;
  scheme?: "light" | "dark";
  metrics?: KeypadMetricsOptions;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * A numeric keypad that behaves identically on iOS and Android.
 *
 * It replaces the system keyboard entirely, which sidesteps the whole class of
 * Android problems that come from OEM keyboards: layouts without a comma or
 * minus key, IMEs that ignore `keyboardType`, autocorrect injecting characters,
 * and the keyboard resizing the screen mid-entry.
 */
export function Keypad({
  controller,
  onDigitPress,
  onBackspace,
  onClear,
  leftKey,
  rightKey,
  layout,
  disabled = false,
  appearance = "tiles",
  shuffle = false,
  shuffleSeed,
  haptics = true,
  commitOn = "press-in",
  backspaceBehavior = "repeat",
  colors: colorOverrides,
  scheme,
  metrics: metricsOptions,
  style,
  testID,
}: KeypadProps) {
  const palette = useKeypadColors(colorOverrides, scheme);
  const metrics = useKeypadMetrics(metricsOptions);
  const guard = useKeypadPressGuard();

  const handleDigit = (digit: string) => {
    if (haptics) keypadHaptic("key");
    if (onDigitPress) onDigitPress(digit);
    else controller?.push(digit);
  };

  const handleBackspace = () => {
    if (haptics) keypadHaptic("delete");
    if (onBackspace) onBackspace();
    else controller?.backspace();
  };

  const handleClear = () => {
    if (haptics) keypadHaptic("delete");
    if (onClear) onClear();
    else controller?.clear();
  };

  const digits = useMemo(
    () => (shuffle ? shuffled(ORDERED_DIGITS) : ORDERED_DIGITS),
    // Re-shuffling on every render would move keys under the user's finger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shuffle, shuffleSeed],
  );

  const resolvedLayout = useMemo<KeypadLayout>(() => {
    if (layout) return layout;
    const digitKey = (value: string): KeypadKey => ({ type: "digit", value });
    return [
      digits.slice(0, 3).map(digitKey),
      digits.slice(3, 6).map(digitKey),
      digits.slice(6, 9).map(digitKey),
      [
        leftKey ?? { type: "empty" },
        digitKey(digits[9]),
        rightKey ?? { type: "backspace" },
      ],
    ];
  }, [digits, layout, leftKey, rightKey]);

  const flat = appearance === "flat";
  const tileWidth = flat
    ? Math.min(metrics.keyWidth, metrics.keyHeight)
    : metrics.keyWidth;
  const tileRadius = flat ? tileWidth / 2 : metrics.radius;
  // A flat key has no visible tile at rest, so it rests on the surface colour.
  const restColor = flat ? palette.surface : palette.key;
  const pressedColor = palette.keyPressed;
  // Half the gutter on each side removes the dead zones between keys.
  const hitSlop = Math.floor(metrics.gap / 2);

  const backspaceHold: KeypadKeyHold =
    backspaceBehavior === "repeat"
      ? { kind: "repeat", onRepeat: handleBackspace }
      : backspaceBehavior === "clear"
        ? { kind: "once", delayMs: 480, onHold: handleClear }
        : null;

  return (
    <View
      testID={testID}
      style={[
        {
          width: metrics.width,
          alignSelf: "center",
          paddingHorizontal: metrics.paddingHorizontal,
          gap: metrics.gap,
        },
        style,
      ]}
    >
      {resolvedLayout.map((row, rowIndex) => (
        <View
          key={`row-${rowIndex}`}
          style={{
            flexDirection: "row",
            gap: metrics.gap,
            justifyContent: "space-between",
          }}
        >
          {row.map((cell, cellIndex) => {
            const slotKey = `${rowIndex}-${cellIndex}`;

            if (cell.type === "empty") {
              return (
                <View
                  key={slotKey}
                  style={{ width: metrics.keyWidth, height: metrics.keyHeight }}
                />
              );
            }

            const shared = {
              width: metrics.keyWidth,
              height: metrics.keyHeight,
              radius: tileRadius,
              pressedColor,
              guard,
              commitOn,
              hitSlop,
              style: flat
                ? { width: tileWidth, height: tileWidth, borderRadius: tileRadius }
                : undefined,
            };

            if (cell.type === "digit") {
              return (
                <KeypadKeyView
                  {...shared}
                  key={slotKey}
                  id={`digit-${cell.value}`}
                  testID={`keypad-key-${cell.value}`}
                  restColor={restColor}
                  disabled={disabled}
                  accessibilityLabel={cell.value}
                  onActivate={() => handleDigit(cell.value)}
                >
                  <RNText
                    allowFontScaling
                    maxFontSizeMultiplier={1.15}
                    style={{
                      color: palette.keyText,
                      fontSize: metrics.digitFontSize,
                      fontWeight: "600",
                      fontVariant: ["tabular-nums"],
                      includeFontPadding: false,
                      textAlignVertical: "center",
                    }}
                  >
                    {cell.value}
                  </RNText>
                </KeypadKeyView>
              );
            }

            if (cell.type === "backspace") {
              return (
                <KeypadKeyView
                  {...shared}
                  key={slotKey}
                  id="backspace"
                  testID="keypad-key-backspace"
                  restColor={restColor}
                  disabled={disabled}
                  accessibilityLabel={
                    backspaceBehavior === "clear"
                      ? "Delete digit. Hold to clear."
                      : "Delete digit"
                  }
                  onActivate={handleBackspace}
                  hold={backspaceHold}
                >
                  <Ionicons
                    name="backspace-outline"
                    size={metrics.iconSize}
                    color={palette.keyMuted}
                  />
                </KeypadKeyView>
              );
            }

            return (
              <KeypadKeyView
                {...shared}
                key={slotKey}
                id={`action-${cell.id}`}
                testID={`keypad-key-${cell.id}`}
                restColor={cell.ghost ? palette.surface : restColor}
                disabled={disabled || cell.disabled}
                accessibilityLabel={
                  cell.accessibilityLabel ?? cell.label ?? cell.id
                }
                onActivate={() => {
                  if (haptics) keypadHaptic("key");
                  cell.onPress();
                }}
              >
                {cell.icon ?? (
                  <RNText
                    allowFontScaling
                    maxFontSizeMultiplier={1.15}
                    numberOfLines={1}
                    style={{
                      color: cell.tint ?? palette.keyMuted,
                      fontSize: metrics.labelFontSize,
                      fontWeight: "600",
                      includeFontPadding: false,
                    }}
                  >
                    {cell.label ?? ""}
                  </RNText>
                )}
              </KeypadKeyView>
            );
          })}
        </View>
      ))}
    </View>
  );
}
