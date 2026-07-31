import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text as RNText,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { SlideInDown, SlideOutDown } from "react-native-reanimated";

import { useCompactScreen } from "@/hooks/use-compact-screen";
import { useKeypadColors, type KeypadColorOverrides } from "./keypad-theme";

export interface KeypadDockProps {
  children: ReactNode;
  /** Header caption, e.g. "SmiPay Secure Keypad". Omit to hide the header. */
  title?: string;
  /** Shows a shield glyph next to the title. */
  secure?: boolean;
  /** Renders a trailing text button in the header. */
  onDone?: () => void;
  doneLabel?: string;
  doneDisabled?: boolean;
  colors?: KeypadColorOverrides;
  scheme?: "light" | "dark";
  /** Slide the dock in and out on mount/unmount. */
  animated?: boolean;
  /** Extra breathing room under the last key row, above the safe-area inset. */
  bottomPadding?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Bottom container for a `<Keypad />`.
 *
 * Place it as the last child of a flex column (sibling of your scroll view)
 * rather than absolutely positioning it — the keypad then reserves its own
 * space and content above can never end up hidden behind it.
 *
 * The bottom padding follows the safe-area inset, which covers the iPhone home
 * indicator and Android gesture-navigation pill without device-specific hacks.
 */
export function KeypadDock({
  children,
  title,
  secure = false,
  onDone,
  doneLabel = "Done",
  doneDisabled = false,
  colors: colorOverrides,
  scheme,
  animated = true,
  bottomPadding = 8,
  style,
  testID,
}: KeypadDockProps) {
  const palette = useKeypadColors(colorOverrides, scheme);
  const insets = useSafeAreaInsets();
  const compact = useCompactScreen();

  const showHeader = Boolean(title) || Boolean(onDone);
  const headerPadV = compact ? 6 : 10;
  const effBottomPad = compact ? Math.min(bottomPadding, 4) : bottomPadding;

  return (
    <Animated.View
      testID={testID}
      entering={animated ? SlideInDown.duration(240) : undefined}
      exiting={animated ? SlideOutDown.duration(180) : undefined}
      style={[
        {
          backgroundColor: palette.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: palette.separator,
          paddingTop: showHeader ? 0 : compact ? 6 : 10,
          paddingBottom: Math.max(insets.bottom, compact ? 6 : 10) + effBottomPad,
        },
        style,
      ]}
    >
      {showHeader ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: headerPadV,
          }}
        >
          <View
            style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}
          >
            {secure ? (
              <Ionicons
                name="shield-checkmark"
                size={14}
                color={palette.accent}
              />
            ) : null}
            <RNText
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
              style={{
                color: palette.keyMuted,
                fontSize: 12.5,
                fontWeight: "600",
              }}
            >
              {title}
            </RNText>
          </View>

          {onDone ? (
            <Pressable
              onPress={onDone}
              disabled={doneDisabled}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={doneLabel}
              style={({ pressed }) => ({ opacity: doneDisabled ? 0.4 : pressed ? 0.6 : 1 })}
            >
              <RNText
                maxFontSizeMultiplier={1.2}
                style={{
                  color: palette.accent,
                  fontSize: 14,
                  fontWeight: "700",
                }}
              >
                {doneLabel}
              </RNText>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {children}
    </Animated.View>
  );
}
