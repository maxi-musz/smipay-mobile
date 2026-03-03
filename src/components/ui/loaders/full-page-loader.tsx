import { useEffect } from "react";
import { Image, View } from "react-native";
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
const DURATION = 900;

export function FullPageLoader({ message }: FullPageLoaderProps) {
  const scale = useSharedValue(BREATHE_IN);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(BREATHE_OUT, { duration: DURATION, easing: Easing.inOut(Easing.ease) }),
        withTiming(BREATHE_IN, { duration: DURATION, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );

    opacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: DURATION, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: DURATION, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
  }, [scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View className="absolute inset-0 z-50 items-center justify-center bg-black/50">
      <Animated.View style={animatedStyle}>
        <Image
          source={require("@/assets/images/icon.png")}
          className="h-24 w-24 rounded-2xl"
          resizeMode="contain"
        />
      </Animated.View>

      {message && (
        <Text className="mt-6 text-sm text-white">{message}</Text>
      )}
    </View>
  );
}
