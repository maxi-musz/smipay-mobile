import type { User, AuthTokens } from "./user";

/** Standard success envelope returned by all API endpoints. */
export interface ApiResponse<T = null> {
  success: boolean;
  message: string;
  data: T;
}

/** NestJS-style error response (4xx / 5xx). */
export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string | null;
  user: User;
}

export interface RegisterPayload {
  email: string;
  password: string;
  transaction_pin?: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  agree_to_terms: boolean;
  middle_name?: string;
  gender?: "male" | "female";
  referral_code?: string;
  country?: string;
  updates_opt_in?: boolean;
}

export interface SignInPayload {
  email: string;
  password: string;
}

export interface ResetPasswordPayload {
  email: string;
  otp: string;
  new_password: string;
}
