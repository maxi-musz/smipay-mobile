/** Matches the backend user object exactly (snake_case preserved to avoid mapping bugs). */
export interface User {
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
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string | null;
}
