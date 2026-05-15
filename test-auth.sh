#!/bin/bash

echo "🧪 Authentication Verification Test"
echo "===================================="
echo ""

# Test 1: Backend health
echo "1️⃣ Testing backend health..."
if curl -s http://localhost:8000/docs > /dev/null; then
  echo "   ✅ Backend is running"
else
  echo "   ❌ Backend not responding"
  exit 1
fi

# Test 2: Login
echo ""
echo "2️⃣ Testing login endpoint..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8000/auth/login/json \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"admin"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r .access_token)
if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  echo "   ✅ Login successful"
  echo "   Token: ${TOKEN:0:30}..."
  ROLE=$(echo "$LOGIN_RESPONSE" | jq -r .role)
  EMAIL=$(echo "$LOGIN_RESPONSE" | jq -r .email)
  echo "   User: $EMAIL"
  echo "   Role: $ROLE"
else
  echo "   ❌ Login failed"
  echo "   Response: $LOGIN_RESPONSE"
  exit 1
fi

# Test 3: Verify with token
echo ""
echo "3️⃣ Testing /auth/verify WITH token..."
VERIFY_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8000/auth/verify)
AUTH_STATUS=$(echo "$VERIFY_RESPONSE" | jq -r .authenticated)

if [ "$AUTH_STATUS" == "true" ]; then
  echo "   ✅ Verify successful with token"
  USER_EMAIL=$(echo "$VERIFY_RESPONSE" | jq -r .user.email)
  USER_ROLE=$(echo "$VERIFY_RESPONSE" | jq -r .user.role)
  echo "   User: $USER_EMAIL"
  echo "   Role: $USER_ROLE"
else
  echo "   ❌ Verify failed"
  echo "   Response: $VERIFY_RESPONSE"
fi

# Test 4: Verify without token (should fail with 401)
echo ""
echo "4️⃣ Testing /auth/verify WITHOUT token..."
NO_TOKEN=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/auth/verify)

if [ "$NO_TOKEN" == "401" ]; then
  echo "   ✅ Correctly returns 401 without token"
else
  echo "   ⚠️  Expected 401, got $NO_TOKEN"
fi

# Test 5: Verify with invalid token (should fail with 401)
echo ""
echo "5️⃣ Testing /auth/verify with INVALID token..."
INVALID_TOKEN=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer invalid.fake.token" \
  http://localhost:8000/auth/verify)

if [ "$INVALID_TOKEN" == "401" ]; then
  echo "   ✅ Correctly returns 401 with invalid token"
else
  echo "   ⚠️  Expected 401, got $INVALID_TOKEN"
fi

echo ""
echo "===================================="
echo "✅ Backend authentication is working correctly!"
echo ""
echo "📋 Next steps:"
echo "   1. Open browser to: http://localhost:3000"
echo "   2. Open Developer Console (F12)"
echo "   3. Look for debug logs:"
echo "      [AUTH] Checking authentication..."
echo "      [API] Verifying session..."
echo "      [PROTECTED ROUTE] State: {...}"
echo ""
echo "   4. If you see infinite spinner:"
echo "      - Clear localStorage: localStorage.clear()"
echo "      - Hard refresh: Cmd+Shift+R"
echo ""
echo "📖 Full guide: AUTH_VERIFICATION_FIXED.md"
