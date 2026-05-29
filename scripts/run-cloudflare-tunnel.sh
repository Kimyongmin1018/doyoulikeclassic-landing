#!/usr/bin/env bash
set -euo pipefail

TOKEN_FILE="${CF_TUNNEL_TOKEN_FILE:-/tmp/doyoulikeclassic-cloudflared.token}"

if [[ ! -s "$TOKEN_FILE" ]]; then
  echo "Missing Cloudflare Tunnel token file: $TOKEN_FILE" >&2
  echo "Run npm run cloudflare:setup with a Cloudflare API token that can manage tunnels first." >&2
  exit 1
fi

if [[ -n "${CLOUDFLARED_BIN:-}" ]]; then
  bin="$CLOUDFLARED_BIN"
elif command -v cloudflared >/dev/null 2>&1; then
  bin="cloudflared"
elif [[ -x /tmp/cloudflared ]]; then
  bin="/tmp/cloudflared"
else
  echo "cloudflared was not found. Install it or set CLOUDFLARED_BIN." >&2
  exit 1
fi

exec "$bin" tunnel --no-autoupdate run --token-file "$TOKEN_FILE"
