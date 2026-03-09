#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
#  OTA Update Script for SmiPay
#
#  Usage:
#    ./scripts/ota-update.sh staging "fix: corrected payment display"
#    ./scripts/ota-update.sh production "fix: corrected payment display"
#
#  Expo CLI auto-loads .env.local with highest priority, which will
#  override your target env. This script temporarily moves .env.local
#  and .env aside, copies the correct env file to .env, runs the
#  update, then restores everything.
# ─────────────────────────────────────────────────────────────

CHANNEL="${1:-}"
MESSAGE="${2:-}"

if [ -z "$CHANNEL" ] || [ -z "$MESSAGE" ]; then
  echo ""
  echo "  Usage: ./scripts/ota-update.sh <channel> <message>"
  echo ""
  echo "  Examples:"
  echo "    ./scripts/ota-update.sh staging  \"fix: corrected payment display\""
  echo "    ./scripts/ota-update.sh production \"fix: corrected payment display\""
  echo ""
  exit 1
fi

if [ "$CHANNEL" != "staging" ] && [ "$CHANNEL" != "production" ]; then
  echo "ERROR: Channel must be 'staging' or 'production'. Got: $CHANNEL"
  exit 1
fi

ENV_FILE=".env.${CHANNEL}"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found. Create it first."
  exit 1
fi

echo ""
echo "  Channel:  $CHANNEL"
echo "  Env file: $ENV_FILE"
echo "  API URL:  $(grep EXPO_PUBLIC_API_BASE_URL "$ENV_FILE" | cut -d= -f2-)"
echo ""
read -p "  Proceed? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "  Cancelled."
  exit 0
fi

# Move .env.local and .env aside so Expo CLI only sees our target env
MOVED_LOCAL=false
MOVED_ENV=false

cleanup() {
  if [ "$MOVED_LOCAL" = true ] && [ -f .env.local.bak ]; then
    mv .env.local.bak .env.local
  fi
  if [ "$MOVED_ENV" = true ] && [ -f .env.bak ]; then
    mv .env.bak .env
  fi
}
trap cleanup EXIT

if [ -f .env.local ]; then
  mv .env.local .env.local.bak
  MOVED_LOCAL=true
fi

if [ -f .env ]; then
  mv .env .env.bak
  MOVED_ENV=true
fi

cp "$ENV_FILE" .env

echo ""
eas update --channel "$CHANNEL" --message "$MESSAGE"
