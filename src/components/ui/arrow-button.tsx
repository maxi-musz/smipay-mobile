import { useEffect } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { Spinner } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";
import { useAppTheme } from "@/hooks/use-app-theme";
import { cn } from "@/lib/utils";

export interface ArrowButtonProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Diameter of the circle, in dp. */
  size?: number;
  /** Optional leading text — renders a pill instead of a bare circle. */
  label?: string;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Compact circular "proceed" control — the modern replacement for a
 * full-bleed submit button.
 *
 * The chevron nudges continuously while the action is available, which reads as
 * "you can go now" without spending a full row of screen height on a label.
 */
export function ArrowButton({
  onPress,
  disabled = false,
  loading = false,
  size = 58,
  label,
  accessibilityLabel,
  style,
  testID,
}: ArrowButtonProps) {
  const { isDark } = useAppTheme();
  const enabled = !disabled && !loading;

  const nudge = useSharedValue(0);
  const press = useSharedValue(0);

  useEffect(() => {
    if (enabled) {
      nudge.value = withRepeat(
        withSequence(
          withTiming(4, { duration: 650 }),
          withTiming(0, { duration: 650 }),
        ),
        -1,
        true,
      );
    } else {
      nudge.value = withTiming(0, { duration: 120 });
    }
  }, [enabled, nudge]);

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: nudge.value }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.06 }],
  }));

  const disabledBg = isDark ? "#334155" : "#E5E7EB";
  const disabledTint = isDark ? "#94A3B8" : "#9CA3AF";
  const background = enabled ? colors.orange[500] : disabledBg;
  const tint = enabled ? "#FFFFFF" : disabledTint;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={!enabled}
      onPressIn={() => {
        press.value = withTiming(1, { duration: 70 });
      }}
      onPressOut={() => {
        press.value = withTiming(0, { duration: 140 });
      }}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !enabled }}
      style={style}
    >
      <Animated.View
        style={[
          {
            height: size,
            borderRadius: size / 2,
            backgroundColor: background,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: label ? 22 : 0,
            width: label ? undefined : size,
            gap: label ? 10 : 0,
            // Lifts the control off the page without a heavy card shadow.
            shadowColor: colors.orange[600],
            shadowOpacity: enabled ? 0.28 : 0,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: enabled ? 4 : 0,
          },
          containerStyle,
        ]}
      >
        {label ? (
          <Text
            className="text-base font-semibold"
            style={{ color: tint }}
            maxFontSizeMultiplier={1.2}
          >
            {label}
          </Text>
        ) : null}

        {loading ? (
          <Spinner size="small" color={tint} />
        ) : (
          <Animated.View style={arrowStyle}>
            <Ionicons name="arrow-forward" size={Math.round(size * 0.4)} color={tint} />
          </Animated.View>
        )}
      </Animated.View>
    </Pressable>
  );
}

/** Right-aligned row wrapper — the usual placement for `ArrowButton`. */
export function ArrowButtonRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={cn("mt-8 flex-row justify-end", className)}>{children}</View>
  );
}
