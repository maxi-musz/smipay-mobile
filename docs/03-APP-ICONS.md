# App Icons — What You Need

This doc explains what icon assets are required for iOS and Android, what the rules are, and what to ask your designers for.

---

## 1. iOS Icon

**Apple uses a single image. No layers, no complexity.**

| Requirement | Value |
|---|---|
| File | `assets/images/icon.png` |
| Size | 1024 x 1024 px |
| Format | PNG |
| Transparency | Not allowed (no alpha channel) |
| Rounded corners | Do NOT add — iOS adds them automatically |
| Content | Your full app icon (logo + background baked into one image) |

Configured in `app.json`:
```json
"icon": "./assets/images/icon.png"
```

**Will Apple reject my icon?** Only if it:
- Has transparency / alpha channel
- Is misleading (looks like a system app)
- Is just a solid color with nothing on it
- Contains offensive content

Your current SmiPay icon is fine.

---

## 2. Android Icon (Adaptive Icon)

Android uses a **layered** icon system called "adaptive icons". The OS takes your foreground and background layers and crops them into different shapes (circle, squircle, rounded square) depending on the device manufacturer.

### The three layers

| Layer | File | What it should be |
|---|---|---|
| **Foreground** | `assets/images/android-icon-foreground.png` | Just the logo (S icon), transparent background, centered in the safe zone |
| **Background** | Solid color `#FFFFFF` (or an image) | The color/image behind the logo |
| **Monochrome** | `assets/images/android-icon-monochrome.png` | Same shape as foreground but solid white on transparent — used for Android 13+ themed icons |

Configured in `app.json`:
```json
"android": {
  "icon": "./assets/images/icon.png",
  "adaptiveIcon": {
    "foregroundImage": "./assets/images/icon.png",
    "backgroundColor": "#FFFFFF",
    "monochromeImage": "./assets/images/android-icon-monochrome.png"
  }
}
```

### Foreground image requirements

| Requirement | Value |
|---|---|
| Size | 432 x 432 px (108dp at xxxhdpi) |
| Format | PNG with transparency |
| Safe zone | Inner 288 x 288 px (66%) — your logo must fit inside this area |
| Background | Transparent (the `backgroundColor` or `backgroundImage` provides the background) |

### Why the safe zone matters

Android crops the icon into different shapes depending on the device. The outer ~17% on each side can be clipped:

```
┌─────────────────────────┐
│     (may be cropped)    │
│   ┌─────────────────┐   │
│   │                 │   │
│   │    YOUR LOGO    │   │  ← safe zone (always visible)
│   │                 │   │
│   └─────────────────┘   │
│     (may be cropped)    │
└─────────────────────────┘
      432 x 432 total
      288 x 288 safe zone
```

If the logo extends beyond the safe zone, it will be cut off on some devices.

### Current status

Right now, `app.json` uses `icon.png` (the full SmiPay icon with baked-in background) as the foreground. This works but may look slightly small on some Android devices because the icon already has its own padding + background.

**For the best result**, ask designers to provide a proper foreground with:
- Just the "S" logo
- Transparent background
- Centered in 432x432 with the logo inside the inner 288x288

---

## 3. What to ask your designers for

Send this to your design team:

> We need the following icon assets for the SmiPay mobile app:
>
> **iOS (already done):**
> - 1024 x 1024 PNG, no transparency, no rounded corners — this is our current `icon.png`
>
> **Android adaptive icon (needs update):**
> 1. **Foreground** (432 x 432 PNG, transparent background): Just the SmiPay "S" logo centered in the image. The logo should fit within the inner 288 x 288 pixel area (the "safe zone"). Everything outside this area may be cropped by Android on different devices.
> 2. **Background**: We're using solid white (#FFFFFF). If you want a gradient or pattern, provide a 432 x 432 PNG.
> 3. **Monochrome** (432 x 432 PNG, transparent background): Same shape as the foreground but filled solid white. This is used by Android 13+ for themed icons.
>
> **Store listing icons:**
> - Google Play: 512 x 512 PNG (high-res icon for the Play Store listing)
> - App Store: Uses the 1024 x 1024 `icon.png` automatically
>
> Reference for adaptive icons: https://developer.android.com/develop/ui/views/launch/icon_design_adaptive

---

## 4. Testing your icon

After replacing the icon files, you must **rebuild** the app (icon changes are native, not OTA-updatable):

```bash
eas build --profile development --platform android
eas build --profile development --platform ios
```

To preview how the adaptive icon looks in different shapes before building, use: https://adapticon.tooo.io/ — upload your foreground and background and see circle, squircle, and rounded square previews.

---

## 5. Quick reference

| Platform | File(s) | Size | Notes |
|---|---|---|---|
| iOS | `icon.png` | 1024 x 1024 | No transparency, no rounded corners |
| Android (legacy) | `icon.png` | 1024 x 1024 | Fallback for old Android versions |
| Android (foreground) | `android-icon-foreground.png` | 432 x 432 | Transparent BG, logo in inner 288x288 |
| Android (background) | Solid `#FFFFFF` or image | 432 x 432 | Behind the foreground layer |
| Android (monochrome) | `android-icon-monochrome.png` | 432 x 432 | White on transparent, for themed icons |
| Google Play listing | Separate 512x512 | 512 x 512 | Uploaded to Play Console, not in app |
