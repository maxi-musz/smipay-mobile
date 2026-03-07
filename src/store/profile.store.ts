import { create } from "zustand";

import { fetchUserProfile } from "@/api";
import type { UserProfileData } from "@/types";
import { createSelectors } from "./create-selectors";

interface ProfileState {
  data: UserProfileData | null;
  isLoading: boolean;
  error: string | null;
}

interface ProfileActions {
  fetchProfile: () => Promise<void>;
  reset: () => void;
}

type ProfileStore = ProfileState & ProfileActions;

const initialState: ProfileState = {
  data: null,
  isLoading: false,
  error: null,
};

const _useProfileStore = create<ProfileStore>()((set, get) => ({
  ...initialState,

  fetchProfile: async () => {
    if (get().isLoading) return;

    set({ isLoading: true, error: null });

    try {
      const response = await fetchUserProfile();
      set({ data: response.data, isLoading: false });
    } catch {
      set({
        error: "Unable to load profile. Please try again.",
        isLoading: false,
      });
    }
  },

  reset: () => set(initialState),
}));

export const useProfileStore = createSelectors(_useProfileStore);
