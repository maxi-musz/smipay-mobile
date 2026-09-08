import type { ReactNode } from "react";
import { Image, Platform, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import { KeyboardAwareScrollView } from "@/components/ui/keyboard-aware-scroll-view";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useCompactScreen } from "@/hooks/use-compact-screen";
import { getAppVersionLabel } from "@/lib/app-version";

/** Keeps the focused field above a pinned footer + the system keyboard. */
const FOOTER_INPUT_CLEARANCE = 96;

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
  const compact = useCompactScreen();
  // On short screens the brand lockup is the cheapest thing to drop — it frees
  // ~50 dp so the field + primary button clear the keypad without scrolling.
  const brand = showBrand && !compact;
  const liftFooterForKeyboard = Boolean(footer) && !bottom;

  return (
    <View testID={testID} className="flex-1 bg-background">
      <View
        className="flex-row items-center justify-between px-6"
        style={{
          paddingTop: insets.top + (compact ? 2 : 6),
          paddingBottom: compact ? 2 : 4,
          minHeight: compact ? 40 : 44,
        }}
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
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: compact ? 12 : 24,
        }}
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        automaticallyAdjustKeyboardInsets={false}
        bottomOffset={footer ? FOOTER_INPUT_CLEARANCE : 28}
        extraKeyboardSpace={Platform.OS === "android" ? 20 : 0}
      >
        {brand ? (
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
          className={brand ? "mt-7" : compact ? "mt-3" : "mt-2"}
        >
          <Text
            className={
              compact
                ? "text-[23px] font-bold leading-7 text-foreground"
                : "text-[30px] font-bold leading-9 text-foreground"
            }
            maxFontSizeMultiplier={1.25}
          >
            {title}
          </Text>
          {subtitle ? (
            <View className={compact ? "mt-1" : "mt-2"}>
              {typeof subtitle === "string" ? (
                <Text
                  className={
                    compact
                      ? "text-[13px] leading-5 text-muted-foreground"
                      : "text-[15px] leading-6 text-muted-foreground"
                  }
                >
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

      {footer ? (
        liftFooterForKeyboard ? (
          <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
            <View
              className="border-t border-border bg-background px-6 pt-3"
              style={{ paddingBottom: Math.max(insets.bottom, 10) }}
            >
              {footer}
            </View>
          </KeyboardStickyView>
        ) : (
          <View className="border-t border-border bg-background px-6 pt-3 pb-2">
            {footer}
          </View>
        )
      ) : null}

      {showVersion && version ? (
        <Text className="pb-2 text-center text-xs text-muted-foreground">
          {version}
        </Text>
      ) : null}

      {bottom ??
        (footer ? null : (
          <View style={{ height: Math.max(insets.bottom, 8) }} />
        ))}
    </View>
  );
}
