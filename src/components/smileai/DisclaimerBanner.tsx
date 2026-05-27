import { View } from "react-native";

import { Text } from "@/components/ui/text";

export function DisclaimerBanner() {
  return (
    <View className="mt-6 px-1 pb-8">
      <Text className="text-center text-xs text-muted-foreground">
        Smile may make mistakes. Verify important details. Smile cannot see your PIN,
        OTP, or password.
      </Text>
    </View>
  );
}
