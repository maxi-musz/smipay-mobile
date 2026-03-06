import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus, Linking } from "react-native";
import { Redirect, Stack } from "expo-router";

import { FundingResultSheet } from "@/components/dashboard";
import { useAuthStore, useFundingResultSheetStore } from "@/store";
import {
  getPendingFundingReference,
  clearPendingFundingReference,
} from "@/lib/pending-funding";

const FUNDING_CALLBACK_PATH = "wallet/funding/callback";

function parseFundingCallbackReference(url: string): string | null {
  try {
    if (!url || !url.includes(FUNDING_CALLBACK_PATH)) return null;
    const parsed = new URL(url);
    return parsed.searchParams.get("reference");
  } catch {
    return null;
  }
}

export default function AppLayout() {
  const isAuthenticated = useAuthStore.use.isAuthenticated();
  const setFunding = useFundingResultSheetStore((s) => s.setFunding);
  const isCheckingRef = useRef(false);

  // Deep-link handler: when Paystack redirects to smipay://wallet/funding/callback?reference=xxx
  // and the redirect isn't caught by openAuthSessionAsync (e.g. external browser).
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleUrl = (event: { url: string }) => {
      const ref = parseFundingCallbackReference(event.url);
      if (ref) {
        clearPendingFundingReference().catch(() => {});
        setFunding(ref);
      }
    };

    const sub = Linking.addEventListener("url", handleUrl);
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });
    return () => sub.remove();
  }, [isAuthenticated, setFunding]);

  // Safety net: when the app resumes from background, check for stale pending
  // references (e.g. user killed the app during payment). If found, open the
  // result sheet so verification can run.
  useEffect(() => {
    if (!isAuthenticated) return;

    async function checkPendingOnResume() {
      if (isCheckingRef.current) return;
      const currentRef = useFundingResultSheetStore.getState().reference;
      if (currentRef) return; // result sheet already showing

      isCheckingRef.current = true;
      try {
        const pending = await getPendingFundingReference();
        if (pending) {
          await clearPendingFundingReference();
          setFunding(pending);
        }
      } finally {
        isCheckingRef.current = false;
      }
    }

    const sub = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          checkPendingOnResume();
        }
      },
    );

    // Also check on first mount (app cold start with stale reference)
    checkPendingOnResume();

    return () => sub.remove();
  }, [isAuthenticated, setFunding]);

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
      <FundingResultSheet />
    </>
  );
}
