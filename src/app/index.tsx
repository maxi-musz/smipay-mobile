import { Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/ui/text";
import { OnboardingScreen, useOnboardingStatus } from "@/onboarding";
import { useAuthStore } from "@/store";

export default function IndexScreen() {
  const { hasCompleted, isLoading, completeOnboarding } =
    useOnboardingStatus();
  const isAuthenticated = useAuthStore.use.isAuthenticated();

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <Text className="text-muted-foreground">Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!hasCompleted) {
    return <OnboardingScreen onComplete={completeOnboarding} />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}
