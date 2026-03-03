import { Alert, Image, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { OnboardingScreen, useOnboardingStatus } from "@/onboarding";
import { useAppTheme } from "@/hooks/use-app-theme";

export default function HomeScreen() {
  const { hasCompleted, isLoading, completeOnboarding, clearOnboarding } =
    useOnboardingStatus();
  const { isDark, mode, toggle } = useAppTheme();

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white dark:bg-gray-950">
        <Text className="text-gray-500 dark:text-gray-400">Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!hasCompleted) {
    return <OnboardingScreen onComplete={completeOnboarding} />;
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950">
      <View className="flex-1 items-center justify-center px-6">
        <Image
          source={require("@/assets/images/icon.png")}
          className="mb-6 h-24 w-24 rounded-2xl"
          resizeMode="contain"
        />

        <Text className="text-3xl font-bold text-orange-500">SmiPay</Text>

        <Text className="mt-1 text-base text-gray-500 dark:text-gray-400">
          Pay with a smile
        </Text>

        <View className="mt-10 w-full items-center rounded-2xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900">
          <Text className="text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Current Theme
          </Text>

          <Text className="mt-2 text-lg font-bold text-gray-900 dark:text-gray-50">
            {mode === "system" ? "System" : isDark ? "Dark" : "Light"}
          </Text>

          <Pressable
            onPress={toggle}
            className="mt-4 rounded-xl bg-orange-500 px-8 py-3 active:bg-oracity-90"
          >
            <Text className="text-base font-semibold text-white">
              Switch to {isDark ? "Light" : "Dark"}
            </Text>
          </Pressable>
        </View>

        <View className="mt-6 w-full flex-row justify-between rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
          <Swatch label="Orange" className="bg-orange-500" />
          <Swatch label="Green" className="bg-green-500" />
          <Swatch label="Success" className="bg-green-600" />
          <Swatch label="Error" className="bg-red-500" />
          <Swatch label="Warning" className="bg-yellow-500" />
        </View>

        {__DEV__ && (
          <Pressable
            onPress={() =>
              Alert.alert(
                "Clear app data",
                "This will reset onboarding. You'll see the welcome screens again.",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Clear", style: "destructive", onPress: clearOnboarding },
                ]
              )
            }
            className="mt-8 py-2 active:opacity-70"
          >
            <Text className="text-xs text-gray-400 dark:text-gray-500">
              Clear app data
            </Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

function Swatch({ label, className }: { label: string; className: string }) {
  return (
    <View className="items-center gap-1.5">
      <View className={`h-10 w-10 rounded-full ${className}`} />
      <Text className="text-xs text-gray-500 dark:text-gray-400">{label}</Text>
    </View>
  );
}
