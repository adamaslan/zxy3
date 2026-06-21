#!/usr/bin/env bash
# start-pipeline.sh — starts the cloudflared tunnel + uvicorn backend for pipe1
# Safe to run multiple times: checks if port 8102 is already in use before starting.

set -e

BACKEND_DIR="$(dirname "$0")/social-pr-autopilot/backend"
ENV_FILE="$(dirname "$0")/.env"

# --- 1. Check if backend is already running ---
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8102/health | grep -q "200"; then
  echo "✅ Backend already running on port 8102."
else
  echo "🚀 Starting uvicorn backend..."
  cd "$BACKEND_DIR"
  nohup python3 -m uvicorn app.main:app --port 8102 > /tmp/uvicorn.log 2>&1 &
  echo "   PID: $! — logs at /tmp/uvicorn.log"
  cd - > /dev/null
fi

# --- 2. Start tunnel (always start a fresh one; old URLs expire anyway) ---
echo "🌐 Starting Cloudflare tunnel..."
nohup cloudflared tunnel --url http://127.0.0.1:8102 --no-autoupdate > /tmp/cloudflared.log 2>&1 &
TUNNEL_PID=$!
echo "   PID: $TUNNEL_PID — logs at /tmp/cloudflared.log"

# --- 3. Wait for tunnel URL to appear ---
echo "⏳ Waiting for tunnel URL (up to 15s)..."
TUNNEL_URL=""
for i in $(seq 1 15); do
  TUNNEL_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' /tmp/cloudflared.log 2>/dev/null | head -1)
  if [ -n "$TUNNEL_URL" ]; then break; fi
  sleep 1
done

if [ -n "$TUNNEL_URL" ]; then
  echo "✅ Tunnel URL: $TUNNEL_URL"
  # Update INSTAGRAM_PUBLIC_BASE_URL in .env
  if grep -q "^INSTAGRAM_PUBLIC_BASE_URL=" "$ENV_FILE" 2>/dev/null; then
    sed -i '' "s|^INSTAGRAM_PUBLIC_BASE_URL=.*|INSTAGRAM_PUBLIC_BASE_URL=$TUNNEL_URL|" "$ENV_FILE"
    echo "✅ Updated INSTAGRAM_PUBLIC_BASE_URL in .env"
  else
    echo "INSTAGRAM_PUBLIC_BASE_URL=$TUNNEL_URL" >> "$ENV_FILE"
    echo "✅ Added INSTAGRAM_PUBLIC_BASE_URL to .env"
  fi
else
  echo "⚠️  Tunnel URL not captured yet — check /tmp/cloudflared.log manually."
fi

# --- 4. Wait for backend health ---
echo "⏳ Waiting for backend health (up to 10s)..."
for i in $(seq 1 10); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8102/health)
  if [ "$STATUS" = "200" ]; then
    echo "✅ Backend healthy."
    break
  fi
  sleep 1
done

echo ""
echo "Pipeline ready. Run pipe1 now."
