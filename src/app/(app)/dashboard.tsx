import { Image, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/ui/text";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuthStore } from "@/store";

export default function DashboardScreen() {
  const user = useAuthStore.use.user();

  const firstName = user?.first_name ?? "there";

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-6 pt-2">
        <Text variant="h3" className="text-foreground">
          Dashboard
        </Text>
        <ThemeToggle />
      </View>

      <View className="flex-1 items-center justify-center px-6">
        <Image
          source={require("@/assets/images/icon.png")}
          className="mb-6 h-24 w-24 rounded-2xl"
          resizeMode="contain"
        />
        <Text variant="h3" className="text-primary">
          Welcome, {firstName}!
        </Text>
        <Text className="mt-2 text-center text-muted-foreground">
          Nothing here yet — this is where the magic will happen.
        </Text>
      </View>
    </SafeAreaView>
  );
}
