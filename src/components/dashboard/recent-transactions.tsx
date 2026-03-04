import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import { colors } from "@/constants/colors";
import type { TransactionItem } from "@/types";

type TransactionStatus = "successful" | "pending" | "failed" | "cancelled";

interface RecentTransactionsProps {
  transactions: TransactionItem[];
}

const STATUS_CONFIG: Record<
  TransactionStatus,
  { label: string; color: string; bgColor: string }
> = {
  successful: {
    label: "SUCCESS",
    color: colors.green[500],
    bgColor: colors.green[50],
  },
  pending: {
    label: "PENDING",
    color: colors.warning,
    bgColor: "#FFFBEB",
  },
  failed: {
    label: "FAILED",
    color: colors.error,
    bgColor: "#FEF2F2",
  },
  cancelled: {
    label: "CANCELLED",
    color: colors.error,
    bgColor: "#FEF2F2",
  },
};

function formatAmount(amount: number, creditDebit: "credit" | "debit"): string {
  const sign = creditDebit === "credit" ? "+" : "-";
  return `${sign}₦${new Intl.NumberFormat("en-NG").format(amount)}`;
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const { isDark } = useAppTheme();

  return (
    <View className="mt-6 px-5">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-[15px] font-semibold text-foreground">
          Recent Transactions
        </Text>
        {transactions.length > 0 && (
          <Pressable onPress={() => router.push("/(app)/(tabs)/history")}>
            <Text className="text-sm text-primary">See All</Text>
          </Pressable>
        )}
      </View>

      {transactions.length === 0 ? (
        <EmptyState isDark={isDark} />
      ) : (
        <View className="overflow-hidden rounded-2xl bg-card">
          {transactions.map((tx, index) => (
            <TransactionRow
              key={tx.id}
              transaction={tx}
              isLast={index === transactions.length - 1}
              isDark={isDark}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function EmptyState({ isDark }: { isDark: boolean }) {
  return (
    <View className="items-center rounded-2xl bg-card px-6 py-10">
      <Ionicons
        name="receipt-outline"
        size={40}
        color={isDark ? "#808999" : "#9CA3B0"}
      />
      <Text className="mt-3 text-center text-muted-foreground">
        No transactions yet
      </Text>
    </View>
  );
}

function TransactionRow({
  transaction,
  isLast,
  isDark,
}: {
  transaction: TransactionItem;
  isLast: boolean;
  isDark: boolean;
}) {
  const statusKey = transaction.status as TransactionStatus;
  const status = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.pending;
  const amountColor =
    transaction.credit_debit === "credit" ? colors.green[500] : colors.error;

  const iconBg = isDark ? "rgba(255,255,255,0.08)" : colors.gray[100];
  const iconColor = isDark ? colors.gray[400] : colors.gray[500];

  return (
    <Pressable
      className={`flex-row items-center px-4 py-3.5 active:opacity-80 ${
        !isLast ? "border-b border-border" : ""
      }`}
    >
      <View
        className="mr-3 h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: iconBg }}
      >
        <Ionicons
          name={
            transaction.credit_debit === "credit"
              ? "arrow-down-outline"
              : "arrow-up-outline"
          }
          size={18}
          color={iconColor}
        />
      </View>

      <View className="flex-1">
        <Text className="text-[15px] font-medium text-foreground">
          {transaction.description}
        </Text>
        <Text className="mt-0.5 text-xs text-muted-foreground">
          {transaction.date}
        </Text>
      </View>

      <View className="items-end">
        <Text className="text-[15px] font-semibold" style={{ color: amountColor }}>
          {formatAmount(transaction.amount, transaction.credit_debit)}
        </Text>
        <View
          className="mt-1 rounded-full px-2 py-0.5"
          style={{
            backgroundColor: isDark
              ? `${status.color}20`
              : status.bgColor,
          }}
        >
          <Text
            className="text-[9px] font-bold"
            style={{ color: status.color }}
          >
            {status.label}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
