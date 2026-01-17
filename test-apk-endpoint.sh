#!/bin/bash

echo "=== Testing APK Endpoint Manually ==="
echo ""
echo "This script will help debug the APK upload issue."
echo ""

# Check if backend is running
echo "1. Checking if backend is accessible..."
HEALTH_CHECK=$(curl -s -w "\n%{http_code}" http://localhost:3001/health 2>&1)
HTTP_CODE=$(echo "$HEALTH_CHECK" | tail -n1)
RESPONSE=$(echo "$HEALTH_CHECK" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Backend is running"
else
    echo "❌ Backend is not accessible (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE"
    exit 1
fi

echo ""
echo "2. To test the APK endpoint, you need to:"
echo "   a) Login and get your JWT token from browser Developer Tools"
echo "   b) Run this command with your token:"
echo ""
echo "   curl -X GET \\"
echo "     -H 'Authorization: Bearer YOUR_JWT_TOKEN_HERE' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -w '\\n\\nHTTP Status: %{http_code}\\n' \\"
echo "     http://localhost:3001/api/upload/apk/info"
echo ""
echo "3. To see actual error from browser:"
echo "   a) Open Browser Developer Tools (F12)"
echo "   b) Go to Console tab"
echo "   c) Try uploading APK again"
echo "   d) Look for the actual error message in red"
echo ""
echo "4. To check backend logs:"
echo "   docker compose -f docker-compose.duckdns.yml logs backend --tail=100 | grep -i error"
echo ""
