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

export type HistoryStatus = "pending" | "success" | "failed" | "cancelled";

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

export interface SingleTransaction {
  id: string;
  amount: string;
  type: string;
  description: string;
  provider: string | null;
  status: HistoryStatus;
  recipient_mobile: string | null;
  tx_reference: string | null;
  created_on: string;
  updated_on: string;
  sender: string | null;
  icon: string | null;
}

