import React, { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";

import { useToastStore } from "@/components/ui/toast/toast-store";
import { logFundingSuccess } from "@/lib/analytics";
import { formatNairaNumberForDisplay } from "@/lib/money";
import { useAuthStore, useHomepageStore } from "@/store";

interface WalletCreditedPayload {
  transaction_id: string;
  reference: string;
  amount: number;
  new_balance: number;
  source?: "dva_transfer" | "card" | "other";
  currency?: string;
  occurred_at?: string;
}

function getSocketOrigin(): string {
  const base = __DEV__
    ? (process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:1500")
    : process.env.EXPO_PUBLIC_API_BASE_URL!;
  const version = process.env.EXPO_PUBLIC_API_VERSION ?? "/api/v1";
  try {
    return new URL(`${base}${version}`).origin;
  } catch {
    return base;
  }
}

/**
 * Connects to the backend `/webhook-events` namespace and forwards
 * webhook-driven realtime updates into the relevant client stores.
 *
 * Currently handled events:
 *  - `wallet_credited` — successful deposit (DVA bank transfer or card).
 *    Triggers a silent homepage refetch so the BalanceCard + recent
 *    transactions update without a manual reload, and shows a toast
 *    so users see instant confirmation regardless of which screen
 *    they're on.
 *
 * This provider has no public context value — it's a side-effect-only
 * mount that lives at the root of the auth tree.
 */
export function WebhookEventsSocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = useAuthStore((s) => s.tokens?.accessToken ?? null);
  const socketRef = useRef<Socket | null>(null);
  // In-memory dedupe so a socket reconnect / duplicate webhook never
  // double-toasts the same deposit.
  const handledRefsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    const origin = getSocketOrigin();
    const s = io(`${origin}/webhook-events`, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    s.on("wallet_credited", (payload: WalletCreditedPayload) => {
      if (!payload?.reference) return;
      if (handledRefsRef.current.has(payload.reference)) return;
      handledRefsRef.current.add(payload.reference);

      if (payload.source === "dva_transfer") {
        void logFundingSuccess("dva", payload.amount);
      }

      void useHomepageStore.getState().refreshHomepageSilently();

      useToastStore.getState().show({
        variant: "success",
        title: "Wallet funded",
        message: `+${formatNairaNumberForDisplay(payload.amount)} • New balance ${formatNairaNumberForDisplay(payload.new_balance)}`,
      });
    });

    socketRef.current = s;
    return () => {
      s.removeAllListeners();
      s.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  return <>{children}</>;
}
