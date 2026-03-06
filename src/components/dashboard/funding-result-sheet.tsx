import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Spinner } from "@/components/ui/loaders";
import { BottomSheetModal } from "@/components/ui/modals";
import { useFundingResultSheetStore } from "@/store";
import { useHomepageStore } from "@/store";
import {
  verifyFundingAndGetResult,
  type FundingVerifyResult,
} from "@/lib/verify-funding-result";
import { colors } from "@/constants/colors";

function formatNaira(amount: number): string {
  return `₦${new Intl.NumberFormat("en-NG").format(amount)}`;
}

export function FundingResultSheet() {
  const reference = useFundingResultSheetStore((s) => s.reference);
  const amount = useFundingResultSheetStore((s) => s.amount);
  const clear = useFundingResultSheetStore((s) => s.clear);
  const fetchHomepage = useHomepageStore((s) => s.fetchHomepage);

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<FundingVerifyResult | null>(null);

  const visible = !!reference;

  const runVerify = useCallback(async () => {
    if (!reference) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await verifyFundingAndGetResult(reference);
      setResult(res);
    } finally {
      setLoading(false);
    }
  }, [reference]);

  useEffect(() => {
    if (reference) {
      runVerify();
    }
  }, [reference, runVerify]);

  const handleClose = useCallback(() => {
    clear();
    setResult(null);
    setLoading(true);
    setTimeout(() => fetchHomepage(), 0);
  }, [clear, fetchHomepage]);

  if (!visible) return null;

  return (
    <BottomSheetModal
      visible={visible}
      onClose={handleClose}
      title="Payment result"
      closeOnBackdrop={!loading}
      showHandle
    >
      <View className="items-center gap-4 pb-6">
        {loading ? (
          <>
            <Spinner size="large" color={colors.orange[500]} />
            <Text className="text-center text-muted-foreground">
              Verifying your payment…
            </Text>
          </>
        ) : result ? (
          <ResultContent result={result} amount={amount} onDone={handleClose} />
        ) : null}
      </View>
    </BottomSheetModal>
  );
}

function ResultContent({
  result: res,
  amount,
  onDone,
}: {
  result: FundingVerifyResult;
  amount: number | null;
  onDone: () => void;
}) {
  if (res.status === "success") {
    return (
      <>
        <View
          className="h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: colors.green[100] }}
        >
          <Ionicons name="checkmark" size={36} color={colors.green[600]} />
        </View>
        <Text className="text-center text-lg font-semibold text-foreground">
          Deposit successful
        </Text>
        <Text className="text-center text-muted-foreground">
          New balance: {res.balance_after}
        </Text>
        <Button
          className="mt-2 w-full rounded-2xl"
          onPress={onDone}
          style={{ backgroundColor: colors.orange[500] }}
        >
          <Text className="font-semibold text-white">Done</Text>
        </Button>
      </>
    );
  }

  if (res.status === "cancelled") {
    return (
      <>
        <View
          className="h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: "#FEF2F2" }}
        >
          <Ionicons name="close-circle" size={36} color={colors.error} />
        </View>
        <Text
          className="text-center text-lg font-semibold"
          style={{ color: colors.error }}
        >
          Funding cancelled
        </Text>
        <Text className="text-center text-muted-foreground">
          You cancelled your funding
          {amount ? ` of ${formatNaira(amount)}` : ""}.
        </Text>
        <Button
          variant="outline"
          className="mt-2 w-full rounded-2xl"
          onPress={onDone}
        >
          <Text className="font-semibold text-foreground">Done</Text>
        </Button>
      </>
    );
  }

  if (res.status === "failed") {
    return (
      <>
        <View
          className="h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: "#FEF2F2" }}
        >
          <Ionicons name="close-circle" size={36} color={colors.error} />
        </View>
        <Text
          className="text-center text-lg font-semibold"
          style={{ color: colors.error }}
        >
          Payment failed
        </Text>
        <Text className="text-center text-muted-foreground">
          Your funding{amount ? ` of ${formatNaira(amount)}` : ""} failed.
          Please try again or use a different card.
        </Text>
        <Button
          className="mt-2 w-full rounded-2xl"
          onPress={onDone}
          style={{ backgroundColor: colors.orange[500] }}
        >
          <Text className="font-semibold text-white">Done</Text>
        </Button>
      </>
    );
  }

  return (
    <>
      <View
        className="h-14 w-14 items-center justify-center rounded-full"
        style={{ backgroundColor: "#FEF2F2" }}
      >
        <Ionicons name="warning" size={36} color={colors.error} />
      </View>
      <Text
        className="text-center text-lg font-semibold"
        style={{ color: colors.error }}
      >
        Something went wrong
      </Text>
      <Text className="text-center text-muted-foreground">
        {res.message}
      </Text>
      <Button
        className="mt-2 w-full rounded-2xl"
        onPress={onDone}
        style={{ backgroundColor: colors.orange[500] }}
      >
        <Text className="font-semibold text-white">Done</Text>
      </Button>
    </>
  );
}
