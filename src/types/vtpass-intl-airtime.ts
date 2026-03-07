/**
 * Types for International Airtime API (VTpass foreign-airtime).
 * @see INTERNATIONAL_AIRTIME_API_DOCUMENTATION.md under vtpass/airtime/
 */

export interface IntlCountry {
  code: string;
  flag: string;
  name: string;
  currency: string;
  prefix: string;
}

export interface IntlProductType {
  product_type_id: number;
  name: string;
}

export interface IntlOperator {
  operator_id: string;
  name: string;
  operator_image: string;
}

export interface IntlVariation {
  variation_code: string;
  name: string;
  variation_amount: string;
  fixedPrice: string;
}

export interface IntlVariationsResponse {
  serviceName: string;
  serviceID: string;
  convenienceFee: string;
  variations: IntlVariation[];
}

// ── Countries ─────────────────────────────────────────────────────────────

export interface IntlCountriesResponse {
  success: boolean;
  message: string;
  data: { countries: IntlCountry[] };
}

// ── Product types ──────────────────────────────────────────────────────────

export interface IntlProductTypesResponse {
  success: boolean;
  message: string;
  data: IntlProductType[];
}

// ── Operators ──────────────────────────────────────────────────────────────

export interface IntlOperatorsResponse {
  success: boolean;
  message: string;
  data: IntlOperator[];
}

// ── Variations ────────────────────────────────────────────────────────────

export interface IntlVariationsApiResponse {
  success: boolean;
  message: string;
  data: IntlVariationsResponse;
}

// ── Purchase ──────────────────────────────────────────────────────────────

export interface IntlAirtimePurchaseRequest {
  serviceID?: string;
  billersCode: string;
  variation_code: string;
  amount?: number;
  phone: string;
  operator_id: string;
  country_code: string;
  product_type_id: string;
  request_id?: string;
  use_cashback?: boolean;
}

export interface IntlPurchaseTransactionContent {
  status: string;
  product_name?: string;
  unique_element?: string;
  unit_price?: string;
  quantity?: number;
  commission?: number;
  transactionId?: string;
}

export interface IntlAirtimePurchaseResponse {
  success: boolean;
  message: string;
  data?: {
    id?: string;
    code?: string;
    status?: string;
    response_description?: string;
    requestId?: string;
    amount?: number;
    transaction_date?: string;
    purchased_code?: string;
    wallet_balance?: number;
    message?: string;
    content?: {
      transactions?: IntlPurchaseTransactionContent;
    };
  };
}

// ── Query ─────────────────────────────────────────────────────────────────

export interface IntlAirtimeQueryRequest {
  request_id: string;
}

export interface IntlAirtimeQueryResponse {
  success: boolean;
  message: string;
  data?: {
    code?: string;
    content?: {
      transactions?: IntlPurchaseTransactionContent;
    };
    response_description?: string;
    requestId?: string;
    amount?: number;
    transaction_date?: string;
    purchased_code?: string;
  };
}
