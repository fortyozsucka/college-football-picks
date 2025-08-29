#!/bin/bash

# Test Automated Sync System
# Usage: ./scripts/test-sync.sh [local|production]

set -e

ENV=${1:-local}

if [ "$ENV" = "local" ]; then
    BASE_URL="http://localhost:3001"
    CRON_SECRET="test-secret-123"
else
    echo "Enter your production URL (e.g., https://your-app.vercel.app):"
    read BASE_URL
    echo "Enter your CRON_SECRET:"
    read -s CRON_SECRET
fi

echo "🧪 Testing Automated Sync System..."
echo "📍 Environment: $ENV"
echo "🌐 Base URL: $BASE_URL"
echo ""

# Test 1: Check manual schedule status
echo "1️⃣ Testing schedule status..."
curl -s "$BASE_URL/api/cron/manual-schedule" | jq '.' || echo "❌ Failed to get schedule status"
echo ""

# Test 2: Test cron endpoint (with auth)
echo "2️⃣ Testing cron endpoint with auth..."
curl -s -X POST "$BASE_URL/api/cron/sync-games" \
  -H "Authorization: Bearer $CRON_SECRET" | jq '.' || echo "❌ Cron endpoint failed"
echo ""

# Test 3: Test without auth (should fail)
echo "3️⃣ Testing cron endpoint without auth (should fail)..."
curl -s -X POST "$BASE_URL/api/cron/sync-games" | jq '.' || echo "✅ Correctly rejected unauthorized request"
echo ""

# Test 4: Test live scores endpoint  
echo "4️⃣ Testing live scores endpoint..."
curl -s -X POST "$BASE_URL/api/games/live-scores-test" | jq '.message, .apiAccess' || echo "❌ Live scores test failed"
echo ""

echo "🎉 Sync system testing complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Set CRON_SECRET in your environment"
echo "   2. Deploy to Vercel with 'vercel --prod'"
echo "   3. Monitor logs with 'vercel logs --follow'"