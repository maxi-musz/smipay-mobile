import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@smipay/data_recent";
const MAX_RECENT = 10;

export interface DataRecentEntry {
  /** Stored as 10 digits (no leading 0). Display with 0 prefix. */
  phone: string;
  serviceID: string;
}

function toTenDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

export async function getRecentData(): Promise<DataRecentEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is DataRecentEntry =>
        typeof item?.phone === "string" && typeof item?.serviceID === "string",
    );
  } catch {
    return [];
  }
}

/** Returns entry with phone in display form (0XXXXXXXXXX). */
export function getRecentDataEntryDisplay(entry: DataRecentEntry): string {
  return entry.phone.length === 10 ? `0${entry.phone}` : entry.phone;
}

export async function addRecentData(
  phone: string,
  serviceID: string,
): Promise<void> {
  const phone10 = toTenDigits(phone);
  if (phone10.length < 10) return;
  const entry: DataRecentEntry = { phone: phone10, serviceID };

  const list = await getRecentData();
  const filtered = list.filter(
    (e) => !(e.phone === entry.phone && e.serviceID === entry.serviceID),
  );
  const updated = [entry, ...filtered].slice(0, MAX_RECENT);

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
