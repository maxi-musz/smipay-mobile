# Builds and Expo Go — Explained Simply

If you’ve never dealt with “development build”, “production build”, or “Expo Go” before, this doc is for you. It explains what they are, when you need them, and how to switch back to Expo Go.

---

## 1. What is Expo Go?

**Expo Go** is an app you install on your phone (from the App Store or Play Store). It’s like a “generic” container that can run many Expo projects.

- You run `npx expo start` on your computer, scan the QR code with Expo Go, and your app appears on the phone.
- **Pros**: No Xcode/Android Studio needed, very fast to try changes.
- **Cons**: Some native features don’t work in Expo Go. For example, **push notifications on Android** don’t work in Expo Go (from SDK 53 onward). They do work on a “development build” or “production build”.

So: Expo Go = quickest way to run the app during normal development, but not all features are available there.

---

## 2. What is a “development build”?

A **development build** is **your own app binary** (an .ipa on iOS or .apk/.aab on Android) that includes your JavaScript bundle and all the native code your app needs (e.g. push notifications, native modules).

- It’s **your app**, not Expo Go. You install it on your phone or simulator like any other app.
- It still connects to your dev server: you run `npx expo start`, and the development build loads the JS from your computer so you get fast refresh and debugging.
- Use it when you need features that Expo Go doesn’t support (e.g. push on Android, certain native modules or config plugins).

Think of it as: “My app, but in development mode — still talking to my laptop for updates.”

---

## 3. What is a “production build”?

A **production build** is the version you give to real users (or to the stores).

- The JavaScript is **bundled inside** the app (no need for your laptop to be running).
- It’s optimized and signed for App Store / Play Store (or for internal testing).
- You use it when you want to test the “real” app or submit to Apple/Google.

Think of it as: “The final app, as users will get it.”

---

## 4. When do I need which?

| Goal | What to use |
|------|-------------|
| Day-to-day UI and logic, no push / no special native features | **Expo Go** + `npx expo start` |
| Test push notifications (especially on Android) or other native features | **Development build** |
| Test the app as users will get it, or submit to stores | **Production build** |

You can do most of your work in Expo Go and only use a development build when you need push or similar.

---

## 5. How do I create a development build? (Step by step)

You’ll use **EAS Build** (Expo’s cloud build service). First time only:

1. **Install EAS CLI**
   ```bash
   npm install -g eas-cli
   ```

2. **Log in to Expo**
   ```bash
   eas login
   ```
   Use your Expo account (create one at [expo.dev](https://expo.dev) if needed).

3. **Link the project to EAS**
   ```bash
   cd /path/to/smipay-mobile
   eas init
   ```
   Follow the prompts. This adds EAS config and a `projectId` to your project.

4. **Build for your device**
   - **iOS (Mac only, for simulator or device):**
     ```bash
     eas build --profile development --platform ios
     ```
   - **Android:**
     ```bash
     eas build --profile development --platform android
     ```

5. **Install the build**
   - EAS will give you a link when the build finishes.
   - **iOS**: Install via the link (or download the .ipa and install with Xcode / Apple Configurator if you use a device).
   - **Android**: Download the .apk from the link and install on your phone or emulator.

6. **Run your app in “dev” mode**
   - Start the dev server: `npx expo start`.
   - Open the **development build** on your device (not Expo Go). It should connect to your dev server and load your app with fast refresh.

You only need to create a new development build when you change native code or config (e.g. add a new plugin, change `app.json`). For most JS-only changes, the same development build keeps working.

---

## 6. How do I create a production build?

1. **Configure signing (one-time)**
   ```bash
   eas credentials
   ```
   Follow the prompts for iOS (Apple account, certificates) and Android (keystore). EAS can manage these for you.

2. **Build for stores / testing**
   ```bash
   eas build --profile production --platform ios
   eas build --profile production --platform android
   ```

3. **Submit (optional)**
   ```bash
   eas submit --platform ios
   eas submit --platform android
   ```

Your `eas.json` (created by `eas init`) defines the `development` and `production` profiles. Defaults are fine to start; you can tune them later (e.g. environment variables, build number).

---

## 7. How do I “return to Expo Go”?

You don’t “uninstall” anything. You just **run the app in Expo Go again**:

1. Start the dev server:
   ```bash
   npx expo start
   ```

2. On your phone, open **Expo Go** (not your development build).

3. Scan the QR code (or choose the project from “Recently opened”).

Your project will load in Expo Go again. Same code, same repo — you’re just choosing a different “player”: Expo Go instead of your custom development build.

- **Development build**: still installed on your phone; use it when you need push or other native features.
- **Expo Go**: use it for normal development when you don’t need those features.

No need to delete the development build unless you want to free space.

---

## 8. Quick reference

| I want to… | Command / Action |
|------------|-------------------|
| Daily development (no push) | `npx expo start` → open in **Expo Go** |
| Test push or other native features | Use a **development build** (build once with `eas build --profile development`, then open that app and run `npx expo start`) |
| Test “real” app or submit to stores | `eas build --profile production` |
| Go back to Expo Go | Just open **Expo Go** and scan the QR code from `npx expo start` |

---

## 9. Summary in one sentence

**Expo Go** = fast development in a generic app; **development build** = your own app with all native features (e.g. push); **production build** = final app for users; you can switch back to Expo Go anytime by opening Expo Go and connecting to `npx expo start`.
