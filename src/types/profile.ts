import type { TierLimits } from "./homepage";

/** User object as returned by fetch-user-profile (snake_case from backend). */
export interface ProfileUser {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  is_verified: boolean;
  phone_number: string;
  profile_image: string | null;
  gender: string | null;
  date_of_birth: string | null;
  joined: string;
  totalCards?: number;
  totalAccounts?: number;
  wallet_balance?: number;
}

export interface ProfileAddress {
  id: string;
  house_no: string;
  city: string;
  state: string;
  country: string;
  house_address: string;
  postal_code: string;
}

export interface ProfileKycVerification {
  id: string;
  is_active: boolean;
  status: string;
  id_type: string;
  id_number: string;
}

export interface ProfileWalletCard {
  id: string;
  current_balance: string;
  all_time_fuunding: string;
  all_time_withdrawn: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileTier {
  id?: string;
  tier: string;
  name: string;
  description: string;
  order?: number;
  requirements: string[];
  limits: TierLimits;
  is_active?: boolean;
  is_current?: boolean;
}

export interface UserProfileData {
  user: ProfileUser;
  address: ProfileAddress | null;
  kyc_verification: ProfileKycVerification | null;
  wallet_card: ProfileWalletCard;
  current_tier: ProfileTier;
  available_tiers: ProfileTier[];
}
