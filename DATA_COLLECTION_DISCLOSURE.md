# SmiPay — Data Collection Disclosure

This document describes what data the SmiPay mobile app collects, why it is collected, and how it is handled. Use this as a reference when filling out the **Apple App Store Privacy Nutrition Labels**, the **Google Play Data Safety** form, and when drafting your **Privacy Policy** page.

---

## 1. Data collected

| Data | Collected? | Source | Stored on device? | Sent to server? |
|------|-----------|--------|--------------------|-----------------|
| **Device identifier** | Yes | App-generated UUID (not hardware ID) | Yes (encrypted in Keychain / Keystore) | Yes |
| **Device model & name** | Yes | OS API (`expo-device`) | No (in-memory only) | Yes (HTTP headers) |
| **OS name & version** | Yes | OS API (`Platform`) | No | Yes (HTTP headers) |
| **App version** | Yes | OS API (`expo-application`) | No | Yes (HTTP headers) |
| **Approximate location** | Only if user grants permission | GPS (foreground only, balanced accuracy ~100m) | Cached in-memory for 5 min | Yes (HTTP headers) |
| **IP address** | Derived server-side | TCP connection | N/A | Derived automatically |
| **Email, name, phone** | Yes | User-provided at registration | Encrypted in Keychain / Keystore | Yes |
| **Auth tokens** | Yes | Server-issued | Encrypted in Keychain / Keystore | Yes (HTTP headers) |

---

## 2. Purpose of collection

All data listed above is collected **exclusively** for the following purposes:

### Fraud prevention & account security
- The device identifier, device metadata, IP address, and approximate location are used to build an **audit log** of account activity.
- This allows detection of unauthorized access attempts (e.g. sign-in from a new device or unusual location).
- This is a **regulatory requirement** for financial services apps in Nigeria (CBN guidelines) and aligns with PCI-DSS best practices.

### App functionality
- Email, name, and phone number are required to create and manage the user's account.
- Auth tokens are required to authenticate API requests.

---

## 3. What we do NOT do

- We do **not** use device identifiers for **advertising** or **cross-app tracking**.
- We do **not** collect hardware identifiers (IMEI, MAC address, IDFA/GAID).
- We do **not** use **background location** — only foreground, and only when the user has granted permission.
- We do **not** sell or share collected data with third parties for marketing purposes.
- We do **not** use location data for any purpose other than fraud prevention.

---

## 4. User control

| Action | Behavior |
|--------|----------|
| **Deny location permission** | App works normally. Server falls back to IP-based city-level geolocation for audit logs. User is never asked again. |
| **Revoke location in Settings** | Same as deny — app detects the change and stops sending coordinates. |
| **Delete account** | All user data and audit logs are deleted server-side per data retention policy. |

---

## 5. App Store form guidance

### Apple — App Privacy (Nutrition Labels)

| Data type | Collected | Linked to identity | Used for tracking |
|-----------|-----------|-------------------|-------------------|
| Precise Location | No | — | — |
| Coarse Location | Yes (if permitted) | Yes | No |
| Device ID | Yes (app-generated, not hardware) | Yes | No |
| Email Address | Yes | Yes | No |
| Phone Number | Yes | Yes | No |
| Name | Yes | Yes | No |

**Purpose to select:** "App Functionality", "Analytics" (fraud detection falls under this).

### Google Play — Data Safety

| Data type | Collected | Shared | Purpose |
|-----------|-----------|--------|---------|
| Approximate location | Yes (optional) | No | Fraud prevention, security, compliance |
| Device or other IDs | Yes | No | Fraud prevention, security, compliance |
| Email address | Yes | No | Account management |
| Phone number | Yes | No | Account management |
| Name | Yes | No | Account management |

**Declare:** Data is encrypted in transit (HTTPS). Data is not sold. Users can request deletion.

---

## 6. Privacy Policy page — suggested paragraphs

Include these in your Privacy Policy page/screen:

> **Device Information:** When you use SmiPay, we collect basic information about your device, including a randomly generated device identifier, device model, and operating system version. We use this information to protect your account from unauthorized access and to comply with financial regulations. We do not collect hardware serial numbers, IMEI, or advertising identifiers.

> **Location Information:** With your permission, we collect your approximate location (accurate to approximately 100 meters) while the app is in use. This information is used solely to detect suspicious account activity, such as sign-in attempts from unusual locations. If you decline location access, the app will continue to work normally — we will use your IP address to determine your approximate city for security purposes. You can change your location permissions at any time in your device settings.

> **How We Protect Your Data:** Sensitive information such as authentication tokens and your device identifier are stored using your device's secure enclave (iOS Keychain or Android Keystore). All data transmitted to our servers is encrypted using HTTPS/TLS.

---

**Document version:** 1.0
**Last updated:** 2026-03-03
