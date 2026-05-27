import { Tabs } from "expo-router";

import { FloatingTabBar } from "@/components/navigation/FloatingTabBar";

const TABS: { name: string; title: string }[] = [
  { name: "index", title: "Home" },
  { name: "history/index", title: "History" },
  { name: "profile/index", title: "Menu" },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      {/* Hidden route — Smile is no longer a tab; entry is floating orb + AskSmile banner. */}
      <Tabs.Screen name="smile/index" options={{ href: null }} />
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarAccessibilityLabel: tab.title,
          }}
        />
      ))}
    </Tabs>
  );
}
