import type { ImageSourcePropType } from "react-native";
import { Image, Text, View } from "react-native";

import { colors } from "@/constants/colors";
import type { ReceiptPayload } from "@/lib/transaction-receipt-data";
import { getProviderLogo } from "@/lib/provider-logo";
import type { SingleTransaction } from "@/types";

const LOGO = require("../../../assets/images/icon.png");

export const RECEIPT_CAPTURE_WIDTH = 360;

function providerImageSource(tx: SingleTransaction | undefined): ImageSourcePropType | null {
  if (!tx) return null;
  if (tx.icon && /^https?:\/\//i.test(tx.icon.trim())) {
    return { uri: tx.icon.trim() };
  }
  return getProviderLogo(tx.description);
}

export function TransactionReceiptCard({
  payload,
  tx,
}: {
  payload: ReceiptPayload;
  tx?: SingleTransaction | null;
}) {
  // Receipt is always a light card; keep the amount neutral (dark). The +/-
  // prefix still signals credit vs debit, and the status badge carries colour.
  const amountColor = colors.gray[900];
  const statusColor =
    payload.statusKey === "success"
      ? colors.green[500]
      : payload.statusKey === "pending"
        ? colors.warning
        : payload.statusKey === "reversed"
          ? colors.info
          : colors.error;

  const debitBg = payload.isCredit ? "#DCFCE7" : "#FEE2E2";
  const debitFg = payload.isCredit ? colors.green[500] : "#B91C1C";

  const prov = providerImageSource(tx ?? undefined);

  return (
    <View
      style={{ width: RECEIPT_CAPTURE_WIDTH, backgroundColor: "#FFF7ED" }}
      collapsable={false}
    >
      <View
        style={{
          backgroundColor: colors.white,
          borderRadius: 18,
          overflow: "hidden",
          marginHorizontal: 14,
          marginVertical: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <View style={{ height: 5, flexDirection: "row" }}>
          <View style={{ flex: 1, backgroundColor: colors.orange[500] }} />
          <View style={{ flex: 1, backgroundColor: colors.green[500] }} />
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: "33%", alignItems: "flex-start" }}>
              <Image
                source={LOGO}
                style={{ width: 48, height: 48, borderRadius: 12 }}
                resizeMode="contain"
              />
            </View>
            <View style={{ width: "34%", alignItems: "center", justifyContent: "center" }}>
              {prov ? (
                <Image
                  source={prov}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: colors.gray[200],
                    backgroundColor: colors.white,
                  }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: colors.gray[200],
                    borderStyle: "dashed",
                    backgroundColor: colors.gray[100],
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 4,
                  }}
                >
                  <Text
                    style={{ fontSize: 9, fontWeight: "700", color: colors.gray[500], textAlign: "center" }}
                    numberOfLines={2}
                  >
                    {payload.providerLabel.slice(0, 12)}
                  </Text>
                </View>
              )}
            </View>
            <View style={{ width: "33%" }} />
          </View>

          <Text
            style={{
              textAlign: "center",
              fontSize: 10,
              fontWeight: "800",
              letterSpacing: 1.2,
              color: colors.gray[600],
              marginTop: 12,
            }}
          >
            TRANSACTION RECEIPT
          </Text>
          <Text
            style={{
              textAlign: "center",
              fontSize: 13,
              color: colors.gray[500],
              marginTop: 4,
              marginBottom: 12,
            }}
          >
            {payload.providerLabel}
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: debitBg,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: "800", color: debitFg }}>
                {payload.debitCreditLabel}
              </Text>
            </View>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: "#EFF6FF",
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: "700", color: "#1D4ED8" }}>
                {payload.transactionTypeLabel}
              </Text>
            </View>
          </View>

          <Text style={{ fontSize: 11, color: colors.gray[500], marginBottom: 4 }}>Amount</Text>
          <Text
            style={{
              fontSize: 32,
              fontWeight: "800",
              color: amountColor,
              marginBottom: 12,
              letterSpacing: -0.5,
            }}
          >
            {payload.amountPrefix}₦{payload.amountDisplay}
          </Text>

          <View
            style={{
              alignSelf: "flex-start",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor:
                payload.statusKey === "success"
                  ? "#DCFCE7"
                  : payload.statusKey === "pending"
                    ? "#FEF3C7"
                    : payload.statusKey === "reversed"
                      ? "#EFF6FF"
                      : "#FEE2E2",
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "700", color: statusColor }}>
              {payload.statusLabel}
            </Text>
          </View>

          <View
            style={{
              backgroundColor: colors.gray[100],
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingTop: 12,
              paddingBottom: 4,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: "700",
                letterSpacing: 0.8,
                color: colors.gray[500],
                marginBottom: 8,
              }}
            >
              DETAILS
            </Text>
            {payload.lines.map((line, i) => (
              <View
                key={`${line.label}-${i}`}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 10,
                  borderBottomWidth: i === payload.lines.length - 1 ? 0 : 0.5,
                  borderBottomColor: colors.gray[200],
                  gap: 8,
                }}
              >
                <Text style={{ flex: 0.38, fontSize: 11, color: colors.gray[500] }}>{line.label}</Text>
                <Text
                  style={{
                    flex: 0.62,
                    fontSize: 12,
                    fontWeight: "600",
                    color: colors.gray[900],
                    textAlign: "right",
                  }}
                >
                  {line.value}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
      <Text
        style={{
          textAlign: "center",
          fontSize: 10,
          color: colors.gray[400],
          paddingHorizontal: 24,
          paddingBottom: 20,
        }}
      >
        Generated in SmiPay • For your records only
      </Text>
    </View>
  );
}
