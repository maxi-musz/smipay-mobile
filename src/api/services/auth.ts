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

const MAX_REGISTER_AVATAR_BYTES = 5 * 1024 * 1024;

/**
 * Same as `register`, but multipart — optional `file` profile image (max 5 MB).
 * Field rules match Section 3.3.1 of FRONTEND_DEVICE_METADATA.md.
 */
export async function registerWithProfilePicture(
  payload: RegisterPayload,
  file?: { uri: string; name: string; type: string },
  fileSizeBytes?: number,
) {
  if (fileSizeBytes != null && fileSizeBytes > MAX_REGISTER_AVATAR_BYTES) {
    throw new Error("Image must be 5 MB or smaller.");
  }

  const formData = new FormData();
  formData.append("email", payload.email);
  formData.append("password", payload.password);
  if (payload.transaction_pin) {
    formData.append("transaction_pin", payload.transaction_pin);
  }
  formData.append("first_name", payload.first_name);
  formData.append("last_name", payload.last_name);
  formData.append("phone_number", payload.phone_number);
  formData.append("agree_to_terms", payload.agree_to_terms ? "true" : "false");
  if (payload.country != null && payload.country !== "") {
    formData.append("country", payload.country);
  }
  if (payload.middle_name) formData.append("middle_name", payload.middle_name);
  if (payload.gender) formData.append("gender", payload.gender);
  if (payload.referral_code) formData.append("referral_code", payload.referral_code);
  if (payload.updates_opt_in !== undefined) {
    formData.append("updates_opt_in", payload.updates_opt_in ? "true" : "false");
  }

  if (file) {
    formData.append(
      "file",
      {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as unknown as Blob,
    );
  }

  const { data } = await api.post<ApiResponse<AuthResponse>>(
    `${AUTH}/register-with-profile-picture`,
    formData,
    {
      timeout: 90_000,
      transformRequest: (body, headers) => {
        if (headers && typeof headers === "object" && "Content-Type" in headers) {
          delete (headers as Record<string, unknown>)["Content-Type"];
        }
        return body;
      },
    },
  );
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
