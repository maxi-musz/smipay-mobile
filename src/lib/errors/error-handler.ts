import { router } from "expo-router";

import { useAuthStore } from "@/store/auth.store";
import { ApiClientError } from "@/lib/api";
import { useToastStore } from "@/components/ui/toast/toast-store";

type ErrorVariant = "error" | "warning" | "info";

interface ClassifiedError {
  title: string;
  message: string;
  variant: ErrorVariant;
  statusCode?: number;
  /** Whether this error was already handled automatically (e.g. 401 logout). */
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

/**
 * Safe messages that never leak implementation details.
 * The backend's messages (400, 409) are already user-friendly per the API spec,
 * so we pass those through. For everything else, we substitute.
 */
const SAFE_MESSAGES: Record<number, { title: string; message: string }> = {
  401: {
    title: "Session Expired",
    message: "Please sign in again to continue.",
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
 * Classifies any error into a user-safe, display-ready object.
 */
export function classifyError(error: unknown): ClassifiedError {
  // Network / connectivity errors
  if (isNetworkError(error)) {
    return {
      title: "Connection Error",
      message: "Please check your internet connection and try again.",
      variant: "warning",
      handled: false,
    };
  }

  // API errors with status codes
  if (error instanceof ApiClientError && error.statusCode) {
    const code = error.statusCode;

    // 401 — force logout (handled automatically)
    if (code === 401) {
      return {
        ...SAFE_MESSAGES[401],
        variant: "error",
        statusCode: code,
        handled: true,
      };
    }

    // 400, 409 — backend messages are user-friendly, pass through
    if (code === 400 || code === 409) {
      return {
        title: code === 409 ? "Already Exists" : "Invalid Request",
        message: error.message,
        variant: "error",
        statusCode: code,
        handled: false,
      };
    }

    // Known safe fallbacks for other codes
    const safe = SAFE_MESSAGES[code];
    if (safe) {
      return {
        ...safe,
        variant: code >= 500 ? "error" : "warning",
        statusCode: code,
        handled: false,
      };
    }

    // Unknown HTTP error — never show raw message
    return {
      title: "Something Went Wrong",
      message: "An unexpected error occurred. Please try again.",
      variant: "error",
      statusCode: code,
      handled: false,
    };
  }

  // Completely unknown error — never expose internals
  return {
    title: "Something Went Wrong",
    message: "An unexpected error occurred. Please try again.",
    variant: "error",
    handled: false,
  };
}

/**
 * One-liner to handle any error from an API call or anywhere else.
 *
 * - Classifies the error into a user-safe message.
 * - Shows a toast automatically.
 * - Handles 401 (force logout + redirect to sign-in).
 *
 * Returns the classified error so callers can inspect it if needed.
 */
export function handleApiError(error: unknown): ClassifiedError {
  const classified = classifyError(error);

  // 401 → force logout
  if (classified.statusCode === 401) {
    useAuthStore.getState().logout();
    router.replace("/(auth)/sign-in");
    useToastStore.getState().show({
      variant: "error",
      title: classified.title,
      message: classified.message,
    });
    return classified;
  }

  // Show toast for everything else
  useToastStore.getState().show({
    variant: classified.variant,
    title: classified.title,
    message: classified.message,
  });

  return classified;
}
