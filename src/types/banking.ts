/**
 * Types for Paystack wallet funding (banking) API.
 * Aligned with fund-with-paystack.md backend contract.
 */

/** Response data from POST /banking/initialise-paystack-funding */
export interface InitialisePaystackData {
  authorization_url: string;
  reference: string;
  amount: number;
  email: string;
}

/** Response data from POST /banking/verify-paystack-funding (success case) */
export interface VerifyPaystackSuccessData {
  id: string;
  amount: string;
  transaction_type: string;
  credit_debit: string;
  description: string;
  status: "success";
  payment_method: string;
  date: string;
  balance_after: string;
}

/** Response data when payment was cancelled or failed */
export interface VerifyPaystackStatusData {
  status: "cancelled" | "failed";
}

export type VerifyPaystackData = VerifyPaystackSuccessData | VerifyPaystackStatusData;

/** Response data from POST /banking/cancel-paystack-funding */
export interface CancelPaystackData {
  status: "cancelled";
}

/** Account row from GET /banking/user-wallet */
export interface UserWalletAccountRow {
  id: string;
  account_number: string | null;
  bank_name: string | null;
  currency: string | null;
  balance: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** GET /banking/user-wallet — formatted wallet + accounts + cashback */
export interface UserWalletSnapshotData {
  wallet: {
    id: string;
    current_balance: string;
    all_time_fuunding: string;
    all_time_withdrawn: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    is_four_digit_pin_set?: boolean;
  };
  accounts: UserWalletAccountRow[];
  cashback_wallet: {
    id?: string;
    current_balance: string;
    all_time_earned: string;
    all_time_withdrawn: string;
  };
}
