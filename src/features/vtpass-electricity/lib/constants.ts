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

export function getElectricityCashbackRate(
  cashbackRates?: CashbackRate[],
  rewardBanners?: RewardBanner[],
): { percentage: number; maxPerTransaction?: number } {
  const rate = cashbackRates?.find(
    (r) => r.service === "electricity" && r.is_active && r.percentage > 0,
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

export const POLL_FIRST_DELAY_MS = 15_000;
export const POLL_INTERVAL_MS = 30_000;
export const POLL_MAX_ELAPSED_MS = 5 * 60 * 1000;

export const PHONE_REGEX = /^0[789]\d{9}$/;

export const ELECTRICITY_MIN_AMOUNT = 500;
export const ELECTRICITY_MAX_AMOUNT = 500_000;
export const DEFAULT_MIN_PURCHASE = 500;

/**
 * Parses the Min_Purchase_Amount from verify response.
 * Falls back to DEFAULT_MIN_PURCHASE if empty/invalid.
 */
export function getMinPurchaseAmount(raw?: string): number {
  if (!raw) return DEFAULT_MIN_PURCHASE;
  const parsed = Number(raw);
  return parsed > 0 ? parsed : DEFAULT_MIN_PURCHASE;
}

// ── Disco short names (for display) ────────────────────────────────────────

const DISCO_SHORT_NAMES: Record<string, string> = {
  "ikeja-electric": "IKEDC",
  "eko-electric": "EKEDC",
  "kano-electric": "KEDCO",
  "portharcourt-electric": "PHED",
  "jos-electric": "JED",
  "ibadan-electric": "IBEDC",
  "kaduna-electric": "KAEDCO",
  "abuja-electric": "AEDC",
  "enugu-electric": "EEDC",
  "benin-electric": "BEDC",
  "aba-electric": "ABA",
  "yola-electric": "YEDC",
};

export function getDiscoShortName(serviceID: string): string {
  return DISCO_SHORT_NAMES[serviceID] ?? serviceID;
}
