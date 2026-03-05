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
