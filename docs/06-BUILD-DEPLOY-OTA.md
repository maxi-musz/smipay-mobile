# Deploy, Build & OTA Update Commands

EAS build commands and OTA (Over-The-Air) update guide for SmiPay.
Profiles and env are defined in `eas.json`.

---

## Table of Contents

1. [Build Commands](#build-commands)
2. [Submit to Stores](#submit-to-stores)
3. [OTA Updates -- Why They Are Apple/Google Compliant](#ota-updates----why-they-are-applegoogle-compliant)
4. [What You CAN Update via OTA](#what-you-can-update-via-ota-safe)
5. [What REQUIRES a New Store Build](#what-requires-a-new-store-build-not-ota-safe)
6. [First-Time Setup Checklist](#first-time-setup-checklist-one-time)
7. [Publishing an OTA Update Manually](#publishing-an-ota-update-manually)
8. [Automated OTA via EAS Workflows](#automated-ota-via-eas-workflows)
9. [Verifying Updates on Device](#verifying-updates-on-device)
10. [Rolling Back a Bad Update](#rolling-back-a-bad-update)
11. [Runtime Version Strategy](#runtime-version-strategy)

---

## Build Commands

### Development

Uses `developmentClient: true`, internal distribution, and local/staging API from profile env.

```bash
# iOS
eas build --profile development --platform ios

# Android
eas build --profile development --platform android

# Both
eas build --profile development --platform all
```

### Staging

Internal distribution, points at staging API (e.g. `https://smipay-backend.onrender.com`).

```bash
# iOS
eas build --profile staging --platform ios

# Android
eas build --profile staging --platform android

# Both
eas build --profile staging --platform all
```

### Production

Production channel and API. Use for store builds.

```bash
# iOS
eas build --profile production --platform ios

# Android
eas build --profile production --platform android

# Both
eas build --profile production --platform all
```

---

## Submit to Stores

After a production build, submit with:

```bash
eas submit --platform ios   # or android
```

See `docs/07-STORE-SUBMISSION.md` for full submission steps.

---

## OTA Updates -- Why They Are Apple/Google Compliant

EAS Update is Expo's official OTA update service. It delivers **only JavaScript bundle
and asset changes** (images, fonts, etc.) to users' devices. It **never** touches native
code (Objective-C, Swift, Java, Kotlin) or native configuration.

### Apple's Position

Apple App Store Review Guideline **3.3.2** explicitly permits this:

> *"Interpreted code may be downloaded to an Application but only so long as such code:
> (a) does not change the primary purpose of the Application [...],
> (b) does not create a store or storefront for other code or applications, and
> (c) does not bypass signing, sandbox, or other security features of the OS."*

React Native / Expo apps ship a JavaScript bundle that is interpreted by the native
runtime. Updating that bundle OTA is explicitly allowed under 3.3.2 as long as you
don't change the app's primary purpose or bypass security features.

### Google's Position

Google Play's Developer Program Policy allows OTA JavaScript updates. The same rules
apply: you cannot change the app's primary purpose, add new native permissions, or
download executable native code outside the Play Store.

### Why EAS Update Is Safe

- It only ships **JS bundles + static assets** (images, fonts, JSON).
- It **never** modifies native binaries, permissions, or entitlements.
- It uses **HTTPS** with code signing to verify update integrity.
- It is used by **thousands of production apps** on both stores.
- Expo is a Y Combinator company trusted by major enterprises.

---

## What You CAN Update via OTA (Safe)

All of the following can be pushed directly to users' phones **without** a store review:

| Change Type | Examples |
|---|---|
| UI fixes | Colors, spacing, padding, font sizes, layout changes |
| Text changes | Button labels, error messages, screen titles |
| Bug fixes | Logic errors in TypeScript/JavaScript code |
| New screens/routes | Adding a new tab or page (using existing native modules only) |
| Business logic | Changing validation rules, calculation formulas |
| API changes | Updating endpoints, request/response handling |
| Navigation changes | Reordering tabs, changing default routes |
| Asset updates | Replacing images, adding new icons (bundled with the JS) |
| State management | Zustand/Redux store changes, new slices |
| Styling overhauls | Complete visual redesign using existing components |

---

## What REQUIRES a New Store Build (Not OTA Safe)

These changes modify native code or configuration. You **must** rebuild and resubmit
to the App Store / Play Store:

| Change Type | Examples |
|---|---|
| New native module | Adding `expo-camera`, `expo-maps`, etc. for the first time |
| Removing a native module | Uninstalling a native dependency |
| Permission changes | Adding `CAMERA` permission, removing location, etc. |
| `app.json` native config | Changing `bundleIdentifier`, `package`, splash screen, app icon |
| Expo SDK upgrade | Bumping from SDK 54 to SDK 55 |
| `version` bump in `app.json` | Changing `"version": "1.0.0"` to `"1.1.0"` (changes runtimeVersion) |
| Native plugin config changes | Modifying plugin options in `app.json` `plugins` array |
| New native entitlements | Adding Apple Pay, HealthKit, push notification entitlements |

**Rule of thumb:** If you only touched `.ts`, `.tsx`, `.js`, `.json`, or image files
inside `src/` or `assets/` -- it's OTA safe. If you touched `app.json` plugins,
installed a native package, or changed permissions -- you need a store build.

---

## First-Time Setup Checklist (One-Time)

Run these commands once to verify everything is wired up correctly before your first
OTA update. You only need to do this once per machine.

### Step 1: Verify you are logged in to EAS

```bash
eas whoami
```

Expected output: your Expo account username (e.g. `besttechltd`).

If not logged in:

```bash
eas login
```

Enter your Expo account email and password when prompted.

### Step 2: Verify the project is linked

```bash
eas project:info
```

Expected output should show:
- Project ID: `589fbf17-a8c3-49b0-9d9c-ba2b048f2887`
- Owner: `besttechltd`
- Slug: `smipay-mobile`

### Step 3: Verify update channels exist

```bash
eas channel:list
```

You should see `staging` and `production` channels. If either is missing, create them:

```bash
eas channel:create staging
eas channel:create production
```

### Step 4: Verify at least one build exists on each channel

OTA updates can only be received by builds that were built with a matching channel.
Check your builds:

```bash
eas build:list --channel production --limit 1
eas build:list --channel staging --limit 1
```

If no builds exist for a channel, you need to create one first:

```bash
# Staging build (for internal testers)
eas build --profile staging --platform all

# Production build (for store submission)
eas build --profile production --platform all
```

**Important:** A build without a channel (like `development` profile) will never
receive OTA updates. Only `staging` and `production` builds receive them.

### Step 5: Verify expo-updates is installed

```bash
npx expo install --check
```

If `expo-updates` is missing, install it:

```bash
npx expo install expo-updates
```

After completing all 5 steps, you are ready to publish OTA updates.

---

## Publishing an OTA Update Manually

This is the core workflow you will use most often. After making JS/TS/asset changes,
you publish an update that all users on that channel receive automatically.

### Push to Staging (for internal testing)

```bash
eas update --channel staging --message "fix: corrected payment amount display"
```

What this does:
1. Bundles your current JS code and assets locally.
2. Uploads the bundle to Expo's CDN.
3. Links it to the `staging` channel.
4. Any device running a **staging** build will download the update on next app launch.

### Push to Production (for all users)

```bash
eas update --channel production --message "fix: corrected payment amount display"
```

What this does:
1. Same bundling and upload as staging.
2. Links it to the `production` channel.
3. Any device running a **production** build (from App Store / Play Store) will
   download the update on next app launch.

### Recommended Workflow

```
1. Make your code changes
2. Test locally with `npx expo start`
3. Publish to staging:
   eas update --channel staging --message "describe your change"
4. Test on a staging build (physical device or simulator with staging build installed)
5. When verified, publish to production:
   eas update --channel production --message "describe your change"
```

### Environment Variables

EAS Update uses the environment variables from your **local `.env`** file or from the
`eas.json` profile env at build time. The env variables are baked into the JS bundle
at update publish time. Make sure your local env matches what you expect:

- For staging: the update will use whatever env is in your current shell/env files.
- For production: double-check `EXPO_PUBLIC_API_BASE_URL` points to production.

To be explicit, set env inline:

```bash
EXPO_PUBLIC_API_BASE_URL=https://smipay-prod.onrender.com \
EXPO_PUBLIC_API_VERSION=/api/v1 \
eas update --channel production --message "fix: payment display"
```

### Viewing Published Updates

```bash
# List recent updates on production
eas update:list --branch production

# List recent updates on staging
eas update:list --branch staging
```

---

## Automated OTA via EAS Workflows

The project already has EAS Workflows configured to automatically publish OTA updates
when you push to specific branches.

### Staging: Auto-OTA on push to `develop`

File: `.eas/workflows/staging-update.yml`

Every time you push (or merge a PR) to the `develop` branch, EAS automatically:
1. Checks out your code.
2. Runs `eas update --branch staging`.
3. All staging builds receive the update.

**To trigger:** Simply push your changes to the `develop` branch:

```bash
git checkout develop
git merge your-feature-branch
git push origin develop
```

### Production: Auto-OTA on push to `main`

File: `.eas/workflows/production-update.yml`

Every time you push (or merge a PR) to the `main` branch, EAS automatically:
1. Checks out your code.
2. Runs `eas update --branch production`.
3. All production builds (App Store / Play Store users) receive the update.

**To trigger:** Merge develop into main:

```bash
git checkout main
git merge develop
git push origin main
```

### Full Build + Store Submit (Manual Trigger)

File: `.eas/workflows/build-and-submit.yml`

This workflow is triggered manually from the Expo dashboard. It builds iOS and Android
production binaries and submits them to the App Store and Play Store.

**To trigger:**
1. Go to https://expo.dev
2. Navigate to your project > Workflows
3. Click "Run workflow" on "Build and Submit"

Use this **only** when you've made native changes that require a new store build.

---

## Verifying Updates on Device

### Method 1: Check via Expo Dashboard (Easiest)

1. Go to https://expo.dev
2. Click on the **SmiPay** project.
3. Click **Updates** in the left sidebar.
4. You'll see all published updates grouped by branch (`staging` / `production`).
5. Each update shows: message, publish date, runtime version, and platforms.

### Method 2: Check via CLI

```bash
# See all updates on production branch
eas update:list --branch production

# See all updates on staging branch
eas update:list --branch staging
```

### Method 3: Check on Device Programmatically

You can use the `expo-updates` API in your app code to check for and apply updates.
This is optional -- by default, the app checks for updates on launch automatically.

```typescript
import * as Updates from "expo-updates";

async function checkForUpdate() {
  if (__DEV__) return; // updates don't work in development

  const update = await Updates.checkForUpdateAsync();
  if (update.isAvailable) {
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync(); // restarts the app with the new update
  }
}
```

Call this function on app launch, or behind a "Check for updates" button in a
settings screen.

### When Do Users Receive Updates?

By default, `expo-updates` checks for a new update **every time the app is launched**
(cold start). The flow is:

1. User opens the app.
2. The app loads the currently cached JS bundle immediately (no delay).
3. In the background, it checks `https://u.expo.dev/...` for a newer update.
4. If a new update is found, it downloads it silently.
5. On the **next** app launch, the new update is loaded.

This means updates are received within **two app launches** -- one to download, one to
apply. If you want immediate application, use the programmatic approach above with
`reloadAsync()`.

---

## Rolling Back a Bad Update

If you publish a broken update, you have several options:

### Option 1: Publish a Fix (Recommended)

The fastest approach -- just fix the code and publish again:

```bash
# Fix the bug in your code, then:
eas update --channel production --message "fix: reverted broken payment logic"
```

Users will get the fixed version on their next app launch.

### Option 2: Republish a Previous Git Commit

Check out the last known good commit and publish from there:

```bash
git log --oneline -10                    # find the good commit hash
git checkout <good-commit-hash>          # check out that commit
eas update --channel production --message "rollback: reverting to stable version"
git checkout main                        # go back to main
```

### Option 3: Use EAS Update Rollback via Dashboard

1. Go to https://expo.dev
2. Navigate to your project > **Updates**.
3. Find the **branch** (e.g., `production`).
4. Click the **three dots** menu on the bad update.
5. Select **Roll back** to point the branch back to the previous update.

### Option 4: Roll Back via CLI

```bash
# List updates to find the update group ID
eas update:list --branch production

# Delete the bad update (users will fall back to the previous one)
eas update:delete --id <update-group-id>
```

---

## Runtime Version Strategy

Your project uses the `"appVersion"` runtime version policy (configured in `app.json`):

```json
"runtimeVersion": {
  "policy": "appVersion"
}
```

### How It Works

- The runtime version is derived from the `"version"` field in `app.json`.
- Currently `"version": "1.0.0"`, so the runtime version is `1.0.0`.
- OTA updates are only delivered to builds with a **matching** runtime version.
- If a build has runtime version `1.0.0` and you publish an update with runtime
  version `1.1.0`, the build **silently ignores** the update. This is safe -- it
  will never crash.

### When to Bump the Version

**Bump `version` in `app.json` ONLY when you make native changes:**

```
app.json "version": "1.0.0"  -->  "1.1.0"
```

Then rebuild and resubmit to stores. After that, OTA updates must target `1.1.0`.

**Do NOT bump `version` for JS-only changes.** That would create a new runtime version
and break OTA delivery to existing users on the old version.

### Lifecycle Example

```
1. Build v1.0.0 and submit to stores.
2. Fix a UI bug --> eas update --channel production  (delivered to v1.0.0 users)
3. Fix another bug --> eas update --channel production  (delivered to v1.0.0 users)
4. Add expo-camera (native change) --> bump to v1.1.0, rebuild, resubmit to stores.
5. Fix a bug --> eas update --channel production  (delivered to v1.1.0 users only)
6. Users still on v1.0.0 must update from the store to get v1.1.0.
```

---

## Quick Reference

| Task | Command |
|---|---|
| Login to EAS | `eas login` |
| Check login | `eas whoami` |
| List channels | `eas channel:list` |
| Create channel | `eas channel:create <name>` |
| OTA to staging | `eas update --channel staging --message "your message"` |
| OTA to production | `eas update --channel production --message "your message"` |
| List staging updates | `eas update:list --branch staging` |
| List production updates | `eas update:list --branch production` |
| Delete a bad update | `eas update:delete --id <update-group-id>` |
| Build staging | `eas build --profile staging --platform all` |
| Build production | `eas build --profile production --platform all` |
| Submit to stores | `eas submit --platform ios` / `eas submit --platform android` |
