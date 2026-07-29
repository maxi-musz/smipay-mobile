import { useEffect, useRef } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useKeypadColors, type KeypadColorOverrides } from "./keypad-theme";

export interface PinDotsProps {
  value: string;
  length: number;
  error?: boolean;
  shakeKey?: string | number;
  size?: number;
  gap?: number;
  colors?: KeypadColorOverrides;
  scheme?: "light" | "dark";
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Masked progress display for PIN entry — the lock-screen counterpart to `CodeSlots`. */
export function PinDots({
  value,
  length,
  error = false,
  shakeKey,
  size = 14,
  gap = 18,
  colors: colorOverrides,
  scheme,
  style,
  testID,
}: PinDotsProps) {
  const palette = useKeypadColors(colorOverrides, scheme);
  const shake = useSharedValue(0);
  const wasErrored = useRef(false);

  useEffect(() => {
    const shouldShake = error && (!wasErrored.current || shakeKey !== undefined);
    wasErrored.current = error;
    if (!shouldShake) return;

    cancelAnimation(shake);
    shake.value = withSequence(
      withTiming(-8, { duration: 45 }),
      withRepeat(withTiming(8, { duration: 80 }), 3, true),
      withTiming(0, { duration: 45 }),
    );
  }, [error, shake, shakeKey]);

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  return (
    <Animated.View
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={`${value.length} of ${length} digits entered`}
      style={[
        { flexDirection: "row", gap, justifyContent: "center" },
        rowStyle,
        style,
      ]}
    >
      {Array.from({ length }).map((_, index) => (
        <Dot
          key={index}
          filled={index < value.length}
          size={size}
          color={error ? palette.danger : palette.filled}
          idleColor={error ? palette.danger : palette.separator}
        />
      ))}
    </Animated.View>
  );
}

function Dot({
  filled,
  size,
  color,
  idleColor,
}: {
  filled: boolean;
  size: number;
  color: string;
  idleColor: string;
}) {
  const scale = useSharedValue(filled ? 1 : 0);

  useEffect(() => {
    scale.value = withTiming(filled ? 1 : 0, { duration: filled ? 140 : 100 });
  }, [filled, scale]);

  const fillStyle = useAnimatedStyle(() => ({
    opacity: scale.value,
    transform: [{ scale: 0.6 + scale.value * 0.4 }],
  }));

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: idleColor,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
          fillStyle,
        ]}
      />
    </View>
  );
}
