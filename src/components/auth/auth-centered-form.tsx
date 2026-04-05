import type { ReactNode } from "react";
import { View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  /** e.g. px-6 or px-8 for horizontal inset */
  className?: string;
  /**
   * `center` — full-viewport min-height + vertical center (lock screen, sign-in).
   * `top` — align to top with light padding; use while the keyboard is open so short forms
   * sit near the keyboard (pair with `useKeyboardVisible` and `flex-grow` off on ScrollView).
   */
  layout?: "center" | "top";
};

/**
 * Layout wrapper for auth flows. For register / forgot-password, prefer
 * `layout={keyboardVisible ? "top" : "center"}` with `useKeyboardVisible()` so the screen
 * stays vertically centered when the keyboard is hidden and avoids a large gap when typing.
 */
export function AuthCenteredForm({
  children,
  className,
  layout = "center",
}: Props) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  if (layout === "top") {
    // Parent `SafeAreaView` already applies top inset — only add light spacing so we do not
    // double-count safe area (which would push content too far down).
    return (
      <View className={cn("pt-2 pb-8", className)}>
        {children}
      </View>
    );
  }

  const minH = Math.max(0, height - insets.top - insets.bottom);

  return (
    <View className={cn("justify-center", className)} style={{ minHeight: minH }}>
      {children}
    </View>
  );
}
