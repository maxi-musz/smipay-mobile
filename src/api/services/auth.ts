import { api } from "@/lib/api";
import type {
  ApiResponse,
  AuthResponse,
  RegisterPayload,
  SignInPayload,
  ResetPasswordPayload,
} from "@/types";

const AUTH = "/new-auth";

export async function requestEmailVerification(email: string) {
  const { data } = await api.post<ApiResponse>(`${AUTH}/request-email-verification`, { email });
  return data;
}

export async function verifyEmailForRegistration(email: string, otp: string) {
  const { data } = await api.post<ApiResponse>(`${AUTH}/verify-email-for-registration`, { email, otp });
  return data;
}

export async function register(payload: RegisterPayload) {
  const { data } = await api.post<ApiResponse<AuthResponse>>(`${AUTH}/register`, payload);
  return data;
}

export async function signIn(payload: SignInPayload) {
  const { data } = await api.post<ApiResponse<AuthResponse>>(`${AUTH}/signin`, payload);
  return data;
}

export async function forgotPassword(email: string) {
  const { data } = await api.post<ApiResponse>(`${AUTH}/forgot-password`, { email });
  return data;
}

export async function verifyPasswordResetOtp(email: string, otp: string) {
  const { data } = await api.post<ApiResponse>(`${AUTH}/verify-password-reset-otp`, { email, otp });
  return data;
}

export async function resetPassword(payload: ResetPasswordPayload) {
  const { data } = await api.post<ApiResponse>(`${AUTH}/reset-password`, payload);
  return data;
}

export async function logout() {
  const { data } = await api.post<ApiResponse>(`${AUTH}/logout`);
  return data;
}

export async function refreshToken(refresh_token: string) {
  const { data } = await api.post<ApiResponse<AuthResponse>>(
    `${AUTH}/refresh`,
    { refresh_token },
  );
  return data;
}

export async function completeOnboarding() {
  const { data } = await api.post<ApiResponse>(`${AUTH}/complete-onboarding`);
  return data;
}
