import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";

export default function HistoryScreen() {
  const { isDark } = useAppTheme();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="px-6 pb-2 pt-3">
        <Text variant="h3" className="text-foreground">
          History
        </Text>
      </View>

      <View className="flex-1 items-center justify-center px-6 pb-20">
        <Ionicons
          name="receipt-outline"
          size={56}
          color={isDark ? "#808999" : "#9CA3B0"}
        />
        <Text variant="h4" className="mt-4 text-foreground">
          No Transactions
        </Text>
        <Text className="mt-2 text-center text-muted-foreground">
          Your transaction history will appear here once you start using SmiPay.
        </Text>
      </View>
    </SafeAreaView>
  );
}
