import { Pressable, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";

import type { SmartPasteApi } from "../hooks/use-smart-paste";
import { PasteAffordance } from "./paste-affordance";

export interface SmartPasteInlineProps {
  paste: SmartPasteApi;
  manualPrompt?: string;
  className?: string;
}

/**
 * Strip under the input, for the two states that shouldn't interrupt: the
 * offer (clipboard has text we're not allowed to read yet) and the message
 * after a paste that found nothing. Renders nothing otherwise.
 */
export function SmartPasteInline({
  paste,
  manualPrompt = "Paste a number you copied",
  className,
}: SmartPasteInlineProps) {
  const { needsUserTap, hint } = paste;

  if (hint) {
    return (
      <Animated.View
        entering={FadeIn.duration(160)}
        exiting={FadeOut.duration(120)}
        className={className}
      >
        <View className="mt-2 flex-row items-center gap-2">
          <Ionicons
            name="information-circle-outline"
            size={15}
            color={colors.gray[500]}
          />
          <Text className="flex-1 text-[13px] text-muted-foreground">
            {hint}
          </Text>
        </View>
      </Animated.View>
    );
  }

  if (!needsUserTap) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(140)}
      className={className}
    >
      <View
        className="mt-3 flex-row items-center gap-3 rounded-2xl bg-muted/60 px-3 py-2.5"
        style={{ borderLeftWidth: 3, borderLeftColor: colors.orange[500] }}
      >
        <Ionicons
          name="clipboard-outline"
          size={20}
          color={colors.orange[500]}
        />

        <Text
          className="min-w-0 flex-1 text-[13.5px] text-foreground"
          numberOfLines={2}
        >
          {manualPrompt}
        </Text>

        <PasteAffordance
          busy={paste.pasting}
          onManualPaste={() => void paste.pasteFromClipboard()}
        />

        <Pressable
          onPress={paste.dismiss}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Dismiss clipboard suggestion"
          className="p-0.5"
        >
          <Ionicons name="close" size={17} color={colors.gray[400]} />
        </Pressable>
      </View>
    </Animated.View>
  );
}
