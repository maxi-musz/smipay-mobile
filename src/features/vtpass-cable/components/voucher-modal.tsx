import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { BottomSheetModal } from "@/components/ui/modals";
import { colors } from "@/constants/colors";
import { useToastStore } from "@/components/ui/toast/toast-store";

interface VoucherModalProps {
  visible: boolean;
  voucherCode: string;
  onClose: () => void;
}

export function VoucherModal({
  visible,
  voucherCode,
  onClose,
}: VoucherModalProps) {
  async function handleCopy() {
    await Clipboard.setStringAsync(voucherCode);
    useToastStore.getState().show({
      variant: "success",
      title: "Copied",
      message: "Voucher code copied to clipboard.",
    });
  }

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      closeOnBackdrop
      showHandle
    >
      <View className="items-center gap-5 pb-4">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-green-50 dark:bg-green-950">
          <Ionicons
            name="checkmark-circle"
            size={48}
            color={colors.green[500]}
          />
        </View>

        <Text className="text-lg font-semibold text-foreground text-center">
          Showmax Subscription Ready!
        </Text>
        <Text className="text-sm text-muted-foreground text-center">
          Use the voucher code below to activate your subscription on Showmax.
        </Text>

        <View className="w-full rounded-2xl border border-dashed border-primary bg-primary/5 px-5 py-4">
          <Text className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Voucher Code
          </Text>
          <Text
            className="mt-2 text-center text-2xl font-bold text-foreground tracking-wider"
            selectable
          >
            {voucherCode}
          </Text>
        </View>

        <Pressable
          onPress={handleCopy}
          className="flex-row items-center gap-2 rounded-xl border border-border px-5 py-3 active:bg-muted/50"
        >
          <Ionicons name="copy-outline" size={20} color={colors.orange[500]} />
          <Text className="text-sm font-semibold text-primary">
            Copy to Clipboard
          </Text>
        </Pressable>

        <Button
          size="lg"
          className="w-full rounded-xl"
          style={{ backgroundColor: colors.green[500] }}
          onPress={onClose}
        >
          <Text className="text-base font-semibold text-white">Done</Text>
        </Button>
      </View>
    </BottomSheetModal>
  );
}
