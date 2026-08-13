/**
 * Verification table for the smart-paste detector.
 *
 *   npm run verify:smart-paste
 *
 * Every row is a real clipboard string. Add a row before changing scoring.
 */

import {
  detectAmount,
  pickCandidate,
  scanClipboardText,
  SURFACE_MIN_CONFIDENCE,
} from "../src/features/smart-paste/lib/detect";
import type { SmartPasteKind } from "../src/features/smart-paste/lib/types";

type Surface =
  | "home"
  | "phone-field"
  | "meter-field"
  | "smartcard-field"
  | "showmax-field";

interface Case {
  name: string;
  input: string;
  surface: Surface;
  /** null = the surface must show nothing. */
  expect: { kind: SmartPasteKind; value: string } | null;
}

/** Mirrors what each screen passes to `useSmartPaste`. */
const ACCEPTS: Record<Surface, readonly SmartPasteKind[]> = {
  // No screen runs at dashboard strictness today; kept as the strict-floor case.
  home: ["phone", "meter", "smartcard"],
  "phone-field": ["phone"],
  "meter-field": ["meter"],
  "smartcard-field": ["smartcard"],
  "showmax-field": ["phone"],
};

const FLOOR: Record<Surface, number> = {
  home: SURFACE_MIN_CONFIDENCE.home,
  "phone-field": SURFACE_MIN_CONFIDENCE.field,
  "meter-field": SURFACE_MIN_CONFIDENCE.field,
  "smartcard-field": SURFACE_MIN_CONFIDENCE.field,
  "showmax-field": SURFACE_MIN_CONFIDENCE.field,
};

const P = (value: string) => ({ kind: "phone" as const, value });
const M = (value: string) => ({ kind: "meter" as const, value });
const S = (value: string) => ({ kind: "smartcard" as const, value });

const CASES: Case[] = [
  // ── Phone formats ────────────────────────────────────────────────────
  { name: "plain 11-digit", input: "08031234567", surface: "phone-field", expect: P("08031234567") },
  { name: "bare 10-digit", input: "8031234567", surface: "phone-field", expect: P("08031234567") },
  { name: "+234 international", input: "+2348031234567", surface: "phone-field", expect: P("08031234567") },
  { name: "234 without plus", input: "2348031234567", surface: "phone-field", expect: P("08031234567") },
  { name: "00234 access code", input: "002348031234567", surface: "phone-field", expect: P("08031234567") },
  { name: "+234 with trunk zero", input: "+23408031234567", surface: "phone-field", expect: P("08031234567") },
  { name: "+234 (0) bracket form", input: "+234 (0) 803 123 4567", surface: "phone-field", expect: P("08031234567") },
  { name: "spaced groups", input: "0803 123 4567", surface: "phone-field", expect: P("08031234567") },
  { name: "hyphenated", input: "0803-123-4567", surface: "phone-field", expect: P("08031234567") },
  { name: "dotted", input: "0803.123.4567", surface: "phone-field", expect: P("08031234567") },
  { name: "en-dash separators", input: "0803–123–4567", surface: "phone-field", expect: P("08031234567") },
  { name: "non-breaking spaces", input: "0803 123 4567", surface: "phone-field", expect: P("08031234567") },
  { name: "zero-width joiner", input: "0803​1234​567", surface: "phone-field", expect: P("08031234567") },
  { name: "RTL mark from WhatsApp", input: "‏08031234567‎", surface: "phone-field", expect: P("08031234567") },
  { name: "Arabic-Indic numerals", input: "٠٨٠٣١٢٣٤٥٦٧", surface: "phone-field", expect: P("08031234567") },
  { name: "fullwidth numerals", input: "０８０３１２３４５６７", surface: "phone-field", expect: P("08031234567") },
  { name: "tel: URI", input: "tel:+2348031234567", surface: "phone-field", expect: P("08031234567") },
  { name: "wa.me link", input: "https://wa.me/2348031234567", surface: "phone-field", expect: P("08031234567") },
  { name: "inside a sentence", input: "Please send the airtime to 08031234567 thanks", surface: "phone-field", expect: P("08031234567") },
  { name: "label prefix", input: "Phone: 0803 123 4567", surface: "phone-field", expect: P("08031234567") },
  { name: "trailing punctuation", input: "call me on 08031234567.", surface: "phone-field", expect: P("08031234567") },
  { name: "leading/trailing newlines", input: "\n  08031234567  \n", surface: "phone-field", expect: P("08031234567") },
  { name: "9mobile prefix", input: "09081234567", surface: "phone-field", expect: P("09081234567") },
  { name: "glo prefix", input: "08051234567", surface: "phone-field", expect: P("08051234567") },
  { name: "airtel prefix", input: "07011234567", surface: "phone-field", expect: P("07011234567") },
  { name: "two numbers — takes the first", input: "08031234567 / 08098765432", surface: "phone-field", expect: P("08031234567") },

  // ── Must not become a phone ──────────────────────────────────────────
  { name: "landline rejected", input: "012345678", surface: "phone-field", expect: null },
  { name: "foreign number rejected", input: "+14155552671", surface: "phone-field", expect: null },
  { name: "UK number rejected", input: "+447911123456", surface: "phone-field", expect: null },
  { name: "wrong NG prefix (06)", input: "06031234567", surface: "phone-field", expect: null },
  { name: "12 digits rejected", input: "080312345678", surface: "phone-field", expect: null },
  { name: "OTP not a phone", input: "Your code is 483920", surface: "phone-field", expect: null },
  { name: "date not a phone", input: "2024-08-13", surface: "phone-field", expect: null },
  { name: "IPv4 not a phone", input: "192.168.100.101", surface: "phone-field", expect: null },
  { name: "money not a phone", input: "₦5,000.00", surface: "phone-field", expect: null },
  { name: "BVN by context", input: "My BVN is 22123456789", surface: "phone-field", expect: null },
  { name: "NIN by context", input: "NIN: 12345678901", surface: "phone-field", expect: null },
  { name: "card PAN (Luhn)", input: "4111111111111111", surface: "phone-field", expect: null },
  { name: "empty string", input: "", surface: "phone-field", expect: null },
  { name: "prose with no number", input: "hey are you around today?", surface: "phone-field", expect: null },

  // ── Meter ────────────────────────────────────────────────────────────
  { name: "13-digit meter", input: "1234567890123", surface: "meter-field", expect: M("1234567890123") },
  { name: "hinted 11-digit meter", input: "Meter number: 45012345678", surface: "meter-field", expect: M("45012345678") },
  { name: "hinted prepaid meter", input: "Ikeja prepaid meter 04123456789", surface: "meter-field", expect: M("04123456789") },
  { name: "spaced meter", input: "1234 5678 9012 3", surface: "meter-field", expect: M("1234567890123") },
  { name: "hinted 8-digit postpaid", input: "postpaid meter 12345678", surface: "meter-field", expect: M("12345678") },
  { name: "test meter (repeated digits)", input: "1111111111111", surface: "meter-field", expect: M("1111111111111") },
  { name: "meter beats phone when hinted", input: "AEDC meter 08031234567", surface: "meter-field", expect: M("08031234567") },
  { name: "phone still wins on phone field", input: "AEDC meter 08031234567", surface: "phone-field", expect: null },

  // ── Strict floor: only near-certain matches pass ──────────────────────
  { name: "home shows a clean phone", input: "08031234567", surface: "home", expect: P("08031234567") },
  { name: "home shows a hinted meter", input: "my meter number is 45012345678", surface: "home", expect: M("45012345678") },
  { name: "home ignores bare 10-digit", input: "8031234567", surface: "home", expect: null },
  { name: "home ignores a NUBAN", input: "GTB 0123456789", surface: "home", expect: null },
  { name: "home ignores an 11-digit non-phone", input: "45012345678", surface: "home", expect: null },
  { name: "home shows a hinted smartcard", input: "DStv IUC 7012345678", surface: "home", expect: { kind: "smartcard", value: "7012345678" } },

  // ── Messy payloads ───────────────────────────────────────────────────
  { name: "parenthesised area group", input: "(0803) 123 4567", surface: "phone-field", expect: P("08031234567") },
  { name: "comma separated pair", input: "08031234567,08098765432", surface: "phone-field", expect: P("08031234567") },
  { name: "multiline contact card", input: "John Doe\n08031234567\nGTBank", surface: "phone-field", expect: P("08031234567") },
  { name: "number at end of long message", input: `${"lorem ipsum ".repeat(40)}reach me on 0803 123 4567`, surface: "phone-field", expect: P("08031234567") },
  { name: "bare 10-digit meter", input: "0412345678", surface: "meter-field", expect: M("0412345678") },
  { name: "NUBAN not offered as a meter", input: "Acct: 0123456789 Zenith Bank", surface: "meter-field", expect: null },
  { name: "NUBAN not offered on phone field", input: "Acct: 0123456789 Zenith Bank", surface: "phone-field", expect: null },
  { name: "order id does not interrupt home", input: "Order #1234567890123 shipped", surface: "home", expect: null },
  { name: "amount-only text offers nothing", input: "I sent you ₦12,500 now", surface: "phone-field", expect: null },
  { name: "url with digits ignored", input: "https://smipay.ng/tx/8912345677", surface: "home", expect: null },

  // ── Cable: smartcard / IUC, and Showmax which bills a phone ──────────
  { name: "bare DStv IUC", input: "7012345678", surface: "smartcard-field", expect: S("7012345678") },
  { name: "hinted IUC", input: "DStv IUC 7012345678", surface: "smartcard-field", expect: S("7012345678") },
  { name: "spaced IUC", input: "7012 3456 78", surface: "smartcard-field", expect: S("7012345678") },
  { name: "11-digit Startimes card", input: "02123456789", surface: "smartcard-field", expect: S("02123456789") },
  { name: "GOtv label prefix", input: "GOtv smartcard: 4034567890", surface: "smartcard-field", expect: S("4034567890") },
  { name: "a phone is not an IUC", input: "08031234567", surface: "smartcard-field", expect: null },
  { name: "a hinted meter is not an IUC", input: "Ikeja meter 04123456789", surface: "smartcard-field", expect: null },
  { name: "a NUBAN is not an IUC", input: "GTB 0123456789", surface: "smartcard-field", expect: null },
  { name: "card PAN is not an IUC", input: "4111111111111111", surface: "smartcard-field", expect: null },
  { name: "Showmax takes a phone", input: "08031234567", surface: "showmax-field", expect: P("08031234567") },
  { name: "Showmax ignores an IUC", input: "DStv IUC 7012345678", surface: "showmax-field", expect: null },
];

interface AmountCase {
  name: string;
  input: string;
  expect: string | null;
}

const AMOUNT_CASES: AmountCase[] = [
  { name: "plain", input: "5000", expect: "5000" },
  { name: "comma grouped", input: "5,000", expect: "5000" },
  { name: "naira marked", input: "₦2,500", expect: "2500" },
  { name: "NGN prefix", input: "NGN 1500", expect: "1500" },
  { name: "with kobo", input: "₦1,250.00", expect: "1250" },
  { name: "k shorthand", input: "₦5k", expect: "5000" },
  { name: "in a sentence", input: "send me ₦2000 please", expect: "2000" },
  { name: "prefers the marked amount", input: "order 12345 total ₦3,000", expect: "3000" },
  { name: "above cap rejected", input: "12345678", expect: null },
  { name: "no number", input: "thanks!", expect: null },
];

let passed = 0;
const failures: string[] = [];

for (const c of CASES) {
  const scan = scanClipboardText(c.input);
  const got = pickCandidate(scan, ACCEPTS[c.surface], FLOOR[c.surface]);

  const ok = c.expect
    ? got !== null && got.kind === c.expect.kind && got.value === c.expect.value
    : got === null;

  if (ok) {
    passed++;
  } else {
    failures.push(
      `  [${c.surface}] ${c.name}\n` +
        `      input:    ${JSON.stringify(c.input)}\n` +
        `      expected: ${c.expect ? `${c.expect.kind} ${c.expect.value}` : "no suggestion"}\n` +
        `      got:      ${got ? `${got.kind} ${got.value} (${got.confidence})` : "no suggestion"}`,
    );
  }
}

for (const c of AMOUNT_CASES) {
  const got = detectAmount(c.input, { min: 50, max: 999_999 });
  const ok = c.expect ? got?.value === c.expect : got === null;

  if (ok) {
    passed++;
  } else {
    failures.push(
      `  [amount] ${c.name}\n` +
        `      input:    ${JSON.stringify(c.input)}\n` +
        `      expected: ${c.expect ?? "no suggestion"}\n` +
        `      got:      ${got?.value ?? "no suggestion"}`,
    );
  }
}

const total = CASES.length + AMOUNT_CASES.length;
console.log(`smart-paste detector: ${passed}/${total} passed`);
if (failures.length > 0) {
  console.log("\nFailures:\n" + failures.join("\n\n"));
  process.exit(1);
}
