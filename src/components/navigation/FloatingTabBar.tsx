import { useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text as RNText,
  View,
} from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { colors } from "@/constants/colors";
import { useAppTheme } from "@/hooks/use-app-theme";

const CAPSULE_BORDER_RADIUS = 30;
const PILL_HEIGHT = 46;
const TAB_ROW_HEIGHT = 58;
const PILL_H_PADDING = 15;
const ICON_SIZE = 23;
const LABEL_GAP = 7;

const ANIM = { duration: 240, easing: Easing.out(Easing.cubic) } as const;

const TAB_ICONS: Record<
  string,
  { focused: keyof typeof Ionicons.glyphMap; default: keyof typeof Ionicons.glyphMap }
> = {
  index: { focused: "home", default: "home-outline" },
  "history/index": { focused: "receipt", default: "receipt-outline" },
  "profile/index": { focused: "menu", default: "menu-outline" },
};

const TAB_LABELS: Record<string, string> = {
  index: "Home",
  "history/index": "History",
  "profile/index": "Menu",
};

/** Single source of truth for which routes render in the floating bar. */
const VISIBLE_ROUTE_NAMES: ReadonlySet<string> = new Set(Object.keys(TAB_ICONS));

type ThemeColors = {
  capsuleBg: string;
  activePill: string;
  activeContent: string;
  inactiveIcon: string;
  shadow: string;
  border: string;
};

const THEME: { light: ThemeColors; dark: ThemeColors } = {
  light: {
    capsuleBg: "#FFFFFF",
    activePill: colors.orange[600],
    activeContent: "#FFFFFF",
    inactiveIcon: "#64748B",
    shadow: "rgba(15,23,42,0.14)",
    border: "rgba(15,23,42,0.05)",
  },
  dark: {
    // Lifted off the page background so the capsule reads in dark mode, where
    // drop shadows are nearly invisible.
    capsuleBg: "#1E293B",
    activePill: colors.orange[500],
    activeContent: "#FFFFFF",
    inactiveIcon: "#94A3B8",
    shadow: "rgba(0,0,0,0.5)",
    border: "rgba(255,255,255,0.08)",
  },
};

type TabItemProps = {
  label: string;
  iconFocused: keyof typeof Ionicons.glyphMap;
  iconDefault: keyof typeof Ionicons.glyphMap;
  isFocused: boolean;
  theme: ThemeColors;
  onPress: () => void;
  onLongPress: () => void;
  accessibilityLabel: string;
  testID?: string;
};

/**
 * One tab. Active state expands a brand pill that reveals the label beside the
 * icon; inactive tabs collapse to an icon only. Everything animates on the UI
 * thread: the pill background cross-fades, the two icon variants cross-fade,
 * and the label's width/opacity animate from a measured natural width.
 */
function TabItem({
  label,
  iconFocused,
  iconDefault,
  isFocused,
  theme,
  onPress,
  onLongPress,
  accessibilityLabel,
  testID,
}: TabItemProps) {
  const p = useSharedValue(isFocused ? 1 : 0);
  const [labelWidth, setLabelWidth] = useState(0);

  useEffect(() => {
    p.value = withTiming(isFocused ? 1 : 0, ANIM);
  }, [isFocused, p]);

  const pillStyle = useAnimatedStyle(
    () => ({
      backgroundColor: interpolateColor(
        p.value,
        [0, 1],
        ["rgba(0,0,0,0)", theme.activePill],
      ),
    }),
    [theme.activePill],
  );

  const labelStyle = useAnimatedStyle(
    () => ({
      width: p.value * labelWidth,
      opacity: p.value,
      marginLeft: p.value * LABEL_GAP,
    }),
    [labelWidth],
  );

  const activeIconStyle = useAnimatedStyle(() => ({ opacity: p.value }));
  const inactiveIconStyle = useAnimatedStyle(() => ({ opacity: 1 - p.value }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      hitSlop={6}
      style={{ paddingVertical: 5 }}
    >
      {/* Off-screen measurer: captures the label's natural width so the visible
          one can animate from 0 → that width without wrapping. */}
      <RNText
        pointerEvents="none"
        numberOfLines={1}
        style={{
          position: "absolute",
          opacity: 0,
          fontSize: 13,
          fontWeight: "700",
        }}
        onLayout={(e) => {
          const w = Math.ceil(e.nativeEvent.layout.width);
          if (w > 0 && w !== labelWidth) setLabelWidth(w);
        }}
      >
        {label}
      </RNText>

      <Animated.View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            height: PILL_HEIGHT,
            borderRadius: PILL_HEIGHT / 2,
            paddingHorizontal: PILL_H_PADDING,
          },
          pillStyle,
        ]}
      >
        <View
          style={{
            width: 26,
            height: 26,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Animated.View
            style={[styles.iconLayer, inactiveIconStyle]}
            pointerEvents="none"
          >
            <Ionicons name={iconDefault} size={ICON_SIZE} color={theme.inactiveIcon} />
          </Animated.View>
          <Animated.View
            style={[styles.iconLayer, activeIconStyle]}
            pointerEvents="none"
          >
            <Ionicons name={iconFocused} size={ICON_SIZE} color={theme.activeContent} />
          </Animated.View>
        </View>

        <Animated.View style={[{ overflow: "hidden" }, labelStyle]}>
          <RNText
            numberOfLines={1}
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: theme.activeContent,
            }}
          >
            {label}
          </RNText>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();
  const theme = isDark ? THEME.dark : THEME.light;

  // Filter against an explicit whitelist. expo-router's `href: null` field is
  // not surfaced on the descriptor's `options`, so route name is the only
  // reliable signal. Routes in `_layout.tsx` must also exist in TAB_ICONS.
  const visibleRoutes = useMemo(
    () => state.routes.filter((r) => VISIBLE_ROUTE_NAMES.has(r.name)),
    [state.routes],
  );

  const focusedKey = state.routes[state.index]?.key;

  // iOS: hug the home indicator (the 34pt safe-area is mostly hint). Android:
  // keep clear of hardware nav buttons that live inside insets.bottom.
  const bottomOffset =
    Platform.OS === "ios"
      ? Math.max(insets.bottom - 22, 8)
      : insets.bottom > 0
        ? insets.bottom + 2
        : 14;

  return (
    <View
      pointerEvents="box-none"
      style={{ position: "absolute", left: 16, right: 16, bottom: bottomOffset }}
    >
      <View
        style={{
          borderRadius: CAPSULE_BORDER_RADIUS,
          backgroundColor: theme.capsuleBg,
          borderWidth: 1,
          borderColor: theme.border,
          paddingHorizontal: 8,
          paddingVertical: 6,
          shadowColor: theme.shadow,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 1,
          shadowRadius: 26,
          elevation: 16,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-around",
            minHeight: TAB_ROW_HEIGHT,
          }}
        >
          {visibleRoutes.map((route) => {
            const { options } = descriptors[route.key];
            const isFocused = route.key === focusedKey;
            const icons = TAB_ICONS[route.name] ?? {
              focused: "ellipse",
              default: "ellipse-outline",
            };
            const label =
              TAB_LABELS[route.name] ??
              (options.title !== undefined ? String(options.title) : route.name);

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({ type: "tabLongPress", target: route.key });
            };

            return (
              <TabItem
                key={route.key}
                label={label}
                iconFocused={icons.focused}
                iconDefault={icons.default}
                isFocused={isFocused}
                theme={theme}
                onPress={onPress}
                onLongPress={onLongPress}
                accessibilityLabel={
                  typeof options.tabBarAccessibilityLabel === "string"
                    ? options.tabBarAccessibilityLabel
                    : label
                }
                testID={options.tabBarButtonTestID}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});
