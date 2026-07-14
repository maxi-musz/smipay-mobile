import { useAuthStore } from "@/store/auth.store";
import { ApiClientError } from "@/lib/api";
import { useToastStore } from "@/components/ui/toast/toast-store";

type ErrorVariant = "error" | "warning" | "info";

interface ClassifiedError {
  title: string;
  message: string;
  variant: ErrorVariant;
  statusCode?: number;
  /** Whether this error was already handled automatically (e.g. 401 lock). */
  handled: boolean;
}

const NETWORK_PATTERNS = [
  "network error",
  "network request failed",
  "err_network",
  "timeout",
  "econnaborted",
  "econnrefused",
  "econnreset",
  "enotfound",
];

function isNetworkError(error: unknown): boolean {
  const msg =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return NETWORK_PATTERNS.some((p) => msg.includes(p));
}

function isAxiosGenericStatusMessage(msg: string): boolean {
  return /^Request failed with status code \d+$/i.test(msg);
}

const SAFE_MESSAGES: Record<number, { title: string; message: string }> = {
  401: {
    title: "Session Expired",
    message: "Please enter your password to continue.",
  },
  403: {
    title: "Access Denied",
    message: "You don't have permission to perform this action.",
  },
  404: {
    title: "Not Found",
    message: "The resource you're looking for doesn't exist.",
  },
  408: {
    title: "Request Timeout",
    message: "The server took too long to respond. Please try again.",
  },
  429: {
    title: "Too Many Requests",
    message: "Please wait a moment before trying again.",
  },
  500: {
    title: "Server Error",
    message: "Something went wrong on our end. Please try again later.",
  },
  502: {
    title: "Server Error",
    message: "Our servers are temporarily unavailable. Please try again shortly.",
  },
  503: {
    title: "Under Maintenance",
    message: "We're performing maintenance. Please try again in a few minutes.",
  },
};

/**
 * When a purchase fails downstream (e.g. the provider declines it), the backend
 * still records a `failed` transaction, refunds the wallet, and attaches that
 * transaction's id to the error response as `transactionId`. Extract it so the
 * app can open the transaction receipt (Opay-style) instead of a dead-end
 * error. Returns undefined for validation/network errors that never produced a
 * transaction — those should keep their inline error handling.
 */
export function getFailedTransactionId(error: unknown): string | undefined {
  if (error instanceof ApiClientError) {
    const id = error.data?.transactionId;
    if (typeof id === "string" && id.length > 0) return id;
  }
  return undefined;
}

export function classifyError(error: unknown): ClassifiedError {
  if (isNetworkError(error)) {
    return {
      title: "Connection Error",
      message: "Please check your internet connection and try again.",
      variant: "warning",
      handled: false,
    };
  }

  if (error instanceof ApiClientError && error.statusCode) {
    const code = error.statusCode;

    if (code === 401) {
      return {
        ...SAFE_MESSAGES[401],
        variant: "error",
        statusCode: code,
        handled: true,
      };
    }

    if (code === 400 || code === 409) {
      return {
        title: code === 409 ? "Already Exists" : "Invalid Request",
        message: error.message,
        variant: "error",
        statusCode: code,
        handled: false,
      };
    }

    if (code >= 500) {
      const msg = (error.message ?? "").trim();
      if (msg && !isAxiosGenericStatusMessage(msg)) {
        return {
          title: code === 503 ? "Temporarily Unavailable" : "Server Error",
          message: msg,
          variant: "error",
          statusCode: code,
          handled: false,
        };
      }
    }

    const safe = SAFE_MESSAGES[code];
    if (safe) {
      return {
        ...safe,
        variant: code >= 500 ? "error" : "warning",
        statusCode: code,
        handled: false,
      };
    }

    return {
      title: "Something Went Wrong",
      message: "An unexpected error occurred. Please try again.",
      variant: "error",
      statusCode: code,
      handled: false,
    };
  }

  return {
    title: "Something Went Wrong",
    message: "An unexpected error occurred. Please try again.",
    variant: "error",
    handled: false,
  };
}

/**
 * Handles any error from an API call.
 *
 * - Classifies the error into a user-safe message.
 * - Shows a toast automatically.
 * - On 401 (after refresh failed): locks the app instead of hard logout.
 */
export function handleApiError(error: unknown): ClassifiedError {
  const classified = classifyError(error);

  if (classified.statusCode === 401) {
    useAuthStore.getState().lock();
    useToastStore.getState().show({
      variant: "error",
      title: classified.title,
      message: classified.message,
    });
    return classified;
  }

  useToastStore.getState().show({
    variant: classified.variant,
    title: classified.title,
    message: classified.message,
  });

  return classified;
}
