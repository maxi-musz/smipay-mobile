import { View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Text } from "@/components/ui/text";
import { Switch } from "@/components/ui/switch";

interface CashbackToggleProps {
  cashbackBalance: string;
  useCashback: boolean;
  onToggle: (value: boolean) => void;
}

export function CashbackToggle({
  cashbackBalance,
  useCashback,
  onToggle,
}: CashbackToggleProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(200).duration(300).springify().damping(15)}
      className="mt-6 flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3"
    >
      <View className="flex-1">
        <Text className="text-base font-medium text-foreground">
          Use cashback
        </Text>
        <Text className="mt-0.5 text-sm text-muted-foreground">
          Pay with your {cashbackBalance} cashback first
        </Text>
      </View>
      <Switch value={useCashback} onValueChange={onToggle} />
    </Animated.View>
  );
}
