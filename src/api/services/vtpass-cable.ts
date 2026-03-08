import { api } from "@/lib/api";
import type {
  CableServiceIdsResponse,
  CableVariationCodesResponse,
  CableVerifyRequest,
  CableVerifyResponse,
  CablePurchaseRequest,
  CablePurchaseResponse,
  CableQueryRequest,
  CableQueryResponse,
} from "@/types/vtpass-cable";

const BASE = "/vtpass/cable";

export async function fetchCableServiceIds(): Promise<CableServiceIdsResponse> {
  const { data } = await api.get<CableServiceIdsResponse>(
    `${BASE}/service-ids`,
  );
  return data;
}

export async function fetchCableVariationCodes(
  serviceID: string,
): Promise<CableVariationCodesResponse> {
  const { data } = await api.get<CableVariationCodesResponse>(
    `${BASE}/variation-codes`,
    { params: { serviceID } },
  );
  return data;
}

export async function verifyCableSmartcard(
  payload: CableVerifyRequest,
): Promise<CableVerifyResponse> {
  const { data } = await api.post<CableVerifyResponse>(
    `${BASE}/verify`,
    payload,
  );
  return data;
}

export async function purchaseCable(
  payload: CablePurchaseRequest,
): Promise<CablePurchaseResponse> {
  const { data } = await api.post<CablePurchaseResponse>(
    `${BASE}/purchase`,
    payload,
  );
  return data;
}

export async function queryCableTransaction(
  body: CableQueryRequest,
): Promise<CableQueryResponse> {
  const { data } = await api.post<CableQueryResponse>(`${BASE}/query`, body);
  return data;
}
