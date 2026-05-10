import type { TierLimits } from "./homepage";

/** Referral analysis as returned by fetch-user-profile. */
export interface ReferralAnalysis {
  total_referred: number;
  by_status: {
    pending?: number;
    eligible?: number;
    rewarded?: number;
    partially_rewarded?: number;
    expired?: number;
    rejected?: number;
  };
  referrer_rewards_issued: number;
  referrer_rewards_total_amount: number;
  referee_rewards_issued: number;
  referee_rewards_total_amount: number;
  slots_remaining: number;
  program_config?: {
    is_active: boolean;
    referrer_reward_amount: number;
    referee_reward_amount: number;
    reward_trigger: string;
    max_referrals_per_user: number;
    min_transaction_amount: number;
  };
}

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
  /** User's referral code for sharing (e.g. JOHN7ABC). Use smipay_tag if empty. */
  referral_code?: string;
  /** Unique SmiPay tag (e.g. johndoe). Often used as shareable referral identifier. */
  smipay_tag?: string;
  /** True if user has requested account deletion; show pending state and cancel option. */
  requested_account_deletion?: boolean;
  /** From fetch-user-profile: whether a 4-digit transaction PIN exists on the account. */
  is_four_digit_pin_set?: boolean;
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
  referral_analysis?: ReferralAnalysis;
}
