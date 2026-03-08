import { api } from "@/lib/api";
import type {
  EducationVariationsResponse,
  JambVerifyRequest,
  JambVerifyResponse,
  EducationPurchaseRequest,
  EducationPurchaseResponse,
  EducationQueryRequest,
  EducationQueryResponse,
} from "@/types/vtpass-education";

const BASE = "/vtpass/education";

export async function fetchEducationVariations(
  serviceID: string,
): Promise<EducationVariationsResponse> {
  const { data } = await api.get<EducationVariationsResponse>(
    `${BASE}/variations`,
    { params: { serviceID } },
  );
  return data;
}

export async function verifyJambProfile(
  payload: JambVerifyRequest,
): Promise<JambVerifyResponse> {
  const { data } = await api.post<JambVerifyResponse>(
    `${BASE}/verify-jamb`,
    payload,
  );
  return data;
}

export async function purchaseEducation(
  payload: EducationPurchaseRequest,
): Promise<EducationPurchaseResponse> {
  const { data } = await api.post<EducationPurchaseResponse>(
    `${BASE}/purchase`,
    payload,
  );
  return data;
}

export async function queryEducationTransaction(
  body: EducationQueryRequest,
): Promise<EducationQueryResponse> {
  const { data } = await api.post<EducationQueryResponse>(
    `${BASE}/query`,
    body,
  );
  return data;
}
