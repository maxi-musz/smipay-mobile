import { Modal, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";
import { useAppTheme } from "@/hooks/use-app-theme";

interface PhoneVerificationRequiredModalProps {
  visible: boolean;
  maskedPhone?: string;
  onProceed: () => void;
}

/**
 * Mandatory prompt shown on the dashboard when the user's current tier requires
 * phone verification and they have not completed it yet.
 */
export function PhoneVerificationRequiredModal({
  visible,
  maskedPhone,
  onProceed,
}: PhoneVerificationRequiredModalProps) {
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  const cardBg = isDark ? "#0F172A" : "#FFFFFF";
  const subtleText = isDark ? "#94A3B8" : "#6B7280";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View className="flex-1 justify-end" style={{ flex: 1 }}>
        <View className="absolute inset-0 bg-black/70" />

        <View
          style={{
            backgroundColor: cardBg,
            paddingBottom: Math.max(insets.bottom, 16),
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
          }}
          className="px-6 pt-5 shadow-2xl"
        >
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Ionicons name="call" size={26} color={colors.orange[500]} />
            </View>
            <View
              className="self-start rounded-full px-2 py-0.5"
              style={{
                backgroundColor: isDark
                  ? "rgba(245,131,32,0.16)"
                  : "rgba(245,131,32,0.12)",
              }}
            >
              <Text
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: colors.orange[500] }}
              >
                Required
              </Text>
            </View>
          </View>

          <Text className="mt-4 text-xl font-semibold text-foreground">
            Verify your phone number
          </Text>
          <Text className="mt-1.5 text-sm leading-5" style={{ color: subtleText }}>
            {maskedPhone
              ? `Please verify ${maskedPhone} to continue using your account and unlock your tier limits.`
              : "Please verify your phone number to continue using your account and unlock your tier limits."}
          </Text>

          <Button className="mt-7 h-12 rounded-2xl" onPress={onProceed}>
            <Text className="text-sm font-semibold text-primary-foreground">
              Proceed to verify
            </Text>
          </Button>
        </View>
      </View>
    </Modal>
  );
}
