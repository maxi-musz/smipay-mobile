import { Image, View } from "react-native";
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

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  // Authenticated — show home / dashboard placeholder
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-6">
        <Image
          source={require("@/assets/images/icon.png")}
          className="mb-6 h-24 w-24 rounded-2xl"
          resizeMode="contain"
        />
        <Text variant="h3" className="text-primary">SmiPay</Text>
        <Text className="mt-1 text-muted-foreground">
          Dashboard coming soon
        </Text>
      </View>
    </SafeAreaView>
  );
}
