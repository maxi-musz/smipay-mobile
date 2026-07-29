import type { ReactNode } from "react";
import { Image, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import { KeyboardAwareScrollView } from "@/components/ui/keyboard-aware-scroll-view";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import { getAppVersionLabel } from "@/lib/app-version";

export interface AuthShellProps {
  title: string;
  subtitle?: ReactNode;
  /** Scrollable body. */
  children: ReactNode;
  /** Pinned between the body and `bottom` — e.g. a proceed button. */
  footer?: ReactNode;
  /** Docked bottom area, usually a `<KeypadDock />`. Owns the bottom inset. */
  bottom?: ReactNode;
  onBack?: () => void;
  backDisabled?: boolean;
  /** Trailing control in the top bar (theme toggle, help, …). */
  headerRight?: ReactNode;
  /** Brand lockup above the title. */
  showBrand?: boolean;
  /** App version, rendered in-flow so it can't collide with a docked keypad. */
  showVersion?: boolean;
  testID?: string;
}

/**
 * Auth/lock screen scaffold.
 *
 * Content is top-anchored and left-aligned rather than centred in the viewport:
 * the eye lands on the heading first, the input sits in the upper-middle where
 * the thumb isn't covering it, and the bottom third stays free for the keypad.
 *
 * `bottom` is a flex sibling of the scroll area, never an overlay, so a docked
 * keypad can't cover the fields above it.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  bottom,
  onBack,
  backDisabled = false,
  headerRight,
  showBrand = true,
  showVersion = false,
  testID,
}: AuthShellProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();
  const version = getAppVersionLabel();

  return (
    <View testID={testID} className="flex-1 bg-background">
      <View
        className="flex-row items-center justify-between px-6"
        style={{ paddingTop: insets.top + 6, paddingBottom: 4, minHeight: 44 }}
      >
        {onBack ? (
          <Pressable
            onPress={onBack}
            disabled={backDisabled}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="h-10 w-10 items-center justify-center rounded-full active:opacity-70"
            style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "#F3F4F6",
              opacity: backDisabled ? 0.4 : 1,
            }}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={isDark ? "#E5E7EB" : "#111827"}
            />
          </Pressable>
        ) : (
          <View className="h-10" />
        )}

        {headerRight ?? null}
      </View>

      {/* Keyboard-aware so the fallback modes that *do* use the system keyboard
          (email sign-in, legacy alphanumeric password) still scroll clear of it. */}
      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
        keyboardDismissMode="on-drag"
        bottomOffset={28}
      >
        {showBrand ? (
          <Animated.View
            entering={FadeInDown.duration(220)}
            className="mt-2 flex-row items-center gap-2"
          >
            <Image
              source={require("@/assets/images/icon.png")}
              className="h-8 w-8 rounded-xl"
              resizeMode="contain"
            />
            <Text className="text-[17px] font-bold text-primary">SmiPay</Text>
          </Animated.View>
        ) : null}

        <Animated.View
          entering={FadeInDown.delay(40).duration(240)}
          className={showBrand ? "mt-7" : "mt-2"}
        >
          <Text
            className="text-[30px] font-bold leading-9 text-foreground"
            maxFontSizeMultiplier={1.25}
          >
            {title}
          </Text>
          {subtitle ? (
            <View className="mt-2">
              {typeof subtitle === "string" ? (
                <Text className="text-[15px] leading-6 text-muted-foreground">
                  {subtitle}
                </Text>
              ) : (
                subtitle
              )}
            </View>
          ) : null}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(240)}>
          {children}
        </Animated.View>
      </KeyboardAwareScrollView>

      {footer ? <View className="px-6 pb-2">{footer}</View> : null}

      {showVersion && version ? (
        <Text className="pb-2 text-center text-xs text-muted-foreground">
          {version}
        </Text>
      ) : null}

      {bottom ?? (
        <View style={{ height: Math.max(insets.bottom, 8) }} />
      )}
    </View>
  );
}
