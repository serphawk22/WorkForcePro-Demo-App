#!/usr/bin/env bash
# Full local stack: PostgreSQL API + Next dev (macOS/Linux).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Stopping old processes on :3000 and :8000..."
lsof -ti :3000 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti :8000 2>/dev/null | xargs kill -9 2>/dev/null || true

rm -rf "$ROOT/frontend/.next"
echo "Cleared frontend/.next"

echo "Starting API (PostgreSQL) on http://127.0.0.1:8000 ..."
cd "$ROOT/backend"
# Rely entirely on backend/.env DATABASE_URL
python3 -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 &
API_PID=$!
sleep 2

echo "Starting frontend on http://localhost:3000 ..."
cd "$ROOT/frontend"
node scripts/run-dev.cjs &
WEB_PID=$!

cleanup() {
  echo ""
  echo "Shutting down..."
  kill "$API_PID" "$WEB_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo ""
echo "✅ WorkForce Pro running:"
echo "   Frontend  http://localhost:3000"
echo "   API       http://127.0.0.1:8000   (health: /health)"
echo "   Login     admin@gmail.com / admin   (PostgreSQL dev seed)"
echo ""
wait
