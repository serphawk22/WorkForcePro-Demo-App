#!/bin/bash
# Double-click this file in Finder to start the app (macOS).
# The website only works while THIS window stays open.

cd "$(dirname "$0")" || exit 1

clear
echo ""
echo "  ╔══════════════════════════════════════════════════════════╗"
echo "  ║  WorkForce Pro — local dev servers                       ║"
echo "  ╚══════════════════════════════════════════════════════════╝"
echo ""

if ! command -v node &>/dev/null; then
  echo "  ❌ Node.js not found. Install: https://nodejs.org"
  echo ""
  read -r -p "  Press Enter to close..."
  exit 1
fi

if [ ! -d "frontend/node_modules/next" ]; then
  echo "  First run: installing frontend packages (may take a minute)..."
  (cd frontend && npm install) || {
    echo "  ❌ npm install failed."
    read -r -p "  Press Enter to close..."
    exit 1
  }
  echo ""
fi

echo "  ➜  Starting Next.js + API..."
echo "  ➜  When you see \"Ready\", open: http://localhost:3000"
echo "  ➜  Do NOT close this window while using the app."
echo ""

npm run dev

echo ""
echo "  Server stopped."
read -r -p "  Press Enter to close..."
