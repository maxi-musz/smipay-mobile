import AsyncStorage from "@react-native-async-storage/async-storage";

const PENDING_FUNDING_KEY = "@smipay/pending_funding_reference";

export async function getPendingFundingReference(): Promise<string | null> {
  return AsyncStorage.getItem(PENDING_FUNDING_KEY);
}

export async function setPendingFundingReference(reference: string): Promise<void> {
  await AsyncStorage.setItem(PENDING_FUNDING_KEY, reference);
}

export async function clearPendingFundingReference(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_FUNDING_KEY);
}
