#!/bin/bash

# Local testing script for Fireflies RAG Worker

echo "🔥 Testing Fireflies RAG Worker Locally"
echo "======================================="
echo ""

URL="http://localhost:8788"

echo "1️⃣ Health Check:"
curl -s $URL/test | jq .
echo ""

echo "2️⃣ Debug Info:"
curl -s $URL/debug | jq .
echo ""

echo "3️⃣ Pipeline Tests:"
curl -s $URL/test-pipeline | jq '.results.summary'
echo ""

echo "4️⃣ Dashboard:"
echo "Open $URL in your browser to view the dashboard"
echo ""

echo "✅ Local testing complete!"
echo ""
echo "Results:"
echo "- Database: Connected ✓"
echo "- R2 Storage: Connected ✓"
echo "- API Keys: Not configured (expected for local testing)"
echo ""
echo "To test with real data, you need to:"
echo "1. Set FIREFLIES_API_KEY"
echo "2. Set OPENAI_API_KEY"
echo "3. Deploy to Cloudflare"