import { View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { colors } from "@/constants/colors";
import { useAppTheme } from "@/hooks/use-app-theme";
import { formatNaira, getMinPurchaseAmount } from "../lib/constants";
import type { ElectricityVerifyContent } from "@/types/vtpass-electricity";

interface CustomerInfoCardProps {
  content: ElectricityVerifyContent;
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

export function CustomerInfoCard({ content }: CustomerInfoCardProps) {
  const { isDark } = useAppTheme();

  const minAmount = getMinPurchaseAmount(content.Min_Purchase_Amount);
  const hasArrears = !!content.Customer_Arrears && content.Customer_Arrears !== "0";

  return (
    <Animated.View
      entering={FadeInDown.duration(300).springify().damping(15)}
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
          Meter Verified
        </Text>
      </View>

      <View className="px-4 pb-3">
        <Row label="Customer" value={content.Customer_Name} />
        {content.Address && <Row label="Address" value={content.Address} />}
        {content.Meter_Type && (
          <Row label="Meter Type" value={content.Meter_Type} />
        )}
        {content.Customer_Account_Type && (
          <Row
            label="Account Type"
            value={
              content.Customer_Account_Type === "MD"
                ? "Maximum Demand"
                : content.Customer_Account_Type === "NMD"
                  ? "Household (NMD)"
                  : content.Customer_Account_Type
            }
          />
        )}
        {content.Service_Band && (
          <Row label="Service Band" value={content.Service_Band} />
        )}
        {hasArrears && (
          <Row
            label="Arrears"
            value={formatNaira(parseFloat(content.Customer_Arrears!))}
          />
        )}
        <Row label="Min. Purchase" value={formatNaira(minAmount)} />
      </View>
    </Animated.View>
  );
}
