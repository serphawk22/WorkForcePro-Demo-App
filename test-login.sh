#!/bin/bash
# Quick Login Test Script

echo "🧪 Testing WorkForce Pro Login System"
echo "======================================"
echo ""

# Test Admin Login
echo "Testing Admin Login..."
ADMIN_RESPONSE=$(curl -s -X POST http://localhost:8000/auth/login/json \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"admin"}')

if echo "$ADMIN_RESPONSE" | grep -q "access_token"; then
    echo "✅ Admin login: SUCCESS"
    echo "   Role: $(echo "$ADMIN_RESPONSE" | jq -r '.role')"
    echo "   Name: $(echo "$ADMIN_RESPONSE" | jq -r '.name')"
else
    echo "❌ Admin login: FAILED"
    exit 1
fi

echo ""

# Test Employee Login
echo "Testing Employee Login..."
EMP_RESPONSE=$(curl -s -X POST http://localhost:8000/auth/login/json \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}')

if echo "$EMP_RESPONSE" | grep -q "access_token"; then
    echo "✅ Employee login: SUCCESS"
    echo "   Role: $(echo "$EMP_RESPONSE" | jq -r '.role')"
    echo "   Name: $(echo "$EMP_RESPONSE" | jq -r '.name')"
else
    echo "❌ Employee login: FAILED"
    exit 1
fi

echo ""
echo "======================================"
echo "✅ All login tests passed!"
echo ""
echo "You can now:"
echo "  • Open http://localhost:3000/login"
echo "  • Login as admin@gmail.com / admin"
echo "  • Or login as john@example.com / password123"
