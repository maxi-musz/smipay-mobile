import { useEffect } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { colors } from "@/constants/colors";
import { getAppVersionLabel } from "@/lib/app-version";

const DISPLAY_DURATION = 2200;
const FADE_DURATION = 400;
const APP_VERSION_LABEL = getAppVersionLabel();

interface SplashOverlayProps {
  onFinish: () => void;
}

/**
 * Branded launch screen — one centered wordmark graphic, no icon tile or shadow.
 * Native splash (app.json) uses the same asset so the handoff is seamless.
 */
export function SplashOverlay({ onFinish }: SplashOverlayProps) {
  const opacity = useSharedValue(1);
  const logoScale = useSharedValue(0.94);
  const logoOpacity = useSharedValue(0);
  const footerOpacity = useSharedValue(0);

  useEffect(() => {
    logoOpacity.value = withTiming(1, {
      duration: 450,
      easing: Easing.out(Easing.ease),
    });

    logoScale.value = withTiming(1, {
      duration: 550,
      easing: Easing.out(Easing.cubic),
    });

    footerOpacity.value = withDelay(
      420,
      withTiming(1, { duration: 350, easing: Easing.out(Easing.ease) }),
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

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const footerStyle = useAnimatedStyle(() => ({
    opacity: footerOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <LinearGradient
        colors={["#FFFFFF", colors.orange[50], "#FFFFFF"]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        <Animated.View style={[styles.logoWrap, logoStyle]}>
          <Image
            source={require("@/assets/images/smipay-logo.png")}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="SmiPay — Pay with a smile"
          />
        </Animated.View>
      </View>

      <Animated.View style={[styles.footer, footerStyle]}>
        <Text style={styles.footerText}>SmiPay Technologies Ltd</Text>
        {APP_VERSION_LABEL ? (
          <Text style={styles.versionText}>{APP_VERSION_LABEL}</Text>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  logoWrap: {
    width: "100%",
    maxWidth: 300,
    alignItems: "center",
  },
  logo: {
    width: "100%",
    height: 110,
  },
  footer: {
    paddingBottom: 48,
    alignItems: "center",
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: colors.gray[400],
    fontWeight: "400",
  },
  versionText: {
    fontSize: 11,
    color: colors.gray[400],
    fontWeight: "400",
  },
});
