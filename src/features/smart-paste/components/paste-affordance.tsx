import { Pressable, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { Spinner } from "@/components/ui/loaders";
import { colors } from "@/constants/colors";

export interface PasteAffordanceProps {
  onManualPaste: () => void;
  label?: string;
  /** `chip` sits beside a field; `block` is a full-width button. */
  size?: "chip" | "block";
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const BLOCK_HEIGHT = 48;

/**
 * Deliberately not `expo-clipboard`'s `ClipboardPasteButton` (iOS
 * `UIPasteControl`). That view renders nothing when its native component isn't
 * registered — Expo Go being one such client — and since Apple requires an
 * explicit frame on it, the space is still reserved, so the failure looks like
 * an invisible button. `isPasteButtonAvailable` reports the module, not
 * whether anything drew, so there's no way to detect it from JS.
 */
export function PasteAffordance({
  onManualPaste,
  label = "Paste",
  size = "chip",
  busy = false,
  style,
  testID,
}: PasteAffordanceProps) {
  const block = size === "block";

  if (busy) {
    return (
      <Pressable
        testID={testID}
        disabled
        accessibilityRole="button"
        accessibilityLabel="Pasting"
        accessibilityState={{ busy: true, disabled: true }}
        className={
          block
            ? "items-center justify-center self-stretch rounded-2xl"
            : "items-center justify-center rounded-full px-5 py-2"
        }
        style={[
          { backgroundColor: colors.orange[500], opacity: 0.75 },
          block ? { height: BLOCK_HEIGHT } : null,
          style,
        ]}
      >
        <Spinner color={colors.white} size="small" />
      </Pressable>
    );
  }

  return (
    <Pressable
      testID={testID}
      onPress={onManualPaste}
      accessibilityRole="button"
      accessibilityLabel="Paste from clipboard"
      hitSlop={8}
      className={
        block
          ? "flex-row items-center justify-center gap-2 self-stretch rounded-2xl active:opacity-85"
          : "flex-row items-center gap-1.5 rounded-full px-3.5 py-2 active:opacity-80"
      }
      style={[
        { backgroundColor: colors.orange[500] },
        block ? { height: BLOCK_HEIGHT } : null,
        style,
      ]}
    >
      <Ionicons
        name="clipboard-outline"
        size={block ? 17 : 14}
        color={colors.white}
      />
      <Text
        className={
          block
            ? "text-[15px] font-semibold text-white"
            : "text-[13px] font-semibold text-white"
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}
