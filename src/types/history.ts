export interface HistoryCategories {
  all: number;
  deposit?: number;
  transfer?: number;
  airtime?: number;
  data?: number;
  cable?: number;
  education?: number;
  betting?: number;
  referral_bonus?: number;
  [key: string]: number | undefined;
}

export interface HistoryPagination {
  currentPage: number;
  totalItems: number;
  totalPages: number;
  activeFilter: string;
}

export type HistoryStatus = "pending" | "success" | "failed" | "cancelled" | "reversed";

export type HistoryDirection = "credit" | "debit";

export interface HistoryTransaction {
  id: string;
  amount: string;
  raw_amount: number;
  type: string;
  credit_debit: HistoryDirection;
  transaction_type: string;
  description: string;
  status: HistoryStatus;
  /** Data bundle label for `data` transactions; null otherwise */
  data_plan_name?: string | null;
  date: string;
  reference: string | null;
  sender: string | null;
  icon: string | null;
  payment_channel: string | null;
  payment_method: string | null;
}

export interface HistoryListData {
  categories: HistoryCategories;
  pagination: HistoryPagination;
  transactions: HistoryTransaction[];
}

export interface TransactionMeta {
  /** VTU / Cable / Education */
  service_id?: string;
  variation_code?: string;
  product_name?: string;
  phone?: string;
  quantity?: number;

  /** Education-specific */
  pin?: string;
  serial?: string;
  tokens?: string[];
  cards?: { Serial: string; Pin: string }[];
  profile_id?: string | null;
  purchased_code?: string;

  /** Cable-specific */
  smartcard_number?: string;
  subscription_type?: string;
  customer_name?: string;
  current_bouquet?: string;

  /** Airtime / Data */
  network?: string;
  recipient_phone?: string;
  data_plan?: string;

  /** Electricity-specific */
  meter_number?: string;
  meter_type?: string;
  electricity_token?: string;
  units?: string;
  address?: string;
  /** Electricity: customer address from provider (preferred over `address` when both exist) */
  customer_address?: string | null;
  /** Electricity: distribution company label */
  disco?: string | null;

  /** Catch-all for future fields */
  [key: string]: unknown;
}

export interface SingleTransaction {
  id: string;
  amount: string;
  type: string;
  description: string;
  /** Data plan name for `data` transactions */
  data_plan_name?: string | null;
  provider: string | null;
  status: HistoryStatus;
  recipient_mobile: string | null;
  tx_reference: string | null;
  created_on: string;
  updated_on: string;
  sender: string | null;
  icon: string | null;
  credit_debit?: string;
  raw_amount?: number;
  wallet_balance?: number;
  balance_before?: number | null;
  balance_after?: number | null;
  cashback_balance_before?: number | null;
  cashback_used?: number | null;
  cashback_balance_after?: number | null;
  cashback_earned?: number | null;
  meta?: TransactionMeta | null;
}

