import { api } from "@/lib/api";
import type {
  DataServiceIdsResponse,
  DataVariationCodesResponse,
  DataPurchaseRequest,
  DataPurchaseResponse,
  DataQueryRequest,
  DataQueryResponse,
} from "@/types/vtpass-data";

const BASE = "/vtpass/data";

export async function fetchDataServiceIds(): Promise<DataServiceIdsResponse> {
  const { data } = await api.get<DataServiceIdsResponse>(`${BASE}/service-ids`);
  return data;
}

export async function fetchDataVariationCodes(
  serviceID: string,
): Promise<DataVariationCodesResponse> {
  const { data } = await api.get<DataVariationCodesResponse>(
    `${BASE}/variation-codes`,
    { params: { serviceID } },
  );
  return data;
}

export async function purchaseData(
  payload: DataPurchaseRequest,
): Promise<DataPurchaseResponse> {
  const { data } = await api.post<DataPurchaseResponse>(`${BASE}/purchase`, payload);
  return data;
}

export async function queryDataTransaction(
  body: DataQueryRequest,
): Promise<DataQueryResponse> {
  const { data } = await api.post<DataQueryResponse>(`${BASE}/query`, body);
  return data;
}
