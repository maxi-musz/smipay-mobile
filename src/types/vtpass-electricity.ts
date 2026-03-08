import type { ApiResponse } from "./api";

// ── Service IDs ────────────────────────────────────────────────────────────

export interface ElectricityServiceItem {
  serviceID: string;
  name: string;
  identifier?: string;
}

export interface ElectricityServiceIdsResponse {
  success: boolean;
  message: string;
  data: ElectricityServiceItem[];
}

// ── Meter Type ─────────────────────────────────────────────────────────────

export type MeterType = "prepaid" | "postpaid";

// ── Verify Meter ───────────────────────────────────────────────────────────

export interface ElectricityVerifyRequest {
  billersCode: string;
  serviceID: string;
  type: MeterType;
}

export interface ElectricityVerifyContent {
  Customer_Name: string;
  Address?: string;
  Meter_Number?: string;
  Customer_Arrears?: string;
  Minimum_Amount?: string;
  Min_Purchase_Amount?: string;
  Can_Vend?: string;
  Business_Unit?: string;
  Customer_Account_Type?: string;
  Meter_Type?: string;
  Service_Band?: string;
  WrongBillersCode?: boolean;
}

export interface ElectricityVerifyResponse {
  success: boolean;
  message: string;
  data?: {
    code: string;
    content: ElectricityVerifyContent;
  };
}

// ── Purchase ───────────────────────────────────────────────────────────────

export interface ElectricityPurchaseRequest {
  serviceID: string;
  billersCode: string;
  variation_code: MeterType;
  amount: number;
  phone: string;
  request_id?: string;
  use_cashback?: boolean;
}

export interface ElectricityTransactionContent {
  status: string;
  product_name?: string;
  unique_element?: string;
  unit_price?: string | number;
  quantity?: number;
  transactionId?: string;
  commission?: number;
}

export interface ElectricityPurchaseData {
  id: string;
  code: string;
  response_description?: string;
  status?: "processing" | "delivered" | "pending" | "initiated";
  message?: string;
  requestId?: string;
  amount: number;
  transaction_date?: string;
  purchased_code?: string;
  electricity_token?: string;
  token?: string;
  units?: string;
  customerName?: string;
  customerAddress?: string;
  wallet_balance?: number;
  content?: {
    transactions: ElectricityTransactionContent;
  };
}

export type ElectricityPurchaseResponse = ApiResponse<ElectricityPurchaseData>;

// ── Query Transaction ──────────────────────────────────────────────────────

export interface ElectricityQueryRequest {
  request_id: string;
}

export interface ElectricityQueryResponse {
  success: boolean;
  message: string;
  data?: {
    code?: string;
    response_description?: string;
    content?: {
      transactions: ElectricityTransactionContent;
    };
    requestId?: string;
    amount?: number;
    purchased_code?: string;
    electricity_token?: string;
    units?: string;
  };
}
