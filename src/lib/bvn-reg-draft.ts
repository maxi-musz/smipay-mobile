import { secureStorage, SECURE_KEYS } from "@/lib/secure-storage";

export type BvnRegDraft = {
  sessionToken: string;
  bvn: string;
  maskedPhone: string;
  email?: string;
  emailVerified?: boolean;
};

export async function loadBvnRegDraft(): Promise<BvnRegDraft | null> {
  return secureStorage.get<BvnRegDraft>(SECURE_KEYS.BVN_REG_DRAFT);
}

export async function saveBvnRegDraft(draft: BvnRegDraft): Promise<void> {
  await secureStorage.set(SECURE_KEYS.BVN_REG_DRAFT, draft);
}

export async function clearBvnRegDraft(): Promise<void> {
  await secureStorage.remove(SECURE_KEYS.BVN_REG_DRAFT);
}
