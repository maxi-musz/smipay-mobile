import { useCallback, useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import {
  getPendingFundingReference,
  clearPendingFundingReference,
} from "@/lib/pending-funding";
import { verifyPendingFundingAndHandleResult } from "@/lib/verify-funding-result";

interface UsePendingFundingVerifyOptions {
  /** Called when verification completes so the caller can close the funding modal. */
  onCloseFundingModal?: () => void;
}

export function usePendingFundingVerify(
  options: UsePendingFundingVerifyOptions = {},
) {
  const { onCloseFundingModal } = options;
  const isVerifyingRef = useRef(false);

  const verify = useCallback(async () => {
    if (isVerifyingRef.current) return;
    const reference = await getPendingFundingReference();
    if (!reference) return;

    isVerifyingRef.current = true;
    try {
      await verifyPendingFundingAndHandleResult({
        onCloseModal: onCloseFundingModal,
      });
    } finally {
      isVerifyingRef.current = false;
    }
  }, [onCloseFundingModal]);

  useFocusEffect(
    useCallback(() => {
      verify();
    }, [verify]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          verify();
        }
      },
    );
    return () => sub.remove();
  }, [verify]);
}
