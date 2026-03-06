# App Store and Play Store Submission Guide

This doc covers everything you need to submit SmiPay to the Apple App Store and Google Play Store. You only need this when you're ready to release to real users.

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

### Build and submit

```bash
# Build for production
eas build --profile production --platform ios

# Submit to App Store Connect (after build finishes)
eas submit --platform ios
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
# Submit to Play Store
eas submit --platform android
```

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

- **Internal testing**: Available to testers immediately (no review)
- **Closed testing** (alpha/beta): Available within hours, no review
- **Production**: Google reviews your app (typically 1-7 days for new apps, faster for updates)

Start with **internal testing** to verify everything works, then promote to production.

---

## 4. Testing before store release

### TestFlight (iOS)

After your production build is submitted to App Store Connect:

1. Go to App Store Connect → **TestFlight** tab
2. The build appears after Apple processes it (~15-30 min)
3. **Internal testers**: Add up to 100 people from your App Store Connect team — no review needed
4. **External testers**: Add up to 10,000 people by email — requires a brief Beta App Review (usually <24 hours)
5. Testers get the TestFlight app and install your build from there

### Internal testing (Android)

1. Go to Play Console → **Testing** → **Internal testing**
2. Create a testers list (add emails)
3. Upload a build (or use EAS submit)
4. Share the opt-in link with testers
5. Testers install from the Play Store (shows as "internal test" version)

---

## 5. Quick reference

### Commands

```bash
# ── Build for stores ─────────────────────────────────
eas build --profile production --platform ios
eas build --profile production --platform android

# ── Submit to stores ─────────────────────────────────
eas submit --platform ios
eas submit --platform android

# ── Submit both at once ──────────────────────────────
eas submit --platform all
```

### Complete release flow

```
1. Finish development and testing on dev build
2. Build production:
   eas build --profile production --platform ios
   eas build --profile production --platform android
3. Test via TestFlight (iOS) and Internal Testing (Android)
4. Fix any issues found in testing
5. Submit for review:
   - iOS: Submit via App Store Connect → App Review (1-3 days)
   - Android: Promote from Internal Testing → Production (1-7 days for new apps)
6. App goes live on stores
7. For JS-only updates after release: use OTA (see OTA-UPDATES-AND-WORKFLOWS.md)
8. For native changes: build again and resubmit
```

### Accounts needed

| Account | Cost | URL |
|---------|------|-----|
| Apple Developer Program | $99/year | [developer.apple.com/programs](https://developer.apple.com/programs) |
| Google Play Developer | $25 one-time | [play.google.com/console](https://play.google.com/console) |
| Expo (EAS) | Free tier available | [expo.dev](https://expo.dev) |

---

## 6. Summary

- **iOS**: Build with EAS → submit with `eas submit` → appears in App Store Connect → submit for Apple review → goes live
- **Android**: Build with EAS → first upload manually to Play Console → subsequent uploads via `eas submit` → Google review → goes live
- **Test first**: Use TestFlight (iOS) and Internal Testing (Android) before going to production
- **After release**: Use OTA updates for JS changes (no store review needed), rebuild only for native changes
