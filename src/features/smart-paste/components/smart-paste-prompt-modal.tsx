import { useEffect } from "react";
import {
  Image,
  Modal,
  Pressable,
  View,
  type ImageSourcePropType,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";
import { getNetworkProviderLogo } from "@/lib/network-provider-logo";

import type { SmartPasteApi } from "../hooks/use-smart-paste";

const APP_ICON = require("@/assets/images/icon.png");

export interface SmartPastePromptModalProps {
  paste: SmartPasteApi;
  /** e.g. "Use this meter number?". */
  title?: string;
}

/** Shown only when the clipboard was read and classified. */
export function SmartPastePromptModal({
  paste,
  title,
}: SmartPastePromptModalProps) {
  const { suggestion } = paste;
  const visible = suggestion != null;

  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withTiming(1, {
        duration: 260,
        easing: Easing.out(Easing.back(1.4)),
      });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      scale.value = 0.85;
      opacity.value = 0;
    }
  }, [visible, scale, opacity]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!suggestion) return null;

  const logo = suggestion.network
    ? getNetworkProviderLogo(suggestion.network)
    : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={paste.close}
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        className="flex-1 items-center justify-center bg-black/50 px-8"
      >
        {/* Tapping outside closes without counting as a rejection. */}
        <Pressable
          className="absolute inset-0"
          onPress={paste.close}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />

        <Animated.View
          style={cardStyle}
          className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-lg"
        >
          <View className="items-center">
            <PromptIcon logo={logo} />
          </View>

          <Text className="mt-4 text-center text-base font-medium text-muted-foreground">
            {title ?? "Paste copied number?"}
          </Text>

          <Text
            className="mt-1.5 text-center text-[26px] font-bold text-foreground"
            style={{ letterSpacing: 0.5 }}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {suggestion.display}
          </Text>

          <Text className="mt-1 text-center text-[13px] text-muted-foreground">
            {suggestion.label} · from your clipboard
          </Text>

          <Pressable
            onPress={paste.accept}
            accessibilityRole="button"
            accessibilityLabel={`Paste ${suggestion.display}`}
            className="mt-6 h-12 items-center justify-center rounded-2xl active:opacity-85"
            style={{ backgroundColor: colors.orange[500] }}
          >
            <Text className="text-[15px] font-semibold text-white">Paste</Text>
          </Pressable>

          <Pressable
            onPress={paste.dismiss}
            accessibilityRole="button"
            accessibilityLabel="Not now"
            className="mt-2 h-11 items-center justify-center rounded-2xl active:bg-muted"
          >
            <Text className="text-[14px] font-medium text-muted-foreground">
              Not now
            </Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

/** The network's logo when known, otherwise the app mark on a tinted tile. */
function PromptIcon({ logo }: { logo: ImageSourcePropType | null }) {
  if (logo) {
    return (
      <Image
        source={logo}
        style={{ width: 60, height: 60, borderRadius: 15 }}
        resizeMode="contain"
      />
    );
  }

  return (
    <View className="h-[60px] w-[60px] items-center justify-center rounded-2xl bg-muted">
      <Image
        source={APP_ICON}
        style={{ width: 38, height: 38 }}
        resizeMode="contain"
      />
    </View>
  );
}
