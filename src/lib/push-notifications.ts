/**
 * Push notifications (Expo Push Service).
 *
 * - No Firebase: your backend sends to Expo's API; Expo delivers via APNs (iOS) / FCM (Android).
 * - Compliant with Apple and Google guidelines (permission-first, user control).
 * - On simulator/emulator or when push is unavailable, we skip gracefully (no crash, no stuck UI).
 *
 * Sound, badge, and other options can be set when sending from your backend (see PUSH-NOTIFICATIONS.md).
 */

import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { type Href, router } from "expo-router";

import { useAuthStore, useInboxStore } from "@/store";

const ANDROID_DEFAULT_CHANNEL_ID = "default";
/** Custom sound filename (no path). Backend should use this in the push payload for custom sound. */
export const NOTIFICATION_SOUND_NAME = "notification_1";

/** Last token we successfully sent to the backend; used to call remove on logout. */
let lastRegisteredToken: string | null = null;
/** When token fetch fails, stores a user-facing reason for the notifications screen. */
let lastPushErrorReason: string | null = null;
/** Time (ms) of last successful backend registration; used to avoid duplicate registrations. */
let lastRegistrationTime = 0;
const REGISTRATION_DEBOUNCE_MS = 15000;

export function getLastRegisteredToken(): string | null {
  return lastRegisteredToken;
}

export function setLastRegisteredToken(token: string): void {
  lastRegisteredToken = token;
}

export function clearLastRegisteredToken(): void {
  lastRegisteredToken = null;
}

/** Call after successfully registering the token with the backend to avoid duplicate registrations. */
export function markRegistrationDone(): void {
  lastRegistrationTime = Date.now();
}

/** True if we recently registered; used to skip duplicate registration from _layout. */
export function didRegisterRecently(): boolean {
  return Date.now() - lastRegistrationTime < REGISTRATION_DEBOUNCE_MS;
}

/**
 * Configure how notifications are presented when the app is in the foreground.
 * You can enable sound, badge, and banner here; backend can still override via payload.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldAnnotateResponse: true,
  }),
});

/**
 * Returns true if push notifications are likely to work on this device.
 * False on simulators/emulators and in Expo Go on Android (SDK 53+).
 */
export function isPushSupported(): boolean {
  if (!Device.isDevice) return false;
  if (Platform.OS === "android" && Constants.appOwnership === "expo") return false;
  return true;
}

/**
 * Request permission and get an Expo push token.
 * Returns null if we're on a simulator, permission denied, or token fetch fails (e.g. missing projectId).
 * Does not throw; safe to call on every app launch.
 */
export async function getExpoPushTokenAsync(): Promise<string | null> {
  if (!isPushSupported()) {
    if (__DEV__) console.log("[Push] Skipped: not a physical device or not supported in this environment.");
    return null;
  }

  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(ANDROID_DEFAULT_CHANNEL_ID, {
        name: "Default",
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      if (__DEV__) console.log("[Push] Permission not granted.");
      return null;
    }

    let projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;

    if (!projectId) {
      try {
        const appConfig = require("../../app.json") as { expo?: { extra?: { eas?: { projectId?: string } } } };
        projectId = appConfig.expo?.extra?.eas?.projectId ?? null;
      } catch {
        // ignore
      }
    }

    if (!projectId) {
      if (__DEV__) console.warn("[Push] No EAS projectId; push token unavailable. Add extra.eas.projectId in app.json for production.");
      return null;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    lastPushErrorReason = null;
    return token ?? null;
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    if (__DEV__) console.warn("[Push] Failed to get token:", e);

    // Android: FCM/Firebase must be configured for push to work.
    if (
      Platform.OS === "android" &&
      (errMsg.includes("FirebaseApp") ||
        errMsg.includes("Firebase") ||
        errMsg.includes("fcm-credentials"))
    ) {
      lastPushErrorReason =
        "Android push requires FCM setup. Add google-services.json and upload a service account key to EAS. See docs/ANDROID-PUSH-SETUP.md.";
    } else {
      lastPushErrorReason = null;
    }
    return null;
  }
}

/**
 * When push token fetch fails, returns a user-facing reason (e.g. FCM not configured).
 * Use this in the notifications screen to show a clearer error.
 */
export function getLastPushErrorReason(): string | null {
  return lastPushErrorReason;
}

/**
 * Register for push: get token and set up listeners.
 * Call when the user is authenticated. Returns the token if available (send to your backend).
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  const token = await getExpoPushTokenAsync();
  setupNotificationListeners();
  return token;
}

/** Deferred until app unlock — `router.push` under the lock overlay is unreliable. */
let pendingNotificationHref: Href | null = null;

/**
 * Call after successful unlock (`isLocked` → false) so push taps open the right screen.
 */
export function flushPendingNotificationNavigation() {
  if (!pendingNotificationHref) return;
  const target = pendingNotificationHref;
  pendingNotificationHref = null;
  // Wait until after lock overlay is gone and the root navigator has committed (avoids dropped routes).
  requestAnimationFrame(() => {
    queueMicrotask(() => {
      try {
        router.push(target);
      } catch (e) {
        if (__DEV__) console.warn("[Push] Deferred navigation failed:", e);
      }
    });
  });
}

/** Clear when signing out so a stale tap cannot navigate after a new session. */
export function clearPendingNotificationNavigation() {
  pendingNotificationHref = null;
}

let lastProcessedNotificationIdentifier: string | null = null;

function notificationResponseDedupKey(response: Notifications.NotificationResponse): string {
  return response.notification.request.identifier;
}

/** Expo/APNs often deliver `data` values as strings; normalize for deep links. */
function dataString(data: Record<string, unknown>, key: string): string | undefined {
  const v = data[key];
  if (typeof v === "string" && v.length > 0) return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return undefined;
}

function buildHrefFromNotificationData(
  data: Record<string, unknown>,
): Href | null {
  const screen = dataString(data, "screen");
  const id = dataString(data, "id");

  if (screen === "support" && id) {
    return { pathname: "/(app)/support/chat", params: { id } };
  }
  if (screen === "support") {
    return "/(app)/support";
  }
  if (screen === "transaction" && id) {
    return `/(app)/history/${id}`;
  }
  if (screen === "transaction") {
    return "/(app)/(tabs)/history";
  }
  // Always open the inbox list — detail deep links were flaky (cold start / lock / id timing); list is reliable.
  if (screen === "notification") {
    return "/(app)/notifications";
  }
  return null;
}

/**
 * Navigate when user taps a notification (or on cold start via getLastNotificationResponseAsync).
 * If the app is locked, stores the target and {@link flushPendingNotificationNavigation} runs after unlock.
 */
export function processNotificationResponse(response: Notifications.NotificationResponse) {
  const dedupKey = notificationResponseDedupKey(response);
  if (dedupKey && lastProcessedNotificationIdentifier === dedupKey) {
    return;
  }
  if (dedupKey) {
    lastProcessedNotificationIdentifier = dedupKey;
  }

  let data = response.notification.request.content.data as Record<string, unknown> | string | undefined;
  if (data == null) return;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data) as Record<string, unknown>;
    } catch {
      return;
    }
  }
  if (typeof data !== "object") return;

  const dataRecord = data as Record<string, unknown>;
  const href = buildHrefFromNotificationData(dataRecord);
  if (!href) return;

  if (dataString(dataRecord, "screen") === "notification") {
    void useInboxStore.getState().fetchInboxFirstPage({ force: true });
  }

  const { isAuthenticated, isLocked } = useAuthStore.getState();
  if (!isAuthenticated) {
    return;
  }

  if (isLocked) {
    pendingNotificationHref = href;
    if (__DEV__) {
      console.log("[Push] App locked — deferring navigation until unlock:", href);
    }
    return;
  }

  router.push(href);
}

let listenersAttached = false;

/**
 * Attach listeners for received notifications and notification tap.
 * Idempotent: safe to call multiple times.
 */
export function setupNotificationListeners(): void {
  if (listenersAttached) return;
  listenersAttached = true;

  const received = Notifications.addNotificationReceivedListener(
    (notification: Notifications.Notification) => {
      if (__DEV__) {
        console.log(
          "[Push] Received:",
          notification.request.content.title,
          notification.request.content.data,
        );
      }
    },
  );

  const response = Notifications.addNotificationResponseReceivedListener(
    (notificationResponse: Notifications.NotificationResponse) => {
      if (__DEV__) {
        console.log("[Push] Response:", notificationResponse.notification.request.content.data);
      }
      processNotificationResponse(notificationResponse);
    },
  );

  const remove = () => {
    received.remove();
    response.remove();
    listenersAttached = false;
  };
  (global as unknown as { __pushRemove?: () => void }).__pushRemove = remove;
}
