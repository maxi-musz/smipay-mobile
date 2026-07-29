import { useEffect, useRef } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";
import { useAppTheme } from "@/hooks/use-app-theme";

/** Nigerian local format: `0801 234 5678`. */
export function formatNigerianPhone(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 11);
  const parts = [d.slice(0, 4), d.slice(4, 7), d.slice(7, 11)].filter(Boolean);
  return parts.join(" ");
}

export interface PhoneNumberDisplayProps {
  value: string;
  label?: string;
  placeholder?: string;
  error?: string | null;
  /** Blinking caret + accent underline. */
  focused?: boolean;
  shakeKey?: string | number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Large, keypad-driven phone number field.
 *
 * Deliberately not a bordered `TextInput`: with an in-app keypad there is no
 * text cursor to host, so the value is rendered as display type with its own
 * caret. That reads as a modern entry field rather than a 2013 form box.
 */
export function PhoneNumberDisplay({
  value,
  label = "Phone number",
  placeholder = "0801 234 5678",
  error,
  focused = true,
  shakeKey,
  onPress,
  style,
  testID,
}: PhoneNumberDisplayProps) {
  const { isDark } = useAppTheme();

  const shake = useSharedValue(0);
  const caret = useSharedValue(1);
  const wasErrored = useRef(false);

  useEffect(() => {
    const shouldShake =
      Boolean(error) && (!wasErrored.current || shakeKey !== undefined);
    wasErrored.current = Boolean(error);
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

  const idleBorder = isDark ? "#334155" : "#E5E7EB";
  const borderColor = error
    ? colors.error
    : value.length > 0 || focused
      ? colors.orange[500]
      : idleBorder;

  const body = (
    <Animated.View style={[style, rowStyle]} testID={testID}>
      <Text className="text-[13px] font-medium text-muted-foreground">
        {label}
      </Text>

      <View
        className="mt-2 flex-row items-center pb-2.5"
        style={{ borderBottomWidth: 2, borderBottomColor: borderColor }}
      >
        {focused && !value ? (
          <Animated.View
            style={[
              {
                width: 2,
                height: 28,
                marginRight: 4,
                borderRadius: 1,
                backgroundColor: colors.orange[500],
              },
              caretStyle,
            ]}
          />
        ) : null}

        <Text
          className="text-[27px] font-semibold"
          maxFontSizeMultiplier={1.15}
          numberOfLines={1}
          style={{
            color: value
              ? isDark
                ? "#F8FAFC"
                : "#0F172A"
              : isDark
                ? "#475569"
                : "#B6BCC6",
            letterSpacing: 1.5,
            fontVariant: ["tabular-nums"],
          }}
        >
          {value ? formatNigerianPhone(value) : placeholder}
        </Text>

        {focused && value ? (
          <Animated.View
            style={[
              {
                width: 2,
                height: 28,
                marginLeft: 4,
                borderRadius: 1,
                backgroundColor: colors.orange[500],
              },
              caretStyle,
            ]}
          />
        ) : null}
      </View>

      {error ? (
        <Text className="mt-2 text-sm font-medium text-destructive">{error}</Text>
      ) : null}
    </Animated.View>
  );

  if (!onPress) return body;

  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {body}
    </Pressable>
  );
}
