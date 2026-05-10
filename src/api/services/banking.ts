import { api } from "@/lib/api";
import type { ApiResponse } from "@/types";
import type {
  InitialisePaystackData,
  VerifyPaystackData,
  CancelPaystackData,
  UserWalletSnapshotData,
} from "@/types/banking";

const BANKING = "/banking";

export async function fetchUserWallet(): Promise<
  ApiResponse<UserWalletSnapshotData>
> {
  const { data } = await api.get<ApiResponse<UserWalletSnapshotData>>(
    `${BANKING}/user-wallet`,
  );
  return data;
}

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

export interface RequestTransactionPinOtpData {
  /** ISO timestamp; the local UI uses this to render a countdown / disable resend. */
  expires_at: string;
  /** OTP lifetime in milliseconds (mirrors `TX_PIN_SETUP_OTP_TTL_MS`). */
  ttl_ms: number;
  /** Minimum gap in milliseconds before a fresh OTP can be requested. */
  cooldown_ms: number;
  /** Wrong-attempt cap before the OTP is invalidated. */
  max_attempts: number;
}

export interface VerifyTransactionPinOtpData {
  is_four_digit_pin_set: boolean;
}

/** Shape of the JSON body returned for transaction PIN OTP error responses. */
export interface TransactionPinOtpErrorData {
  success?: false;
  message?: string;
  /** Present on 429 cooldown responses. */
  retry_after_seconds?: number;
  cooldown_ms?: number;
  /** Present on wrong-OTP / too-many-attempts responses. */
  attempts_remaining?: number;
  max_attempts?: number;
  /** Server invalidated the OTP record; UI must request a new code. */
  otp_invalidated?: boolean;
}

/** Step 1 of the OTP-gated transaction PIN setup flow. Server emails a 6-digit code. */
export async function requestTransactionPinSetupOtp(): Promise<
  ApiResponse<RequestTransactionPinOtpData>
> {
  const { data } = await api.post<ApiResponse<RequestTransactionPinOtpData>>(
    `${BANKING}/user-wallet/transaction-pin/request-otp`,
  );
  return data;
}

/** Step 2: verify the OTP and persist the bcrypt-hashed PIN on the user. */
export async function verifyTransactionPinSetupOtp(payload: {
  pin: string;
  otp: string;
}): Promise<ApiResponse<VerifyTransactionPinOtpData>> {
  const { data } = await api.post<ApiResponse<VerifyTransactionPinOtpData>>(
    `${BANKING}/user-wallet/transaction-pin/verify-and-set`,
    payload,
  );
  return data;
}
