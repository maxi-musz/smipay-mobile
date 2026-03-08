# How to Get Your EAS Project ID (Step by Step)

The **EAS project ID** is required for push notifications (Expo needs it to issue push tokens). This project currently has a **placeholder** in `app.json` (`REPLACE_WITH_YOUR_EAS_PROJECT_ID`). Replace it with your real project ID after Step 4. If there was an old or wrong project ID, remove it and use the steps below to get the correct one.

---

## Step 1: Remove any existing project ID (if present)

- Open **`app.json`** and delete any `extra` block that contains `eas.projectId`, or delete the whole `extra` section if that’s all that’s in it.
- If you have an **`app.config.js`** or **`app.config.ts`**, open it and remove any `extra.eas.projectId` (or the whole `extra.eas` object).
- Save the file. You’ll add the new project ID in Step 5.

---

## Step 2: Install EAS CLI

In a terminal (any folder is fine):

```bash
npm install -g eas-cli
```

If you prefer not to install globally, you can use `npx eas` in the next steps instead of `eas`.

---

## Step 3: Log in to Expo

```bash
eas login
```

- If you already have an Expo account, enter your email and password.
- If not, choose **Sign up** and create an account at [expo.dev](https://expo.dev).

---

## Step 4: Link this project to EAS and get the project ID

Open a terminal in your **project root** (where `app.json` and `package.json` are):

```bash
cd /path/to/smipay-mobile
eas init
```

- EAS will detect your app (name, slug from `app.json`).
- It will ask to **create a new project** or link to an existing one. Choose **Create a new project** (or **Link to existing** only if you already have the right project in your Expo account).
- When it finishes, the terminal will show something like:
  - **Project ID:** `a1b2c3d4-e5f6-7890-abcd-ef1234567890`
- Copy that **Project ID** (the long UUID). You can also find it in the Expo dashboard (Step 5).

---

## Step 5: Add the project ID to your app config

You must put the project ID in your Expo config so the app can get push tokens.

### If you use only `app.json`

1. Open **`app.json`**.
2. Inside the `"expo"` object, add an `"extra"` block with `"eas"` and `"projectId"` (create the path if it doesn’t exist):

```json
{
  "expo": {
    "name": "SmiPay",
    "slug": "smipay-mobile",
    "extra": {
      "eas": {
        "projectId": "PASTE-YOUR-PROJECT-ID-HERE"
      }
    },
    ...
  }
}
```

3. Replace `PASTE-YOUR-PROJECT-ID-HERE` with the **exact** project ID from Step 4 (e.g. `a1b2c3d4-e5f6-7890-abcd-ef1234567890`).
4. Save the file.

### If you use `app.config.js` or `app.config.ts`

Add (or update) `extra.eas.projectId` in the exported config:

```js
export default {
  expo: {
    name: "SmiPay",
    slug: "smipay-mobile",
    extra: {
      eas: {
        projectId: "PASTE-YOUR-PROJECT-ID-HERE",
      },
    },
    // ... rest of your config
  },
};
```

Again, replace the placeholder with your real project ID.

---

## Step 6: Confirm in the Expo dashboard (optional)

1. Go to [expo.dev](https://expo.dev) and log in.
2. Open your account → **Projects**.
3. Click the project **smipay-mobile** (or the name you used).
4. In project **Settings** or the overview, you’ll see **Project ID**. It must match what you put in `app.json` (or `app.config.js`).

---

## Summary

| Step | What to do |
|------|------------|
| 1 | Remove any old/wrong `projectId` from `app.json` or `app.config.js`. |
| 2 | `npm install -g eas-cli` |
| 3 | `eas login` |
| 4 | In project root: `eas init` → create/link project → copy the **Project ID**. |
| 5 | Add `expo.extra.eas.projectId` in `app.json` (or app.config.js) with that ID. |
| 6 | (Optional) Check the same ID in the Expo dashboard. |

After this, push notification token registration in the app will use the correct project and work when you run a development or production build (and when the device supports push).
