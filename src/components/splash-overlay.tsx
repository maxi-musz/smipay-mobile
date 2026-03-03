import { useEffect } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { colors } from "@/constants/colors";

const DISPLAY_DURATION = 2200;
const FADE_DURATION = 400;

interface SplashOverlayProps {
  onFinish: () => void;
}

export function SplashOverlay({ onFinish }: SplashOverlayProps) {
  const opacity = useSharedValue(1);
  const iconScale = useSharedValue(0.85);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    iconScale.value = withTiming(1, {
      duration: 500,
      easing: Easing.out(Easing.back(1.5)),
    });

    textOpacity.value = withDelay(
      300,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }),
    );

    opacity.value = withDelay(
      DISPLAY_DURATION,
      withTiming(0, { duration: FADE_DURATION, easing: Easing.in(Easing.ease) }, (finished) => {
        if (finished) {
          runOnJS(onFinish)();
        }
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run-once mount animation
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <View style={styles.content}>
        <Animated.View style={[styles.iconWrapper, iconStyle]}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.icon}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View style={textStyle}>
          <Text style={styles.brandName}>
            <Text style={styles.brandSmi}>Smi</Text>
            <Text style={styles.brandPay}>Pay</Text>
          </Text>
          <Text style={styles.tagline}>...Pay with a smile</Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.footer, textStyle]}>
        <Text style={styles.footerText}>SmiPay Technologies Ltd</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.white,
    zIndex: 999,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  iconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  icon: {
    width: 100,
    height: 100,
  },
  brandName: {
    textAlign: "center",
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  brandSmi: {
    color: colors.orange[500],
  },
  brandPay: {
    color: colors.green[500],
  },
  tagline: {
    textAlign: "center",
    marginTop: 4,
    fontSize: 14,
    color: colors.gray[400],
    fontWeight: "500",
    fontStyle: "italic",
  },
  footer: {
    paddingBottom: 48,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: colors.gray[400],
    fontWeight: "400",
  },
});
