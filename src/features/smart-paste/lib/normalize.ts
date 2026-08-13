/**
 * Text repair for clipboard content, run before any pattern matching so the
 * detector only sees ASCII digits and plain separators. Real clipboards carry
 * directional marks from WhatsApp, non-breaking spaces from PDFs, zero-width
 * joiners from the web, and non-Latin numerals from other keyboards.
 */

/** Longer than this is a document, not a copied number. */
export const MAX_SCAN_LENGTH = 2000;

/** Unicode digit blocks we fold to ASCII, as [start, end] code point pairs. */
const DIGIT_BLOCKS: readonly (readonly [number, number])[] = [
  [0x0660, 0x0669], // Arabic-Indic
  [0x06f0, 0x06f9], // Extended Arabic-Indic (Persian / Urdu keyboards)
  [0x0966, 0x096f], // Devanagari
  [0x09e6, 0x09ef], // Bengali
  [0x0be6, 0x0bef], // Tamil
  [0xff10, 0xff19], // Fullwidth (CJK IMEs)
];

/** Built from escapes: the literal characters are invisible in an editor. */
function charClass(...escapes: string[]): RegExp {
  return new RegExp("[" + escapes.join("") + "]", "g");
}

/** Soft hyphen, zero-width chars, bidi controls, BOM. */
const INVISIBLE = charClass(
  "\\u00AD",
  "\\u200B-\\u200F",
  "\\u202A-\\u202E",
  "\\u2060-\\u2064",
  "\\uFEFF",
);

/** Every flavour of whitespace that is not U+0020. */
const EXOTIC_SPACE = charClass(
  "\\t",
  "\\u000B\\u000C",
  "\\u00A0",
  "\\u1680",
  "\\u2000-\\u200A",
  "\\u202F",
  "\\u205F",
  "\\u3000",
);

/** Hyphen lookalikes: figure/en/em dash, minus sign, non-breaking & fullwidth hyphen. */
const EXOTIC_HYPHEN = charClass(
  "\\u2010-\\u2015",
  "\\u2043",
  "\\u2212",
  "\\uFE58",
  "\\uFE63",
  "\\uFF0D",
);

/** `tel:`, `sms:`, `callto:`, `whatsapp://send?phone=` and friends. */
const URI_SCHEME = /\b(?:tel|sms|smsto|callto|whatsapp|wa\.me)\s*:(?:\/\/)?/gi;

function foldDigit(char: string): string {
  const code = char.codePointAt(0);
  if (code === undefined) return char;
  for (const [start, end] of DIGIT_BLOCKS) {
    if (code >= start && code <= end) {
      return String.fromCharCode(48 + (code - start));
    }
  }
  return char;
}

/** Idempotent; safe to run on already-clean text. */
export function sanitizeClipboardText(raw: string): string {
  if (!raw) return "";

  const clipped =
    raw.length > MAX_SCAN_LENGTH ? raw.slice(0, MAX_SCAN_LENGTH) : raw;

  let out = "";
  for (const char of clipped) {
    out += foldDigit(char);
  }

  return out
    .replace(INVISIBLE, "")
    .replace(URI_SCHEME, " ")
    .replace(EXOTIC_SPACE, " ")
    .replace(EXOTIC_HYPHEN, "-");
}

/** Digits only. */
export function digitsOf(value: string): string {
  return value.replace(/\D/g, "");
}

/** `08031234567` → `080 312 34567`, matching the airtime field's grouping. */
export function groupPhoneDigits(value: string): string {
  const d = digitsOf(value);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

/** `1234567890123` → `1234 5678 9012 3`. Meter and smartcard numbers. */
export function groupInFours(value: string): string {
  return digitsOf(value).replace(/(.{4})/g, "$1 ").trim();
}

/** `5000` → `5,000`. */
export function groupThousands(value: string): string {
  return digitsOf(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** A 12–19 digit string that passes is very likely a card PAN. */
export function passesLuhn(digits: string): boolean {
  if (!/^\d+$/.test(digits) || digits.length < 12) return false;

  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let value = digits.charCodeAt(i) - 48;
    if (double) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
    double = !double;
  }
  return sum % 10 === 0;
}
