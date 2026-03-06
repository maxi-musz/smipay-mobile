import { Image, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import { colors } from "@/constants/colors";
import { getProviderLogo } from "@/lib/provider-logo";
import type { TransactionItem } from "@/types";

type TransactionStatus = "success" | "successful" | "pending" | "failed" | "cancelled";

interface RecentTransactionsProps {
  transactions: TransactionItem[];
  /** When true, show refresh state instead of list/empty. */
  loadFailed?: boolean;
  /** Called when the user taps to retry after load failed. */
  onRetry?: () => void;
}

const STATUS_CONFIG: Record<
  TransactionStatus,
  { label: string; color: string; bgColor: string }
> = {
  success: {
    label: "SUCCESS",
    color: colors.green[500],
    bgColor: colors.green[50],
  },
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

export function RecentTransactions({
  transactions,
  loadFailed = false,
  onRetry,
}: RecentTransactionsProps) {
  const { isDark } = useAppTheme();

  return (
    <View className="mt-6 px-5">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-[15px] font-semibold text-foreground">
          Recent Transactions
        </Text>
        {transactions.length > 0 && !loadFailed && (
          <Pressable onPress={() => router.push("/(app)/(tabs)/history")}>
            <Text className="text-sm text-primary">See All</Text>
          </Pressable>
        )}
      </View>

      {loadFailed ? (
        <Pressable
          onPress={onRetry}
          className="items-center rounded-2xl bg-card px-6 py-10"
        >
          <Ionicons
            name="refresh"
            size={40}
            color={isDark ? "#808999" : "#9CA3B0"}
          />
          <Text className="mt-3 text-center text-muted-foreground">
            Couldn't load transactions. Tap to retry.
          </Text>
        </Pressable>
      ) : transactions.length === 0 ? (
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

  const localLogo = getProviderLogo(transaction.description);
  const isCredit = transaction.credit_debit === "credit";

  return (
    <Pressable
      onPress={() => router.push(`/(app)/history/${transaction.id}`)}
      className={`flex-row items-center px-4 py-3.5 active:opacity-80 ${
        !isLast ? "border-b border-border" : ""
      }`}
    >
      <TxIcon
        localLogo={localLogo}
        remoteIcon={transaction.icon}
        isCredit={isCredit}
        isDark={isDark}
      />

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

function TxIcon({
  localLogo,
  remoteIcon,
  isCredit,
  isDark,
}: {
  localLogo: ReturnType<typeof getProviderLogo>;
  remoteIcon: string | null;
  isCredit: boolean;
  isDark: boolean;
}) {
  if (localLogo) {
    return (
      <Image
        source={localLogo}
        className="mr-3 h-10 w-10 rounded-full"
        resizeMode="cover"
      />
    );
  }

  if (isCredit) {
    return (
      <View
        className="mr-3 h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: isDark ? "#052E16" : "#DCFCE7" }}
      >
        <Ionicons name="arrow-down" size={18} color={colors.green[500]} />
      </View>
    );
  }

  if (remoteIcon) {
    return (
      <Image
        source={{ uri: remoteIcon }}
        className="mr-3 h-10 w-10 rounded-full"
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      className="mr-3 h-10 w-10 items-center justify-center rounded-full"
      style={{
        backgroundColor: isDark ? "rgba(255,255,255,0.08)" : colors.gray[100],
      }}
    >
      <Ionicons
        name="arrow-up"
        size={18}
        color={isDark ? colors.gray[400] : colors.gray[500]}
      />
    </View>
  );
}
