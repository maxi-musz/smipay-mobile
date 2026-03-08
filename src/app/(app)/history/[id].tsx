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
import { useToastStore } from "@/components/ui/toast/toast-store";
import type { HistoryStatus, SingleTransaction, TransactionMeta } from "@/types";

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

  async function copyText(text: string, field: string, label?: string) {
    await Clipboard.setStringAsync(text);
    setCopiedField(field);
    useToastStore.getState().show({
      variant: "success",
      title: "Copied",
      message: `${label ?? field} copied to clipboard.`,
    });
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

            {/* Base Details Card */}
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

              {tx.meta?.product_name && (
                <DetailRow label="Product" value={tx.meta.product_name} />
              )}

              {tx.recipient_mobile && (
                <DetailRow label="Recipient" value={tx.recipient_mobile} />
              )}

              {tx.meta?.phone && !tx.recipient_mobile && (
                <DetailRow label="Phone" value={tx.meta.phone} />
              )}

              {tx.sender && (
                <DetailRow label="Sender" value={tx.sender} />
              )}

              {tx.provider && (
                <DetailRow label="Provider" value={tx.provider} />
              )}

              {tx.meta?.customer_name && (
                <DetailRow label="Customer" value={tx.meta.customer_name} />
              )}

              {tx.meta?.smartcard_number && (
                <DetailRow label="Smartcard No." value={tx.meta.smartcard_number} />
              )}

              {tx.meta?.current_bouquet && (
                <DetailRow label="Bouquet" value={tx.meta.current_bouquet} />
              )}

              {tx.meta?.subscription_type && (
                <DetailRow
                  label="Subscription"
                  value={tx.meta.subscription_type === "renew" ? "Renewal" : "Bouquet Change"}
                />
              )}

              {tx.meta?.meter_number && (
                <DetailRow label="Meter No." value={tx.meta.meter_number} />
              )}

              {tx.meta?.meter_type && (
                <DetailRow
                  label="Meter Type"
                  value={String(tx.meta.meter_type).charAt(0).toUpperCase() + String(tx.meta.meter_type).slice(1)}
                />
              )}

              {tx.meta?.address && (
                <DetailRow label="Address" value={String(tx.meta.address)} />
              )}

              {tx.meta?.units && (
                <DetailRow label="Units" value={String(tx.meta.units)} />
              )}

              {tx.meta?.profile_id && (
                <DetailRow label="JAMB Profile ID" value={tx.meta.profile_id} />
              )}

              {tx.meta?.quantity != null && tx.meta.quantity > 1 && (
                <DetailRow label="Quantity" value={String(tx.meta.quantity)} />
              )}

              {tx.tx_reference && (
                <DetailRow
                  label="Reference"
                  value={tx.tx_reference}
                  isMono
                  onCopy={() => copyText(tx.tx_reference!, "ref", "Reference")}
                  isCopied={copiedField === "ref"}
                />
              )}

              <DetailRow label="Date" value={tx.created_on} isLast />
            </View>

            {/* Credentials Card — Education PINs/Serials */}
            {tx.type === "education" &&
              tx.status === "success" &&
              tx.meta &&
              hasCredentials(tx.meta) && (
                <View
                  className="mx-5 mt-4 rounded-2xl px-5 py-4"
                  style={{ backgroundColor: cardBg }}
                >
                  <Text className="mb-3 text-sm font-semibold text-foreground">
                    Credentials
                  </Text>

                  {/* Single PIN (WAEC Reg / JAMB) */}
                  {tx.meta.pin && !tx.meta.cards?.length && (
                    <CredentialCopyRow
                      label={tx.meta.serial ? "PIN" : "Token / PIN"}
                      value={tx.meta.pin}
                      fieldKey="pin"
                      onCopy={copyText}
                      isCopied={copiedField === "pin"}
                    />
                  )}

                  {/* Serial (WAEC Result Checker single) */}
                  {tx.meta.serial && !tx.meta.cards?.length && (
                    <CredentialCopyRow
                      label="Serial Number"
                      value={tx.meta.serial}
                      fieldKey="serial"
                      onCopy={copyText}
                      isCopied={copiedField === "serial"}
                    />
                  )}

                  {/* Multiple cards (WAEC Result Checker with quantity) */}
                  {tx.meta.cards &&
                    tx.meta.cards.length > 0 &&
                    tx.meta.cards.map((card, i) => (
                      <View
                        key={`card-${i}`}
                        className="mb-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3"
                      >
                        {tx.meta!.cards!.length > 1 && (
                          <Text className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                            Card {i + 1}
                          </Text>
                        )}
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1 mr-2">
                            <Text className="text-[10px] text-muted-foreground uppercase">
                              Serial
                            </Text>
                            <Text
                              className="text-[13px] font-bold text-foreground"
                              selectable
                            >
                              {card.Serial}
                            </Text>
                          </View>
                          <Pressable
                            onPress={() =>
                              copyText(card.Serial, `serial-${i}`, "Serial")
                            }
                            hitSlop={8}
                            className="rounded-lg bg-primary/10 p-1.5"
                          >
                            <Ionicons
                              name={
                                copiedField === `serial-${i}`
                                  ? "checkmark-circle"
                                  : "copy-outline"
                              }
                              size={14}
                              color={
                                copiedField === `serial-${i}`
                                  ? colors.green[500]
                                  : colors.orange[500]
                              }
                            />
                          </Pressable>
                        </View>
                        <View className="h-px bg-border my-1.5" />
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1 mr-2">
                            <Text className="text-[10px] text-muted-foreground uppercase">
                              PIN
                            </Text>
                            <Text
                              className="text-[13px] font-bold text-foreground"
                              selectable
                            >
                              {card.Pin}
                            </Text>
                          </View>
                          <Pressable
                            onPress={() =>
                              copyText(card.Pin, `pin-${i}`, "PIN")
                            }
                            hitSlop={8}
                            className="rounded-lg bg-primary/10 p-1.5"
                          >
                            <Ionicons
                              name={
                                copiedField === `pin-${i}`
                                  ? "checkmark-circle"
                                  : "copy-outline"
                              }
                              size={14}
                              color={
                                copiedField === `pin-${i}`
                                  ? colors.green[500]
                                  : colors.orange[500]
                              }
                            />
                          </Pressable>
                        </View>
                      </View>
                    ))}
                </View>
              )}

            {/* Electricity Token Card */}
            {tx.type === "electricity" &&
              tx.status === "success" &&
              tx.meta?.electricity_token && (
                <View
                  className="mx-5 mt-4 rounded-2xl px-5 py-4"
                  style={{ backgroundColor: cardBg }}
                >
                  <Text className="mb-3 text-sm font-semibold text-foreground">
                    Electricity Token
                  </Text>
                  <CredentialCopyRow
                    label="Token"
                    value={tx.meta.electricity_token}
                    fieldKey="elec-token"
                    onCopy={copyText}
                    isCopied={copiedField === "elec-token"}
                  />
                </View>
              )}

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

function CredentialCopyRow({
  label,
  value,
  fieldKey,
  onCopy,
  isCopied,
}: {
  label: string;
  value: string;
  fieldKey: string;
  onCopy: (text: string, field: string, label: string) => void;
  isCopied: boolean;
}) {
  return (
    <View className="mb-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3">
      <Text className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </Text>
      <View className="flex-row items-center justify-between mt-1">
        <Text
          className="text-base font-bold text-foreground flex-1 mr-2"
          selectable
          numberOfLines={1}
        >
          {value}
        </Text>
        <Pressable
          onPress={() => onCopy(value, fieldKey, label)}
          hitSlop={8}
          className="rounded-lg bg-primary/10 p-1.5"
        >
          <Ionicons
            name={isCopied ? "checkmark-circle" : "copy-outline"}
            size={14}
            color={isCopied ? colors.green[500] : colors.orange[500]}
          />
        </Pressable>
      </View>
    </View>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────── */

function hasCredentials(meta: TransactionMeta): boolean {
  return !!(
    meta.pin ||
    meta.serial ||
    (meta.cards && meta.cards.length > 0) ||
    (meta.tokens && meta.tokens.length > 0)
  );
}

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
  if (tx.meta?.product_name) return tx.meta.product_name;
  if (tx.provider) return tx.provider;

  const desc = tx.description.toLowerCase();
  if (desc.includes("mtn")) return "MTN";
  if (desc.includes("glo")) return "Glo";
  if (desc.includes("airtel")) return "Airtel";
  if (desc.includes("9mobile") || desc.includes("etisalat")) return "9mobile";
  if (desc.includes("dstv")) return "DStv";
  if (desc.includes("gotv")) return "GOtv";
  if (desc.includes("startimes")) return "StarTimes";
  if (desc.includes("showmax")) return "Showmax";
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
    case "electricity":
      return "Electricity";
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
    case "electricity":
      return "Electricity";
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
    case "electricity":
      return "flash-outline";
    case "referral_bonus":
      return "gift-outline";
    default:
      return "receipt-outline";
  }
}
