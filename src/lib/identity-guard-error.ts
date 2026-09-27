export type IdentityGuardField =
  | "phone_number"
  | "email"
  | "bvn"
  | "first_name"
  | "middle_name"
  | "last_name";

export type IdentityGuardCode =
  | "invalid_phone"
  | "invalid_email"
  | "email_provider_not_supported"
  | "invalid_name"
  | "invalid_bvn"
  | "phone_update_required";

export interface IdentityGuardError {
  field: IdentityGuardField | null;
  code: IdentityGuardCode | null;
  message: string;
}

const FIELDS: readonly IdentityGuardField[] = [
  "phone_number",
  "email",
  "bvn",
  "first_name",
  "middle_name",
  "last_name",
];

const CODES: readonly IdentityGuardCode[] = [
  "invalid_phone",
  "invalid_email",
  "email_provider_not_supported",
  "invalid_name",
  "invalid_bvn",
  "phone_update_required",
];

const FALLBACK_MESSAGE = "Please check your details and try again.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

function nonEmpty(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function readIdentityGuardError(err: unknown): IdentityGuardError | null {
  if (!isRecord(err) || !isRecord(err.data)) return null;
  const body = err.data;
  const envelope = body.data;
  if (!isRecord(envelope) || envelope.error !== "identity_guard") return null;

  return {
    field: isOneOf(FIELDS, envelope.field) ? envelope.field : null,
    code: isOneOf(CODES, envelope.code) ? envelope.code : null,
    message: nonEmpty(body.message) ?? nonEmpty(err.message) ?? FALLBACK_MESSAGE,
  };
}
