import type { ApiResponse } from "./api";

export interface DataServiceItem {
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

export interface DataServiceIdsResponse {
  success: boolean;
  message: string;
  data: DataServiceItem[];
}

export interface DataVariation {
  variation_code: string;
  name: string;
  variation_amount: string;
  vtpass_amount: string;
  fixedPrice?: string;
}

export interface DataVariationCategory {
  count: number;
  variations: DataVariation[];
}

export interface DataVariationCodesResponse {
  success: boolean;
  message: string;
  data: {
    ServiceName: string;
    serviceID: string;
    convinience_fee: string;
    counts: Record<string, number>;
    variations: DataVariation[];
    variations_categorized: Record<string, DataVariationCategory>;
  };
}

export interface DataPurchaseRequest {
  serviceID: string;
  billersCode: string;
  variation_code: string;
  amount?: number;
  phone?: string;
  request_id?: string;
  use_cashback?: boolean;
}

export interface DataTransactionContent {
  status: string;
  product_name: string;
  unique_element: string;
  unit_price: string | number;
  quantity: number;
  amount: string | number;
  commission?: number;
  total_amount?: number;
  transactionId?: string;
  commission_details?: {
    amount: number;
    rate: string;
    rate_type: string;
    computation_type: string;
  };
}

export interface DataPurchaseData {
  id: string;
  code: string;
  response_description?: string;
  status?: "processing" | "delivered" | "pending" | "initiated";
  message?: string;
  content?: {
    transactions: DataTransactionContent;
  };
  requestId?: string;
  amount: number;
  transaction_date?: string;
}

export type DataPurchaseResponse = ApiResponse<DataPurchaseData>;

export interface DataQueryRequest {
  request_id: string;
}

export interface DataQueryResponse {
  success: boolean;
  message: string;
  data: {
    response_description?: string;
    code?: string;
    content?: {
      transactions: DataTransactionContent;
    };
    requestId?: string;
    amount?: number;
    transaction_date?: string;
  };
}
