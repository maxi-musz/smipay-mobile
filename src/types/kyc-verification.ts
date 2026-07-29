import type { ProfileTier } from "@/types/profile";

export interface PendingVerification {
  key: string;
  label: string;
  required: boolean;
}

export interface PhoneOtpPolicy {
  resend_cooldown_seconds: number;
  daily_max: number;
  daily_used: number;
  daily_remaining: number;
  retry_after_seconds: number;
  can_request: boolean;
}

export interface PhoneVerificationStatus {
  is_required: boolean;
  is_met: boolean;
  masked_phone: string;
  otp_policy?: PhoneOtpPolicy | null;
}

export interface KycVerificationStatusData {
  current_tier: ProfileTier | null;
  available_tiers: ProfileTier[];
  pending_verifications: PendingVerification[];
  should_block: boolean;
  phone_verification: PhoneVerificationStatus;
}

export interface RequestPhoneOtpData {
  expires_at: string;
  ttl_ms: number;
  cooldown_ms: number;
  cooldown_seconds: number;
  masked_phone: string;
  daily_max: number;
  daily_used: number;
  daily_remaining: number;
  retry_after_seconds?: number;
}

export interface PhoneOtpErrorData {
  retry_after_seconds?: number;
  cooldown_ms?: number;
  cooldown_seconds?: number;
  daily_max?: number;
  daily_used?: number;
  daily_remaining?: number;
  message?: string;
}
