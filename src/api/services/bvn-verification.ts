import { api } from "@/lib/api";
import type { ApiResponse } from "@/types";
import type {
  BvnVerificationStatusData,
  RequestBvnOtpData,
  VerifyBvnData,
} from "@/types/bvn-verification";

const BVN = "/bvn-verification";

export async function fetchBvnStatus(): Promise<
  ApiResponse<BvnVerificationStatusData>
> {
  const { data } = await api.get<ApiResponse<BvnVerificationStatusData>>(
    `${BVN}/status`,
  );
  return data;
}

export async function requestBvnOtp(
  bvn: string,
): Promise<ApiResponse<RequestBvnOtpData>> {
  const { data } = await api.post<ApiResponse<RequestBvnOtpData>>(
    `${BVN}/request-otp`,
    { bvn },
  );
  return data;
}

export async function verifyBvnOtp(
  otp: string,
): Promise<ApiResponse<VerifyBvnData>> {
  const { data } = await api.post<ApiResponse<VerifyBvnData>>(
    `${BVN}/verify-otp`,
    { otp },
  );
  return data;
}
