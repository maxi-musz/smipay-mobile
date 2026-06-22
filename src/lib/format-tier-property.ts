import type { TierProperty } from "@/types/profile";

export function formatTierPropertyValue(property: TierProperty): string {
  if (property.value_type === "VERIFICATION") return "Required";
  if (property.value_type === "BOOLEAN") {
    return property.value ? "Enabled" : "Disabled";
  }
  if (property.value_type === "NUMBER") {
    if (property.value === null || property.value === "unlimited") {
      return "Unlimited";
    }
    const amount = Number(property.value);
    if (Number.isNaN(amount)) return "—";
    const formatted = amount.toLocaleString("en-NG");
    return property.unit ? `${formatted} ${property.unit}` : formatted;
  }
  return String(property.value ?? "—");
}

export function getVerificationProperties(
  properties?: TierProperty[],
): TierProperty[] {
  if (!properties?.length) return [];
  return properties.filter((p) => p.value_type === "VERIFICATION");
}

export function getLimitProperties(properties?: TierProperty[]): TierProperty[] {
  if (!properties?.length) return [];
  return properties.filter(
    (p) => p.value_type === "NUMBER" && p.category === "limits",
  );
}

export function getFeatureProperties(
  properties?: TierProperty[],
): TierProperty[] {
  if (!properties?.length) return [];
  return properties.filter(
    (p) => p.value_type === "BOOLEAN" && p.category === "features",
  );
}
