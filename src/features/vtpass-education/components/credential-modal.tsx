import { Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { BottomSheetModal } from "@/components/ui/modals";
import { colors } from "@/constants/colors";
import { useToastStore } from "@/components/ui/toast/toast-store";
import type { EducationCredentials, WaecCard } from "@/types/vtpass-education";

function copyToClipboard(value: string, label: string) {
  Clipboard.setStringAsync(value);
  useToastStore.getState().show({
    variant: "success",
    title: "Copied",
    message: `${label} copied to clipboard.`,
  });
}

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="w-full rounded-xl border border-dashed border-primary bg-primary/5 px-4 py-2.5">
      <Text className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </Text>
      <View className="flex-row items-center justify-between mt-1">
        <Text
          className="text-base font-bold text-foreground tracking-wider flex-1 mr-2"
          selectable
          numberOfLines={1}
        >
          {value}
        </Text>
        <Pressable
          onPress={() => copyToClipboard(value, label)}
          hitSlop={10}
          className="flex-row items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5"
        >
          <Ionicons name="copy-outline" size={14} color={colors.orange[500]} />
          <Text className="text-[11px] font-semibold text-primary">Copy</Text>
        </Pressable>
      </View>
    </View>
  );
}

function CompactCardRow({ card, index }: { card: WaecCard; index: number }) {
  return (
    <View className="w-full rounded-xl border border-dashed border-primary bg-primary/5 px-4 py-2.5">
      {index >= 0 && (
        <Text className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
          Card {index + 1}
        </Text>
      )}
      <View className="flex-row items-center justify-between">
        <View className="flex-1 mr-2">
          <Text className="text-[10px] text-muted-foreground uppercase">Serial</Text>
          <Text className="text-[13px] font-bold text-foreground" selectable numberOfLines={1}>
            {card.Serial}
          </Text>
        </View>
        <Pressable
          onPress={() => copyToClipboard(card.Serial, "Serial")}
          hitSlop={8}
          className="rounded-lg bg-primary/10 p-1.5"
        >
          <Ionicons name="copy-outline" size={14} color={colors.orange[500]} />
        </Pressable>
      </View>
      <View className="h-px bg-border my-1.5" />
      <View className="flex-row items-center justify-between">
        <View className="flex-1 mr-2">
          <Text className="text-[10px] text-muted-foreground uppercase">PIN</Text>
          <Text className="text-[13px] font-bold text-foreground" selectable numberOfLines={1}>
            {card.Pin}
          </Text>
        </View>
        <Pressable
          onPress={() => copyToClipboard(card.Pin, "PIN")}
          hitSlop={8}
          className="rounded-lg bg-primary/10 p-1.5"
        >
          <Ionicons name="copy-outline" size={14} color={colors.orange[500]} />
        </Pressable>
      </View>
    </View>
  );
}

interface CredentialModalProps {
  visible: boolean;
  title: string;
  message: string;
  credentials: EducationCredentials | null;
  credentialType: "token" | "serial-pin" | "pin";
  onClose: () => void;
}

export function CredentialModal({
  visible,
  title,
  message,
  credentials,
  credentialType,
  onClose,
}: CredentialModalProps) {
  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      closeOnBackdrop
      showHandle
    >
      <View>
        {/* Header — always visible */}
        <View className="items-center gap-1.5 pb-3">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-green-50 dark:bg-green-950">
            <Ionicons
              name="checkmark-circle"
              size={34}
              color={colors.green[500]}
            />
          </View>
          <Text className="text-base font-semibold text-foreground text-center">
            {title}
          </Text>
          <Text className="text-xs text-muted-foreground text-center">
            {message}
          </Text>
        </View>

        {/* Scrollable credentials */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
        >
          {credentials && credentialType === "token" && credentials.pin && (
            <CopyRow label="Registration Token" value={credentials.pin} />
          )}

          {credentials && credentialType === "pin" && credentials.pin && (
            <CopyRow label="PIN" value={credentials.pin} />
          )}

          {credentials &&
            credentialType === "serial-pin" &&
            credentials.cards &&
            credentials.cards.length > 0 &&
            credentials.cards.map((card, i) => (
              <CompactCardRow
                key={`${card.Serial}-${i}`}
                card={card}
                index={credentials.cards!.length > 1 ? i : -1}
              />
            ))}

          {credentials &&
            credentialType === "serial-pin" &&
            (!credentials.cards || credentials.cards.length === 0) &&
            credentials.pin && (
              <>
                {credentials.serial && (
                  <CopyRow label="Serial Number" value={credentials.serial} />
                )}
                <CopyRow label="PIN" value={credentials.pin} />
              </>
            )}
        </ScrollView>

        {/* Pinned Done button */}
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
