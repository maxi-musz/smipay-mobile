import { api } from "@/lib/api";
import type { ApiResponse } from "@/types";
import type {
  KycVerificationStatusData,
  RequestPhoneOtpData,
} from "@/types/kyc-verification";

const KYC = "/kyc-verification";

export async function fetchKycVerificationStatus(): Promise<
  ApiResponse<KycVerificationStatusData>
> {
  const { data } = await api.get<ApiResponse<KycVerificationStatusData>>(
    `${KYC}/status`,
  );
  return data;
}

export async function requestPhoneVerificationOtp(): Promise<
  ApiResponse<RequestPhoneOtpData>
> {
  const { data } = await api.post<ApiResponse<RequestPhoneOtpData>>(
    `${KYC}/phone/request-otp`,
  );
  return data;
}

export async function verifyPhoneVerificationOtp(
  otp: string,
): Promise<ApiResponse<KycVerificationStatusData>> {
  const { data } = await api.post<ApiResponse<KycVerificationStatusData>>(
    `${KYC}/phone/verify-otp`,
    { otp },
  );
  return data;
}

export async function updatePhoneVerificationNumber(
  phoneNumber: string,
): Promise<ApiResponse<KycVerificationStatusData>> {
  const { data } = await api.patch<ApiResponse<KycVerificationStatusData>>(
    `${KYC}/phone`,
    { phone_number: phoneNumber },
  );
  return data;
}
