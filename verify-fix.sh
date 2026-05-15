#!/bin/bash

echo "🔍 WorkForcePro - Redirect Loop Verification"
echo "============================================="
echo ""

# Check if servers are running
echo "1️⃣ Checking servers..."
BACKEND_PID=$(lsof -ti :8000)
FRONTEND_PID=$(lsof -ti :3000)

if [ -z "$BACKEND_PID" ]; then
  echo "❌ Backend NOT running on port 8000"
  echo "   Start with: cd backend && source ../.venv/bin/activate && uvicorn app.main:app --reload --port 8000"
else
  echo "✅ Backend running (PID: $BACKEND_PID)"
fi

if [ -z "$FRONTEND_PID" ]; then
  echo "❌ Frontend NOT running on port 3000"
  echo "   Start with: cd frontend && npm run dev"
else
  echo "✅ Frontend running (PID: $FRONTEND_PID)"
fi

echo ""
echo "2️⃣ Testing login API..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8000/auth/login/json \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"admin"}')

if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
  echo "✅ Login API working"
  ROLE=$(echo "$LOGIN_RESPONSE" | jq -r .role)
  echo "   Role: $ROLE"
else
  echo "❌ Login API failed"
  echo "$LOGIN_RESPONSE"
fi

echo ""
echo "3️⃣ Manual Testing Steps:"
echo ""
echo "   A. Clear browser data:"
echo "      - Open browser console (F12)"
echo "      - Run: localStorage.clear()"
echo ""
echo "   B. Test login page (no redirect loop):"
echo "      - Visit: http://localhost:3000/login"
echo "      - Expected: Page loads once, no repeated requests"
echo "      - Console should be quiet (no flood of logs)"
echo ""
echo "   C. Test admin login:"
echo "      - Email: admin@gmail.com"
echo "      - Password: admin"
echo "      - Expected: Redirects to /admin/dashboard in < 1 second"
echo ""
echo "   D. Test employee login:"
echo "      - Clear localStorage first"
echo "      - Email: john@example.com"
echo "      - Password: password123"
echo "      - Expected: Redirects to /employee/dashboard"
echo ""
echo "   E. Test already logged in:"
echo "      - While logged in, visit: http://localhost:3000/login"
echo "      - Expected: Immediately redirects to your dashboard"
echo ""
echo "4️⃣ Success Indicators:"
echo "   ✅ Login page loads instantly"
echo "   ✅ No 'Too many redirects' error"
echo "   ✅ Console shows clean, minimal logs"
echo "   ✅ Navigation happens in < 1 second"
echo "   ✅ No browser freeze or hang"
echo ""
echo "5️⃣ If you see issues:"
echo "   - Check browser console for errors"
echo "   - Check Network tab for repeated requests"
echo "   - Clear localStorage and cookies"
echo "   - Hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)"
echo ""
echo "📖 Full testing guide: REDIRECT_LOOP_FIXED.md"
echo ""
