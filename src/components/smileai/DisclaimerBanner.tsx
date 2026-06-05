import { View } from "react-native";

import { Text } from "@/components/ui/text";
import { SMILEY_ASSISTANT_NAME } from "@/constants/smiley";

export function DisclaimerBanner() {
  return (
    <View className="mt-6 px-1 pb-8">
      <Text className="text-center text-xs text-muted-foreground">
        {SMILEY_ASSISTANT_NAME} may make mistakes. Verify important details.{" "}
        {SMILEY_ASSISTANT_NAME} cannot see your PIN,
        OTP, or password.
      </Text>
    </View>
  );
}
