import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";

import { BottomSheetModal } from "@/components/ui/modals";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useToastStore } from "@/components/ui/toast/toast-store";
import { colors } from "@/constants/colors";
import { getBankLogo } from "@/lib/bank-logo";
import { cn } from "@/lib/utils";
import type { AccountDVA } from "@/types";

interface AccountDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  accounts: AccountDVA[];
}

export function AccountDetailsModal({
  visible,
  onClose,
  accounts,
}: AccountDetailsModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSelectedIndex(0);
    setCopied(false);
  }, [visible, accounts]);

  useEffect(() => {
    if (selectedIndex >= accounts.length && accounts.length > 0) {
      setSelectedIndex(0);
    }
  }, [accounts.length, selectedIndex]);

  const selected =
    accounts.length > 0 ? accounts[Math.min(selectedIndex, accounts.length - 1)] : null;
  const bankLogoSource = selected ? getBankLogo(selected.bank_name) : null;

  async function handleCopyAccountNumber() {
    if (!selected?.account_number) return;
    await Clipboard.setStringAsync(selected.account_number);
    setCopied(true);
    useToastStore.getState().show({
      variant: "success",
      title: "Copied",
      message: "Account number copied to clipboard.",
    });
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title="Add Money"
      closeOnBackdrop
      showHandle
    >
      {accounts.length === 0 ? (
        <View className="items-center gap-4 pb-4 pt-2">
          <View
            className="h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(245,130,32,0.15)" }}
          >
            <Ionicons name="business-outline" size={28} color={colors.orange[500]} />
          </View>
          <Text className="text-center text-lg font-semibold text-foreground">
            No account assigned yet
          </Text>
          <Text className="px-2 text-center text-sm leading-6 text-muted-foreground">
            Please contact support to set up your funding account.
          </Text>
          <Button
            className="mt-2 w-full rounded-2xl"
            style={{ backgroundColor: colors.orange[500] }}
            onPress={onClose}
          >
            <Text className="font-semibold text-white">Done</Text>
          </Button>
        </View>
      ) : (
        <View className="gap-4 pb-2">
          <Text className="text-sm leading-5 text-muted-foreground">
            Transfer to any of these accounts to fund your wallet instantly.
          </Text>

          {accounts.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingRight: 8 }}
            >
              {accounts.map((acct, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <Pressable
                    key={acct.id}
                    onPress={() => {
                      setSelectedIndex(idx);
                      setCopied(false);
                    }}
                    className={cn(
                      "rounded-full px-4 py-2.5",
                      isSelected ? "bg-primary" : "bg-muted/50",
                    )}
                  >
                    <Text
                      className={cn(
                        "text-[13px] font-semibold",
                        isSelected ? "text-white" : "text-muted-foreground",
                      )}
                      numberOfLines={1}
                    >
                      {acct.bank_name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {selected && (
            <View className="rounded-2xl border border-border bg-card p-4">
              <View className="flex-row items-start gap-3">
                {bankLogoSource ? (
                  <Image
                    source={bankLogoSource}
                    style={{ width: 44, height: 44, borderRadius: 12 }}
                    resizeMode="contain"
                  />
                ) : (
                  <View
                    className="h-11 w-11 items-center justify-center rounded-xl"
                    style={{ backgroundColor: "rgba(245,130,32,0.12)" }}
                  >
                    <Ionicons name="business" size={22} color={colors.orange[500]} />
                  </View>
                )}
                <View className="min-w-0 flex-1">
                  <Text className="text-base font-semibold text-foreground">
                    {selected.bank_name}
                  </Text>
                  <Text className="mt-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {(selected.currency ?? "").toUpperCase() || "—"}
                  </Text>
                </View>
              </View>

              <View className="mt-4 rounded-xl bg-muted/30 px-3 py-3">
                <Text className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Account number
                </Text>
                <View className="mt-2 flex-row flex-wrap items-center gap-2">
                  <Text
                    className="flex-1 font-mono text-xl font-bold tracking-widest text-foreground"
                    selectable
                  >
                    {selected.account_number}
                  </Text>
                  <Pressable
                    onPress={handleCopyAccountNumber}
                    className="flex-row items-center gap-1 rounded-lg bg-primary/15 px-3 py-2"
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
                      {copied ? "Copied!" : "Copy"}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {selected.account_holder_name ? (
                <View className="mt-3 flex-row items-start justify-between gap-3 border-t border-border pt-3">
                  <Text className="text-[13px] text-muted-foreground">Account name</Text>
                  <Text
                    className="flex-1 text-right text-[13px] font-medium leading-5 text-foreground"
                    numberOfLines={3}
                  >
                    {selected.account_holder_name}
                  </Text>
                </View>
              ) : null}
            </View>
          )}
        </View>
      )}
    </BottomSheetModal>
  );
}
