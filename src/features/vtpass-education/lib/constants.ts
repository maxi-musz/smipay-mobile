import type { CashbackRate, RewardBanner } from "@/types/homepage";
import type { EducationProductID } from "@/types/vtpass-education";

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

export function getEducationCashbackRate(
  cashbackRates?: CashbackRate[],
  rewardBanners?: RewardBanner[],
): { percentage: number; maxPerTransaction?: number } {
  const rate = cashbackRates?.find(
    (r) => r.service === "education" && r.is_active && r.percentage > 0,
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

// ── Product-specific traits ─────────────────────────────────────────────────

interface ProductTraits {
  label: string;
  shortLabel: string;
  hasVerify: boolean;
  hasQuantity: boolean;
  credentialType: "token" | "serial-pin" | "pin";
  billersCodeLabel: string;
  billersCodePlaceholder: string;
  successTitle: string;
  successMessage: string;
}

const PRODUCT_TRAITS: Record<EducationProductID, ProductTraits> = {
  "waec-registration": {
    label: "WAEC Registration PIN",
    shortLabel: "WAEC Reg",
    hasVerify: false,
    hasQuantity: true,
    credentialType: "token",
    billersCodeLabel: "",
    billersCodePlaceholder: "",
    successTitle: "Registration PIN Ready!",
    successMessage: "Your WAEC Registration PIN is ready.",
  },
  waec: {
    label: "WAEC Result Checker",
    shortLabel: "WAEC Result",
    hasVerify: false,
    hasQuantity: true,
    credentialType: "serial-pin",
    billersCodeLabel: "",
    billersCodePlaceholder: "",
    successTitle: "Result Checker Ready!",
    successMessage: "Your WAEC Result Checker is ready.",
  },
  jamb: {
    label: "JAMB PIN",
    shortLabel: "JAMB",
    hasVerify: true,
    hasQuantity: false,
    credentialType: "pin",
    billersCodeLabel: "JAMB Profile ID",
    billersCodePlaceholder: "e.g. 0123456789",
    successTitle: "JAMB PIN Ready!",
    successMessage: "Your JAMB PIN is ready.",
  },
};

export function getProductTraits(serviceID: string): ProductTraits {
  const id = serviceID.toLowerCase().trim() as EducationProductID;
  return (
    PRODUCT_TRAITS[id] ?? {
      label: serviceID,
      shortLabel: serviceID,
      hasVerify: false,
      hasQuantity: false,
      credentialType: "pin",
      billersCodeLabel: "ID",
      billersCodePlaceholder: "Enter ID",
      successTitle: "Purchase Complete!",
      successMessage: "Your purchase was successful.",
    }
  );
}

// ── Education products list (static — no service-ids endpoint) ──────────────

export interface EducationProduct {
  serviceID: EducationProductID;
  name: string;
}

export const EDUCATION_PRODUCTS: EducationProduct[] = [
  { serviceID: "waec-registration", name: "WAEC Registration" },
  { serviceID: "waec", name: "WAEC Result Checker" },
  { serviceID: "jamb", name: "JAMB PIN" },
];
