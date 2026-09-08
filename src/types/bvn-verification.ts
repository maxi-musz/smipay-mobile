export type BvnOtpMode = "self" | "provider";
export type PhoneMatchPolicy = "require" | "reconcile" | "ignore";
export type BvnStatus = "unstarted" | "otp_sent" | "verified" | "failed";

export interface BvnVerificationStatusData {
  enabled: boolean;
  is_verified: boolean;
  status: BvnStatus;
  masked_phone: string | null;
  bvn_last4: string | null;
  otp_mode: BvnOtpMode;
  phone_match_policy: PhoneMatchPolicy;
  bvn_attempts_used: number;
  max_bvn_attempts: number;
  resend_cooldown_seconds: number;
  locked_until: string | null;
  locked_seconds_left: number;
}

export interface RequestBvnOtpData {
  masked_phone: string;
  phone_matched: boolean;
  /** When true, confirming the code will set the BVN's number as their number. */
  will_update_phone: boolean;
  expires_in_seconds: number;
  resend_cooldown_seconds: number;
}

export interface VerifyBvnData {
  is_verified: boolean;
  bvn_last4: string | null;
  phone_updated: boolean;
}
