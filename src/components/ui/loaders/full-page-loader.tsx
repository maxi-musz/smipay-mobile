import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { Text } from "@/components/ui/text";

interface FullPageLoaderProps {
  message?: string;
}

const BREATHE_IN = 1;
const BREATHE_OUT = 0.6;
const BREATHE_DURATION = 900;
const ROTATION_DURATION = 1600;
const FACE_SIZE = 96;

export function FullPageLoader({ message }: FullPageLoaderProps) {
  const scale = useSharedValue(BREATHE_IN);
  const opacity = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(BREATHE_OUT, {
          duration: BREATHE_DURATION,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(BREATHE_IN, {
          duration: BREATHE_DURATION,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
    );

    opacity.value = withRepeat(
      withSequence(
        withTiming(0.5, {
          duration: BREATHE_DURATION,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(1, {
          duration: BREATHE_DURATION,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
    );

    rotation.value = withRepeat(
      withTiming(360, {
        duration: ROTATION_DURATION,
        easing: Easing.linear,
      }),
      -1,
    );
  }, [scale, opacity, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <View className="absolute inset-0 z-50 items-center justify-center bg-black/50">
      <Animated.View style={[styles.face, animatedStyle]}>
        <View style={styles.smile} />

        <View style={styles.eyesRow}>
          <View style={styles.eye} />
          <View style={styles.eye} />
        </View>
      </Animated.View>

      {message && (
        <Text className="mt-6 text-sm text-white">{message}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  face: {
    width: FACE_SIZE,
    height: FACE_SIZE,
    borderRadius: FACE_SIZE / 2,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  smile: {
    width: FACE_SIZE * 0.52,
    height: FACE_SIZE * 0.52,
    borderRadius: (FACE_SIZE * 0.52) / 2,
    borderBottomWidth: 3,
    borderBottomColor: "#ff7a00",
    borderLeftWidth: 3,
    borderLeftColor: "transparent",
    borderRightWidth: 3,
    borderRightColor: "transparent",
    borderTopWidth: 3,
    borderTopColor: "transparent",
    transform: [{ translateY: FACE_SIZE * 0.12 }],
  },
  eyesRow: {
    position: "absolute",
    top: FACE_SIZE * 0.3,
    flexDirection: "row",
    gap: FACE_SIZE * 0.18,
  },
  eye: {
    width: 8,
    height: 12,
    borderRadius: 8,
    backgroundColor: "#ff7a00",
  },
});
