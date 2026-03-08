import type { ApiResponse } from "./api";

// ── Service IDs ────────────────────────────────────────────────────────────

export interface CableServiceItem {
  serviceID: string;
  name: string;
  identifier?: string;
}

export interface CableServiceIdsResponse {
  success: boolean;
  message: string;
  data: CableServiceItem[];
}

// ── Variation Codes ────────────────────────────────────────────────────────

export interface CableVariation {
  variation_code: string;
  name: string;
  variation_amount: string;
  fixedPrice?: string;
}

export interface CableVariationCodesResponse {
  success: boolean;
  message: string;
  data: {
    ServiceName: string;
    serviceID: string;
    convinience_fee: string;
    variations: CableVariation[];
  };
}

// ── Verify Smartcard ───────────────────────────────────────────────────────

export interface CableVerifyRequest {
  billersCode: string;
  serviceID: string;
}

/** DSTV / GOTV verification content. */
export interface CableVerifyContentDstvGotv {
  Customer_Name: string;
  Status?: string;
  Due_Date?: string;
  Customer_Number?: string;
  Customer_Type?: string;
  Current_Bouquet?: string;
  Renewal_Amount?: string;
}

/** Startimes verification content. */
export interface CableVerifyContentStartimes {
  Customer_Name: string;
  Balance?: number;
  Smartcard_Number?: string;
}

export type CableVerifyContent =
  | CableVerifyContentDstvGotv
  | CableVerifyContentStartimes;

export interface CableVerifyResponse {
  success: boolean;
  message: string;
  data?: {
    code: string;
    content: CableVerifyContent;
  };
}

// ── Purchase ───────────────────────────────────────────────────────────────

export type CableSubscriptionType = "change" | "renew";

export interface CablePurchaseRequest {
  serviceID: string;
  billersCode: string;
  subscription_type?: CableSubscriptionType;
  variation_code?: string;
  amount?: number;
  phone?: string;
  quantity?: number;
  request_id?: string;
  use_cashback?: boolean;
}

export interface CableTransactionContent {
  status: string;
  product_name?: string;
  unique_element?: string;
  unit_price?: string | number;
  quantity?: number;
  transactionId?: string;
  amount?: string | number;
  commission?: number;
}

export interface CablePurchaseData {
  id: string;
  code: string;
  response_description?: string;
  status?: "processing" | "delivered" | "pending" | "initiated";
  message?: string;
  requestId?: string;
  amount: number;
  transaction_date?: string;
  /** Showmax-only: voucher activation code. */
  purchased_code?: string;
  voucher_code?: string;
  voucher_codes?: string[];
  Voucher?: string[];
  content?: {
    transactions: CableTransactionContent;
  };
}

export type CablePurchaseResponse = ApiResponse<CablePurchaseData>;

// ── Query Transaction ──────────────────────────────────────────────────────

export interface CableQueryRequest {
  request_id: string;
}

export interface CableQueryResponse {
  success: boolean;
  message: string;
  data?: {
    code?: string;
    response_description?: string;
    content?: {
      transactions: CableTransactionContent;
    };
    requestId?: string;
    amount?: number;
    transaction_date?: string;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Guard: check if verify content is DSTV/GOTV shape (has Current_Bouquet). */
export function isDstvGotvContent(
  c: CableVerifyContent,
): c is CableVerifyContentDstvGotv {
  return "Current_Bouquet" in c || "Due_Date" in c || "Customer_Type" in c;
}
