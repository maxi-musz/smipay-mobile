import { api } from "@/lib/api";
import type {
  AirtimeServiceIdsResponse,
  AirtimePurchaseRequest,
  AirtimePurchaseResponse,
} from "@/types/vtpass-airtime";

const BASE = "/vtpass/airtime";

export async function fetchAirtimeServiceIds(): Promise<AirtimeServiceIdsResponse> {
  const { data } = await api.get<AirtimeServiceIdsResponse>(
    `${BASE}/service-ids`,
  );
  return data;
}

export async function purchaseAirtime(
  payload: AirtimePurchaseRequest,
): Promise<AirtimePurchaseResponse> {
  const { data } = await api.post<AirtimePurchaseResponse>(
    `${BASE}/purchase`,
    payload,
  );
  return data;
}
