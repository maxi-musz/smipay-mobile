import type { CashbackRate, RewardBanner } from "@/types/homepage";

const NAIRA_SYMBOL = "₦";

/** Extract numeric value from balance string (e.g. "₦72.50" -> 72.5). */
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

/** Cashback rate for international_airtime service. */
export function getIntlAirtimeCashbackRate(
  cashbackRates?: CashbackRate[],
  rewardBanners?: RewardBanner[],
): { percentage: number; maxPerTransaction?: number } {
  const rate = cashbackRates?.find(
    (r) =>
      r.service === "international_airtime" &&
      r.is_active &&
      r.percentage > 0,
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
