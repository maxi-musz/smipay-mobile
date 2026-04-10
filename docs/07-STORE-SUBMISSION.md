# App Store and Play Store Submission Guide

This doc covers everything you need to submit SmiPay to the Apple App Store and Google Play Store. You only need this when you're ready to release to real users.

### Short rule: rebuild vs submit-only

| Situation | New `eas build`? |
|-----------|-------------------|
| Changes under **`eas.json` → `submit`** (e.g. Play `track`, submit paths) | **No** — only affects `eas submit`; run submit again. |
| Changes under **`eas.json` → `build`** (especially **`env`** / `EXPO_PUBLIC_*`, channels, `developmentClient`) | **Yes** — those values are baked into the release binary. |
| New **native** dependencies in `package.json`, or **`app.json`** / plugins / permissions / icons / splash | **Yes**. |
| **JS/TS-only** app changes | Often **no** — use **`eas update`** (OTA) when no native change is required. |

**Rule of thumb:** `submit` = no rebuild; `build` profile / native stack = rebuild (or confirm OTA is enough).

---

## 1. Prerequisites

Before submitting to either store, make sure you have:

- A **production build** ready (`eas build --profile production`)
- App icon, splash screen, and screenshots for store listings
- Privacy policy URL (required by both stores)
- A short description and full description of your app

---

## 2. Apple App Store (iOS)

### One-time setup

1. **Apple Developer Program** ($99/year)
   - Enroll at [developer.apple.com/programs](https://developer.apple.com/programs)
   - You need this to distribute apps on the App Store
   - If you already built a development build with EAS, your account is already linked

2. **Create the app on App Store Connect**
   - Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
   - Click **My Apps** → **+** → **New App**
   - Fill in:
     - **Platform**: iOS
     - **Name**: SmiPay
     - **Primary language**: English
     - **Bundle ID**: `com.smipay.mobile` (select from dropdown — EAS registered this during your first build)
     - **SKU**: `com.smipay.mobile` (or any unique string)
   - Click **Create**

3. **Fill in the app listing**
   - **App Information**: Category (Finance), age rating, privacy policy URL
   - **Pricing and Availability**: Free (or set price)
   - **App Privacy**: Fill in the data collection questionnaire (what data your app collects)
   - **Version Information**:
     - Screenshots (required sizes below)
     - Description, keywords, support URL
     - What's new in this version

### Required screenshots

| Device | Size | Required? |
|--------|------|-----------|
| iPhone 6.7" (15 Pro Max) | 1290 x 2796 | Yes |
| iPhone 6.5" (11 Pro Max) | 1242 x 2688 | Yes |
| iPad 12.9" | 2048 x 2732 | Only if `supportsTablet: true` (yours is `false`, so no) |

You need at least **3 screenshots** per required size. Take them from your production build or create marketing images.

### Build and upload (required)

```bash
# Build for production
eas build --profile production --platform ios

# Submit to App Store Connect (after build finishes)
eas submit --profile production --platform ios
```

EAS will ask:
| Prompt | Answer |
|--------|--------|
| **Select a build to submit** | Choose the latest production build |
| **Apple ID** | Your developer email |
| **App specific password** | Generate one at [appleid.apple.com](https://appleid.apple.com) → Sign-In and Security → App-Specific Passwords |

After submission, the build appears in App Store Connect under **TestFlight** (for beta testing) and can be submitted for **App Review**.

### App Review process

1. Go to App Store Connect → your app → **App Store** tab
2. Select the build you submitted
3. Fill in any missing metadata
4. Click **Submit for Review**
5. Apple reviews your app (typically 1-3 days)
6. If approved, you can release it immediately or schedule a release date
7. If rejected, Apple tells you why — fix the issues and resubmit

#### Updated iOS build + TestFlight flow (simplified)

Use this if the UI you see on App Store Connect doesn’t exactly match the screenshots above.

```bash
# 1. Build a production iOS binary
eas build --profile production --platform ios

# 2. Submit that build to App Store Connect
eas submit --profile production --platform ios
```

During `eas submit`, answer:

| Prompt | Answer |
|--------|--------|
| **Select a build to submit** | Choose the latest **production** iOS build |
| **Apple ID** | Your Apple developer email |
| **App-specific password** | Generate one at [appleid.apple.com](https://appleid.apple.com) → **Sign-In and Security** → **App-Specific Passwords** |

After submission and a short processing period (usually 5–30 minutes), the build appears in App Store Connect:

- On the **TestFlight** tab (if you decide to use TestFlight for testing), and  
- On the **App Store** version page when you choose a build for review.

> **Note:** TestFlight is **recommended but not mandatory**. You can skip testers and go straight to App Review once you are confident in the build.

**Optional – internal TestFlight testing**

1. In App Store Connect, open your app → **TestFlight** tab.  
2. Wait until the uploaded build finishes processing and appears in the **Builds** list.  
3. Under **Internal Testing**, create or use an existing group.  
4. Add internal testers (members of your App Store Connect team).  
5. Testers install the **TestFlight** app on their iPhones and will see your build there to install/update.  

You can still later submit **this same build** for App Review; you do not need to upload a new one.

### Common rejection reasons

- Missing privacy policy
- App crashes during review
- Incomplete functionality (placeholder screens)
- Missing login credentials for the reviewer (provide a test account in App Store Connect → App Review Information)
- Screenshots don't match the actual app

---

## 3. Google Play Store (Android)

### One-time setup

1. **Google Play Developer account** ($25 one-time)
   - Sign up at [play.google.com/console](https://play.google.com/console)
   - Pay the one-time $25 registration fee
   - Complete identity verification (can take 1-2 days)

2. **Create the app on Play Console**
   - Go to Play Console → **Create app**
   - Fill in:
     - **App name**: SmiPay
     - **Default language**: English
     - **App or Game**: App
     - **Free or Paid**: Free
   - Accept the declarations
   - Click **Create app**

3. **Complete the setup checklist**

   Play Console has a setup dashboard with items you must complete before you can publish. Go through each one:

   | Section | What to fill in |
   |---------|----------------|
   | **App access** | Whether your app requires login (yes — provide test credentials) |
   | **Ads** | Whether your app contains ads (no) |
   | **Content rating** | Fill out the IARC questionnaire (takes 2 minutes) |
   | **Target audience** | Age group your app targets (18+ for finance) |
   | **News app** | Is this a news app? (no) |
   | **Data safety** | What data your app collects and how it's used |
   | **Government apps** | Is this a government app? (no) |
   | **Financial features** | Does it provide financial services? (yes — describe) |

4. **Store listing**
   - **Short description**: Up to 80 characters
   - **Full description**: Up to 4000 characters
   - **Screenshots**: At least 2 phone screenshots (minimum 320px, maximum 3840px on any side)
   - **Feature graphic**: 1024 x 500 px (required)
   - **App icon**: 512 x 512 px (high-res, used on Play Store — different from in-app icon)
   - **Privacy policy URL**: Required for finance apps

### First submission (manual upload required)

Google requires you to upload the **very first** build manually through their console. After that, EAS can submit automatically.

```bash
# Build for production (creates .aab file)
eas build --profile production --platform android
```

When the build finishes:
1. Download the `.aab` file from the EAS build link
2. Go to Play Console → your app → **Production** (or **Internal testing** to test first)
3. Click **Create new release**
4. Upload the `.aab` file
5. Add release notes
6. Click **Review release** → **Start rollout**

### Subsequent submissions (automated via EAS)

After the first manual upload, configure EAS to submit automatically:

```bash
# Submit to Play Store (uses submit.production from eas.json)
eas submit --profile production --platform android
```

Optional: set which Play track receives the build under `submit.production.android` in `eas.json` (e.g. `"track": "internal"` | `"alpha"` | `"beta"` | `"production"`). See [Expo: Android submit](https://docs.expo.dev/submit/android/).

EAS will ask:
| Prompt | Answer |
|--------|--------|
| **Select a build** | Choose the latest production build |
| **Google Service Account JSON** | See below |

**Setting up the Google Service Account** (one-time, for automated submissions):

1. Go to Play Console → **Setup** → **API access**
2. Click **Link** to link to Google Cloud project (or create a new one)
3. Click **Create new service account** → follow the link to Google Cloud Console
4. Create a service account with the **Service Account User** role
5. Create a JSON key for this service account
6. Download the JSON key file
7. Back in Play Console, grant the service account **Release manager** permission
8. When EAS asks for the service account JSON, provide the path to this file

Or set it in `eas.json`:
```json
"submit": {
  "production": {
    "android": {
      "serviceAccountKeyPath": "./google-service-account.json"
    }
  }
}
```

Add `google-service-account.json` to `.gitignore` — it contains sensitive credentials.

### Review process

- **Internal testing**: Available immediately, no review. Does NOT count toward production access.
- **Closed testing**: Available within hours, no review. This IS what counts for production eligibility.
- **Production**: Google reviews your app (typically 1-7 days for new apps, faster for updates).

### Google's mandatory closed testing requirement (first-time apps)

Google will NOT let you publish to production until you meet ALL of these:

| Requirement | Detail |
|---|---|
| **Testing track** | Must be **Closed testing** (not Internal testing) |
| **Minimum testers** | At least **12 unique testers** must opt in and install the app |
| **Minimum duration** | Testers must be active for at least **14 continuous days** |
| **Opt-in required** | Testers must click the opt-in link and install from Play Store |

Internal testing (the 100-person track) does NOT satisfy this requirement. You must
use **Closed testing** specifically.

---

## 4. Testing before store release

### Recommended testing timeline

| Day | What to do |
|---|---|
| Day 1 | Build staging: `eas build --profile staging --platform all` |
| Day 1 | iOS: Submit to App Store Connect, distribute via TestFlight |
| Day 1 | Android: Upload to Play Console **Closed testing** track, invite 15-20 testers |
| Day 1-3 | Testers install and start using the app on both platforms |
| Day 2-13 | Fix bugs as they come in via OTA: `eas update --channel staging --message "fix: description"` (no rebuild needed) |
| Day 14 | Google's 14-day requirement is met |
| Day 14+ | Build production: `eas build --profile production --platform all` |
| Day 14+ | Submit to both stores for review |

During the 14-day testing period, you can push unlimited bug fixes and UI changes
via OTA updates. Testers receive fixes on their next app launch without reinstalling.

### TestFlight (iOS)

Apple has **no minimum tester count or testing duration**. You can submit for App
Store review as soon as you are satisfied the app works. However, Apple's review team
will manually test every flow, so make sure nothing is broken.

After your production build is submitted to App Store Connect:

1. Go to App Store Connect → **TestFlight** tab
2. The build appears after Apple processes it (~15-30 min)
3. **Internal testers**: Add up to 100 people from your App Store Connect team — no review needed
4. **External testers**: Add up to 10,000 people by email — requires a brief Beta App Review (usually <24 hours)
5. Testers get the TestFlight app and install your build from there

### Closed testing (Android) -- use this, not Internal testing

This is the track that counts toward Google's 14-day production access requirement.

1. Go to Play Console → **Testing** → **Closed testing**
2. Click **Create track** (or use the default "Closed testing" track)
3. **Create a testers list**: click **Manage testers** → create a new email list
4. Add at least **15-20 email addresses** (aim higher than 12 to account for people who don't opt in)
5. Upload a build: click **Create new release** → upload the `.aab` file from your EAS build
6. Add release notes → click **Review release** → **Start rollout to Closed testing**
7. After rollout, go back to **Testers** tab → copy the **Opt-in URL**
8. Send the opt-in URL to all your testers via WhatsApp, email, etc.
9. Each tester must: click the link → accept → install from Play Store
10. Wait **14 days** from when testers start installing

After 14 days with 12+ active testers, the "Production" option becomes available in
Play Console.

### Internal testing (Android) -- optional, for quick personal testing only

This track is instant (no review, no wait) but does NOT count toward the 14-day
requirement. Use it only to quickly verify your build works before setting up closed
testing.

1. Go to Play Console → **Testing** → **Internal testing**
2. Create a testers list (add emails)
3. Upload a build (or use EAS submit)
4. Share the opt-in link with testers
5. Testers install from the Play Store (shows as "internal test" version)

### Fixing bugs during testing (OTA)

You do NOT need to rebuild or re-upload when you find bugs during testing. For any
JavaScript/TypeScript/UI fix:

```bash
# Fix the bug in your code, then:
eas update --channel staging --message "fix: describe what you fixed"
```

Testers receive the fix on their next app launch. This works for both TestFlight and
Play Store testing builds, as long as they were built with the `staging` profile.

---

## 5. Quick reference

### Commands

```bash
# ── Build for stores ─────────────────────────────────
eas build --profile production --platform ios
eas build --profile production --platform android

# ── Submit to stores (uses submit.production in eas.json) ──────────────
eas submit --profile production --platform ios
eas submit --profile production --platform android

# ── Submit both at once ──────────────────────────────
eas submit --profile production --platform all
```

### Complete release flow

```
1.  Finish development and testing on dev build
2.  Build staging:
      eas build --profile staging --platform all
3.  iOS: Submit to App Store Connect → distribute via TestFlight
4.  Android: Upload to Play Console → Closed testing (NOT Internal testing)
5.  Invite 15-20 testers, share the opt-in link, have them install
6.  Fix bugs during testing via OTA:
      eas update --channel staging --message "fix: description"
7.  Wait 14 days (Google requirement for first-time apps)
8.  Build production:
      eas build --profile production --platform all
9.  Submit for review:
      - iOS: Submit via App Store Connect → App Review (1-3 days)
      - Android: Promote to Production in Play Console (1-7 days for new apps)
10. App goes live on stores
11. For JS-only updates after release: use OTA (see docs/06-BUILD-DEPLOY-OTA.md)
12. For native changes: build again and resubmit
```

### Accounts needed

| Account | Cost | URL |
|---------|------|-----|
| Apple Developer Program | $99/year | [developer.apple.com/programs](https://developer.apple.com/programs) |
| Google Play Developer | $25 one-time | [play.google.com/console](https://play.google.com/console) |
| Expo (EAS) | Free tier available | [expo.dev](https://expo.dev) |

---

## 6. Summary

- **iOS**: Build → submit to App Store Connect → test via TestFlight → submit for Apple review → goes live
- **Android**: Build → upload to Play Console **Closed testing** → 12+ testers for 14 days → promote to Production → Google review → goes live
- **During testing**: Push bug fixes instantly via OTA (`eas update --channel staging`) -- no rebuild needed
- **After release**: Use OTA updates for JS changes (no store review needed), rebuild only for native changes
