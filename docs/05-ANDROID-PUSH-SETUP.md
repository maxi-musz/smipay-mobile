# Android Push Notifications Setup (FCM)

Android push notifications require **Firebase Cloud Messaging (FCM)**. Your backend still sends to Expo’s API; Expo delivers to devices via FCM. You don’t write Firebase code, but you must add two things:

1. **google-services.json** — in your project (enables FCM in the native Android app)
2. **Google Service Account Key** — uploaded to EAS (lets Expo deliver push on your behalf)

---

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project** or use an existing project
3. If creating new: enter a name (e.g. "SmiPay"), enable/disable Google Analytics as you prefer

> **Note:** A Firebase project is the same as a Google Cloud project. Creating "SmiPay" in Firebase automatically creates a "SmiPay" project in Google Cloud. You do not create a separate project in Google Cloud Console.

---

## Step 2: Add an Android App to Firebase

1. In Firebase, click **Add app** → **Android**
2. **Android package name:** `com.smipay.mobile` (must match `app.json`)
3. **App nickname (optional):** SmiPay
4. Click **Register app**

---

## Step 3: Download google-services.json

1. Firebase will offer to download `google-services.json`
2. Download it and place it at your project root:

   ```
   smipay-mobile/
   ├── app.json
   ├── google-services.json   ← here
   ├── package.json
   └── ...
   ```

3. Add `googleServicesFile` to `app.json` (already added in this project):

   ```json
   "android": {
     "googleServicesFile": "./google-services.json",
     ...
   }
   ```

4. `google-services.json` can be committed; it contains public identifiers, not secrets.

---

## Step 4: Create a Service Account Key (for EAS)

**Use Firebase Console** (console.firebase.google.com), NOT Google Cloud Console.

1. In [Firebase Console](https://console.firebase.google.com/), select your Smipay project. Open **Project settings** (gear icon) → **Service accounts**
2. Click **Generate new private key** → **Generate key**
3. Save the JSON file securely (e.g. `smipay-firebase-adminsdk.json`)
4. **Add this file to `.gitignore`** — it contains secrets:

   ```
   *firebase*.json
   *adminsdk*.json
   ```

5. Upload to EAS:

   ```bash
   eas credentials
   ```

6. In the menu:
   - **Platform:** Android
   - **Profile:** production (or development)
   - **Credentials:** Google Service Account
   - Select **Set up a Google Service Account Key for Push Notifications (FCM V1)**
   - Choose **Upload a new service account key**
   - Pick the JSON file you downloaded

   EAS will store it securely. Repeat for `development` if you use that profile.

---

## Step 5: Grant Firebase Admin Role (if needed)

**Skip this step for now.** Only do it if push still fails with permission errors after completing Steps 1–4 and rebuilding.

If the service account doesn’t have permission to send FCM messages:

1. Open [Google Cloud IAM → Service accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. **Select the Smipay project** — Use the project dropdown at the top.
3. **If you see "No rows to display"** — That's normal for a new project. The service account is created when you generate the key in Firebase (Step 4). Go back to [Firebase Console → Project settings → Service accounts](https://console.firebase.google.com/) and complete Step 4 there. You can skip Step 5; the default Firebase Admin SDK account usually has the right permissions.
4. If you do see service accounts: find `firebase-adminsdk-xxx@project.iam.gserviceaccount.com` → Edit → **Add another role** → **Firebase Cloud Messaging API Admin** → Save

---

## Step 6: Rebuild the Android App

After adding `google-services.json`, you must **rebuild** the Android app (native config changed):

```bash
eas build --platform android --profile development
# or
eas build --platform android --profile production
```

OTA updates will not apply this change; a new binary is required.

---

## Checklist

- [ ] Firebase project created
- [ ] Android app added with package `com.smipay.mobile`
- [ ] `google-services.json` downloaded and placed in project root
- [ ] `app.json` includes `"googleServicesFile": "./google-services.json"`
- [ ] Service account key generated and uploaded via `eas credentials`
- [ ] Android app rebuilt with EAS Build
- [ ] Test: enable notifications in Profile → Notifications; verify no error

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `FirebaseApp is not initialized` or `fcm-credentials` | Add `google-services.json` and rebuild; upload service account key via `eas credentials` |
| Build fails: `google-services.json` not found | Download the file from Firebase (Step 3) and place it in the project root before building |
| `Make sure to complete the guide at... fcm-credentials` | Follow Steps 4–5; upload service account key to EAS |
| Push toggle shows "permission denied or push unavailable" | Usually FCM not configured (Steps 1–6) or running in Expo Go (use dev build) |
| "No rows to display" in Google Cloud Service accounts | Normal for a new project. Do Step 4 in **Firebase Console** (not Google Cloud). Skip Step 5 for now. |
| Permission granted in Settings but still fails | FCM setup; rebuild required after adding `google-services.json` |

---

## Summary

- **You do not use Firebase in app code** — your backend still calls Expo’s Push API.
- **Expo uses FCM** under the hood for Android delivery.
- **google-services.json** initializes FCM in the native app.
- **Service account key** in EAS lets Expo send push on your behalf.
