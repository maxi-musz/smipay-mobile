export interface HomepageUser {
  id: string;
  smipay_tag: string;
  name: string;
  isTransactionPinSetup: boolean;
  phone_number: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  profile_image: string | null;
  is_email_verified: boolean;
  /** True if user has requested account deletion; show pending state and cancel option. */
  requested_account_deletion?: boolean;
}

export interface WalletCard {
  id: string;
  current_balance: string;
  all_time_fuunding: string;
  all_time_withdrawn: string;
  owned_currencies?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CashbackWallet {
  current_balance: string;
  all_time_earned: string;
  all_time_withdrawn: string;
}

export interface CashbackRate {
  service: string;
  percentage: number;
  is_active: boolean;
}

export interface AccountDVA {
  id: string;
  account_holder_name: string;
  account_number: string;
  bank_name: string;
  currency: string;
  balance: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionItem {
  id: string;
  amount: number;
  type: string;
  provider: string;
  description: string;
  credit_debit: "credit" | "debit";
  status: string;
  date: string;
  sender: string | null;
  icon: string | null;
}

export interface KycVerification {
  id: string;
  is_verified: boolean;
  status: string;
  id_type: string;
  id_no?: string;
  bvn?: string;
  bvn_verified?: boolean;
  watchlisted?: boolean;
  initiated_at: string;
  approved_at: string;
  failure_reason: string;
}

export interface TierLimits {
  singleTransaction: number;
  daily: number;
  monthly: number;
  airtimeDaily: number;
}

export interface CurrentTier {
  tier: string;
  name: string;
  description: string;
  requirements: string[];
  limits: TierLimits;
  is_active: boolean;
}

export interface RewardBanner {
  type: "referral" | "cashback" | "first_transaction";
  title: string;
  message: string;
  data: Record<string, number>;
}

export interface HomepageData {
  user: HomepageUser;
  accounts: AccountDVA[];
  wallet_card: WalletCard;
  cashback_wallet: CashbackWallet;
  cashback_rates: CashbackRate[];
  transaction_history: TransactionItem[];
  kyc_verification: KycVerification | null;
  current_tier: CurrentTier;
  reward_banners: RewardBanner[];
}
