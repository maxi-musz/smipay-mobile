# Builds and Expo Go — Explained Simply

If you've never dealt with "development build", "production build", or "Expo Go" before, this doc is for you. It explains what they are, when you need them, and how to switch back to Expo Go.

---

## 1. What is Expo Go?

**Expo Go** is an app you install on your phone (from the App Store or Play Store). It's like a "generic" container that can run many Expo projects.

- You run `npx expo start` on your computer, scan the QR code with Expo Go, and your app appears on the phone.
- **Pros**: No Xcode/Android Studio needed, very fast to try changes.
- **Cons**: Some native features don't work in Expo Go — push notifications, biometrics, custom URL schemes (like `smipay://`), and certain native modules. These only work in development/production builds.

So: Expo Go = quickest way to run the app during normal development, but not all features are available there.

---

## 2. What is a "development build"?

A **development build** is **your own app binary** (an .ipa on iOS or .apk/.aab on Android) that includes your JavaScript bundle and all the native code your app needs (e.g. push notifications, native modules, custom URL schemes).

- It's **your app**, not Expo Go. You install it on your phone or simulator like any other app.
- It still connects to your dev server: you run `npx expo start`, and the development build loads the JS from your computer so you get fast refresh and debugging.
- Use it when you need features that Expo Go doesn't support.

Think of it as: "My app, but in development mode — still talking to my laptop for updates."

---

## 3. What is a "production build"?

A **production build** is the version you give to real users (or to the stores).

- The JavaScript is **bundled inside** the app (no need for your laptop to be running).
- It's optimized and signed for App Store / Play Store (or for internal testing).
- You use it when you want to test the "real" app or submit to Apple/Google.

Think of it as: "The final app, as users will get it."

---

## 4. When do I need which?

| Goal | What to use |
|------|-------------|
| Day-to-day UI and logic, no push / no special native features | **Expo Go** + `npx expo start` |
| Test push notifications, biometrics, Paystack redirect, or other native features | **Development build** |
| Test the app as users will get it, or submit to stores | **Production build** |

You can do most of your work in Expo Go and only use a development build when you need native features.

---

## 5. How do I create a development build? (Step by step)

### One-time setup

1. **Install EAS CLI** (global)
   ```bash
   npm install -g eas-cli
   ```

2. **Log in to Expo**
   ```bash
   eas login
   ```
   Use your Expo account (create one at [expo.dev](https://expo.dev) if needed).

3. **Install `expo-dev-client`** (this is what makes your build a "development build" that connects to your dev server)
   ```bash
   npx expo install expo-dev-client
   ```

4. **Link the project to EAS** (creates `eas.json`)
   ```bash
   cd /path/to/smipay-mobile
   eas init
   ```
   Follow the prompts. This adds EAS config and a `projectId` to your project.

### Build the app

**Option A — Cloud build via EAS** (no Xcode / Android Studio needed, ~10-20 min):

```bash
# iOS
eas build --profile development --platform ios

# Android
eas build --profile development --platform android
```

**Option B — Local build** (faster, requires Xcode for iOS / Android Studio for Android):

```bash
# iOS (Mac only)
npx expo run:ios

# Android
npx expo run:android
```

### Install the build

EAS cloud builds give you a download link when finished.
- **iOS**: Open the link **on your iPhone in Safari** to install.
- **Android**: Download the `.apk` from the link, open it on your phone to install.

Local builds install automatically onto the connected device/simulator.

### Run your app

1. Start the dev server:
   ```bash
   npx expo start
   ```
2. Open the **development build** on your device (not Expo Go). It connects to your dev server with fast refresh — same workflow as Expo Go, but with all native features working.

You only need to rebuild when you change native code or config (e.g. add a new plugin, change `app.json`, add a new native module). For JS-only changes, the same build keeps working — just reload.

---

## 6. What EAS asks during your first build

### iOS prompts

EAS needs Apple credentials to sign the app. It walks you through everything:

| # | Prompt | What to enter |
|---|--------|---------------|
| 1 | **iOS uses standard/exempt encryption?** | **Y** (yes — your app only uses HTTPS, not custom crypto) |
| 2 | **Log in to Apple account?** | **Yes** |
| 3 | **Apple ID** | Your Apple Developer email (the one you use at developer.apple.com) |
| 4 | **Password** | Your Apple ID password (sent to Apple, not stored by EAS) |
| 5 | **Two-factor auth code** | 6-digit code Apple sends to your trusted device |
| 6 | **Select team** | Pick your team (auto-selects if you only have one) |
| 7 | **Generate a new Apple Distribution Certificate?** | **Yes** (EAS manages it for you) |
| 8 | **Generate a new Apple Provisioning Profile?** | **Yes** |
| 9 | **Register a new device?** | **Yes** if no devices are registered yet |
| 10 | **Device name** | Any name, e.g. `My iPhone` |
| 11 | **Device UDID** | See "How to find your UDID" below |

After these prompts, EAS uploads your project and builds it in the cloud (~10-20 min). You'll get a link to download and install the `.ipa`.

**How to find your iPhone UDID:**
- **Option A**: Connect iPhone to Mac → open **Finder** → click your iPhone → click the text under the phone name (Serial Number) repeatedly until it shows **UDID** → right-click → Copy.
- **Option B**: Visit [udid.tech](https://udid.tech) on your iPhone in Safari and follow the steps.

### Android prompts

Android is simpler — no developer account needed for development builds:

| # | Prompt | What to enter |
|---|--------|---------------|
| 1 | **Generate a new Android Keystore?** | **Yes** (EAS manages it for you) |

That's it. EAS generates the keystore, builds the `.apk`, and gives you a download link. Install it on your Android device by opening the link or transferring the file.

> **Note**: For **production** Android builds (Play Store), you'll eventually need a Google Play Developer account ($25 one-time fee). For development builds, no account is needed.

---

## 7. How do I create a production build?

1. **Configure signing** (one-time)
   ```bash
   eas credentials
   ```
   Follow the prompts for iOS (Apple account, certificates) and Android (keystore). EAS can manage these for you.

2. **Build for stores / testing**
   ```bash
   eas build --profile production --platform ios
   eas build --profile production --platform android
   ```

3. **Submit** (optional)
   ```bash
   eas submit --platform ios
   eas submit --platform android
   ```

Your `eas.json` (created by `eas init`) defines the `development`, `staging`, and `production` profiles. Each profile can have its own environment variables (API URLs, secrets, etc.).

---

## 8. Environment variables

Different environments point to different backend servers. This is configured in two places:

### For local development (`npx expo start`)

Edit `.env` in the project root:
```
EXPO_PUBLIC_API_BASE_URL=https://your-ngrok-url.ngrok-free.app
EXPO_PUBLIC_API_VERSION=/api/v1
EXPO_PUBLIC_REQUEST_SIGNING_SECRET=your_secret_here
```

To switch environments locally, copy from the reference files:
```bash
cp .env.local .env      # local backend
cp .env.staging .env    # staging backend
cp .env.production .env # production backend
```

### For EAS builds (staging / production)

Environment variables are set in `eas.json` under each build profile's `env` block. When you run `eas build --profile staging`, the staging env vars are baked into the build. See `eas.json` for the current configuration.

---

## 9. How do I "return to Expo Go"?

You don't "uninstall" anything. You just **run the app in Expo Go again**:

1. Start the dev server:
   ```bash
   npx expo start
   ```

2. On your phone, open **Expo Go** (not your development build).

3. Scan the QR code (or choose the project from "Recently opened").

Your project will load in Expo Go again. Same code, same repo — you're just choosing a different "player": Expo Go instead of your custom development build.

- **Development build**: still installed on your phone; use it when you need native features.
- **Expo Go**: use it for normal development when you don't need those features.

No need to delete the development build unless you want to free space.

---

## 10. Quick reference

| I want to… | Command / Action |
|------------|-------------------|
| Daily development (no push) | `npx expo start` → open in **Expo Go** |
| Test push, biometrics, Paystack redirect, etc. | Use a **development build** (build once, then `npx expo start` and open dev build app) |
| Build for staging testers | `eas build --profile staging --platform ios` (or `android`) |
| Build for stores / production | `eas build --profile production --platform ios` (or `android`) |
| Submit to App Store / Play Store | `eas submit --platform ios` (or `android`) |
| Go back to Expo Go | Just open **Expo Go** and scan the QR code from `npx expo start` |
| Switch local env to staging | `cp .env.staging .env` then restart Expo |
| Switch local env back to local | `cp .env.local .env` then restart Expo |

---

## 11. Summary in one sentence

**Expo Go** = fast development in a generic app; **development build** = your own app with all native features (push, biometrics, URL schemes); **production build** = final app for users; you can switch back to Expo Go anytime by opening Expo Go and connecting to `npx expo start`.
