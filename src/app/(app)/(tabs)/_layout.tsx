import { View } from "react-native";
import { Tabs, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/use-app-theme";
import { colors } from "@/constants/colors";

const THEME = {
  light: {
    tabBg: "#FFFFFF",
    activeText: colors.orange[600],
    activeIcon: colors.orange[500],
    inactiveIcon: colors.gray[400],
    inactiveText: colors.gray[500],
    shadow: "rgba(0,0,0,0.08)",
  },
  dark: {
    tabBg: "#1D283A",
    activeText: colors.orange[400],
    activeIcon: colors.orange[400],
    inactiveIcon: "#6B7A8D",
    inactiveText: "#6B7A8D",
    shadow: "rgba(0,0,0,0.4)",
  },
} as const;

type TabConfig = {
  name: string;
  title: string;
  iconFocused: React.ComponentProps<typeof Ionicons>["name"];
  iconDefault: React.ComponentProps<typeof Ionicons>["name"];
};

const TABS: TabConfig[] = [
  { name: "index", title: "Home", iconFocused: "home", iconDefault: "home-outline" },
  { name: "smile/index", title: "Smile", iconFocused: "happy", iconDefault: "happy-outline" },
  { name: "history/index", title: "History", iconFocused: "receipt", iconDefault: "receipt-outline" },
  { name: "profile/index", title: "Menu", iconFocused: "person", iconDefault: "person-outline" },
];

export default function TabsLayout() {
  const { isDark } = useAppTheme();
  const t = isDark ? THEME.dark : THEME.light;
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 12);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.activeText,
        tabBarInactiveTintColor: t.inactiveText,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: t.tabBg,
          borderTopWidth: 1,
          borderTopColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
          elevation: 8,
          shadowColor: t.shadow,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 1,
          shadowRadius: 16,
          paddingTop: 12,
          paddingBottom: bottomPadding,
          height: 64 + bottomPadding,
          minHeight: 64 + bottomPadding,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 4,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          listeners={
            tab.name === "smile/index"
              ? {
                  tabPress: (e) => {
                    e.preventDefault();
                    router.push("/(app)/smileai/chat/new");
                  },
                }
              : undefined
          }
          options={{
            title: tab.title,
            tabBarIcon: ({ focused }) => {
              const iconName = focused ? tab.iconFocused : tab.iconDefault;
              const iconColor = focused ? t.activeIcon : t.inactiveIcon;
              return (
                <View
                  style={{
                    alignItems: "center",
                    justifyContent: "center",
                    width: 48,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: focused
                      ? isDark
                        ? "rgba(245,130,32,0.18)"
                        : colors.orange[50]
                      : "transparent",
                  }}
                >
                  <Ionicons
                    name={iconName}
                    size={22}
                    color={iconColor}
                  />
                </View>
              );
            },
          }}
        />
      ))}
    </Tabs>
  );
}
