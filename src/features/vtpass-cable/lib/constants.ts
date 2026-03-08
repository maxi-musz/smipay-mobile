import type { CashbackRate, RewardBanner } from "@/types/homepage";

const NAIRA_SYMBOL = "₦";

export function parseBalanceToNumber(balanceStr: string): number {
  const trimmed = (balanceStr ?? "").trim().replace(/\s/g, "");
  const hasNaira = trimmed.startsWith(NAIRA_SYMBOL);
  const numPart = hasNaira ? trimmed.slice(NAIRA_SYMBOL.length) : trimmed;
  const cleaned = numPart.replace(/,/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function formatNaira(value: number): string {
  return `₦${value.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

export function getCableCashbackRate(
  cashbackRates?: CashbackRate[],
  rewardBanners?: RewardBanner[],
): { percentage: number; maxPerTransaction?: number } {
  const rate = cashbackRates?.find(
    (r) => r.service === "cable" && r.is_active && r.percentage > 0,
  );
  if (!rate) return { percentage: 0 };

  const cashbackBanner = rewardBanners?.find((b) => b.type === "cashback");
  const maxPerTransaction = cashbackBanner?.data?.max_per_transaction;

  return { percentage: rate.percentage, maxPerTransaction };
}

export function computeCashbackToEarn(
  amount: number,
  percentage: number,
  maxPerTransaction?: number,
): number {
  if (percentage <= 0) return 0;
  const raw = (amount * percentage) / 100;
  const capped =
    maxPerTransaction != null ? Math.min(raw, maxPerTransaction) : raw;
  return Math.floor(capped);
}

/** Polling: first wait 15s, then 30s, then every 30s up to 5 min. */
export const POLL_FIRST_DELAY_MS = 15_000;
export const POLL_INTERVAL_MS = 30_000;
export const POLL_MAX_ELAPSED_MS = 5 * 60 * 1000;

/** Nigerian phone: 11 digits, leading 0. */
export const PHONE_REGEX = /^0[789]\d{9}$/;

// ── Provider-specific traits ──────────────────────────────────────────────

export type CableProviderID = "dstv" | "gotv" | "startimes" | "showmax";

interface ProviderTraits {
  supportsVerify: boolean;
  requiresSubscriptionType: boolean;
  billersCodeIsPhone: boolean;
  hasVoucher: boolean;
  billersCodeLabel: string;
  billersCodePlaceholder: string;
}

const PROVIDER_TRAITS: Record<CableProviderID, ProviderTraits> = {
  dstv: {
    supportsVerify: true,
    requiresSubscriptionType: true,
    billersCodeIsPhone: false,
    hasVoucher: false,
    billersCodeLabel: "Smartcard Number",
    billersCodePlaceholder: "e.g. 7012345678",
  },
  gotv: {
    supportsVerify: true,
    requiresSubscriptionType: true,
    billersCodeIsPhone: false,
    hasVoucher: false,
    billersCodeLabel: "Smartcard Number",
    billersCodePlaceholder: "e.g. 7012345678",
  },
  startimes: {
    supportsVerify: true,
    requiresSubscriptionType: false,
    billersCodeIsPhone: false,
    hasVoucher: false,
    billersCodeLabel: "Smartcard / eWallet Number",
    billersCodePlaceholder: "e.g. 0212345678",
  },
  showmax: {
    supportsVerify: false,
    requiresSubscriptionType: false,
    billersCodeIsPhone: true,
    hasVoucher: true,
    billersCodeLabel: "Phone Number",
    billersCodePlaceholder: "e.g. 08012345678",
  },
};

export function getProviderTraits(serviceID: string): ProviderTraits {
  const id = serviceID.toLowerCase().trim() as CableProviderID;
  return (
    PROVIDER_TRAITS[id] ?? {
      supportsVerify: false,
      requiresSubscriptionType: false,
      billersCodeIsPhone: false,
      hasVoucher: false,
      billersCodeLabel: "Smartcard Number",
      billersCodePlaceholder: "Enter number",
    }
  );
}

/** Is the ewallet variation (Startimes custom-amount)? */
export function isEwalletVariation(variationCode: string): boolean {
  return variationCode.toLowerCase() === "ewallet";
}

// ── Provider branding ──────────────────────────────────────────────────────

interface CableBrand {
  color: string;
  darkColor: string;
  initial: string;
}

const CABLE_BRANDS: Record<string, CableBrand> = {
  dstv: { color: "#003B7E", darkColor: "#2563EB", initial: "D" },
  gotv: { color: "#F7B500", darkColor: "#EAB308", initial: "G" },
  startimes: { color: "#E30613", darkColor: "#EF4444", initial: "S" },
  showmax: { color: "#E40046", darkColor: "#F43F5E", initial: "S" },
};

export function getCableBrand(serviceID: string): CableBrand {
  const id = serviceID.toLowerCase().trim();
  return CABLE_BRANDS[id] ?? { color: "#6B7280", darkColor: "#9CA3AF", initial: "?" };
}
