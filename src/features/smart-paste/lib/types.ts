/** `amount` is only resolved when a field explicitly asks for it. */
export type SmartPasteKind =
  | "phone"
  | "meter"
  | "account"
  | "smartcard"
  | "amount";

export interface SmartPasteCandidate {
  kind: SmartPasteKind;
  /** Field-ready value, digits only. Phones are 11-digit `0…`. */
  value: string;
  /** Grouped for display, e.g. `080 312 34567`. */
  display: string;
  /** e.g. `MTN number`, `Meter number`. */
  label: string;
  confidence: number;
  /** VTpass serviceID when known. */
  network?: string;
  /** Position in the source text; breaks confidence ties. */
  index: number;
}

export interface SmartPasteScan {
  candidates: SmartPasteCandidate[];
  /** A card PAN, BVN, NIN, PIN or OTP was found. Never echo the value back. */
  containsSensitive: boolean;
}
