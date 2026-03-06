import { api } from "@/lib/api";
import type { ApiResponse } from "@/types";
import type {
  InitialisePaystackData,
  VerifyPaystackData,
  CancelPaystackData,
} from "@/types/banking";

const BANKING = "/banking";

export async function initialisePaystackFunding(
  amount: number,
  callbackUrl: string,
): Promise<ApiResponse<InitialisePaystackData>> {
  const { data } = await api.post<ApiResponse<InitialisePaystackData>>(
    `${BANKING}/initialise-paystack-funding`,
    { amount, callback_url: callbackUrl },
  );
  return data;
}

export async function verifyPaystackFunding(
  reference: string,
): Promise<ApiResponse<VerifyPaystackData>> {
  const { data } = await api.post<ApiResponse<VerifyPaystackData>>(
    `${BANKING}/verify-paystack-funding`,
    { reference },
  );
  return data;
}

export async function cancelPaystackFunding(
  reference: string,
): Promise<ApiResponse<CancelPaystackData>> {
  const { data } = await api.post<ApiResponse<CancelPaystackData>>(
    `${BANKING}/cancel-paystack-funding`,
    { reference },
  );
  return data;
}
