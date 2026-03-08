import { Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Spinner } from "@/components/ui/loaders";
import { useAppTheme } from "@/hooks/use-app-theme";
import { colors } from "@/constants/colors";
import { getProviderTraits } from "../lib/constants";
import { cn } from "@/lib/utils";

const PLACEHOLDER_LIGHT = "rgba(107, 114, 128, 0.38)";
const PLACEHOLDER_DARK = "rgba(255, 255, 255, 0.15)";

interface SmartcardInputProps {
  serviceID: string;
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
  onVerify: () => void;
  isVerifying: boolean;
  verified: boolean;
  error?: string;
}

export function SmartcardInput({
  serviceID,
  value,
  onChangeText,
  onClear,
  onVerify,
  isVerifying,
  verified,
  error,
}: SmartcardInputProps) {
  const { isDark } = useAppTheme();
  const traits = getProviderTraits(serviceID);
  const trimmedValue = value.replace(/\s/g, "");
  const canVerify = trimmedValue.length >= 7 && !isVerifying && !verified;

  if (verified) {
    return (
      <View className="gap-1">
        <View className="flex-row items-center justify-between">
          <Text className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {traits.billersCodeLabel}
          </Text>
          {onClear && (
            <Pressable onPress={onClear} hitSlop={8}>
              <Text className="text-xs font-medium text-primary">Change</Text>
            </Pressable>
          )}
        </View>

        <View className="flex-row items-center rounded-2xl border border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20 px-4 py-3">
          <Text className="flex-1 text-[15px] font-medium text-foreground">
            {value}
          </Text>
          <Ionicons
            name="checkmark-circle"
            size={22}
            color={colors.green[500]}
          />
        </View>
      </View>
    );
  }

  return (
    <View className="gap-2">
      <Text className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {traits.billersCodeLabel}
      </Text>

      <View
        className={cn(
          "flex-row items-center rounded-2xl border bg-card overflow-hidden",
          error ? "border-destructive" : "border-border",
        )}
      >
        <View className="pl-4 flex-row items-center flex-1 min-w-0 py-1">
          <TextInput
            className="flex-1 text-[15px] font-normal text-foreground min-h-[48px] py-3"
            placeholder={traits.billersCodePlaceholder}
            placeholderTextColor={isDark ? PLACEHOLDER_DARK : PLACEHOLDER_LIGHT}
            value={value}
            onChangeText={(t) => onChangeText(t.replace(/\s/g, ""))}
            keyboardType={traits.billersCodeIsPhone ? "phone-pad" : "number-pad"}
            maxLength={traits.billersCodeIsPhone ? 11 : 20}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {value.length > 0 && onClear && (
          <Pressable
            onPress={onClear}
            hitSlop={8}
            className="p-2 mr-1"
            accessibilityRole="button"
            accessibilityLabel="Clear"
          >
            <Ionicons name="close-circle" size={20} color={colors.gray[400]} />
          </Pressable>
        )}
      </View>

      {error && <Text className="text-sm text-destructive">{error}</Text>}

      {traits.supportsVerify && (
        <Button
          size="default"
          className="mt-1 rounded-xl"
          onPress={onVerify}
          disabled={!canVerify}
        >
          {isVerifying ? (
            <Spinner color="#fff" size="small" />
          ) : (
            <Text className="text-sm font-semibold text-white">
              Verify {traits.billersCodeLabel.split(" ")[0]}
            </Text>
          )}
        </Button>
      )}
    </View>
  );
}
