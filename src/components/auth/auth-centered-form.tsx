import type { ReactNode } from "react";
import { View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  /** e.g. px-6 or px-8 for horizontal inset */
  className?: string;
};

/**
 * Vertically centers short auth/lock content in the safe viewport. When the keyboard opens,
 * the parent ScrollView can scroll because minHeight is at least one full screen of space.
 */
export function AuthCenteredForm({ children, className }: Props) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const minH = Math.max(0, height - insets.top - insets.bottom);

  return (
    <View className={cn("justify-center", className)} style={{ minHeight: minH }}>
      {children}
    </View>
  );
}
