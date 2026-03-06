import { Platform, View } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/use-app-theme";
import { colors } from "@/constants/colors";

const THEME = {
  light: {
    tabBg: "#FFFFFF",
    activeBg: colors.orange[50],
    activeText: colors.orange[600],
    activeIcon: colors.orange[500],
    inactiveIcon: colors.gray[400],
    inactiveText: colors.gray[400],
    shadow: "rgba(0,0,0,0.06)",
  },
  dark: {
    tabBg: "#1D283A",
    activeBg: "rgba(244,131,31,0.12)",
    activeText: colors.orange[400],
    activeIcon: colors.orange[400],
    inactiveIcon: "#6B7A8D",
    inactiveText: "#6B7A8D",
    shadow: "rgba(0,0,0,0.3)",
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
  { name: "history", title: "History", iconFocused: "time", iconDefault: "time-outline" },
  { name: "profile", title: "Profile", iconFocused: "person", iconDefault: "person-outline" },
];

export default function TabsLayout() {
  const { isDark } = useAppTheme();
  const t = isDark ? THEME.dark : THEME.light;
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

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
          borderTopWidth: 0,
          elevation: 0,
          shadowColor: t.shadow,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 1,
          shadowRadius: 12,
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: 60 + bottomPadding,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, size }) => {
              const iconName = focused ? tab.iconFocused : tab.iconDefault;
              const iconColor = focused ? t.activeIcon : t.inactiveIcon;

              if (focused) {
                return (
                  <View
                    style={{
                      backgroundColor: t.activeBg,
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 4,
                    }}
                  >
                    <Ionicons name={iconName} size={size} color={iconColor} />
                  </View>
                );
              }

              return <Ionicons name={iconName} size={size} color={iconColor} />;
            },
          }}
        />
      ))}
    </Tabs>
  );
}
