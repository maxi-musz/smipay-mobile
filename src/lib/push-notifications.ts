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
import { router } from "expo-router";

const ANDROID_DEFAULT_CHANNEL_ID = "default";
/** Custom sound filename (no path). Backend should use this in the push payload for custom sound. */
export const NOTIFICATION_SOUND_NAME = "notification_1";

/** Last token we successfully sent to the backend; used to call remove on logout. */
let lastRegisteredToken: string | null = null;
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
    return token ?? null;
  } catch (e) {
    if (__DEV__) console.warn("[Push] Failed to get token:", e);
    return null;
  }
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

/**
 * Navigate when user taps a notification. Override this or the data shape to match your backend.
 */
function handleNotificationResponse(response: Notifications.NotificationResponse) {
  const data = response.notification.request.content.data as Record<string, unknown> | undefined;
  if (!data) return;

  const screen = data.screen as string | undefined;
  const id = data.id as string | undefined;

  if (screen === "support" && id) {
    router.push({ pathname: "/(app)/support/chat", params: { id } });
  } else if (screen === "support") {
    router.push("/(app)/support");
  } else if (screen === "transaction" && id) {
    router.push(`/(app)/history/${id}`);
  } else if (screen === "transaction") {
    router.push("/(app)/(tabs)/history");
  }
  // Add more screens as needed.
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
    (response: Notifications.NotificationResponse) => {
      if (__DEV__) {
        console.log("[Push] Response:", response.notification.request.content.data);
      }
      handleNotificationResponse(response);
    },
  );

  const remove = () => {
    received.remove();
    response.remove();
    listenersAttached = false;
  };
  (global as unknown as { __pushRemove?: () => void }).__pushRemove = remove;
}
