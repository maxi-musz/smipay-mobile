// Must match the backend phone floor in common/phone/phone.util.ts.
const SUBSCRIBER_RE = /^[789][01]\d{8}$/;

// Invisible format chars are listed explicitly: \p{Cf} isn't supported on every JS engine.
const SEPARATORS_RE =
  /[\s\-.()/­؜᠎​-‏‐-―‪-‮⁠-⁤⁦-⁩−﹘﹣﻿（）－．／]/g;

const SUBSCRIBER_DIGITS = 10;

const COUNTRY_CODE = "234";

const INTL_PREFIX = "00";

// Native maxLength truncates a paste before JS sees it, so leave room for formatting.
export const NG_PHONE_INPUT_MAX_LENGTH = 32;

function foldFullwidth(input: string): string {
  return input.replace(/[＋０-９]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xfee0),
  );
}

function stripSeparators(input: string): string {
  return foldFullwidth(input).replace(SEPARATORS_RE, "");
}

export function normaliseNgPhoneInput(
  raw: string | null | undefined,
): string | null {
  const compact = stripSeparators(raw ?? "");
  if (!/^\+?\d+$/.test(compact)) return null;

  let digits = compact.replace(/^\+/, "");
  if (digits.startsWith(`${INTL_PREFIX}${COUNTRY_CODE}`)) {
    digits = digits.slice(INTL_PREFIX.length);
  }
  if (/^2340\d{10}$/.test(digits)) digits = `234${digits.slice(4)}`;

  let subscriber: string | null = null;
  if (/^0\d{10}$/.test(digits)) subscriber = digits.slice(1);
  else if (/^234\d{10}$/.test(digits)) subscriber = digits.slice(3);
  else if (/^[1-9]\d{9}$/.test(digits)) subscriber = digits;

  return subscriber && SUBSCRIBER_RE.test(subscriber) ? `0${subscriber}` : null;
}

export function isValidNgPhoneInput(raw: string | null | undefined): boolean {
  return normaliseNgPhoneInput(raw) !== null;
}

function maxDigitsFor(digits: string): number {
  const trunkAfter = (prefix: string) =>
    digits.charAt(prefix.length) === "0" ? 1 : 0;

  const intl = `${INTL_PREFIX}${COUNTRY_CODE}`;
  if (digits.startsWith(intl)) {
    return intl.length + trunkAfter(intl) + SUBSCRIBER_DIGITS;
  }
  if (digits.startsWith(COUNTRY_CODE)) {
    return COUNTRY_CODE.length + trunkAfter(COUNTRY_CODE) + SUBSCRIBER_DIGITS;
  }
  if (digits.startsWith("0")) return 1 + SUBSCRIBER_DIGITS;
  return SUBSCRIBER_DIGITS;
}

function inputDigits(raw: string): string {
  return stripSeparators(raw).replace(/\D/g, "");
}

export function sanitiseNgPhoneTyping(raw: string): string {
  const plus = stripSeparators(raw).startsWith("+") ? "+" : "";
  const digits = inputDigits(raw);
  return plus + digits.slice(0, maxDigitsFor(digits));
}

export function isNgPhoneInputFull(raw: string | null | undefined): boolean {
  const digits = inputDigits(raw ?? "");
  return digits.length > 0 && digits.length >= maxDigitsFor(digits);
}

// For a field that already shows +234: typed digits, a leading trunk 0, or a
// pasted full number (+234…, 0…, 00234…) all reduce to the 10 subscriber digits.
export function toNgSubscriberDigits(raw: string | null | undefined): string {
  const full = normaliseNgPhoneInput(raw);
  if (full) return full.slice(1);

  let digits = stripSeparators(raw ?? "").replace(/\D/g, "");
  if (digits.startsWith(`${INTL_PREFIX}${COUNTRY_CODE}`)) {
    digits = digits.slice(INTL_PREFIX.length + COUNTRY_CODE.length);
  } else if (
    digits.startsWith(COUNTRY_CODE) &&
    digits.length > SUBSCRIBER_DIGITS
  ) {
    digits = digits.slice(COUNTRY_CODE.length);
  }
  return digits.replace(/^0+/, "").slice(0, SUBSCRIBER_DIGITS);
}

export function formatNgSubscriber(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, SUBSCRIBER_DIGITS);
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6)].filter(Boolean).join(" ");
}
