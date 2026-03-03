import { Alert, Image, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { OnboardingScreen, useOnboardingStatus } from "@/onboarding";
import { useAppTheme } from "@/hooks/use-app-theme";

export default function HomeScreen() {
  const { hasCompleted, isLoading, completeOnboarding, clearOnboarding } =
    useOnboardingStatus();
  const { isDark, mode, toggle } = useAppTheme();

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
          Pay with a smile
        </Text>

        <View className="mt-10 w-full items-center rounded-2xl border border-border bg-card p-6">
          <Text variant="small" className="uppercase tracking-wider text-muted-foreground">
            Current Theme
          </Text>

          <Text variant="large" className="mt-2">
            {mode === "system" ? "System" : isDark ? "Dark" : "Light"}
          </Text>

          <Button className="mt-4 rounded-xl" onPress={toggle}>
            <Text>Switch to {isDark ? "Light" : "Dark"}</Text>
          </Button>
        </View>

        <View className="mt-6 w-full flex-row justify-between rounded-2xl border border-border bg-card p-4">
          <Swatch label="Orange" className="bg-orange-500" />
          <Swatch label="Green" className="bg-green-500" />
          <Swatch label="Success" className="bg-green-600" />
          <Swatch label="Error" className="bg-red-500" />
          <Swatch label="Warning" className="bg-yellow-500" />
        </View>

        {__DEV__ && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-8"
            onPress={() =>
              Alert.alert(
                "Clear app data",
                "This will reset onboarding. You'll see the welcome screens again.",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Clear", style: "destructive", onPress: clearOnboarding },
                ],
              )
            }
          >
            <Text className="text-xs text-muted-foreground">Clear app data</Text>
          </Button>
        )}
      </View>
    </SafeAreaView>
  );
}

function Swatch({ label, className }: { label: string; className: string }) {
  return (
    <View className="items-center gap-1.5">
      <View className={`h-10 w-10 rounded-full ${className}`} />
      <Text variant="muted">{label}</Text>
    </View>
  );
}
