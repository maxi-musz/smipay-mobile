import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ONBOARDING_STORAGE_KEY } from "./constants";

export function useOnboardingStatus() {
  const [hasCompleted, setHasCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_STORAGE_KEY).then((value) => {
      setHasCompleted(value === "true");
    });
  }, []);

  const completeOnboarding = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    setHasCompleted(true);
  }, []);

  const clearOnboarding = useCallback(async () => {
    await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
    setHasCompleted(false);
  }, []);

  return {
    hasCompleted,
    isLoading: hasCompleted === null,
    completeOnboarding,
    clearOnboarding,
  };
}
