#!/bin/bash
# Quick test script for Auth0 Founder Role System
# Run this after deploying the Worker to verify everything works

set -e

WORKER_URL="https://cold-cell-aa07.jkmeiihh.workers.dev"
FRONTEND_URL="http://localhost:5500"
FOUNDER_ID="google-oauth2|113043894566831592879"

echo "=========================================="
echo "UNDERHEAT Studio - Auth0 Role System Test"
echo "=========================================="
echo ""

# Test 1: Check if Worker is responding
echo "✓ TEST 1: Worker Health Check"
echo "  Testing: GET $WORKER_URL/api/role (without token)"
RESPONSE=$(curl -s "$WORKER_URL/api/role")
if echo "$RESPONSE" | grep -q "Invalid or missing token"; then
  echo "  ✅ Worker is responding correctly"
else
  echo "  ❌ Unexpected response: $RESPONSE"
  exit 1
fi
echo ""

# Test 2: Get token from browser
echo "✓ TEST 2: Manual Auth0 Login"
echo "  1. Open: $FRONTEND_URL in browser"
echo "  2. Click 'Login' button"
echo "  3. Authenticate with Google"
echo "  4. Open DevTools Console (F12)"
echo "  5. Run: await window.auth0Client.getTokenSilently()"
echo "  6. Copy the returned token"
echo ""
echo "  Once you have your token, run:"
echo "  TOKEN='<paste-token-here>' bash $0"
echo ""

# Test 3: Check if TOKEN is provided
if [ -z "$TOKEN" ]; then
  echo "✓ TEST 3: Verify Role (SKIPPED - TOKEN not provided)"
  echo ""
  echo "=========================================="
  echo "Next steps:"
  echo "1. Deploy Worker: cd underheat-api && wrangler deploy"
  echo "2. Set TOKEN and re-run this script"
  echo "=========================================="
  exit 0
fi

echo "✓ TEST 3: Verify Founder Role"
echo "  Testing: GET /api/role with Auth0 token"
ROLE_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$WORKER_URL/api/role")
echo "  Response: $ROLE_RESPONSE"

if echo "$ROLE_RESPONSE" | grep -q '"role":"founder"'; then
  echo "  ✅ You are recognized as FOUNDER!"
  CURRENT_ROLE="founder"
elif echo "$ROLE_RESPONSE" | grep -q '"role":"admin"'; then
  echo "  ✅ You are recognized as ADMIN"
  CURRENT_ROLE="admin"
elif echo "$ROLE_RESPONSE" | grep -q '"role":"user"'; then
  echo "  ⚠️  You are recognized as USER (expected FOUNDER)"
  CURRENT_ROLE="user"
else
  echo "  ❌ Failed to determine role"
  echo "  Full response: $ROLE_RESPONSE"
  exit 1
fi
echo ""

# Test 4: Frontend verification
echo "✓ TEST 4: Frontend UI Verification"
echo "  Open $FRONTEND_URL and check:"
echo "  - ✅ Admin Panel button appears"
echo "  - ✅ Webamp Player toggle appears"
echo "  - ✅ Debug panel shows role: $CURRENT_ROLE"
echo "  - ✅ Can access /admin.html"
echo ""

# Test 5: Optional - Test set-role endpoint (founder only)
if [ "$CURRENT_ROLE" = "founder" ]; then
  echo "✓ TEST 5: Set Role Endpoint (founder only)"
  echo "  You have permission to promote/demote users"
  echo "  Example: promote user to admin"
  echo "  curl -X POST \\"
  echo "    -H 'Authorization: Bearer \$TOKEN' \\"
  echo "    -H 'Content-Type: application/json' \\"
  echo "    -d '{\"targetSub\":\"google-oauth2|OTHER_ID\",\"newRole\":\"admin\"}' \\"
  echo "    $WORKER_URL/api/set-role"
  echo ""
fi

echo "=========================================="
echo "✅ All tests completed!"
echo "=========================================="
echo ""
echo "Summary:"
echo "  Worker URL: $WORKER_URL"
echo "  Frontend URL: $FRONTEND_URL"
echo "  Your Role: $CURRENT_ROLE"
echo "  Your Auth0 ID: $FOUNDER_ID"
echo ""
echo "Next steps:"
echo "  1. Verify admin panel is visible"
echo "  2. Test webamp player"
echo "  3. Check settings and feedback forms"
echo "  4. (Optional) Promote test users to admin"
echo ""
