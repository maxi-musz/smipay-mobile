import { coerceMoneyNumber, formatBalanceForDisplay } from "@/lib/money";
import type { HistoryStatus, SingleTransaction, TransactionMeta } from "@/types";

export type ReceiptLine = { label: string; value: string };

export type ReceiptPayload = {
  providerLabel: string;
  transactionTypeLabel: string;
  debitCreditLabel: "DEBIT" | "CREDIT";
  amountPrefix: string;
  amountDisplay: string;
  statusLabel: string;
  statusKey: HistoryStatus;
  isCredit: boolean;
  lines: ReceiptLine[];
};

function getMetaAddress(meta: TransactionMeta | null | undefined): string | null {
  if (!meta) return null;
  const raw = meta.customer_address ?? meta.address;
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s === "" || s.toUpperCase() === "N/A") return null;
  return s;
}

function getCashbackEarnedAmount(tx: SingleTransaction): number | null {
  const raw = (tx as unknown as Record<string, unknown>).cashback_earned;
  const rawCamel = (tx as unknown as Record<string, unknown>).cashbackEarned;
  return coerceMoneyNumber(raw ?? rawCamel);
}

function walletCashbackRows(tx: SingleTransaction): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  if (tx.balance_before != null) {
    rows.push({
      label: "Wallet balance before",
      value: formatBalanceForDisplay(tx.balance_before),
    });
  }
  if (tx.balance_after != null) {
    rows.push({
      label: "Wallet balance after",
      value: formatBalanceForDisplay(tx.balance_after),
    });
  }
  const earned = getCashbackEarnedAmount(tx);
  if (earned != null && earned > 0) {
    rows.push({
      label: "Cashback earned",
      value: formatBalanceForDisplay(earned),
    });
  }
  return rows;
}

function formatType(type: string): string {
  switch (type) {
    case "deposit":
      return "Deposit";
    case "transfer":
      return "Transfer";
    case "airtime":
      return "Airtime";
    case "data":
      return "Data";
    case "cable":
      return "Cable TV";
    case "education":
      return "Education";
    case "electricity":
      return "Electricity";
    case "betting":
      return "Betting";
    case "referral_bonus":
      return "Referral Bonus";
    default:
      return type;
  }
}

function getProviderLabel(tx: SingleTransaction): string {
  if (tx.meta?.product_name) return tx.meta.product_name;
  if (tx.provider) return tx.provider;

  const desc = tx.description.toLowerCase();
  if (desc.includes("mtn")) return "MTN";
  if (desc.includes("glo")) return "Glo";
  if (desc.includes("airtel")) return "Airtel";
  if (desc.includes("9mobile") || desc.includes("etisalat")) return "9mobile";
  if (desc.includes("dstv")) return "DStv";
  if (desc.includes("gotv")) return "GOtv";
  if (desc.includes("startimes")) return "StarTimes";
  if (desc.includes("showmax")) return "Showmax";
  if (desc.includes("jamb")) return "JAMB";
  if (desc.includes("waec")) return "WAEC";

  switch (tx.type) {
    case "deposit":
      return "Wallet Funding";
    case "transfer":
      return "Transfer";
    case "airtime":
      return "Airtime";
    case "data":
      return "Data";
    case "cable":
      return "Cable TV";
    case "education":
      return "Education";
    case "electricity":
      return "Electricity";
    case "betting":
      return "Betting";
    case "referral_bonus":
      return "Referral Bonus";
    default:
      return tx.type;
  }
}

function hasCredentials(meta: TransactionMeta | null | undefined): boolean {
  if (!meta) return false;
  return !!(
    meta.pin ||
    meta.serial ||
    (meta.cards && meta.cards.length > 0) ||
    (meta.tokens && meta.tokens.length > 0)
  );
}

const STATUS_LABELS: Record<HistoryStatus, string> = {
  success: "Successful",
  pending: "Pending",
  failed: "Failed",
  cancelled: "Cancelled",
  reversed: "Reversed",
};

export function buildReceiptPayload(tx: SingleTransaction): ReceiptPayload {
  const lines: ReceiptLine[] = [];
  const metaAddress = getMetaAddress(tx.meta);

  const isCredit =
    tx.credit_debit != null
      ? tx.credit_debit === "credit"
      : tx.type === "deposit" || tx.type === "referral_bonus";
  const amountPrefix = isCredit ? "+" : "-";

  if (tx.description) {
    lines.push({ label: "Description", value: tx.description });
  }
  if (tx.type === "data" && tx.data_plan_name) {
    lines.push({ label: "Data plan", value: tx.data_plan_name });
  } else if (tx.type === "data" && !tx.data_plan_name && tx.meta?.data_plan) {
    lines.push({ label: "Data plan", value: String(tx.meta.data_plan) });
  }

  if (tx.meta?.product_name) {
    lines.push({ label: "Product", value: tx.meta.product_name });
  }
  if (tx.recipient_mobile) {
    lines.push({ label: "Recipient", value: tx.recipient_mobile });
  }
  if (tx.meta?.phone && !tx.recipient_mobile) {
    lines.push({ label: "Phone", value: tx.meta.phone });
  }
  if (tx.sender) {
    lines.push({ label: "Sender", value: tx.sender });
  }
  if (tx.provider) {
    lines.push({ label: "Provider", value: tx.provider });
  }
  if (tx.meta?.customer_name) {
    lines.push({ label: "Customer", value: tx.meta.customer_name });
  }
  if (tx.meta?.smartcard_number) {
    lines.push({ label: "Smartcard No.", value: tx.meta.smartcard_number });
  }
  if (tx.meta?.current_bouquet) {
    lines.push({ label: "Bouquet", value: tx.meta.current_bouquet });
  }
  if (tx.meta?.subscription_type) {
    lines.push({
      label: "Subscription",
      value: tx.meta.subscription_type === "renew" ? "Renewal" : "Bouquet change",
    });
  }
  if (tx.meta?.meter_number) {
    lines.push({ label: "Meter No.", value: tx.meta.meter_number });
  }
  if (tx.meta?.meter_type) {
    lines.push({
      label: "Meter type",
      value:
        String(tx.meta.meter_type).charAt(0).toUpperCase() +
        String(tx.meta.meter_type).slice(1),
    });
  }
  if (tx.type === "electricity" && tx.meta?.disco) {
    lines.push({ label: "Disco", value: String(tx.meta.disco) });
  }
  if (metaAddress != null) {
    lines.push({ label: "Address", value: metaAddress });
  }
  if (tx.meta?.units) {
    lines.push({ label: "Units", value: String(tx.meta.units) });
  }
  if (tx.meta?.profile_id) {
    lines.push({ label: "JAMB Profile ID", value: tx.meta.profile_id });
  }
  if (tx.meta?.quantity != null && tx.meta.quantity > 1) {
    lines.push({ label: "Quantity", value: String(tx.meta.quantity) });
  }

  if (tx.type === "education" && tx.status === "success" && hasCredentials(tx.meta)) {
    lines.push({
      label: "Credentials",
      value: "PIN / serial available in the SmiPay app only",
    });
  }

  if (tx.type === "electricity" && tx.status === "success") {
    if (tx.meta?.electricity_token) {
      lines.push({ label: "Electricity token", value: tx.meta.electricity_token });
    } else {
      lines.push({ label: "Electricity token", value: "Not available" });
    }
  }

  if (tx.tx_reference) {
    lines.push({ label: "Reference", value: tx.tx_reference });
  }
  lines.push({ label: "Date", value: tx.created_on });
  if (tx.updated_on && tx.updated_on !== tx.created_on) {
    lines.push({ label: "Updated", value: tx.updated_on });
  }

  for (const row of walletCashbackRows(tx)) {
    lines.push({ label: row.label, value: row.value });
  }

  const status = tx.status as HistoryStatus;

  return {
    providerLabel: getProviderLabel(tx),
    transactionTypeLabel: formatType(tx.type),
    debitCreditLabel: isCredit ? "CREDIT" : "DEBIT",
    amountPrefix,
    amountDisplay: tx.amount,
    statusLabel: STATUS_LABELS[status] ?? tx.status,
    statusKey: status,
    isCredit,
    lines,
  };
}
