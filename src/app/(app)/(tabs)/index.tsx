import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  BalanceCard,
  DashboardHeader,
  PromoBanner,
  RecentTransactions,
  ServicesGrid,
  TransferSection,
} from "@/components/dashboard";
import type { Transaction } from "@/components/dashboard";

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "1",
    title: "Wallet Funding",
    date: "Mar 2, 2026, 11:44 PM",
    amount: 200,
    type: "credit",
    status: "success",
  },
  {
    id: "2",
    title: "Wallet Funding",
    date: "Mar 2, 2026, 11:44 PM",
    amount: 200,
    type: "credit",
    status: "cancelled",
  },
];

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Sticky header + balance card */}
      <View className="z-10 bg-background pb-4">
        <DashboardHeader />
        <BalanceCard balance={5250} cashback={3} />
      </View>

      {/* Scrollable content */}
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-24"
        showsVerticalScrollIndicator={false}
      >
        <PromoBanner />
        <ServicesGrid />
        <TransferSection />
        <RecentTransactions transactions={MOCK_TRANSACTIONS} />
      </ScrollView>
    </SafeAreaView>
  );
}
