import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import { cn } from "@/lib/utils";

/**
 * Shared 3×4 layout: 1–9, blank / 0 / backspace — common for OTP, PIN entry, amounts.
 */
const KEYPAD_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [null, "0", "back"],
] as const;

export type NumericKeypadProps = {
  /** Disables digit and backspace keys */
  disabled?: boolean;
  onDigitPress: (digit: string) => void;
  onBackspacePress: () => void;
  showBackspace?: boolean;
  /**
   * Key tile background; defaults follow light/dark theme (muted gray pads).
   */
  keyBackgroundColor?: string;
  /** Backspace icon color; defaults theme-aware gray */
  backspaceIconColor?: string;
  /** Extra classes on the keypad wrapper */
  className?: string;
  /** Key tile height in logical px */
  keyHeight?: number;
};

export function NumericKeypad({
  disabled = false,
  onDigitPress,
  onBackspacePress,
  showBackspace = true,
  keyBackgroundColor,
  backspaceIconColor,
  className,
  keyHeight = 56,
}: NumericKeypadProps) {
  const { isDark } = useAppTheme();
  const keyBg =
    keyBackgroundColor ?? (isDark ? "rgba(55,55,57,0.95)" : "#F3F4F6");
  const backspaceTint =
    backspaceIconColor ?? (isDark ? "#9CA3AF" : "#6B7280");

  return (
    <View className={cn("gap-2", className)}>
      {KEYPAD_ROWS.map((row, ri) => (
        <View key={String(ri)} className="flex-row gap-2">
          {row.map((cell, ci) => (
            <View key={String(ci)} className="flex-1">
              {cell === null ? (
                <View style={{ height: keyHeight }} />
              ) : cell === "back" ? (
                showBackspace ? (
                  <Pressable
                    disabled={disabled}
                    onPress={onBackspacePress}
                    className="flex-1 items-center justify-center rounded-xl active:opacity-80"
                    style={{ height: keyHeight, backgroundColor: keyBg }}
                    accessibilityRole="button"
                    accessibilityLabel="Delete digit"
                  >
                    <Ionicons name="backspace-outline" size={24} color={backspaceTint} />
                  </Pressable>
                ) : (
                  <View style={{ height: keyHeight }} />
                )
              ) : (
                <Pressable
                  disabled={disabled}
                  onPress={() => onDigitPress(cell)}
                  className="flex-1 items-center justify-center rounded-xl active:opacity-80"
                  style={{ height: keyHeight, backgroundColor: keyBg }}
                  accessibilityRole="keyboardkey"
                  accessibilityLabel={cell}
                >
                  <Text className="text-xl font-semibold tabular-nums text-foreground">
                    {cell}
                  </Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
