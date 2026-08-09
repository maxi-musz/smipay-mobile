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

const HTTP_REASON_PHRASES = new Set([
  "bad request",
  "unauthorized",
  "forbidden",
  "not found",
  "conflict",
  "unprocessable entity",
  "too many requests",
  "internal server error",
  "bad gateway",
  "service unavailable",
]);

function isRoutingMessage(msg: string): boolean {
  return /^Cannot (GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) \//i.test(msg);
}

/** Prefer the backend message when it's actually useful. */
function authoredMessage(error: ApiClientError): string | undefined {
  const msg = (error.message ?? "").trim();
  if (!msg) return undefined;
  if (isAxiosGenericStatusMessage(msg)) return undefined;
  if (isRoutingMessage(msg)) return undefined;
  if (HTTP_REASON_PHRASES.has(msg.toLowerCase())) return undefined;
  return msg;
}


const SERVER_MESSAGE_CODES: Record<
  number,
  { title: string; variant: ErrorVariant }
> = {
  400: { title: "Invalid Request", variant: "error" },
  403: { title: "Can’t continue", variant: "warning" },
  404: { title: "Not Found", variant: "warning" },
  409: { title: "Already Exists", variant: "error" },
  422: { title: "Invalid Request", variant: "error" },
  429: { title: "Too Many Requests", variant: "warning" },
  503: { title: "Temporarily Unavailable", variant: "warning" },
};

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

    // Lock screen handles 401 — keep the toast generic.
    if (code === 401) {
      return {
        ...SAFE_MESSAGES[401],
        variant: "error",
        statusCode: code,
        handled: true,
      };
    }

    const authored = authoredMessage(error);
    const serverOwned = SERVER_MESSAGE_CODES[code];
    if (authored && serverOwned) {
      return {
        title: serverOwned.title,
        message: authored,
        variant: serverOwned.variant,
        statusCode: code,
        handled: false,
      };
    }

    if (code >= 500 && authored) {
      return {
        title: code === 503 ? "Temporarily Unavailable" : "Server Error",
        message: authored,
        variant: "error",
        statusCode: code,
        handled: false,
      };
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
