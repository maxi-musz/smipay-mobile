import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, Text as RNText, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { colors } from "@/constants/colors";
import { useAppTheme } from "@/hooks/use-app-theme";

const CAPSULE_BORDER_RADIUS = 32;
const PILL_HEIGHT = 44;
const CAPSULE_H_PADDING = 8;
const PILL_INSET_PER_CELL = 6;
const TAB_ROW_HEIGHT = 56;

const TAB_ICONS: Record<
  string,
  { focused: keyof typeof Ionicons.glyphMap; default: keyof typeof Ionicons.glyphMap }
> = {
  index: { focused: "home", default: "home-outline" },
  "history/index": { focused: "receipt", default: "receipt-outline" },
  "profile/index": { focused: "person", default: "person-outline" },
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
  activeIcon: string;
  activeText: string;
  inactiveIcon: string;
  inactiveText: string;
  pillBg: string;
  shadow: string;
  border: string;
};

const THEME: { light: ThemeColors; dark: ThemeColors } = {
  light: {
    capsuleBg: "#FFFFFF",
    activeIcon: colors.orange[600],
    activeText: colors.orange[600],
    inactiveIcon: colors.gray[400],
    inactiveText: colors.gray[500],
    pillBg: colors.orange[50],
    shadow: "rgba(0,0,0,0.12)",
    border: "rgba(15,23,42,0.04)",
  },
  dark: {
    // Lifted off the page background so the capsule is clearly readable in dark mode,
    // where iOS/Android drop shadows are nearly invisible.
    capsuleBg: "#2A3445",
    activeIcon: colors.orange[400],
    activeText: colors.orange[400],
    inactiveIcon: "#94A3B8",
    inactiveText: "#94A3B8",
    pillBg: "rgba(245,130,32,0.22)",
    shadow: "rgba(0,0,0,0.5)",
    border: "rgba(255,255,255,0.08)",
  },
};

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();
  const t = isDark ? THEME.dark : THEME.light;

  // Filter against an explicit whitelist. expo-router's `href: null` field is
  // not surfaced on the descriptor's `options`, so the only reliable signal
  // here is the route name. Routes added to TABS in `_layout.tsx` must also
  // exist in VISIBLE_ROUTE_NAMES above.
  const visibleRoutes = useMemo(
    () => state.routes.filter((r) => VISIBLE_ROUTE_NAMES.has(r.name)),
    [state.routes],
  );

  const focusedKey = state.routes[state.index]?.key;
  const focusedVisibleIndex = Math.max(
    0,
    visibleRoutes.findIndex((r) => r.key === focusedKey),
  );

  const [rowWidth, setRowWidth] = useState(0);
  const tabCount = visibleRoutes.length || 1;
  const cellWidth = rowWidth > 0 ? rowWidth / tabCount : 0;
  const pillWidth = Math.max(0, cellWidth - PILL_INSET_PER_CELL * 2);

  const pillX = useSharedValue(0);
  const pillFirstLayout = useRef(true);

  const syncPill = useCallback(() => {
    if (cellWidth <= 0 || pillWidth <= 0) return;
    const x = CAPSULE_H_PADDING + focusedVisibleIndex * cellWidth + PILL_INSET_PER_CELL;
    if (pillFirstLayout.current) {
      pillX.value = x;
      pillFirstLayout.current = false;
    } else {
      pillX.value = withTiming(x, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [cellWidth, pillWidth, focusedVisibleIndex, pillX]);

  useEffect(() => {
    syncPill();
  }, [syncPill]);

  const pillStyle = useAnimatedStyle(
    () => ({
      transform: [{ translateX: pillX.value }],
      width: pillWidth,
    }),
    [pillWidth],
  );

  // iOS: hug the home indicator. iPhones expose `insets.bottom ≈ 34` purely
  // as a safe-area hint — visually the indicator only occupies the bottom
  // ~5px, so we collapse most of that gap to sit snug like WhatsApp.
  // Android: keep a comfortable gap because hardware nav buttons (when
  // present) live inside `insets.bottom` and must not be overlapped.
  const bottomOffset =
    Platform.OS === "ios"
      ? Math.max(insets.bottom - 22, 8)
      : insets.bottom > 0
        ? insets.bottom + 2
        : 14;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: bottomOffset,
      }}
    >
      <View
        style={{
          borderRadius: CAPSULE_BORDER_RADIUS,
          backgroundColor: t.capsuleBg,
          borderWidth: 1,
          borderColor: t.border,
          paddingHorizontal: CAPSULE_H_PADDING,
          paddingVertical: 6,
          shadowColor: t.shadow,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 1,
          shadowRadius: 18,
          elevation: 14,
          overflow: "hidden",
        }}
      >
        <View
          style={{ position: "relative", minHeight: TAB_ROW_HEIGHT }}
          onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}
        >
          {rowWidth > 0 && pillWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: "absolute",
                  left: 0,
                  top: (TAB_ROW_HEIGHT - PILL_HEIGHT) / 2,
                  height: PILL_HEIGHT,
                  borderRadius: PILL_HEIGHT / 2,
                  backgroundColor: t.pillBg,
                },
                pillStyle,
              ]}
            />
          ) : null}

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              minHeight: TAB_ROW_HEIGHT,
            }}
          >
            {visibleRoutes.map((route, index) => {
              const { options } = descriptors[route.key];
              const labelFromOptions =
                options.tabBarLabel !== undefined
                  ? String(options.tabBarLabel)
                  : options.title !== undefined
                    ? String(options.title)
                    : route.name;

              const label = TAB_LABELS[route.name] ?? labelFromOptions;
              const isFocused = focusedVisibleIndex === index;
              const icons = TAB_ICONS[route.name] ?? {
                focused: "ellipse",
                default: "ellipse-outline",
              };

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
                navigation.emit({
                  type: "tabLongPress",
                  target: route.key,
                });
              };

              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={
                    typeof options.tabBarAccessibilityLabel === "string"
                      ? options.tabBarAccessibilityLabel
                      : label
                  }
                  testID={options.tabBarButtonTestID}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 44,
                    paddingVertical: 4,
                  }}
                >
                  <Ionicons
                    name={isFocused ? icons.focused : icons.default}
                    size={22}
                    color={isFocused ? t.activeIcon : t.inactiveIcon}
                  />
                  <RNText
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      marginTop: 2,
                      color: isFocused ? t.activeText : t.inactiveText,
                    }}
                  >
                    {label}
                  </RNText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}
