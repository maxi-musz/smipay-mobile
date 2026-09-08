import { Pressable, View } from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useRegistrationFlow } from "@/hooks/use-registration-flow";
import { PhoneOnlySignUp } from "./_components/phone-only-sign-up";
import { BvnLivenessSignUp } from "./_components/bvn-liveness-sign-up";

/**
 * Registration entry gate. Resolves the active flow from the server (with a
 * persisted last-known-good cache + retry) and routes to the matching flow.
 * It never guesses a default, so it can never render the wrong flow; while it
 * resolves it shows a calm loader, and only a genuine, exhausted failure with
 * no cache shows the temporary-unavailable screen.
 */
export default function SignUpGate() {
  const { flow, status, retry } = useRegistrationFlow();
  const { isDark } = useAppTheme();

  if (status === "ready" && flow === "bvn_liveness") {
    return <BvnLivenessSignUp />;
  }
  if (status === "ready" && flow === "phone_only") {
    return <PhoneOnlySignUp />;
  }

  // resolving | unavailable — both get a header + centered content.
  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: "Create account", headerShadowVisible: false }} />
      <View className="flex-1 items-center justify-center px-8">
        {status === "resolving" ? (
          <>
            <Spinner />
            <Text className="mt-4 text-sm text-muted-foreground">
              Getting things ready…
            </Text>
          </>
        ) : (
          <>
            <View className="h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Ionicons
                name="cloud-offline-outline"
                size={28}
                color={isDark ? "#FB923C" : "#F58220"}
              />
            </View>
            <Text className="mt-5 text-center text-lg font-semibold text-foreground">
              Registration is temporarily unavailable
            </Text>
            <Text className="mt-2 text-center text-sm leading-5 text-muted-foreground">
              We couldn&apos;t reach SmiPay to start your registration. Check your
              internet connection and try again.
            </Text>
            <Button className="mt-8 w-full" onPress={retry}>
              <Text className="font-semibold text-white">Try again</Text>
            </Button>
            <Pressable className="mt-4" onPress={() => router.back()} hitSlop={8}>
              <Text className="text-sm text-muted-foreground">Go back</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}
