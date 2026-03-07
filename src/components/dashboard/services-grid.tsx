import { Pressable, View } from "react-native";
import { router, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { getAirtimeRoute } from "@/lib/provider-config";
import { useAppTheme } from "@/hooks/use-app-theme";
import { colors } from "@/constants/colors";
import type { CashbackRate } from "@/types";

type ServiceItem = {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  iconColor: string;
  bgColor: string;
  darkBgColor: string;
  cashbackService?: string;
  comingSoon?: boolean;
};

const SERVICES: ServiceItem[] = [
  {
    id: "airtime",
    icon: "call",
    label: "Airtime",
    iconColor: colors.orange[500],
    bgColor: colors.orange[100],
    darkBgColor: colors.orange[950],
    cashbackService: "airtime",
  },
  {
    id: "data",
    icon: "wifi",
    label: "Data",
    iconColor: "#6366F1",
    bgColor: "#EEF2FF",
    darkBgColor: "#1E1B4B",
    cashbackService: "data",
  },
  {
    id: "cable-tv",
    icon: "tv",
    label: "Cable TV",
    iconColor: "#EF4444",
    bgColor: "#FEF2F2",
    darkBgColor: "#450A0A",
  },
  {
    id: "education",
    icon: "school",
    label: "Education",
    iconColor: colors.green[500],
    bgColor: colors.green[100],
    darkBgColor: colors.green[950],
  },
  {
    id: "electricity",
    icon: "flash",
    label: "Electricity",
    iconColor: "#EAB308",
    bgColor: "#FEFCE8",
    darkBgColor: "#422006",
  },
  {
    id: "intl-airtime",
    icon: "globe",
    label: "Intl. Airtime",
    iconColor: "#0EA5E9",
    bgColor: "#F0F9FF",
    darkBgColor: "#082F49",
  },
  {
    id: "savings",
    icon: "trending-up",
    label: "Savings",
    iconColor: colors.green[500],
    bgColor: colors.green[100],
    darkBgColor: colors.green[950],
    comingSoon: true,
  },
  {
    id: "streaming",
    icon: "repeat",
    label: "Subscriptions",
    iconColor: "#6366F1",
    bgColor: "#EEF2FF",
    darkBgColor: "#1E1B4B",
    comingSoon: true,
  },
];

interface ServicesGridProps {
  cashbackRates?: CashbackRate[];
}

function getCashbackLabel(
  service: ServiceItem,
  rates?: CashbackRate[],
): string | null {
  if (!rates || !service.cashbackService) return null;

  const rate = rates.find((r) => r.service === service.cashbackService);
  if (!rate || !rate.is_active || rate.percentage <= 0) return null;

  return `${rate.percentage}% cashback`;
}

export function ServicesGrid({ cashbackRates }: ServicesGridProps) {
  const { isDark } = useAppTheme();

  return (
    <View
      className="mt-6 rounded-2xl mx-5 px-3 pb-2 pt-4"
      style={{ backgroundColor: isDark ? "#1E293B" : "#F5F6F8" }}
    >
      <Text className="mb-3 px-1 text-[15px] font-semibold text-foreground">
        Services
      </Text>
      <View className="flex-row flex-wrap">
        {SERVICES.map((service) => (
          <ServiceIcon
            key={service.id}
            service={service}
            isDark={isDark}
            cashbackLabel={getCashbackLabel(service, cashbackRates)}
            onPress={
              service.id === "airtime" && !service.comingSoon
                ? () => router.push(getAirtimeRoute() as Href)
                : undefined
            }
          />
        ))}
      </View>
    </View>
  );
}

function ServiceIcon({
  service,
  isDark,
  cashbackLabel,
  onPress,
}: {
  service: ServiceItem;
  isDark: boolean;
  cashbackLabel: string | null;
  onPress?: () => void;
}) {
  const bg = isDark ? service.darkBgColor : service.bgColor;

  return (
    <Pressable
      className="mb-3 items-center"
      style={{ width: "25%" }}
      disabled={service.comingSoon}
      onPress={onPress}
    >
      <View className="relative">
        {cashbackLabel && (
          <View
            className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 rounded-full px-2.5 py-0.5"
            style={{ backgroundColor: colors.green[500] }}
          >
            <Text className="text-[9px] font-bold text-white" numberOfLines={1}>
              {cashbackLabel}
            </Text>
          </View>
        )}

        {service.comingSoon && (
          <View className="absolute -right-1 -top-1 z-10 rounded-full bg-destructive px-1.5 py-0.5">
            <Text className="text-[8px] font-bold uppercase text-white">
              Soon
            </Text>
          </View>
        )}

        <View
          className="h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: bg }}
        >
          <Ionicons name={service.icon} size={24} color={service.iconColor} />
        </View>
      </View>

      <Text
        className="mt-1.5 text-center text-xs text-foreground"
        numberOfLines={1}
        style={service.comingSoon ? { opacity: 0.5 } : undefined}
      >
        {service.label}
      </Text>
    </Pressable>
  );
}
