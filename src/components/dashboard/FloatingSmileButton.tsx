import { useEffect } from "react";
import { Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SMILEY_ASSISTANT_NAME } from "@/constants/smiley";
import { useCompactScreen } from "@/hooks/use-compact-screen";
import { useResponsiveScale } from "@/hooks/use-responsive-scale";

/**
 * Floating AI assistant entry point (Siri-style breathing orb).
 *
 * Renders absolutely positioned in the bottom-right of the home screen,
 * sitting above the tab bar. Two concentric rings ripple outward with an
 * offset to create a continuous "alive" feel; the inner gradient orb has a
 * subtle breathing scale so it never reads as static.
 *
 * Size scales with screen width (see `useResponsiveScale`) and shrinks further
 * on compact / budget phones so the pulse rings do not dominate small screens.
 *
 * Tapping opens the Smile landing (`/(app)/smileai`).
 */
const BASE_ORB_SIZE = 56;
const BASE_RING_MAX_SCALE = 1.7;
const COMPACT_RING_MAX_SCALE = 1.55;
const PULSE_DURATION_MS = 2400;

export function FloatingSmileButton() {
  const insets = useSafeAreaInsets();
  const compact = useCompactScreen();
  const { s } = useResponsiveScale();

  const orbSize = s(BASE_ORB_SIZE);
  const iconSize = s(24);
  const edgeInset = s(compact ? 14 : 18);
  const gapAboveTab = s(compact ? 12 : 18);
  const ringMaxScale = compact ? COMPACT_RING_MAX_SCALE : BASE_RING_MAX_SCALE;

  // Mirror the tab bar height calculation in (tabs)/_layout.tsx so the orb
  // floats just above the bar with a consistent gap.
  const tabBarHeight = 64 + Math.max(insets.bottom, 12);

  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);
  const breathe = useSharedValue(0);
  const press = useSharedValue(0);

  useEffect(() => {
    ring1.value = withRepeat(
      withTiming(1, {
        duration: PULSE_DURATION_MS,
        easing: Easing.out(Easing.quad),
      }),
      -1,
      false,
    );
    ring2.value = withDelay(
      PULSE_DURATION_MS / 2,
      withRepeat(
        withTiming(1, {
          duration: PULSE_DURATION_MS,
          easing: Easing.out(Easing.quad),
        }),
        -1,
        false,
      ),
    );
    breathe.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [breathe, ring1, ring2]);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + ring1.value * (ringMaxScale - 1) }],
    opacity: 0.45 * (1 - ring1.value),
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + ring2.value * (ringMaxScale - 1) }],
    opacity: 0.35 * (1 - ring2.value),
  }));

  const orbStyle = useAnimatedStyle(() => {
    const scale = (1 + breathe.value * 0.06) * (1 - press.value * 0.08);
    return { transform: [{ scale }] };
  });

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        right: edgeInset,
        bottom: tabBarHeight + gapAboveTab,
        zIndex: 50,
      }}
    >
      <View
        style={{
          width: orbSize,
          height: orbSize,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              width: orbSize,
              height: orbSize,
              borderRadius: orbSize / 2,
              backgroundColor: "#F58220",
            },
            ring1Style,
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              width: orbSize,
              height: orbSize,
              borderRadius: orbSize / 2,
              backgroundColor: "#D946EF",
            },
            ring2Style,
          ]}
        />

        <Pressable
          onPress={() => router.push("/(app)/smileai")}
          onPressIn={() => {
            press.value = withTiming(1, { duration: 100 });
          }}
          onPressOut={() => {
            press.value = withTiming(0, { duration: 160 });
          }}
          hitSlop={compact ? 8 : 10}
          accessibilityRole="button"
          accessibilityLabel={`Open ${SMILEY_ASSISTANT_NAME}`}
        >
          <Animated.View
            style={[
              {
                width: orbSize,
                height: orbSize,
                borderRadius: orbSize / 2,
                overflow: "hidden",
                shadowColor: "#F58220",
                shadowOpacity: 0.45,
                shadowRadius: s(14),
                shadowOffset: { width: 0, height: s(6) },
                elevation: compact ? 8 : 12,
              },
              orbStyle,
            ]}
          >
            <LinearGradient
              colors={["#FBBF24", "#F58220", "#D946EF", "#6366F1"]}
              start={{ x: 0.1, y: 0.1 }}
              end={{ x: 0.9, y: 0.9 }}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Inner highlight, gives the orb a glassy depth */}
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  top: orbSize * 0.11,
                  left: orbSize * 0.14,
                  width: orbSize * 0.45,
                  height: orbSize * 0.3,
                  borderRadius: orbSize * 0.45,
                  backgroundColor: "rgba(255,255,255,0.35)",
                  transform: [{ rotate: "-25deg" }],
                }}
              />
              <Ionicons name="sparkles" size={iconSize} color="#FFFFFF" />
            </LinearGradient>
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}
