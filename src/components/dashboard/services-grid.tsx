import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import { colors } from "@/constants/colors";

type ServiceItem = {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  iconColor: string;
  bgColor: string;
  darkBgColor: string;
  discount?: string;
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
    discount: "Up to 9% off",
  },
  {
    id: "data",
    icon: "wifi",
    label: "Data",
    iconColor: "#6366F1",
    bgColor: "#EEF2FF",
    darkBgColor: "#1E1B4B",
    discount: "Up to 7% off",
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
    id: "cards",
    icon: "card",
    label: "Cards",
    iconColor: colors.green[500],
    bgColor: colors.green[100],
    darkBgColor: colors.green[950],
    comingSoon: true,
  },
  {
    id: "betting",
    icon: "football",
    label: "Betting",
    iconColor: colors.orange[500],
    bgColor: colors.orange[100],
    darkBgColor: colors.orange[950],
    comingSoon: true,
  },
];

export function ServicesGrid() {
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
          />
        ))}
      </View>
    </View>
  );
}

function ServiceIcon({
  service,
  isDark,
}: {
  service: ServiceItem;
  isDark: boolean;
}) {
  const bg = isDark ? service.darkBgColor : service.bgColor;

  return (
    <Pressable
      className="mb-3 items-center"
      style={{ width: "25%" }}
      disabled={service.comingSoon}
    >
      <View className="relative">
        {service.discount && (
          <View className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-destructive px-2 py-0.5">
            <Text className="text-[9px] font-bold text-white" numberOfLines={1}>
              {service.discount}
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
