import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import {
  EducationHeader,
  JambVerifyInput,
} from "@/features/vtpass-education/components";
import { formatNaira } from "@/features/vtpass-education/lib/constants";
import { useEducationStore } from "@/features/vtpass-education/lib/store";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import { colors } from "@/constants/colors";

export default function EducationVerifyScreen() {
  const selectedProduct = useEducationStore.use.selectedProduct();
  const selectedVariation = useEducationStore.use.selectedVariation();
  const verifyData = useEducationStore.use.verifyData();
  const isVerifying = useEducationStore.use.isVerifying();
  const verifyError = useEducationStore.use.verifyError();
  const verifyJamb = useEducationStore.use.verifyJamb();
  const clearVerify = useEducationStore.use.clearVerify();
  const { isDark } = useAppTheme();

  const [profileId, setProfileId] = useState("");
  const [inputError, setInputError] = useState<string | undefined>();

  useEffect(() => {
    if (!selectedProduct || !selectedVariation) {
      router.replace("/(app)/vtpass/education");
    }
  }, [selectedProduct, selectedVariation]);

  if (!selectedProduct || !selectedVariation) return null;

  const verified = !!verifyData;
  const variationAmount = parseFloat(selectedVariation.variation_amount);

  async function handleVerify() {
    if (profileId.trim().length < 5) {
      setInputError("Please enter a valid Profile ID");
      return;
    }
    setInputError(undefined);
    await verifyJamb(profileId.trim(), selectedVariation!.variation_code);
  }

  function handleClearAndRetry() {
    setProfileId("");
    setInputError(undefined);
    clearVerify();
  }

  function handleContinue() {
    router.push("/(app)/vtpass/education/purchase");
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <EducationHeader showMainTitle={false} title="Verify Profile" />

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
      >
        {/* Selected plan summary */}
        <Animated.View
          entering={FadeInDown.duration(300)}
          className="mt-4"
        >
          <View className="mb-2 rounded-xl border border-border bg-card px-4 py-3">
            <Text className="text-xs text-muted-foreground">Selected plan</Text>
            <Text
              className="mt-1 text-[15px] font-semibold text-foreground"
              numberOfLines={2}
            >
              {selectedVariation.name}
            </Text>
            {variationAmount > 0 && (
              <Text
                className="mt-1 text-sm font-bold"
                style={{ color: "#F58220" }}
              >
                {formatNaira(variationAmount)}
              </Text>
            )}
          </View>
        </Animated.View>

        {/* JAMB Profile ID input + verify */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(300)}
          className="mt-6"
        >
          <JambVerifyInput
            value={profileId}
            onChangeText={(t) => {
              setProfileId(t);
              if (inputError) setInputError(undefined);
              if (verifyError) clearVerify();
            }}
            onClear={handleClearAndRetry}
            onVerify={handleVerify}
            isVerifying={isVerifying}
            verified={verified}
            error={inputError ?? verifyError ?? undefined}
          />
        </Animated.View>

        {/* Post-verification: student name + continue */}
        {verified && verifyData && (
          <>
            <Animated.View
              entering={FadeInDown.duration(300)}
              className="mt-4 rounded-2xl border border-border bg-card overflow-hidden"
            >
              <View
                className="flex-row items-center gap-2 px-4 py-3"
                style={{
                  backgroundColor: isDark
                    ? "rgba(34,197,94,0.08)"
                    : "rgba(34,197,94,0.06)",
                }}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.green[500]}
                />
                <Text className="text-sm font-semibold text-foreground">
                  Profile Verified
                </Text>
              </View>
              <View className="px-4 py-3">
                <View className="flex-row items-start justify-between">
                  <Text className="text-sm text-muted-foreground">
                    Student Name
                  </Text>
                  <Text className="text-sm font-medium text-foreground text-right flex-1 ml-4">
                    {verifyData.Customer_Name}
                  </Text>
                </View>
              </View>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(100).duration(300)}
              className="mt-8"
            >
              <Button
                size="lg"
                className="w-full rounded-xl"
                onPress={handleContinue}
              >
                <Text className="text-base font-semibold text-white">
                  Continue
                </Text>
              </Button>
            </Animated.View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
