import { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";

import { fetchTransactionById } from "@/api";
import { Text } from "@/components/ui/text";
import { FullPageLoader } from "@/components/ui/loaders";
import { useAppTheme } from "@/hooks/use-app-theme";
import { colors } from "@/constants/colors";
import { getProviderLogo } from "@/lib/provider-logo";
import type { HistoryStatus, SingleTransaction } from "@/types";

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark } = useAppTheme();
  const [tx, setTx] = useState<SingleTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        setError(null);
        setLoading(true);
        const response = await fetchTransactionById(String(id));
        setTx(response.data);
      } catch {
        setError("Unable to load this transaction.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  async function copyToClipboard(text: string, field: string) {
    await Clipboard.setStringAsync(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  const bg = isDark ? "#020617" : "#F8F9FB";
  const cardBg = isDark ? "#111827" : "#FFFFFF";
  const status = tx?.status as HistoryStatus | undefined;
  const statusConfig = status ? STATUS_MAP[status] : null;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1" style={{ backgroundColor: bg }}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pb-3 pt-14">
          <Pressable
            onPress={() => router.back()}
            className="h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F3F4F6" }}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={isDark ? "#E5E7EB" : "#111827"}
            />
          </Pressable>
          <Text className="text-base font-semibold text-foreground">
            Transaction Details
          </Text>
          <View className="h-9 w-9" />
        </View>

        {loading ? (
          <FullPageLoader message="Loading..." />
        ) : error || !tx ? (
          <View className="flex-1 items-center justify-center px-8">
            <Ionicons
              name="alert-circle-outline"
              size={48}
              color={isDark ? "#FBBF24" : "#D97706"}
            />
            <Text className="mt-3 text-center text-muted-foreground">
              {error ?? "Transaction not found."}
            </Text>
          </View>
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerClassName="pb-10"
            showsVerticalScrollIndicator={false}
          >
            {/* Hero: Logo + Amount + Status */}
            <View className="items-center px-6 pt-6 pb-5">
              <HeroIcon tx={tx} isDark={isDark} />

              <Text className="mt-3 text-sm font-medium text-muted-foreground">
                {getProviderLabel(tx)}
              </Text>

              <Text className="mt-2 text-3xl font-bold text-foreground">
                ₦{tx.amount}
              </Text>

              {statusConfig && (
                <View className="mt-2 flex-row items-center gap-1.5">
                  <Ionicons
                    name={statusConfig.icon}
                    size={16}
                    color={statusConfig.color}
                  />
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: statusConfig.color }}
                  >
                    {statusConfig.label}
                  </Text>
                </View>
              )}
            </View>

            {/* Details Card */}
            <View
              className="mx-5 mt-2 rounded-2xl px-5 py-4"
              style={{ backgroundColor: cardBg }}
            >
              <Text className="mb-3 text-sm font-semibold text-foreground">
                Transaction Details
              </Text>

              {tx.description && (
                <DetailRow label="Description" value={tx.description} />
              )}

              <DetailRow label="Transaction Type" value={formatType(tx.type)} />

              {tx.recipient_mobile && (
                <DetailRow label="Recipient Mobile" value={tx.recipient_mobile} />
              )}

              {tx.sender && (
                <DetailRow label="Sender" value={tx.sender} />
              )}

              {tx.provider && (
                <DetailRow label="Provider" value={tx.provider} />
              )}

              {tx.tx_reference && (
                <DetailRow
                  label="Transaction No."
                  value={tx.tx_reference}
                  isMono
                  onCopy={() => copyToClipboard(tx.tx_reference!, "ref")}
                  isCopied={copiedField === "ref"}
                />
              )}

              <DetailRow label="Date" value={tx.created_on} isLast />
            </View>

            {/* Action Buttons */}
            <View className="mx-5 mt-5 flex-row gap-3">
              <Pressable
                className="flex-1 items-center rounded-xl border py-3.5"
                style={{
                  borderColor: isDark ? "#374151" : "#E5E7EB",
                  backgroundColor: isDark ? "#111827" : "#FFFFFF",
                }}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{ color: colors.orange[500] }}
                >
                  Report Issue
                </Text>
              </Pressable>

              <Pressable
                className="flex-1 items-center rounded-xl py-3.5"
                style={{ backgroundColor: colors.green[500] }}
              >
                <Text className="text-sm font-semibold text-white">
                  Share Receipt
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        )}
      </View>
    </>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────── */

function HeroIcon({
  tx,
  isDark,
}: {
  tx: SingleTransaction;
  isDark: boolean;
}) {
  const localLogo = getProviderLogo(tx.description);

  if (localLogo) {
    return (
      <View
        className="h-16 w-16 items-center justify-center overflow-hidden rounded-full"
        style={{
          backgroundColor: isDark ? "#1F2937" : "#F3F4F6",
        }}
      >
        <Image
          source={localLogo}
          className="h-14 w-14 rounded-full"
          resizeMode="cover"
        />
      </View>
    );
  }

  const isCredit = tx.type === "deposit" || tx.type === "referral_bonus";
  if (isCredit) {
    return (
      <View
        className="h-16 w-16 items-center justify-center rounded-full"
        style={{ backgroundColor: isDark ? "#052E16" : "#DCFCE7" }}
      >
        <Ionicons name="arrow-down" size={28} color={colors.green[500]} />
      </View>
    );
  }

  if (tx.icon) {
    return (
      <View
        className="h-16 w-16 items-center justify-center overflow-hidden rounded-full"
        style={{
          backgroundColor: isDark ? "#1F2937" : "#F3F4F6",
        }}
      >
        <Image
          source={{ uri: tx.icon }}
          className="h-14 w-14 rounded-full"
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <View
      className="h-16 w-16 items-center justify-center rounded-full"
      style={{ backgroundColor: isDark ? "#1C1917" : colors.orange[50] }}
    >
      <Ionicons name={getTypeIcon(tx.type)} size={26} color={colors.orange[500]} />
    </View>
  );
}

function DetailRow({
  label,
  value,
  isMono,
  isLast,
  onCopy,
  isCopied,
}: {
  label: string;
  value: string;
  isMono?: boolean;
  isLast?: boolean;
  onCopy?: () => void;
  isCopied?: boolean;
}) {
  return (
    <View
      className="flex-row items-start justify-between py-3"
      style={
        !isLast
          ? { borderBottomWidth: 0.5, borderBottomColor: "rgba(156,163,175,0.2)" }
          : undefined
      }
    >
      <Text className="mr-4 text-[13px] text-muted-foreground">{label}</Text>
      <View className="flex-1 flex-row items-center justify-end gap-1.5">
        <Text
          className="text-right text-[13px] font-medium text-foreground"
          style={isMono ? { fontFamily: "Menlo", fontSize: 11 } : undefined}
          numberOfLines={3}
        >
          {value}
        </Text>
        {onCopy && (
          <Pressable onPress={onCopy} hitSlop={8}>
            <Ionicons
              name={isCopied ? "checkmark-circle" : "copy-outline"}
              size={14}
              color={isCopied ? colors.green[500] : "#9CA3AF"}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────── */

const STATUS_MAP: Record<
  HistoryStatus,
  { label: string; color: string; icon: React.ComponentProps<typeof Ionicons>["name"] }
> = {
  success: { label: "Successful", color: colors.green[500], icon: "checkmark-circle" },
  pending: { label: "Pending", color: colors.warning, icon: "time" },
  failed: { label: "Failed", color: colors.error, icon: "close-circle" },
  cancelled: { label: "Cancelled", color: colors.gray[500], icon: "close-circle" },
};

function getProviderLabel(tx: SingleTransaction): string {
  if (tx.provider) return tx.provider;

  const desc = tx.description.toLowerCase();
  if (desc.includes("mtn")) return "MTN";
  if (desc.includes("glo")) return "Glo";
  if (desc.includes("airtel")) return "Airtel";
  if (desc.includes("9mobile") || desc.includes("etisalat")) return "9mobile";
  if (desc.includes("dstv")) return "DStv";
  if (desc.includes("gotv")) return "GOtv";
  if (desc.includes("startimes")) return "StarTimes";
  if (desc.includes("jamb")) return "JAMB";
  if (desc.includes("waec")) return "WAEC";

  switch (tx.type) {
    case "deposit":
      return "Wallet Funding";
    case "transfer":
      return "Transfer";
    case "airtime":
      return "Airtime";
    case "data":
      return "Data";
    case "cable":
      return "Cable TV";
    case "education":
      return "Education";
    case "referral_bonus":
      return "Referral Bonus";
    default:
      return tx.type;
  }
}

function formatType(type: string) {
  switch (type) {
    case "deposit":
      return "Deposit";
    case "transfer":
      return "Transfer";
    case "airtime":
      return "Airtime";
    case "data":
      return "Data";
    case "cable":
      return "Cable TV";
    case "education":
      return "Education";
    case "referral_bonus":
      return "Referral Bonus";
    default:
      return type;
  }
}

function getTypeIcon(type: string): React.ComponentProps<typeof Ionicons>["name"] {
  switch (type) {
    case "deposit":
      return "download-outline";
    case "transfer":
      return "swap-horizontal-outline";
    case "airtime":
      return "call-outline";
    case "data":
      return "wifi-outline";
    case "cable":
      return "tv-outline";
    case "education":
      return "school-outline";
    case "referral_bonus":
      return "gift-outline";
    default:
      return "receipt-outline";
  }
}
