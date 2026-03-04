import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import { colors } from "@/constants/colors";

type TransferOption = {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  iconColor: string;
  bgColor: string;
  darkBgColor: string;
  comingSoon?: boolean;
};

const TRANSFER_OPTIONS: TransferOption[] = [
  {
    id: "to-smipay",
    icon: "paper-plane-outline",
    label: "To Smipay",
    iconColor: "#6366F1",
    bgColor: "#EEF2FF",
    darkBgColor: "#1E1B4B",
    comingSoon: true,
  },
  {
    id: "to-bank",
    icon: "business-outline",
    label: "To Bank",
    iconColor: colors.orange[500],
    bgColor: colors.orange[100],
    darkBgColor: colors.orange[950],
    comingSoon: true,
  },
  {
    id: "to-tag",
    icon: "pricetag-outline",
    label: "To Tag",
    iconColor: colors.green[500],
    bgColor: colors.green[100],
    darkBgColor: colors.green[950],
    comingSoon: true,
  },
];

export function TransferSection() {
  const { isDark } = useAppTheme();

  return (
    <View
      className="mt-4 rounded-2xl mx-5 px-3 pb-3 pt-4"
      style={{ backgroundColor: isDark ? "#1E293B" : "#F5F6F8" }}
    >
      <Text className="mb-3 px-1 text-[15px] font-semibold text-foreground">
        Transfer
      </Text>
      <View className="flex-row">
        {TRANSFER_OPTIONS.map((option) => (
          <TransferIcon key={option.id} option={option} isDark={isDark} />
        ))}
      </View>
    </View>
  );
}

function TransferIcon({
  option,
  isDark,
}: {
  option: TransferOption;
  isDark: boolean;
}) {
  const bg = isDark ? option.darkBgColor : option.bgColor;

  return (
    <Pressable
      className="items-center"
      style={{ width: `${100 / TRANSFER_OPTIONS.length}%` }}
      disabled={option.comingSoon}
    >
      <View className="relative">
        {option.comingSoon && (
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
          <Ionicons name={option.icon} size={24} color={option.iconColor} />
        </View>
      </View>

      <Text
        className="mt-1.5 text-center text-xs text-foreground"
        style={option.comingSoon ? { opacity: 0.5 } : undefined}
      >
        {option.label}
      </Text>
    </Pressable>
  );
}
