import { View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import { colors } from "@/constants/colors";

interface WalletBalanceCardProps {
  walletBalance: string;
  cashbackBalance: string;
  hasCashback: boolean;
}

export function WalletBalanceCard({
  walletBalance,
  cashbackBalance,
  hasCashback,
}: WalletBalanceCardProps) {
  const { isDark } = useAppTheme();

  return (
    <Animated.View
      entering={FadeInDown.duration(300).springify().damping(15)}
      className="mb-6 overflow-hidden rounded-2xl px-4 py-3"
      style={{ backgroundColor: isDark ? "#1A2332" : "#F0FDF4" }}
    >
      <View className="flex-row items-center justify-between">
        <View>
          <Text
            className="text-xs font-semibold uppercase tracking-wider"
            style={{
              color: isDark ? "rgba(255,255,255,0.6)" : colors.green[700],
            }}
          >
            Wallet Balance
          </Text>
          <Text
            className="mt-0.5 text-lg font-bold"
            style={{ color: isDark ? "#fff" : colors.green[800] }}
          >
            {walletBalance}
          </Text>
        </View>
        {hasCashback && (
          <View className="items-end">
            <Text
              className="text-xs font-medium"
              style={{
                color: isDark ? "rgba(255,255,255,0.6)" : colors.green[600],
              }}
            >
              Cashback
            </Text>
            <Text
              className="mt-0.5 text-sm font-semibold"
              style={{ color: isDark ? "#fff" : colors.green[700] }}
            >
              {cashbackBalance}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}
