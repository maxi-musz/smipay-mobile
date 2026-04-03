import type { HomepageData } from "@/types";

const NAIRA_SYMBOL = "₦";

/** Group a digit-only integer string with commas (no BigInt needed for grouping). */
function groupIntegerDigits(integerDigits: string): string {
  const digits = integerDigits.replace(/\D/g, "");
  if (!digits) return "0";
  const normalized = digits.replace(/^0+(?=\d)/, "") || "0";
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function normalizeFraction(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 2);
  return d.padEnd(2, "0");
}

/**
 * Formats a wallet-style balance for display without parsing the whole amount as a float.
 * Prefer API values as decimal strings; numbers may lose precision if not safe integers.
 */
export function formatBalanceForDisplay(
  raw: string | number | null | undefined,
): string {
  if (raw === null || raw === undefined) return `${NAIRA_SYMBOL}0.00`;

  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return `${NAIRA_SYMBOL}0.00`;
    if (Number.isSafeInteger(raw)) {
      const abs = Math.abs(raw);
      const sign = raw < 0 ? "-" : "";
      const intStr = String(abs);
      return `${sign}${NAIRA_SYMBOL}${groupIntegerDigits(intStr)}.00`;
    }
    if (__DEV__) {
      console.warn(
        "[money] Balance arrived as non–safe-integer number; possible precision loss. Prefer string from API.",
        raw,
      );
    }
    const rounded = Math.round(raw * 100) / 100;
    const [intPart, fracPart = ""] = String(rounded).split(".");
    const frac = normalizeFraction(fracPart.padEnd(2, "0").slice(0, 2));
    return `${NAIRA_SYMBOL}${groupIntegerDigits(intPart)}.${frac}`;
  }

  let s = String(raw).trim().replace(/\s/g, "");
  if (!s) return `${NAIRA_SYMBOL}0.00`;

  if (/[eE][+-]?\d+/.test(s)) {
    if (__DEV__) {
      console.warn("[money] Scientific notation in balance string; using float fallback.", s);
    }
    const n = Number(s.replace(/,/g, ""));
    return formatBalanceForDisplay(Number.isFinite(n) ? n : 0);
  }

  const hasNaira = s.startsWith(NAIRA_SYMBOL);
  const numPart = hasNaira ? s.slice(NAIRA_SYMBOL.length) : s;
  const dotIdx = numPart.indexOf(".");
  const intWithSep =
    dotIdx >= 0 ? numPart.slice(0, dotIdx) : numPart;
  const fracRaw = dotIdx >= 0 ? numPart.slice(dotIdx + 1) : "";
  const intDigits = intWithSep.replace(/,/g, "");

  if (!/^\d*$/.test(intDigits) || intDigits === "") {
    return `${NAIRA_SYMBOL}0.00`;
  }

  const frac = normalizeFraction(fracRaw);
  return `${NAIRA_SYMBOL}${groupIntegerDigits(intDigits)}.${frac}`;
}

export function normalizeHomepageMoneyFields(data: HomepageData): HomepageData {
  const { wallet_card, cashback_wallet } = data;
  return {
    ...data,
    wallet_card: {
      ...wallet_card,
      current_balance: formatBalanceForDisplay(
        wallet_card.current_balance as string | number | null | undefined,
      ),
      all_time_fuunding: formatBalanceForDisplay(
        wallet_card.all_time_fuunding as string | number | null | undefined,
      ),
      all_time_withdrawn: formatBalanceForDisplay(
        wallet_card.all_time_withdrawn as string | number | null | undefined,
      ),
    },
    cashback_wallet: {
      ...cashback_wallet,
      current_balance: formatBalanceForDisplay(
        cashback_wallet.current_balance as string | number | null | undefined,
      ),
      all_time_earned: formatBalanceForDisplay(
        cashback_wallet.all_time_earned as string | number | null | undefined,
      ),
      all_time_withdrawn: formatBalanceForDisplay(
        cashback_wallet.all_time_withdrawn as string | number | null | undefined,
      ),
    },
  };
}

/**
 * Format a numeric reward-banner `data` value (amounts are usually modest; uses cent rounding).
 */
export function formatNairaNumberForDisplay(n: number): string {
  if (!Number.isFinite(n)) return `${NAIRA_SYMBOL}0.00`;
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  const cents = Math.round(abs * 100);
  const intPart = Math.floor(cents / 100);
  const frac = String(cents % 100).padStart(2, "0");
  return `${sign}${NAIRA_SYMBOL}${groupIntegerDigits(String(intPart))}.${frac}`;
}
