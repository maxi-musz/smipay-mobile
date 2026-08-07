# Smile chat behaviour

Self-contained client bindings for the admin-controlled **Chat behaviour**
settings (unified-admin → SmileAI → Settings → Chat behaviour). The backend
serves these in one call at `GET /smileai/bootstrap`; this package fetches them
and exposes the client-side pacing helpers.

Everything here is standalone (local state only, no shared store) so it can be
wired into the chat screen without touching other production code. If the
bootstrap call is slow or fails, the helpers degrade to "no cooldown" — the
composer never locks up, because the engine still enforces every rule
server-side regardless of the client.

## Usage

```tsx
import { useSmileBehaviour } from "@/components/smileai/behaviour";

const behaviour = useSmileBehaviour();

// gate a send with the local min-interval cooldown
if (!behaviour.canSendNow()) {
  showToast({ title: behaviour.throttleMessage });
  return;
}
behaviour.markSent();

// read anything else the admin configured
const available = behaviour.bootstrap?.available; // false when the admin
                                                  // kill-switch is on
```

## What the server enforces (so the client doesn't have to)

- **Reply length / tone** — injected into the prompt; nothing to do here.
- **Randomised reply delay** — the reply's `ai.message.queued` event carries
  `scheduled_for`; the existing "attending to you" state already covers the wait.
- **Duplicate / rapid-fire / one-word throttle** — the engine answers with the
  throttle nudge (a normal assistant message) and spends no AI call.
- **Daily cap** — the engine goes **silent**: over-cap messages are accepted and
  stored, but no reply is produced until the user's daily count resets at UTC
  midnight. Nothing is shown to the user — deliberately, so it never outs the AI.

The only thing worth doing client-side is the **min-interval cooldown** (so the
send button reflects the pacing). We intentionally do **not** surface the daily
usage / remaining count, because a visible "N messages left" tells the user
they're talking to a system.
