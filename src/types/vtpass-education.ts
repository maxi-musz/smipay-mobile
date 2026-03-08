import type { ApiResponse } from "./api";

// ── Variation Codes ─────────────────────────────────────────────────────────

export interface EducationVariation {
  variation_code: string;
  name: string;
  variation_amount: string;
  fixedPrice?: string;
}

export interface EducationVariationsResponse {
  success: boolean;
  message: string;
  data: {
    serviceName: string;
    serviceID: string;
    convenienceFee: string;
    variations: EducationVariation[];
  };
}

// ── Verify JAMB ─────────────────────────────────────────────────────────────

export interface JambVerifyRequest {
  billersCode: string;
  type: string;
}

export interface JambVerifyContent {
  Customer_Name: string;
}

export interface JambVerifyResponse {
  success: boolean;
  message: string;
  data?: {
    code: string;
    content: JambVerifyContent;
  };
}

// ── Purchase ────────────────────────────────────────────────────────────────

export interface EducationPurchaseRequest {
  serviceID: string;
  variation_code: string;
  phone: string;
  quantity?: number;
  billersCode?: string;
  amount?: number;
  request_id?: string;
  use_cashback?: boolean;
}

export interface EducationTransactionContent {
  status: string;
  product_name?: string;
  unit_price?: string | number;
  quantity?: number;
  commission?: string | number;
  transactionId?: string;
}

export interface WaecCard {
  Serial: string;
  Pin: string;
}

export interface EducationCredentials {
  pin?: string;
  serial?: string;
  tokens?: string[];
  cards?: WaecCard[];
  purchased_code?: string;
}

export interface EducationPurchaseData {
  id: string;
  code: string;
  response_description?: string;
  status?: "processing" | "delivered" | "pending" | "initiated";
  message?: string;
  requestId?: string;
  amount: number;
  transaction_date?: string;
  purchased_code?: string;
  tokens?: string[];
  Pin?: string;
  cards?: WaecCard[];
  wallet_balance?: number;
  credentials?: EducationCredentials;
  content?: {
    transactions: EducationTransactionContent;
  };
}

export type EducationPurchaseResponse = ApiResponse<EducationPurchaseData>;

// ── Query Transaction ───────────────────────────────────────────────────────

export interface EducationQueryRequest {
  request_id: string;
}

export interface EducationQueryResponse {
  success: boolean;
  message: string;
  data?: {
    code?: string;
    response_description?: string;
    content?: {
      transactions: EducationTransactionContent;
    };
    requestId?: string;
    amount?: number;
    transaction_date?: string;
    purchased_code?: string;
    tokens?: string[];
    credentials?: EducationCredentials;
  };
}

// ── Product ID ──────────────────────────────────────────────────────────────

export type EducationProductID = "waec-registration" | "waec" | "jamb";
