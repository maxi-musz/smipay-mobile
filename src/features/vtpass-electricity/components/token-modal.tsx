import { Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { BottomSheetModal } from "@/components/ui/modals";
import { colors } from "@/constants/colors";
import { useToastStore } from "@/components/ui/toast/toast-store";
import { formatNaira } from "../lib/constants";

interface TokenModalProps {
  visible: boolean;
  token: string;
  units?: string;
  customerName?: string;
  amount?: number;
  onClose: () => void;
}

export function TokenModal({
  visible,
  token,
  units,
  customerName,
  amount,
  onClose,
}: TokenModalProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopyToken() {
    await Clipboard.setStringAsync(token);
    setCopied(true);
    useToastStore.getState().show({
      variant: "success",
      title: "Copied",
      message: "Electricity token copied to clipboard.",
    });
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      closeOnBackdrop={false}
      showHandle
    >
      <View className="relative">
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={{ paddingBottom: 4 }}
        >
          {/* Success icon */}
          <View className="items-center pt-4 pb-2">
            <View
              className="h-[34px] w-[34px] items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(34,197,94,0.12)" }}
            >
              <Ionicons name="flash" size={20} color={colors.green[500]} />
            </View>
            <Text className="mt-2 text-base font-bold text-foreground">
              Token Ready!
            </Text>
            <Text className="mt-1 text-xs text-muted-foreground text-center px-6">
              Enter this token on your meter to load electricity.
            </Text>
          </View>

          {/* Token display */}
          <View className="mx-2 mt-3 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 px-4 py-4">
            <Text className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider text-center">
              Electricity Token
            </Text>
            <Text
              className="mt-2 text-center text-xl font-bold text-foreground tracking-widest"
              selectable
            >
              {token}
            </Text>
            <Pressable
              onPress={handleCopyToken}
              className="mt-3 self-center flex-row items-center gap-1.5 rounded-lg bg-primary/15 px-4 py-2"
            >
              <Ionicons
                name={copied ? "checkmark-circle" : "copy-outline"}
                size={16}
                color={copied ? colors.green[500] : colors.orange[500]}
              />
              <Text
                className="text-xs font-semibold"
                style={{
                  color: copied ? colors.green[500] : colors.orange[500],
                }}
              >
                {copied ? "Copied!" : "Copy Token"}
              </Text>
            </Pressable>
          </View>

          {/* Details */}
          {(units || customerName || (amount && amount > 0)) && (
            <View className="mx-2 mt-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 px-4 py-2">
              {units && (
                <View className="flex-row items-center justify-between py-2 border-b border-border">
                  <Text className="text-[13px] text-muted-foreground">
                    Units
                  </Text>
                  <Text className="text-[13px] font-semibold text-foreground">
                    {units}
                  </Text>
                </View>
              )}
              {customerName && (
                <View className="flex-row items-center justify-between py-2 border-b border-border">
                  <Text className="text-[13px] text-muted-foreground">
                    Customer
                  </Text>
                  <Text className="text-[13px] font-medium text-foreground">
                    {customerName}
                  </Text>
                </View>
              )}
              {amount != null && amount > 0 && (
                <View className="flex-row items-center justify-between py-2">
                  <Text className="text-[13px] text-muted-foreground">
                    Amount
                  </Text>
                  <Text className="text-[13px] font-medium text-foreground">
                    {formatNaira(amount)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        <Button
          size="lg"
          className="mt-4 w-full rounded-xl"
          style={{ backgroundColor: colors.green[500] }}
          onPress={onClose}
        >
          <Text className="text-base font-semibold text-white">Done</Text>
        </Button>
      </View>
    </BottomSheetModal>
  );
}
