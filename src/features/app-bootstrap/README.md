# app-bootstrap

One launch call — `GET /app/bootstrap` — that tells the app which areas an admin
has switched off, what the current OTP timings are, and the version gate.

**This decorates the interface. It authorises nothing.** Every rule is
re-checked by the backend at the moment it runs. Treat the payload as a hint so
you can grey out a paused feature instead of letting someone fill in a whole
form and then fail — never as permission.

## Mounted where

`AppBootstrapProvider` sits at the app root (`src/app/_layout.tsx`), alongside
`VersionGateProvider`. One fetch is shared by every screen.

It fetches on launch, and again on resume when the app was backgrounded for
more than 3 minutes. The last good response is cached in AsyncStorage and used
to boot, so a cold start with no network is not a blank screen.

## Reading availability

```tsx
import { useServiceAvailability } from "@/features/app-bootstrap";

const utilities = useServiceAvailability("utility_services");

<Button
  disabled={!utilities.available}
  label={utilities.available ? "Buy airtime" : utilities.message}
/>
```

`message` is the copy the admin wrote in the console. Show it verbatim rather
than writing your own — that box exists so support can change the wording
without a release.

Areas: `registration`, `email_verification`, `otp_verification`,
`utility_services`.

## Handling 503 / 429

The bootstrap payload avoids *most* of these, but there is always a race
between fetching and acting, and an admin can flip a switch mid-session. Every
screen must still handle them arriving mid-flow:

```tsx
import { describeServiceError } from "@/features/app-bootstrap";

try {
  await buyAirtime(payload);
} catch (err) {
  const info = describeServiceError(err);
  if (info.kind === "maintenance") return showMaintenance(info.message);
  if (info.kind === "rate_limited") return showCooldown(info.message, info.retryAfterSeconds);
  showError(info.message);
}
```

`describeServiceError` is safe to call on any thrown value — anything it does
not recognise comes back as `kind: "other"` with a sensible message, so
adopting it never changes an existing error path.

## OTP countdowns

```tsx
import { useOtpTimings } from "@/features/app-bootstrap";

const { resend_cooldown_seconds, expiry_minutes } = useOtpTimings();
```

These are the same numbers the backend enforces, so a countdown built from them
finishes exactly when "Resend" starts working.

## Failure behaviour

Every path fails open. No response, a timeout, a corrupt cache, a missing
provider — all resolve to "everything is available". A bootstrap outage must
never brick the app; the backend is what says no.
