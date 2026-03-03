import { Redirect, Stack } from "expo-router";

import { useAuthStore } from "@/store";

export default function AppLayout() {
  const isAuthenticated = useAuthStore.use.isAuthenticated();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" },
      }}
    />
  );
}
