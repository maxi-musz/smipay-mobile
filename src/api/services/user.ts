import { api } from "@/lib/api";
import type { ApiResponse, HomepageData, UserProfileData } from "@/types";

const USER = "/user";

export async function fetchHomepageDetails() {
  const { data } = await api.get<ApiResponse<HomepageData>>(
    `${USER}/fetch-app-homepage-details`,
  );
  return data;
}

export async function fetchUserProfile() {
  const { data } = await api.get<ApiResponse<UserProfileData>>(
    `${USER}/fetch-user-profile`,
  );
  return data;
}

export interface RequestAccountDeletionPayload {
  reason?: string;
}

export interface AccountDeletionResponseData {
  requested_account_deletion: boolean;
}

/** Request account deletion. Optional reason (max 500 chars). Idempotent if already requested. */
export async function requestAccountDeletion(
  payload?: RequestAccountDeletionPayload,
) {
  const { data } = await api.post<ApiResponse<AccountDeletionResponseData>>(
    `${USER}/request-account-deletion`,
    payload ?? {},
  );
  return data;
}

/** Cancel a pending account deletion request. */
export async function cancelAccountDeletionRequest() {
  const { data } = await api.post<ApiResponse<AccountDeletionResponseData>>(
    `${USER}/cancel-account-deletion-request`,
  );
  return data;
}
