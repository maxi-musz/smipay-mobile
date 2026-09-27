import {
  formatNgSubscriber,
  toNgSubscriberDigits,
  isNgPhoneInputFull,
  normaliseNgPhoneInput,
  sanitiseNgPhoneTyping,
} from "../src/lib/ng-phone-input";

interface Case {
  name: string;
  input: string;
  how: "type" | "paste";
  field: string;
  normalised: string | null;
  full: boolean;
}

const N = "08146694787";

const CASES: Case[] = [
  { name: "local + 1", input: "081466947877", how: "type", field: N, normalised: N, full: true },
  { name: "bare 10 + 1", input: "81466947877", how: "type", field: "8146694787", normalised: N, full: true },
  { name: "234 + 1", input: "23481466947877", how: "type", field: "2348146694787", normalised: N, full: true },
  { name: "+234 + 1", input: "+23481466947879", how: "type", field: "+2348146694787", normalised: N, full: true },
  { name: "+234 0 + 1", input: "+234081466947877", how: "type", field: "+23408146694787", normalised: N, full: true },
  { name: "00234 + 1", input: "0023481466947877", how: "type", field: "002348146694787", normalised: N, full: true },
  { name: "00234 0 + 1", input: "00234081466947877", how: "type", field: "0023408146694787", normalised: N, full: true },
  { name: "+234 + many", input: "+2348146694787999", how: "type", field: "+2348146694787", normalised: N, full: true },

  { name: "lone 2", input: "2", how: "type", field: "2", normalised: null, full: false },
  { name: "23 grows into 234", input: "234", how: "type", field: "234", normalised: null, full: false },
  { name: "00 grows into 00234", input: "00234", how: "type", field: "00234", normalised: null, full: false },
  { name: "+ alone", input: "+", how: "type", field: "+", normalised: null, full: false },
  { name: "empty", input: "", how: "type", field: "", normalised: null, full: false },
  { name: "234 then trunk 0", input: "2340", how: "type", field: "2340", normalised: null, full: false },
  { name: "local short", input: "0814669478", how: "type", field: "0814669478", normalised: null, full: false },

  { name: "local bad network", input: "06012345678", how: "type", field: "06012345678", normalised: null, full: true },
  { name: "bare bad network", input: "1234567890", how: "type", field: "1234567890", normalised: null, full: true },
  { name: "234 bad network", input: "2346012345678", how: "type", field: "2346012345678", normalised: null, full: true },

  { name: "paste local", input: N, how: "paste", field: N, normalised: N, full: true },
  { name: "paste bare", input: "8146694787", how: "paste", field: "8146694787", normalised: N, full: true },
  { name: "paste 234", input: "2348146694787", how: "paste", field: "2348146694787", normalised: N, full: true },
  { name: "paste +234", input: "+2348146694787", how: "paste", field: "+2348146694787", normalised: N, full: true },
  { name: "paste 00234", input: "002348146694787", how: "paste", field: "002348146694787", normalised: N, full: true },
  { name: "paste +234 0", input: "+23408146694787", how: "paste", field: "+23408146694787", normalised: N, full: true },
  { name: "paste +234 (0) formatted", input: "+234 (0) 814-669-4787", how: "paste", field: "+23408146694787", normalised: N, full: true },
  { name: "paste 00234 0", input: "0023408146694787", how: "paste", field: "0023408146694787", normalised: N, full: true },
  { name: "paste spaced +234", input: "+234 814 669 4787", how: "paste", field: "+2348146694787", normalised: N, full: true },
  { name: "paste dotted local", input: "0814.669.4787", how: "paste", field: N, normalised: N, full: true },
  { name: "paste slashed local", input: "0814/669/4787", how: "paste", field: N, normalised: N, full: true },
  {
    name: "paste with bidi marks",
    input: "‪+234 814 669 4787‬",
    how: "paste",
    field: "+2348146694787",
    normalised: N,
    full: true,
  },
  { name: "paste fullwidth", input: "＋２３４８１４６６９４７８７", how: "paste", field: "+2348146694787", normalised: N, full: true },
  { name: "paste local + extra", input: "0814669478799", how: "paste", field: N, normalised: N, full: true },
];

function run(c: Case): string {
  if (c.how === "paste") return sanitiseNgPhoneTyping(c.input);
  let field = "";
  for (const ch of Array.from(c.input)) field = sanitiseNgPhoneTyping(field + ch);
  return field;
}

let passed = 0;
const failures: string[] = [];

for (const c of CASES) {
  const field = run(c);
  const normalised = normaliseNgPhoneInput(field);
  const full = isNgPhoneInputFull(field);
  if (field === c.field && normalised === c.normalised && full === c.full) {
    passed++;
  } else {
    failures.push(
      `  [${c.how}] ${c.name}\n` +
        `      input:    ${JSON.stringify(c.input)}\n` +
        `      expected: field ${JSON.stringify(c.field)}, normalised ${c.normalised}, full ${c.full}\n` +
        `      got:      field ${JSON.stringify(field)}, normalised ${normalised}, full ${full}`,
    );
  }
}

const SUBSCRIBER_CASES: [string, string, string][] = [
  ["8", "8", "8"],
  ["0", "", ""],
  ["08", "8", "8"],
  ["081466", "81466", "814 66"],
  ["08146694787", "8146694787", "814 669 4787"],
  ["8146694787", "8146694787", "814 669 4787"],
  ["81466947871", "8146694787", "814 669 4787"],
  ["+2348146694787", "8146694787", "814 669 4787"],
  ["+234 (0) 814 669 4787", "8146694787", "814 669 4787"],
  ["002348146694787", "8146694787", "814 669 4787"],
  ["\u202a+234 814 669 4787\u202c", "8146694787", "814 669 4787"],
  ["814 669 478", "814669478", "814 669 478"],
];

let subPassed = 0;
for (const [input, digits, shown] of SUBSCRIBER_CASES) {
  const got = toNgSubscriberDigits(input);
  const fmt = formatNgSubscriber(got);
  if (got === digits && fmt === shown) subPassed++;
  else {
    failures.push(
      `  [subscriber] ${JSON.stringify(input)}\n` +
        `      expected: ${digits} / "${shown}"\n` +
        `      got:      ${got} / "${fmt}"`,
    );
  }
}

console.log(`ng phone input: ${passed}/${CASES.length} passed`);
console.log(`+234 field: ${subPassed}/${SUBSCRIBER_CASES.length} passed`);
if (failures.length > 0) {
  console.log("\nFailures:\n" + failures.join("\n\n"));
  process.exit(1);
}
