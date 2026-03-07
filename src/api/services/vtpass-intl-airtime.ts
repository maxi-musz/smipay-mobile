/**
 * International Airtime API (VTpass foreign-airtime).
 * Base: /api/v1/vtpass/airtime/international
 *
 * All intl airtime endpoints live here so changes can be made from one central location.
 */

import { api } from "@/lib/api";
import type {
  IntlCountriesResponse,
  IntlProductTypesResponse,
  IntlOperatorsResponse,
  IntlVariationsApiResponse,
  IntlAirtimePurchaseRequest,
  IntlAirtimePurchaseResponse,
  IntlAirtimeQueryRequest,
  IntlAirtimeQueryResponse,
} from "@/types/vtpass-intl-airtime";

const BASE = "/vtpass/airtime/international";

export async function getIntlCountries(): Promise<IntlCountriesResponse> {
  const { data } = await api.get<IntlCountriesResponse>(`${BASE}/countries`);
  return data;
}

export async function getIntlProductTypes(
  code: string,
): Promise<IntlProductTypesResponse> {
  const { data } = await api.get<IntlProductTypesResponse>(
    `${BASE}/product-types`,
    { params: { code } },
  );
  return data;
}

export async function getIntlOperators(
  code: string,
  product_type_id: string,
): Promise<IntlOperatorsResponse> {
  const { data } = await api.get<IntlOperatorsResponse>(`${BASE}/operators`, {
    params: { code, product_type_id },
  });
  return data;
}

export async function getIntlVariations(
  operator_id: string,
  product_type_id: string,
): Promise<IntlVariationsApiResponse> {
  const { data } = await api.get<IntlVariationsApiResponse>(
    `${BASE}/variations`,
    { params: { operator_id, product_type_id } },
  );
  return data;
}

export async function purchaseIntlAirtime(
  payload: IntlAirtimePurchaseRequest,
): Promise<IntlAirtimePurchaseResponse> {
  const { data } = await api.post<IntlAirtimePurchaseResponse>(
    `${BASE}/purchase`,
    payload,
  );
  return data;
}

export async function queryIntlAirtime(
  body: IntlAirtimeQueryRequest,
): Promise<IntlAirtimeQueryResponse> {
  const { data } = await api.post<IntlAirtimeQueryResponse>(
    `${BASE}/query`,
    body,
  );
  return data;
}
