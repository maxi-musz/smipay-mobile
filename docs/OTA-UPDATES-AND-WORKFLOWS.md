# OTA Updates and EAS Workflows

This doc covers how to push JavaScript updates directly to users without going through the App Store or Play Store (OTA updates via EAS Update), and how to automate builds and updates with EAS Workflows.

---

## 1. Concepts

### What is OTA (Over-The-Air) update?

An OTA update lets you push **JavaScript and asset changes** directly to users' devices. When a user opens the app, it checks for updates in the background, downloads the new JS bundle, and applies it on the next launch. No App Store review, no Play Store wait.

**Example:** You fix a bug in a React component, run one command, and every user gets the fix next time they open the app.

### What are EAS Workflows?

EAS Workflows are **automated CI/CD pipelines** hosted by Expo. They run on every git push (or manually) and can automatically build your app, publish OTA updates, or submit to the stores. Think of them like GitHub Actions, but purpose-built for Expo projects.

### What CAN be updated via OTA?

| Can update via OTA | Requires a new build |
|---|---|
| React components, screens, styles | Adding/removing native modules (e.g. `expo-camera`) |
| JavaScript/TypeScript logic | Changing `app.json` (name, icon, permissions, plugins) |
| Images and assets bundled with JS | Changing native code (iOS/Android files) |
| API URLs, feature flags, text | Updating SDK version |
| Navigation changes | Adding new permissions |

**Rule of thumb:** If your change is only in `src/` (JS/TS files, images imported in JS), it can be OTA. If you changed `app.json`, added a plugin, or installed a native module, you need a new build.

### How channels and runtime versions work

**Channels** separate your update streams so staging testers and production users get different updates:

```
staging build  ──listens to──→  "staging" channel
production build ──listens to──→  "production" channel
```

When you publish an update to the "staging" channel, only staging builds receive it. Production users are unaffected.

**Runtime version** ensures compatibility. It's derived from your `version` in `app.json` (e.g. `1.0.0`). If you publish an update with runtime version `1.0.0`, only builds with that same runtime version will download it. If you bump to `1.1.0` and rebuild, old `1.0.0` builds won't try to load `1.1.0` updates.

---

## 2. EAS Update — Push updates manually

### Prerequisites

These are already configured in this project:

- `expo-updates` is installed
- `app.json` has `runtimeVersion` and `updates.url` configured
- `eas.json` has `channel` set for `staging` and `production` profiles

### Publishing an update

**To staging** (for testers):

```bash
eas update --branch staging --message "fix: resolve payment status display"
```

**To production** (for all users):

```bash
eas update --branch production --message "fix: resolve payment status display"
```

The `--message` is like a commit message — describe what changed.

### What happens when you publish

1. EAS bundles your current JavaScript and assets
2. Uploads the bundle to Expo's CDN
3. Apps on the matching channel + runtime version check for updates
4. On next app launch, the update is downloaded in the background
5. On the launch after that, the new code is active

So users typically get the update **two launches after you publish** (first launch downloads, second launch applies). If you want the update to apply immediately, you can configure `expo-updates` to check on every launch, but the default behavior is safer and avoids flashing.

### Checking what's deployed

```bash
# See all updates for staging
eas update:list --branch staging

# See all updates for production
eas update:list --branch production

# See details of a specific update
eas update:view <update-id>
```

### Rolling back a bad update

If you pushed a broken update, you have two options:

**Option A — Publish a fix:**

```bash
# Fix the code, then:
eas update --branch production --message "fix: revert broken change"
```

This is the fastest approach — just push another update with the fix.

**Option B — Roll back to a previous update:**

```bash
# List updates to find the good one
eas update:list --branch production

# Roll back (re-publish the previous good update)
eas update:republish --group <good-update-group-id>
```

### Using environment variables in updates

When you run `eas update`, it uses the environment variables from your **local `.env` file** (not from `eas.json`). To publish with the correct backend URL:

```bash
# Publishing staging update (uses staging env)
cp .env.staging .env
eas update --branch staging --message "fix: ..."

# Publishing production update (uses production env)
cp .env.production .env
eas update --branch production --message "fix: ..."
```

Or use inline env vars:

```bash
EXPO_PUBLIC_API_BASE_URL=https://api.smipay.com eas update --branch production --message "fix: ..."
```

---

## 3. EAS Workflows — Automated CI/CD

Workflows automate the manual steps above. Instead of running `eas update` yourself, a workflow can do it automatically when you push to a specific branch.

### How it works

```
Push to develop  ──triggers──→  Staging workflow  ──runs──→  eas update --branch staging
Push to main     ──triggers──→  Production workflow ──runs──→  eas update --branch production
```

### Workflow files

Workflows are defined in `.eas/workflows/` as YAML files. This project has three:

| File | Trigger | What it does |
|---|---|---|
| `staging-update.yml` | Push to `develop` | Publishes OTA update to staging channel |
| `production-update.yml` | Push to `main` | Publishes OTA update to production channel |
| `build-and-submit.yml` | Manual trigger | Builds iOS + Android and optionally submits to stores |

### Setting up workflows

1. The workflow files are already in `.eas/workflows/`
2. Push them to your repo
3. Go to [expo.dev](https://expo.dev) → your project → Workflows
4. Workflows appear automatically once the YAML files are in the repo

### Environment variables for workflows

Workflows run in the cloud, so they need env vars set on the EAS dashboard (not in `.env` files):

1. Go to [expo.dev](https://expo.dev) → your project → Settings → Environment variables
2. Add your variables for each environment:

| Variable | Staging value | Production value |
|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | `https://staging-api.smipay.com` | `https://api.smipay.com` |
| `EXPO_PUBLIC_API_VERSION` | `/api/v1` | `/api/v1` |
| `EXPO_PUBLIC_REQUEST_SIGNING_SECRET` | your staging secret | your production secret |

Set the visibility to "Plain text" for URLs and "Sensitive" for secrets.

---

## 4. When to OTA vs when to rebuild

| Scenario | Action | Command |
|---|---|---|
| Fixed a bug in a component | OTA update | `eas update --branch production --message "fix: ..."` |
| Changed styles or text | OTA update | `eas update --branch production --message "update: ..."` |
| Added a new screen (JS only) | OTA update | `eas update --branch production --message "feat: ..."` |
| Changed API URL or env vars | OTA update | `eas update --branch production --message "config: ..."` |
| Added a new native module | **Rebuild** | `eas build --profile production --platform all` |
| Changed `app.json` plugins | **Rebuild** | `eas build --profile production --platform all` |
| Changed app icon or splash | **Rebuild** | `eas build --profile production --platform all` |
| Bumped SDK version | **Rebuild** | `eas build --profile production --platform all` |
| Added new permissions | **Rebuild** | `eas build --profile production --platform all` |

---

## 5. Quick reference

### Commands cheat sheet

```bash
# ── OTA Updates ──────────────────────────────────────

# Publish to staging
eas update --branch staging --message "description"

# Publish to production
eas update --branch production --message "description"

# List published updates
eas update:list --branch staging
eas update:list --branch production

# Roll back to a previous update
eas update:republish --group <group-id>

# ── Builds ───────────────────────────────────────────

# Development build (for testing native features)
eas build --profile development --platform ios
eas build --profile development --platform android

# Staging build (for testers)
eas build --profile staging --platform ios
eas build --profile staging --platform android

# Production build (for stores)
eas build --profile production --platform ios
eas build --profile production --platform android

# ── Submit to stores ─────────────────────────────────

eas submit --platform ios
eas submit --platform android

# ── Workflows ────────────────────────────────────────

# Workflows run automatically on git push (once set up)
# To manually trigger:
eas workflow:run <workflow-file-name>
```

### Typical release flow

```
1. Develop on feature branch
2. Merge to develop → Workflow auto-publishes OTA to staging
3. Testers verify on staging build
4. Merge develop to main → Workflow auto-publishes OTA to production
5. All production users get the update on next app launch

If native code changed:
6. Run eas build --profile production
7. Submit to App Store / Play Store
8. After approved, future OTA updates go to the new build
```

---

## 6. Summary

- **OTA (EAS Update)**: Push JS changes to users instantly. Run `eas update --branch production --message "..."`. Users get it on next app launch.
- **Channels**: Staging and production are separate. Updates only reach the matching channel.
- **Runtime version**: Ensures old builds don't load incompatible updates. Derived from `version` in `app.json`.
- **Workflows**: Automate OTA publishing on git push. Push to `develop` = staging update. Push to `main` = production update.
- **When to rebuild**: Only when native code, plugins, permissions, or `app.json` config changes. Everything else is OTA.
