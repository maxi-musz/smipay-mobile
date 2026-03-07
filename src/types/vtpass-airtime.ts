import type { ApiResponse } from "./api";

export interface AirtimeServiceItem {
  serviceID: string;
  name: string;
  /** API typo: "minimium" — we support both */
  minimium_amount?: string;
  minimum_amount?: string;
  maximum_amount: string;
  convinience_fee: string;
  product_type: string;
  image: string;
}

export interface AirtimeServiceIdsResponse {
  success: boolean;
  message: string;
  data: AirtimeServiceItem[];
}

export interface AirtimePurchaseRequest {
  serviceID: string;
  amount: number;
  phone: string;
  request_id?: string;
  use_cashback?: boolean;
}

export interface AirtimeTransactionContent {
  status: string;
  product_name: string;
  unique_element: string;
  unit_price: string;
  quantity: number;
  amount: string;
  commission: number;
  total_amount: number;
  transactionId: string;
  commission_details?: {
    amount: number;
    rate: string;
    rate_type: string;
    computation_type: string;
  };
}

export interface AirtimePurchaseData {
  id: string;
  code: string;
  response_description?: string;
  status?: "processing" | "delivered" | "pending" | "initiated";
  message?: string;
  content?: {
    transactions: AirtimeTransactionContent;
  };
  requestId?: string;
  amount: number;
  transaction_date?: string;
}

export type AirtimePurchaseResponse = ApiResponse<AirtimePurchaseData>;
