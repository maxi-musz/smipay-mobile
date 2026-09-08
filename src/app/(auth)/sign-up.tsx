import { View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AuthShell } from "@/components/auth/auth-shell";
import { Spinner } from "@/components/ui/loaders";
import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";
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
  const { flow, status } = useRegistrationFlow();

  if (status === "ready" && flow === "bvn_liveness") {
    return <BvnLivenessSignUp />;
  }
  if (status === "ready" && flow === "phone_only") {
    return <PhoneOnlySignUp />;
  }

  const resolving = status === "resolving";

  return (
    <AuthShell
      title={resolving ? "Create your account" : "Registration is unavailable"}
      subtitle={
        resolving
          ? "Getting things ready…"
          : "We couldn't reach SmiPay to start your registration."
      }
      onBack={resolving ? undefined : () => router.back()}
      showVersion={!resolving}
    >
      {resolving ? (
        <View className="mt-16 items-center">
          <Spinner />
        </View>
      ) : (
        <View className="mt-8 flex-row items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3.5">
          <Ionicons
            name="cloud-offline-outline"
            size={20}
            color={colors.orange[500]}
          />
          <Text className="flex-1 text-sm leading-5 text-muted-foreground">
            Check your internet connection, then open this screen again.
          </Text>
        </View>
      )}
    </AuthShell>
  );
}
