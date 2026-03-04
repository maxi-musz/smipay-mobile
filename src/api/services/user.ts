import { api } from "@/lib/api";
import type { ApiResponse, HomepageData } from "@/types";

const USER = "/user";

export async function fetchHomepageDetails() {
  const { data } = await api.get<ApiResponse<HomepageData>>(
    `${USER}/fetch-app-homepage-details`,
  );
  return data;
}
