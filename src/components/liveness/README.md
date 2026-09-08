# Liveness

The selfie step of BVN registration, as a self-contained drop-in.

```tsx
import { LivenessCheck } from "@/components/liveness";

<LivenessCheck
  sessionToken={sessionToken}
  bvn={bvn}
  fullName={fullName}
  hideHeading            {/* the host screen renders the title */}
  onPassed={() => setStep("details")}
  onRestart={(msg) => { showToast(msg); setStep("bvn"); }}
/>
```

## The one rule

**Never render this because the app decided to.** Render it only when the
server said `next_step === "liveness"`.

Whether a selfie is required at all is an admin switch
(Providers → KYC → *Require a selfie check*), and it is **off by default** —
registration is then BVN → SMS code to the number registered to that BVN →
account. Turning it on takes effect immediately for every installed app; no
release, no OTA update, no client flag. The app's only job is to obey
`next_step`.

## What the server is actually checking

Two independent questions, selected by the admin's *What to check* setting:

| Signal | Answers | Alone, it misses |
|---|---|---|
| Liveness | Is a real, live human present? | *Which* human — anyone live could use any BVN |
| Face match | Is this the face on the BVN? | Whether it was live — a printout can pass |

Default when enabled is **both**. The component doesn't know or care which ran;
it captures one frame and reports what the server says.

## Costs

Every submitted frame is a billed provider call (two, in "both" mode). That is
why the component:

- pre-checks size before uploading, so an oversized frame never spends an attempt;
- skips the crop editor, because a user cropping their own face out burns one;
- surfaces `attempts_remaining` so people know a retry budget exists.

The cap itself is server-side (*Max selfie attempts*, default 3). When it runs
out the server returns `liveness_attempts_exhausted` and `onRestart` fires.

## Error handling

Server rejections arrive as `ApiClientError` with a `code`. Three are fatal and
trigger `onRestart`: `liveness_attempts_exhausted`, `liveness_bvn_mismatch`,
`liveness_bvn_required`. Everything else is retryable in place, with the
server's own message (already written for users — don't rewrite it here).

## Dependencies

`expo-image-picker` only, already in the app with camera permission declared in
`app.json`. **No new native module, so this ships over-the-air.** Styling uses
the design system so it matches the registration steps either side of it.

## Privacy

The frame is sent once and never persisted by SmiPay. The backend stores only
the resulting scores (`liveness_probability`, `face_match_confidence`) on the
registration session, for audit and support.
