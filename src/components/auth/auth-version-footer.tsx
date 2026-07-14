import { View } from "react-native";

import { Text } from "@/components/ui/text";
import { useKeyboardVisible } from "@/hooks/use-keyboard-visible";
import { getAppVersionLabel } from "@/lib/app-version";

type Props = {
  /**
   * Hide while the keyboard is open (login / forms). Defaults to true so the
   * version never sits under the keyboard on auth screens.
   */
  hideWhenKeyboard?: boolean;
};

/**
 * Bottom-centered app version label used on auth screens (and lock screen).
 * Non-interactive — stays above the home indicator, muted typography.
 */
export function AuthVersionFooter({ hideWhenKeyboard = true }: Props) {
  const keyboardVisible = useKeyboardVisible();
  const label = getAppVersionLabel();

  if (!label) return null;
  if (hideWhenKeyboard && keyboardVisible) return null;

  return (
    <View
      pointerEvents="none"
      className="absolute bottom-6 left-0 right-0 items-center"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text className="text-xs text-muted-foreground">{label}</Text>
    </View>
  );
}
