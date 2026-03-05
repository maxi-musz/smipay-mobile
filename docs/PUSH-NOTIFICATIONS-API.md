# Push Notifications API — Backend Specification for Mobile

This document describes the **backend push notification API** for the Smipay mobile app. The backend uses **Expo Push Service**: the app sends an Expo push token to the backend, and the backend sends notifications via Expo’s API. Expo delivers to Apple (APNs) and Google (FCM); you do not integrate Firebase or APNs directly in the app.

---

## Overview

| Item | Description |
|------|-------------|
| **Base path** | `/api/v1/push-notification` |
| **Auth** | All endpoints require **JWT Bearer** (user must be logged in). |
| **Token format** | Expo push token from `getExpoPushTokenAsync()`: `ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]`. |
| **Compliance** | Permission-first (ask before registering). User can disable in system settings. Use for relevant events only (e.g. transactions, support) to align with store guidelines. |

---

## REST Endpoints

### 1. Register device token (required for receiving push)

**POST** `/api/v1/push-notification/register`

Call this after the user grants notification permission. Send the Expo push token and platform so the backend can deliver notifications to this device. If the same token is sent again (e.g. app restart), the backend updates metadata; if the token was previously used by another user, it is reassigned to the current user.

**Request body:**

```json
{
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "platform": "ios",
  "device_id": "optional-device-uuid",
  "app_version": "1.2.0"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | Yes | Expo push token from `getExpoPushTokenAsync()`. Must match format `ExponentPushToken[...]`. |
| `platform` | string | Yes | `"ios"` or `"android"`. |
| `device_id` | string | No | Optional device identifier (e.g. UUID) for debugging. Max 255 chars. |
| `app_version` | string | No | App version string. Max 32 chars. |

**Success response (200):**

```json
{
  "success": true,
  "message": "Device token registered successfully",
  "data": {
    "token_id": "uuid-of-stored-token"
  }
}
```

If the token already existed for this user you may get `"Device token refreshed successfully"`; if it was moved from another user, `"Device token updated successfully"`.

**When to call:**

- After login (and after user has granted notification permission).
- On app foreground if you want to refresh the token/metadata (e.g. after app update).
- Do **not** register before the user has granted permission.

**Notes:**

- On **iOS Simulator** and **Android Emulator**, push is not supported; do not call this endpoint if you have no valid token (skip gracefully).
- On **Expo Go on Android (SDK 53+)**, push is not supported; use a development or production build for push.

---

### 2. Remove device token (logout / disable notifications)

**DELETE** `/api/v1/push-notification/remove/:token`

Removes the given Expo push token from the backend. Call when the user logs out or disables notifications so we stop sending to that device. The `:token` is the **URL-encoded** Expo push token (e.g. `ExponentPushToken%5Bxxx%5D`).

**Success response (200):**

```json
{
  "success": true,
  "message": "Device token removed successfully",
  "data": null
}
```

**Errors:** 404 if token not found; 400 if token does not belong to the current user.

---

### 3. List current user’s device tokens

**GET** `/api/v1/push-notification/tokens`

Returns the list of registered, active device tokens for the current user (for debugging or “devices” UI). Token values are **not** returned for privacy.

**Success response (200):**

```json
{
  "success": true,
  "message": "Device tokens retrieved",
  "data": {
    "tokens": [
      {
        "id": "uuid",
        "platform": "ios",
        "device_id": "optional-id",
        "app_version": "1.2.0",
        "createdAt": "2026-03-05T12:00:00.000Z"
      }
    ]
  }
}
```

---

### 4. Send test notification (development only)

**POST** `/api/v1/push-notification/send`

Sends a push notification to **all** of the current user’s registered devices. Intended for **development and testing only**. In production, this endpoint should be disabled or restricted (e.g. admin-only), so that users cannot trigger arbitrary notifications to themselves.

**Request body:**

```json
{
  "title": "Test",
  "body": "Hello from backend",
  "data": "{\"screen\":\"transaction\",\"id\":\"txn_123\"}",
  "image_url": "https://example.com/image.png",
  "priority": "high",
  "channel_id": "default",
  "sound": "default"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Notification title. Max 128 chars. |
| `body` | string | Yes | Notification body. Max 1024 chars. |
| `data` | string | No | JSON string for deep link / custom data. See “Deep links” below. |
| `image_url` | string | No | Optional image URL (rich notification). |
| `priority` | string | No | `"default"`, `"normal"`, or `"high"`. |
| `channel_id` | string | No | Android notification channel ID (e.g. `"default"`, `"transactions"`). |
| `sound` | string | No | iOS: `"default"` or custom sound name (no extension). |

---

## Deep links (when user taps the notification)

The backend sends a `data` object with each notification. The app should use **`screen`** and **`id`** to open the right screen when the user taps the notification.

| `data.screen` | `data.id` | Action |
|---------------|------------|--------|
| `transaction` | transaction id | Open that transaction in history. |
| `transaction` | (none) | Open transaction history list. |
| `support` | conversation id | Open that support conversation. |
| `support` | (none) | Open support conversation list. |

Additional fields (e.g. `type`, `transaction_type`, `amount`, `status`) may be present for in-app use. Keep `data` payload under ~4 KiB (Expo/APNs/FCM limit).

**Example `data` for a transaction notification:**

```json
{
  "screen": "transaction",
  "id": "txn-uuid-here",
  "type": "transaction",
  "transaction_type": "deposit",
  "transaction_id": "txn-uuid-here",
  "amount": 5000,
  "status": "success",
  "timestamp": "2026-03-05T12:00:00.000Z"
}
```

**Example for support:**

```json
{
  "screen": "support",
  "id": "conv-uuid-here",
  "timestamp": "2026-03-05T12:00:00.000Z"
}
```

---

## Backend behaviour (for context)

- **Token storage:** One token per device; same token re-registered updates user/metadata. Token is unique globally (one user per token).
- **Sending:** Notifications are sent to Expo’s API (`https://exp.host/--/api/v2/push/send`). The backend batches up to 100 messages per request and retries on 429/5xx with exponential backoff.
- **Invalid tokens:** If Expo returns `DeviceNotRegistered` or `InvalidCredentials`, the backend marks that token inactive and stops sending to it until the app re-registers a new token.
- **Optional security:** Backend can send an `EXPO_ACCESS_TOKEN` (EAS access token) when calling Expo; if you enable “push security” in the EAS dashboard, requests without this token are rejected by Expo. Set `EXPO_ACCESS_TOKEN` in the backend environment if you use this feature.

---

## EAS project ID (required for Expo push tokens)

Expo needs an **EAS project ID** to issue push tokens. In the app config (e.g. `app.json` / `app.config.js`), set:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "your-eas-project-id"
      }
    }
  }
}
```

Without `projectId`, the app will not get a valid push token (fail gracefully and do not call the register endpoint).

---

## Sound and Android channels

- **Default sound:** Backend uses `sound: "default"` unless overridden.
- **Custom sound:** If the app bundles a custom sound (e.g. `notification-1.wav`), the backend can send `"sound": "notification-1"` (or `"notification-1.wav"` on iOS). Use the same name the app exports (e.g. `NOTIFICATION_SOUND_NAME`).
- **Android channels:** Backend can send `channelId` (e.g. `"default"`, `"transactions"`). The app should create matching channels in `push-notifications.ts` (or equivalent) so notifications display correctly.

---

## Summary for mobile

1. **Auth:** All requests use JWT Bearer (logged-in user).
2. **Register:** `POST /api/v1/push-notification/register` with `token` (Expo) and `platform`; call only after permission is granted.
3. **Unregister:** `DELETE /api/v1/push-notification/remove/:token` on logout or when disabling notifications.
4. **Deep links:** Use `data.screen` and `data.id` in the notification payload to open the correct screen on tap.
5. **Compliance:** Request permission first; use for relevant, non-spam events so store review stays smooth.

If the backend adds or changes any endpoint or field, this document will be updated and shared with the mobile team.
