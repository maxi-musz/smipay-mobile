/**
 * Turns clipboard text into ranked, field-ready candidates.
 *
 * Anything sensitive (card PAN, BVN, NIN, PIN, OTP) is dropped before scoring.
 * Everything else carries a confidence and each field sets its own floor.
 *
 * Pure, with no React Native imports, so it can be compiled and run standalone
 * by `scripts/verify-smart-paste.ts`. The relative import below is deliberate:
 * that script has no bundler to resolve the `@/` alias.
 */

import { getServiceIdFromPhone } from "../../vtpass-airtime/phone-network";

import {
  digitsOf,
  groupInFours,
  groupPhoneDigits,
  groupThousands,
  passesLuhn,
  sanitizeClipboardText,
} from "./normalize";
import type {
  SmartPasteCandidate,
  SmartPasteKind,
  SmartPasteScan,
} from "./types";

/**
 * Digit groups joined by at most two separators. Two keeps
 * `+234 (0) 803 123 4567` together while splitting `0801… / 0809…`; commas and
 * newlines aren't in the class at all, so they always split.
 */
const NUMBER_RUN = /\+?\d+(?:[ \-.()/]{1,2}\d+)*/g;

/** Longest identifier (13-digit meter). */
const MAX_DIGITS = 13;
/** Phones can be longer pre-normalisation: `002348031234567` is 15 digits. */
const MAX_PHONE_DIGITS = 16;
/** Shortest worth classifying (8-digit postpaid meter). */
const MIN_DIGITS = 8;

/** How much text around a match we read for intent keywords. */
const CONTEXT_BEFORE = 28;
const CONTEXT_AFTER = 14;

const PHONE_HINTS = [
  "phone", "tel", "mobile", "msisdn", "call", "whatsapp", "wa", "gsm",
  "line", "number", "no.", "airtime", "recharge", "top up", "topup",
  "data", "sub", "vtu",
];

const BANK_HINTS = [
  "acct", "acc", "account", "a/c", "nuban", "bank", "transfer", "pay to",
  "send to", "gtb", "gtbank", "guaranty", "access", "zenith", "uba",
  "first bank", "firstbank", "fidelity", "fcmb", "sterling", "stanbic",
  "union bank", "wema", "alat", "polaris", "keystone", "heritage",
  "providus", "jaiz", "suntrust", "titan", "globus", "parallex", "kuda",
  "opay", "palmpay", "moniepoint", "carbon", "vfd", "rubies", "sparkle",
  "fairmoney", "ecobank", "citibank", "standard chartered", "unity",
];

const METER_HINTS = [
  "meter", "mtr", "prepaid", "postpaid", "units", "nepa", "disco",
  "electric", "light bill", "band a", "band b", "ikeja", "eko", "ibedc",
  "ibadan", "aedc", "abuja electric", "kedco", "kano", "jed", "jos",
  "phed", "port harcourt", "eedc", "enugu", "bedc", "benin", "kaedco",
  "kaduna", "yedc", "yola", "aba power", "aedl",
];

const CABLE_HINTS = [
  "iuc", "smartcard", "smart card", "decoder", "dstv", "gotv",
  "startimes", "showmax", "subscriber",
];

/** A number next to any of these is dropped entirely. */
const SENSITIVE_HINTS = [
  "bvn", "nin", "pin", "cvv", "cvc", "otp", "password", "passcode",
  "card number", "card no", "debit card", "credit card", "expiry",
  "exp date", "security code", "one-time", "one time code", "verification code",
];

/** `2024-08-13`, `13/08/2024`, `13.08.24`. */
const DATE_SHAPES = [
  /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/,
  /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/,
];

/** `192.168.1.1`. */
const IPV4_SHAPE = /^\d{1,3}(?:\.\d{1,3}){3}$/;

/** `5,000.00`, `1,250` — an amount, not an identifier. */
const MONEY_SHAPE = /^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$|^\d+\.\d{2}$/;

function includesAny(haystack: string, needles: readonly string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

interface NumberRun {
  raw: string;
  digits: string;
  hadPlus: boolean;
  index: number;
  context: string;
}

function collectRuns(text: string): NumberRun[] {
  const runs: NumberRun[] = [];
  const lower = text.toLowerCase();

  NUMBER_RUN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = NUMBER_RUN.exec(text)) !== null) {
    const raw = match[0].trim();
    if (!raw) continue;

    runs.push({
      raw,
      digits: digitsOf(raw),
      hadPlus: raw.startsWith("+"),
      index: match.index,
      context: lower.slice(
        Math.max(0, match.index - CONTEXT_BEFORE),
        match.index + raw.length + CONTEXT_AFTER,
      ),
    });
  }

  return runs;
}

/** Structurally not identifiers, whatever their length. */
function hasDisqualifyingShape(raw: string): boolean {
  return (
    IPV4_SHAPE.test(raw) ||
    MONEY_SHAPE.test(raw) ||
    DATE_SHAPES.some((re) => re.test(raw))
  );
}

/**
 * Any Nigerian mobile spelling to `0XXXXXXXXXX` — `+234…`, `234…`, `00234…`,
 * `+2340803…` (country code and trunk zero), bare 10-digit, 11-digit.
 * Null for landlines, foreign numbers and anything else.
 */
export function toNgMobile(rawDigits: string, hadPlus: boolean): string | null {
  let d = rawDigits;

  // `00` international access code.
  if (d.length > 13 && d.startsWith("00")) d = d.slice(2);

  if (d.startsWith("234")) {
    let rest = d.slice(3);
    // Trunk zero left in after the country code.
    if (rest.length === 11 && rest.startsWith("0")) rest = rest.slice(1);
    if (rest.length === 10 && /^[789]/.test(rest)) return `0${rest}`;
    return null;
  }

  // A leading `+` that is not +234 means a foreign number — out of scope.
  if (hadPlus) return null;

  if (d.length === 11 && /^0[789]/.test(d)) return d;
  if (d.length === 10 && /^[789]/.test(d)) return `0${d}`;

  return null;
}

function phoneLabel(network: string | null): string {
  if (!network) return "Phone number";
  const pretty: Record<string, string> = {
    mtn: "MTN",
    airtel: "Airtel",
    glo: "Glo",
    "9mobile": "9mobile",
  };
  return `${pretty[network] ?? network.toUpperCase()} number`;
}

function scorePhone(run: NumberRun, canonical: string): SmartPasteCandidate {
  const network = getServiceIdFromPhone(canonical);
  const explicitCountryCode = run.digits.startsWith("234") || run.hadPlus;

  let confidence: number;
  if (explicitCountryCode && network) confidence = 0.98;
  else if (run.digits.length === 11 && network) confidence = 0.95;
  else if (run.digits.length === 11) confidence = 0.8;
  else if (network) confidence = 0.72; // bare 10 digits — could be a NUBAN
  else confidence = 0.55;

  if (includesAny(run.context, PHONE_HINTS)) confidence += 0.05;
  if (includesAny(run.context, BANK_HINTS)) confidence -= 0.25;
  // "AEDC meter 08031234567" is a meter shaped like a phone — contradicting
  // context has to push it under every floor.
  if (includesAny(run.context, METER_HINTS)) confidence -= 0.5;
  if (includesAny(run.context, CABLE_HINTS)) confidence -= 0.5;

  return {
    kind: "phone",
    value: canonical,
    display: groupPhoneDigits(canonical),
    label: phoneLabel(network),
    confidence: clamp(confidence),
    network: network ?? undefined,
    index: run.index,
  };
}

function scoreMeter(run: NumberRun): SmartPasteCandidate | null {
  const len = run.digits.length;
  if (len < MIN_DIGITS || len > MAX_DIGITS) return null;

  const hinted = includesAny(run.context, METER_HINTS);

  let confidence: number;
  if (hinted) confidence = 0.95;
  else if (len === 13) confidence = 0.7;
  else if (len === 12) confidence = 0.65;
  else if (len === 11) confidence = 0.55;
  // Some discos issue 10-digit meters. At the field floor exactly.
  else if (len === 10) confidence = 0.5;
  else return null; // 8–9 unhinted digits are more likely an account

  if (includesAny(run.context, BANK_HINTS)) confidence -= 0.3;
  if (includesAny(run.context, PHONE_HINTS)) confidence -= 0.2;

  return {
    kind: "meter",
    value: run.digits,
    display: groupInFours(run.digits),
    label: "Meter number",
    confidence: clamp(confidence),
    index: run.index,
  };
}

function scoreAccount(run: NumberRun): SmartPasteCandidate | null {
  if (run.digits.length !== 10 || run.hadPlus) return null;

  const hinted = includesAny(run.context, BANK_HINTS);
  // 10 digits starting 7/8/9 is usually a phone missing its trunk zero.
  const looksLikePhone = /^[789]/.test(run.digits);

  let confidence: number;
  if (hinted) confidence = 0.92;
  else if (!looksLikePhone) confidence = 0.7;
  else confidence = 0.4;

  if (includesAny(run.context, PHONE_HINTS)) confidence -= 0.25;

  return {
    kind: "account",
    value: run.digits,
    display: run.digits,
    label: "Account number",
    confidence: clamp(confidence),
    index: run.index,
  };
}

function scoreSmartcard(run: NumberRun): SmartPasteCandidate | null {
  // DStv/GOtv IUCs are 10 digits (usually 70…); Startimes runs 10–11.
  const len = run.digits.length;
  if (len < 10 || len > 11) return null;

  const hinted = includesAny(run.context, CABLE_HINTS);
  let confidence = hinted ? 0.92 : 0.5;

  if (includesAny(run.context, BANK_HINTS)) confidence -= 0.3;
  if (includesAny(run.context, METER_HINTS)) confidence -= 0.3;
  // An 11-digit `0[789]…` is unambiguously a phone; a 10-digit `70…` is not.
  if (!hinted && len === 11 && toNgMobile(run.digits, run.hadPlus)) {
    confidence -= 0.15;
  }

  return {
    kind: "smartcard",
    value: run.digits,
    display: groupInFours(run.digits),
    label: "Smartcard / IUC number",
    confidence: clamp(confidence),
    index: run.index,
  };
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(3))));
}

/**
 * Sorted best-first. One run can yield several candidates — a bare 10-digit
 * number is a plausible phone and a plausible account — and the caller filters
 * by `accepts`.
 */
export function scanClipboardText(rawText: string): SmartPasteScan {
  const text = sanitizeClipboardText(rawText);
  if (!text.trim()) return { candidates: [], containsSensitive: false };

  const runs = collectRuns(text);
  const candidates: SmartPasteCandidate[] = [];
  let containsSensitive = false;

  for (const run of runs) {
    const len = run.digits.length;

    if (includesAny(run.context, SENSITIVE_HINTS)) {
      containsSensitive = true;
      continue;
    }

    if (len < MIN_DIGITS || len > MAX_PHONE_DIGITS) continue;
    if (hasDisqualifyingShape(run.raw)) continue;

    const canonicalPhone = toNgMobile(run.digits, run.hadPlus);

    // A `+234` mobile is 13 digits and passes Luhn about one time in ten, so
    // resolve the phone first and only treat leftovers as a possible PAN.
    if (!canonicalPhone && len >= 12 && passesLuhn(run.digits)) {
      containsSensitive = true;
      continue;
    }

    if (canonicalPhone) candidates.push(scorePhone(run, canonicalPhone));

    if (len <= MAX_DIGITS) {
      const meter = scoreMeter(run);
      if (meter) candidates.push(meter);

      const account = scoreAccount(run);
      if (account) candidates.push(account);

      const smartcard = scoreSmartcard(run);
      if (smartcard) candidates.push(smartcard);
    }
  }

  candidates.sort(
    (a, b) => b.confidence - a.confidence || a.index - b.index,
  );

  return { candidates: dedupe(candidates), containsSensitive };
}

function dedupe(list: SmartPasteCandidate[]): SmartPasteCandidate[] {
  const seen = new Set<string>();
  const out: SmartPasteCandidate[] = [];
  for (const c of list) {
    const key = `${c.kind}:${c.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

/** Confidence floor per surface. */
export const SURFACE_MIN_CONFIDENCE = {
  home: 0.75,
  field: 0.5,
} as const;

/** Best candidate a surface will accept. `exclude` is the field's current value. */
export function pickCandidate(
  scan: SmartPasteScan,
  accepts: readonly SmartPasteKind[],
  minConfidence: number,
  exclude?: string,
): SmartPasteCandidate | null {
  const excludeDigits = exclude ? digitsOf(exclude) : "";

  const eligible = scan.candidates.filter(
    (c) =>
      accepts.includes(c.kind) &&
      c.confidence >= minConfidence &&
      c.value !== excludeDigits,
  );
  if (eligible.length === 0) return null;

  // Preference order beats raw confidence: on the airtime screen a phone
  // reading wins over an account reading of the same digits.
  const byPreference = [...eligible].sort((a, b) => {
    const rank = accepts.indexOf(a.kind) - accepts.indexOf(b.kind);
    if (rank !== 0) return rank;
    return b.confidence - a.confidence || a.index - b.index;
  });

  return byPreference[0];
}

export interface ResolveOptions {
  accepts: readonly SmartPasteKind[];
  minConfidence: number;
  exclude?: string;
  amountBounds?: { min?: number; max?: number };
}

export interface ResolveResult {
  candidate: SmartPasteCandidate | null;
  containsSensitive: boolean;
}

/** Entry point for the UI. Falls back to an amount only if `accepts` has one. */
export function resolveClipboardText(
  rawText: string,
  options: ResolveOptions,
): ResolveResult {
  const scan = scanClipboardText(rawText);
  const candidate = pickCandidate(
    scan,
    options.accepts,
    options.minConfidence,
    options.exclude,
  );

  if (candidate) return { candidate, containsSensitive: scan.containsSensitive };

  if (options.accepts.includes("amount") && !scan.containsSensitive) {
    const amount = detectAmount(rawText, options.amountBounds);
    if (amount && amount.value !== digitsOf(options.exclude ?? "")) {
      return { candidate: amount, containsSensitive: false };
    }
  }

  return { candidate: null, containsSensitive: scan.containsSensitive };
}

/**
 * On demand only — a loose number in a message is more often a code than a
 * naira value. Accepts `5000`, `5,000`, `₦5,000.00`, `NGN 5000`, `N5k`.
 */
export function detectAmount(
  rawText: string,
  bounds?: { min?: number; max?: number },
): SmartPasteCandidate | null {
  const text = sanitizeClipboardText(rawText);
  if (!text.trim()) return null;

  const min = bounds?.min ?? 1;
  const max = bounds?.max ?? 999_999;

  const pattern =
    /(?:₦|ngn|n)?\s?(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\s?(k\b)?/gi;

  let best: { value: number; index: number; marked: boolean } | null = null;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const [full, numeric, kSuffix] = match;
    const marked = /^[₦n]/i.test(full.trim());

    let value = Number(numeric.replace(/,/g, ""));
    if (!Number.isFinite(value)) continue;
    if (kSuffix) value *= 1000;

    value = Math.round(value);
    if (value < min || value > max) continue;

    // Prefer a marked amount (`₦2,000`) over a bare number.
    if (!best || (marked && !best.marked)) {
      best = { value, index: match.index, marked };
    }
  }

  if (!best) return null;

  return {
    kind: "amount",
    value: String(best.value),
    display: `₦${groupThousands(String(best.value))}`,
    label: "Amount",
    confidence: best.marked ? 0.9 : 0.6,
    index: best.index,
  };
}
