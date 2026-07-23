#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLIST="$ROOT/GoogleService-Info.plist"

if [[ ! -f "$PLIST" ]]; then
  echo "Missing $PLIST — download it from Firebase Console first." >&2
  exit 1
fi

for env_name in production preview development; do
  echo "Uploading GOOGLE_SERVICES_INFO_PLIST for environment: $env_name"
  eas env:create \
    --scope project \
    --name GOOGLE_SERVICES_INFO_PLIST \
    --type file \
    --value "$PLIST" \
    --environment "$env_name" \
    --force
done

echo "Done. Re-run your EAS build."
