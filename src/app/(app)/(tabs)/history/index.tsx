import { useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  fetchTransactionHistory,
  type FetchHistoryParams,
} from "@/api/services/history";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { FullPageLoader } from "@/components/ui/loaders";
import { useAppTheme } from "@/hooks/use-app-theme";
import { colors } from "@/constants/colors";
import { getProviderLogo } from "@/lib/provider-logo";
import type {
  HistoryCategories,
  HistoryTransaction,
  HistoryDirection,
  HistoryStatus,
} from "@/types";
import { handleApiError } from "@/lib/errors";

type CategoryKey = keyof HistoryCategories;

const CATEGORY_LABELS: Partial<Record<CategoryKey, string>> = {
  all: "All",
  deposit: "Deposits",
  transfer: "Transfers",
  airtime: "Airtime",
  data: "Data",
  cable: "Cable TV",
  education: "Education",
  betting: "Betting",
  referral_bonus: "Rewards",
};

type TabItem = {
  key: string;
  label: string;
  count: number;
};

type StatusConfig = {
  label: string;
  color: string;
  bgColor: string;
};

const STATUS_CONFIG: Record<HistoryStatus, StatusConfig> = {
  pending: {
    label: "PENDING",
    color: colors.warning,
    bgColor: "#FFFBEB",
  },
  success: {
    label: "SUCCESS",
    color: colors.green[500],
    bgColor: colors.green[50],
  },
  failed: {
    label: "FAILED",
    color: colors.error,
    bgColor: "#FEF2F2",
  },
  cancelled: {
    label: "CANCELLED",
    color: colors.gray[500],
    bgColor: "#F3F4F6",
  },
};

export default function HistoryScreen() {
  const { isDark } = useAppTheme();
  const { type: typeParam } = useLocalSearchParams<{ type?: string }>();
  const [transactions, setTransactions] = useState<HistoryTransaction[]>([]);
  const [categories, setCategories] = useState<HistoryCategories | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeType, setActiveType] = useState<string>(typeParam ?? "all");
  const [search, setSearch] = useState("");
  const [pendingSearch, setPendingSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tabs: TabItem[] = useMemo(() => {
    if (!categories) return [];
    return Object.entries(categories).map(([key, count]) => ({
      key,
      label: CATEGORY_LABELS[key as CategoryKey] || key,
      count: count ?? 0,
    }));
  }, [categories]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(pendingSearch.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timeout);
  }, [pendingSearch]);

  async function loadHistory(opts?: Partial<FetchHistoryParams>) {
    const params: FetchHistoryParams = {
      page,
      limit: 20,
      ...opts,
    };

    if (activeType && activeType !== "all") {
      params.type = activeType;
    }
    if (search) {
      params.search = search;
    }

    try {
      setError(null);
      if (opts?.page === 1 && transactions.length > 0) {
        setIsRefreshing(true);
      } else if (opts?.page === 1 || page === 1) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      const response = await fetchTransactionHistory(params);
      const d = response.data;
      setCategories(d.categories);
      setTotalPages(d.pagination.totalPages);

      if (params.page && params.page > 1) {
        setTransactions((prev) => [...prev, ...d.transactions]);
      } else {
        setTransactions(d.transactions);
      }
    } catch (e) {
      handleApiError(e);
      if (!transactions.length) {
        setError("Unable to load your transactions. Please try again.");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    if (typeParam) setActiveType(typeParam);
  }, [typeParam]);

  useEffect(() => {
    loadHistory({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType, search]);

  useEffect(() => {
    if (page === 1) return;
    loadHistory({ page });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function handleTabPress(key: string) {
    setActiveType(key);
    setPage(1);
  }

  function handleEndReached() {
    if (isLoading || isRefreshing) return;
    if (page >= totalPages) return;
    setPage((p) => p + 1);
  }

  function renderHeader() {
    return (
      <Animated.View
        className="px-6 pb-3 pt-3"
        entering={FadeInDown.duration(220)}
      >
        <Text variant="h3" className="text-foreground">
          History
        </Text>

        <View className="mt-4">
          <Input
            placeholder="Search by description, reference, or phone"
            value={pendingSearch}
            onChangeText={setPendingSearch}
            containerClassName=""
            className="text-[15px]"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {tabs.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-4"
            contentContainerClassName="gap-2"
          >
            {tabs.map((tab) => {
              const isActive = tab.key === activeType;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => handleTabPress(tab.key)}
                  className="flex-row items-center rounded-full px-3.5 py-1.5"
                  style={{
                    backgroundColor: isActive
                      ? isDark
                        ? "rgba(245,130,32,0.16)"
                        : colors.orange[50]
                      : isDark
                        ? "#111827"
                        : "#F3F4F6",
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{
                      color: isActive
                        ? colors.orange[600]
                        : isDark
                          ? "#E5E7EB"
                          : "#4B5563",
                    }}
                  >
                    {tab.label} ({tab.count})
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </Animated.View>
    );
  }

  function renderItem({ item, index }: { item: HistoryTransaction; index: number }) {
    const localLogo = getProviderLogo(item.description);
    const isCredit = item.credit_debit === "credit";

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 35).duration(220)}
      >
        <Pressable
          onPress={() => router.push(`/(app)/history/${item.id}`)}
          className="mx-5 mb-2.5 flex-row items-center rounded-2xl px-4 py-3 active:opacity-80"
          style={{
            backgroundColor: isDark ? "#111827" : "#FFFFFF",
          }}
        >
          <TxIcon
          localLogo={localLogo}
          remoteIcon={item.icon}
          isCredit={isCredit}
          isDark={isDark}
        />

        <View className="flex-1">
          <Text className="text-[14px] font-medium text-foreground" numberOfLines={1}>
            {item.description}
          </Text>
          {item.type === "data" && item.data_plan_name ? (
            <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
              {item.data_plan_name}
            </Text>
          ) : null}
          <Text className="mt-0.5 text-xs text-muted-foreground">
            {item.date}
          </Text>
        </View>

        <View className="items-end ml-2">
          <Text
            className="text-[14px] font-semibold"
            style={{
              color: isCredit ? colors.green[500] : colors.error,
            }}
          >
            {formatAmount(item.raw_amount, item.credit_debit)}
          </Text>
          <StatusPill status={item.status as HistoryStatus} isDark={isDark} />
        </View>
        </Pressable>
      </Animated.View>
    );
  }

  if (isLoading && !transactions.length && !error) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <FullPageLoader message="Loading transactions..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {error && !transactions.length ? (
        <View className="flex-1 items-center justify-center px-6 pb-20">
          <Ionicons
            name="alert-circle-outline"
            size={56}
            color={isDark ? "#FBBF24" : "#D97706"}
          />
          <Text className="mt-4 text-center text-muted-foreground">
            {error}
          </Text>
        </View>
      ) : transactions.length === 0 ? (
        <>
          {renderHeader()}
          <View className="flex-1 items-center justify-center px-6 pb-20">
            <Ionicons
              name="receipt-outline"
              size={56}
              color={isDark ? "#808999" : "#9CA3B0"}
            />
            <Text variant="h4" className="mt-4 text-foreground">
              No Transactions
            </Text>
            <Text className="mt-2 text-center text-muted-foreground">
              Your transaction history will appear here once you start using SmiPay.
            </Text>
          </View>
        </>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={{ paddingBottom: 80 }}
          onEndReachedThreshold={0.4}
          onEndReached={handleEndReached}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                setPage(1);
                loadHistory({ page: 1 });
              }}
              tintColor={colors.orange[500]}
            />
          }
          ListFooterComponent={
            isRefreshing ? (
              <View className="py-4">
                <ActivityIndicator size="small" color={colors.orange[500]} />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
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

function formatAmount(amount: number, direction: HistoryDirection) {
  const sign = direction === "credit" ? "+" : "-";
  return `${sign}₦${new Intl.NumberFormat("en-NG").format(amount)}`;
}

function StatusPill({
  status,
  isDark,
}: {
  status: HistoryStatus;
  isDark: boolean;
}) {
  const config = STATUS_CONFIG[status];
  const bgColor = isDark ? `${config.color}20` : config.bgColor;

  return (
    <View
      className="mt-1 rounded-full px-2 py-0.5"
      style={{ backgroundColor: bgColor }}
    >
      <Text
        className="text-[9px] font-bold"
        style={{ color: config.color }}
      >
        {config.label}
      </Text>
    </View>
  );
}
