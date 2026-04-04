import { api } from "@/lib/api";
import type { ApiResponse, HomepageData, UserProfileData } from "@/types";

const USER = "/user";

export interface UpdateDisplayPictureResponseData {
  profile_image: {
    secure_url: string;
    public_id: string;
    storage_provider: string;
  };
}

const MAX_DISPLAY_PICTURE_BYTES = 5 * 1024 * 1024;

/** Upload a new profile photo (JPEG, PNG, GIF, WebP — max 5 MB). */
export async function updateDisplayPicture(
  file: { uri: string; name: string; type: string },
  fileSizeBytes?: number,
) {
  if (fileSizeBytes != null && fileSizeBytes > MAX_DISPLAY_PICTURE_BYTES) {
    throw new Error("Image must be 5 MB or smaller.");
  }

  const formData = new FormData();
  formData.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as unknown as Blob);

  const { data } = await api.post<ApiResponse<UpdateDisplayPictureResponseData>>(
    `${USER}/update-display-picture`,
    formData,
    {
      timeout: 90_000,
      transformRequest: (payload, headers) => {
        if (headers && typeof headers === "object" && "Content-Type" in headers) {
          delete (headers as Record<string, unknown>)["Content-Type"];
        }
        return payload;
      },
    },
  );
  return data;
}

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
