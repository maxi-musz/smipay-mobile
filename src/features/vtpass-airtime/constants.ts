import type { CashbackRate, RewardBanner } from "@/types/homepage";
import type { AirtimeServiceItem } from "@/types/vtpass-airtime";

/** Typical Nigerian mobile (07 / 08 / 09…). Used for network-prefix hints only. */
export const PHONE_REGEX = /^0[789]\d{9}$/;

/**
 * Checkout gate for domestic airtime. VTpass / partner sandboxes may use
 * non-NCC test MSISDNs (e.g. 20100000000), so we only require 10–11 digits.
 * Network match is advisory and must never block Pay.
 */
export function isAirtimePhoneSubmittable(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 11;
}

/**
 * Strips non-digits, caps length, and prepends `0` when the user typed 10 digits
 * starting with 7/8/9 without the leading 0 (common UX issue).
 */
export function normalizeNgMobileDigits(input: string): string {
  let d = input.replace(/\D/g, "").slice(0, 11);
  if (d.length === 10 && /^[789]/.test(d)) {
    d = ("0" + d).slice(0, 11);
  }
  return d;
}

/**
 * Formats a raw phone number from contacts (e.g. +2348012345678, 081 234 5678)
 * to Nigerian format: 0XXXXXXXXXX (11 digits).
 */
export function formatPhoneFromContact(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return "";

  if (digits.startsWith("234") && digits.length >= 12) {
    return "0" + digits.slice(-10);
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits;
  }
  if (digits.length === 10 && /^[789]/.test(digits)) {
    return "0" + digits;
  }
  if (digits.length > 11) {
    return "0" + digits.slice(-10);
  }
  if (digits.length >= 10) {
    const last10 = digits.slice(-10);
    return "0" + last10;
  }
  return digits;
}

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

/** Get airtime cashback rate and optional max per transaction from homepage data. */
export function getAirtimeCashbackRate(
  cashbackRates?: CashbackRate[],
  rewardBanners?: RewardBanner[],
): { percentage: number; maxPerTransaction?: number } {
  const rate = cashbackRates?.find(
    (r) => r.service === "airtime" && r.is_active && r.percentage > 0,
  );
  if (!rate) return { percentage: 0 };

  const cashbackBanner = rewardBanners?.find((b) => b.type === "cashback");
  const maxPerTransaction = cashbackBanner?.data?.max_per_transaction;

  return { percentage: rate.percentage, maxPerTransaction };
}

/** Compute cashback to earn for a given amount (whole naira, capped by max_per_transaction). */
export function computeCashbackToEarn(
  amount: number,
  percentage: number,
  maxPerTransaction?: number,
): number {
  if (percentage <= 0) return 0;
  const raw = (amount * percentage) / 100;
  const capped =
    maxPerTransaction != null
      ? Math.min(raw, maxPerTransaction)
      : raw;
  return Math.floor(capped);
}

export function parseMinMax(
  service: AirtimeServiceItem,
): { min: number; max: number } {
  const min = parseInt(
    service.minimium_amount ?? service.minimum_amount ?? "50",
    10,
  );
  const max = parseInt(service.maximum_amount ?? "100000", 10);
  return { min: isNaN(min) ? 50 : min, max: isNaN(max) ? 100000 : max };
}
