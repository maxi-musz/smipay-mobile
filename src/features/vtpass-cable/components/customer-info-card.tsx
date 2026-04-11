import { View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";
import { useAppTheme } from "@/hooks/use-app-theme";
import { formatNaira } from "../lib/constants";
import {
  isDstvGotvContent,
  type CableVerifyContent,
} from "@/types/vtpass-cable";

interface CustomerInfoCardProps {
  content: CableVerifyContent;
  serviceID: string;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between py-2">
      <Text className="text-sm text-muted-foreground shrink-0 mr-4">
        {label}
      </Text>
      <Text className="text-sm font-medium text-foreground text-right flex-1">
        {value}
      </Text>
    </View>
  );
}

export function CustomerInfoCard({
  content,
  serviceID,
}: CustomerInfoCardProps) {
  const { isDark } = useAppTheme();

  if (isDstvGotvContent(content)) {
    const renewalAmount = content.Renewal_Amount
      ? parseFloat(content.Renewal_Amount)
      : 0;

    return (
      <Animated.View
        entering={FadeInDown.duration(300)}
        className="mt-4 rounded-2xl border border-border bg-card overflow-hidden"
      >
        <View
          className="flex-row items-center gap-2 px-4 py-3"
          style={{
            backgroundColor: isDark ? "rgba(34,197,94,0.08)" : "rgba(34,197,94,0.06)",
          }}
        >
          <Ionicons name="checkmark-circle" size={20} color={colors.green[500]} />
          <Text className="text-sm font-semibold text-foreground">
            Smartcard Verified
          </Text>
        </View>

        <View className="px-4 pb-3">
          <Row label="Customer Name" value={content.Customer_Name} />
          {content.Current_Bouquet && (
            <Row label="Current Bouquet" value={content.Current_Bouquet} />
          )}
          {content.Status && <Row label="Status" value={content.Status} />}
          {renewalAmount > 0 && (
            <Row
              label="Renewal Amount"
              value={formatNaira(renewalAmount)}
            />
          )}
          {content.Due_Date && (
            <Row
              label="Due Date"
              value={new Date(content.Due_Date).toLocaleDateString("en-NG", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            />
          )}
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      className="mt-4 rounded-2xl border border-border bg-card overflow-hidden"
    >
      <View
        className="flex-row items-center gap-2 px-4 py-3"
        style={{
          backgroundColor: isDark ? "rgba(34,197,94,0.08)" : "rgba(34,197,94,0.06)",
        }}
      >
        <Ionicons name="checkmark-circle" size={20} color={colors.green[500]} />
        <Text className="text-sm font-semibold text-foreground">
          Account Verified
        </Text>
      </View>

      <View className="px-4 pb-3">
        <Row label="Customer Name" value={content.Customer_Name} />
        {content.Balance != null && (
          <Row label="Balance" value={formatNaira(content.Balance)} />
        )}
      </View>
    </Animated.View>
  );
}
