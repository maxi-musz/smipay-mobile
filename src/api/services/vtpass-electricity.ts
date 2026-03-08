import { api } from "@/lib/api";
import type {
  ElectricityServiceIdsResponse,
  ElectricityVerifyRequest,
  ElectricityVerifyResponse,
  ElectricityPurchaseRequest,
  ElectricityPurchaseResponse,
  ElectricityQueryRequest,
  ElectricityQueryResponse,
} from "@/types/vtpass-electricity";

const BASE = "/vtpass/electricity";

export async function fetchElectricityServiceIds(): Promise<ElectricityServiceIdsResponse> {
  const { data } = await api.get<ElectricityServiceIdsResponse>(
    `${BASE}/service-ids`,
  );
  return data;
}

export async function verifyElectricityMeter(
  payload: ElectricityVerifyRequest,
): Promise<ElectricityVerifyResponse> {
  const { data } = await api.post<ElectricityVerifyResponse>(
    `${BASE}/verify`,
    payload,
  );
  return data;
}

export async function purchaseElectricity(
  payload: ElectricityPurchaseRequest,
): Promise<ElectricityPurchaseResponse> {
  const { data } = await api.post<ElectricityPurchaseResponse>(
    `${BASE}/purchase`,
    payload,
  );
  return data;
}

export async function queryElectricityTransaction(
  body: ElectricityQueryRequest,
): Promise<ElectricityQueryResponse> {
  const { data } = await api.post<ElectricityQueryResponse>(
    `${BASE}/query`,
    body,
  );
  return data;
}
