import { api } from "@/lib/api";
import type { ApiResponse } from "@/types";

export type RegistrationFlow = "phone_only" | "bvn_liveness";

const BVN = "/registration/bvn";

export async function fetchActiveRegistrationFlow(): Promise<
  ApiResponse<{ active_flow: RegistrationFlow }>
> {
  const { data } = await api.get<ApiResponse<{ active_flow: RegistrationFlow }>>(
    `${BVN}/flow`,
  );
  return data;
}

export interface StartBvnRegData {
  session_token: string;
  masked_phone: string;
  resend_cooldown_seconds: number;
  otp_pending: boolean;
  next_step: "review" | "otp";
}

export async function startBvnRegistration(
  bvn: string,
  deviceId?: string,
): Promise<ApiResponse<StartBvnRegData>> {
  const { data } = await api.post<ApiResponse<StartBvnRegData>>(`${BVN}/start`, {
    bvn,
    device_id: deviceId,
  });
  return data;
}

export interface SendBvnRegOtpData {
  masked_phone: string;
  expires_in_seconds: number;
  resend_cooldown_seconds: number;
  next_step: "otp";
}

export async function sendBvnRegOtp(
  sessionToken: string,
): Promise<ApiResponse<SendBvnRegOtpData>> {
  const { data } = await api.post<ApiResponse<SendBvnRegOtpData>>(
    `${BVN}/send-otp`,
    { session_token: sessionToken },
  );
  return data;
}

export interface VerifyBvnRegData {
  identity: {
    first_name: string | null;
    last_name: string | null;
    middle_name: string | null;
    date_of_birth: string | null;
    gender: string | null;
  };
  masked_phone: string;
  next_step: "liveness" | "details";
}

export async function verifyBvnRegOtp(
  sessionToken: string,
  otp: string,
): Promise<ApiResponse<VerifyBvnRegData>> {
  const { data } = await api.post<ApiResponse<VerifyBvnRegData>>(
    `${BVN}/verify-otp`,
    { session_token: sessionToken, otp },
  );
  return data;
}

/**
 * Submit the selfie for the liveness / face-match check.
 *
 * `bvn` is re-sent because the server never stores the raw BVN — only a hash —
 * and face-match modes need it to fetch the reference photo. The server
 * re-hashes it against the session, so it cannot be swapped for another
 * identity. Errors carry a `code` and `attempts_remaining` on the body.
 */
export async function submitBvnLiveness(
  sessionToken: string,
  image?: string,
  bvn?: string,
): Promise<ApiResponse<{ next_step: string }>> {
  const { data } = await api.post<ApiResponse<{ next_step: string }>>(
    `${BVN}/liveness`,
    { session_token: sessionToken, image, bvn },
  );
  return data;
}

export interface CompleteBvnRegData {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    name: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    is_email_verified: boolean;
    role: string;
    gender: string | null;
    date_of_birth: string | null;
    profile_image: string | null;
    kyc_verified: boolean;
    isTransactionPinSetup: boolean;
    has_completed_onboarding: boolean;
    created_at: string;
  };
}

export async function completeBvnRegistration(payload: {
  session_token: string;
  email: string;
  password: string;
  transaction_pin?: string;
  referral_code?: string;
  agree_to_terms: boolean;
}): Promise<ApiResponse<CompleteBvnRegData>> {
  const { data } = await api.post<ApiResponse<CompleteBvnRegData>>(
    `${BVN}/complete`,
    payload,
  );
  return data;
}
