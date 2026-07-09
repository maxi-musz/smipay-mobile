import { useEffect } from "react";
import { Image, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, {
  Easing,
  FadeInUp,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useResponsiveScale } from "@/hooks/use-responsive-scale";
import { colors } from "@/constants/colors";
import { getProviderLogo } from "@/lib/provider-logo";
import { isUnsuccessfulTransactionStatus } from "@/lib/transaction-display";
import type { TransactionItem } from "@/types";

type TransactionStatus = "success" | "successful" | "pending" | "failed" | "cancelled" | "reversed";

interface RecentTransactionsProps {
  transactions: TransactionItem[];
  /** When true, show refresh state instead of list/empty. */
  loadFailed?: boolean;
  /** Called when the user taps to retry after load failed. */
  onRetry?: () => void;
  /** When true (only on first ever load with no cached data), show skeleton rows. */
  isLoading?: boolean;
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
  reversed: {
    label: "REVERSED",
    color: colors.info,
    bgColor: "#EFF6FF",
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
  isLoading = false,
}: RecentTransactionsProps) {
  const { isDark } = useAppTheme();
  const { s } = useResponsiveScale();

  return (
    <View style={{ marginTop: s(12), paddingHorizontal: s(12) }}>
      {isLoading ? (
        <SkeletonList isDark={isDark} />
      ) : loadFailed ? (
        <Pressable
          onPress={onRetry}
          className="items-center rounded-2xl bg-card"
          style={{ paddingHorizontal: s(24), paddingVertical: s(40) }}
        >
          <Ionicons
            name="refresh"
            size={s(40)}
            color={isDark ? "#808999" : "#9CA3B0"}
          />
          <Text
            className="text-center text-muted-foreground"
            style={{ marginTop: s(12), fontSize: s(14) }}
          >
            {"Couldn't load transactions. Tap to retry."}
          </Text>
        </Pressable>
      ) : transactions.length === 0 ? (
        <EmptyState isDark={isDark} />
      ) : (
        <Animated.View
          layout={Layout.springify().damping(18).stiffness(180)}
          className="overflow-hidden rounded-2xl bg-card"
          style={{ paddingVertical: s(4), gap: s(4) }}
        >
          {transactions.map((tx, idx) => (
            <Animated.View
              key={tx.id}
              entering={
                idx === 0
                  ? FadeInUp.duration(320).delay(40)
                  : FadeInUp.duration(280)
              }
              layout={Layout.springify().damping(18).stiffness(180)}
            >
              <TransactionRow transaction={tx} isDark={isDark} />
            </Animated.View>
          ))}
        </Animated.View>
      )}
    </View>
  );
}

function SkeletonList({ isDark }: { isDark: boolean }) {
  const { s } = useResponsiveScale();
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [shimmer]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + shimmer.value * 0.45,
  }));

  const block = isDark ? "rgba(255,255,255,0.08)" : "#E5E7EB";

  return (
    <View
      className="overflow-hidden rounded-2xl bg-card"
      style={{ paddingVertical: s(4) }}
    >
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          className="flex-row items-center"
          style={{ paddingHorizontal: s(16), paddingVertical: s(10) }}
        >
          <Animated.View
            style={[
              {
                width: s(40),
                height: s(40),
                borderRadius: s(20),
                backgroundColor: block,
                marginRight: s(12),
              },
              shimmerStyle,
            ]}
          />
          <View className="flex-1">
            <Animated.View
              style={[
                {
                  width: "55%",
                  height: s(12),
                  borderRadius: s(6),
                  backgroundColor: block,
                },
                shimmerStyle,
              ]}
            />
            <Animated.View
              style={[
                {
                  marginTop: s(6),
                  width: "35%",
                  height: s(10),
                  borderRadius: s(5),
                  backgroundColor: block,
                },
                shimmerStyle,
              ]}
            />
          </View>
          <View className="items-end">
            <Animated.View
              style={[
                {
                  width: s(64),
                  height: s(12),
                  borderRadius: s(6),
                  backgroundColor: block,
                },
                shimmerStyle,
              ]}
            />
            <Animated.View
              style={[
                {
                  marginTop: s(6),
                  width: s(44),
                  height: s(10),
                  borderRadius: s(5),
                  backgroundColor: block,
                },
                shimmerStyle,
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

function EmptyState({ isDark }: { isDark: boolean }) {
  const { s } = useResponsiveScale();
  return (
    <View
      className="items-center rounded-2xl bg-card"
      style={{ paddingHorizontal: s(24), paddingVertical: s(40) }}
    >
      <Ionicons
        name="receipt-outline"
        size={s(40)}
        color={isDark ? "#808999" : "#9CA3B0"}
      />
      <Text
        className="text-center text-muted-foreground"
        style={{ marginTop: s(12), fontSize: s(14) }}
      >
        No transactions yet
      </Text>
    </View>
  );
}

function TransactionRow({
  transaction,
  isDark,
}: {
  transaction: TransactionItem;
  isDark: boolean;
}) {
  const { s } = useResponsiveScale();
  const statusKey = transaction.status as TransactionStatus;
  const status = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.pending;
  const isUnsuccessful = isUnsuccessfulTransactionStatus(transaction.status);
  // Amount stays neutral (theme-based); the status badge already carries colour.
  // The +/- sign still signals credit vs debit.
  const amountColor = isDark ? colors.white : colors.gray[900];

  const localLogo = getProviderLogo(transaction.description);
  const isCredit = transaction.credit_debit === "credit";

  return (
    <Pressable
      onPress={() => router.push(`/(app)/history/${transaction.id}`)}
      className="flex-row items-center active:opacity-80"
      style={{ paddingHorizontal: s(16), paddingVertical: s(6) }}
    >
      <TxIcon
        localLogo={localLogo}
        remoteIcon={transaction.icon}
        isCredit={isCredit}
        isDark={isDark}
        isUnsuccessful={isUnsuccessful}
      />

      <View className="flex-1">
        <Text
          className="font-medium text-foreground"
          style={{ fontSize: s(13) }}
        >
          {transaction.description}
        </Text>
        {transaction.type === "data" && transaction.data_plan_name ? (
          <Text
            className="text-muted-foreground"
            style={{ marginTop: s(2), fontSize: s(11) }}
            numberOfLines={1}
          >
            {transaction.data_plan_name}
          </Text>
        ) : null}
        <Text
          className="text-muted-foreground"
          style={{ marginTop: s(2), fontSize: s(11) }}
        >
          {transaction.date}
        </Text>
      </View>

      <View className="items-end">
        <Text
          className="font-semibold"
          style={{ color: amountColor, fontSize: s(13) }}
        >
          {formatAmount(transaction.amount, transaction.credit_debit)}
        </Text>
        <View
          className="rounded-full"
          style={{
            marginTop: s(2),
            paddingHorizontal: s(6),
            paddingVertical: s(2),
            backgroundColor: isDark
              ? `${status.color}20`
              : status.bgColor,
          }}
        >
          <Text
            className="font-bold"
            style={{ color: status.color, fontSize: s(8) }}
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
  isUnsuccessful,
}: {
  localLogo: ReturnType<typeof getProviderLogo>;
  remoteIcon: string | null;
  isCredit: boolean;
  isDark: boolean;
  isUnsuccessful: boolean;
}) {
  const { s } = useResponsiveScale();
  const size = s(40);
  const style = { width: size, height: size, marginRight: s(12) };
  const failureBg = isDark ? "rgba(220, 38, 38, 0.2)" : "#FEE2E2";
  const creditBg = isDark ? "#052E16" : "#DCFCE7";
  const debitBg = isDark ? "rgba(255,255,255,0.08)" : colors.gray[100];

  if (localLogo) {
    return (
      <Image
        source={localLogo}
        className="rounded-full"
        style={style}
        resizeMode="cover"
      />
    );
  }

  if (isCredit) {
    return (
      <View
        className="items-center justify-center rounded-full"
        style={[style, { backgroundColor: isUnsuccessful ? failureBg : creditBg }]}
      >
        <Ionicons
          name="arrow-down"
          size={s(18)}
          color={isUnsuccessful ? colors.error : colors.green[500]}
        />
      </View>
    );
  }

  if (remoteIcon) {
    return (
      <Image
        source={{ uri: remoteIcon }}
        className="rounded-full"
        style={style}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      className="items-center justify-center rounded-full"
      style={[
        style,
        {
          backgroundColor: isUnsuccessful ? failureBg : debitBg,
        },
      ]}
    >
      <Ionicons
        name="arrow-up"
        size={s(18)}
        color={
          isUnsuccessful
            ? colors.error
            : isDark
              ? colors.gray[400]
              : colors.gray[500]
        }
      />
    </View>
  );
}
