#!/bin/bash

# Initial sync script for Fireflies RAG Worker
# This script helps with the initial setup and sync

echo "🔥 Fireflies RAG Worker - Initial Sync"
echo "====================================="

# Check if worker URL is provided
if [ -z "$1" ]; then
    echo "Usage: ./initial-sync.sh <worker-url>"
    echo "Example: ./initial-sync.sh https://fireflies-rag.username.workers.dev"
    exit 1
fi

WORKER_URL=$1

echo ""
echo "1️⃣ Testing system connection..."
curl -s "$WORKER_URL/test" | jq .

echo ""
echo "2️⃣ Checking debug information..."
curl -s "$WORKER_URL/debug" | jq .

echo ""
echo "3️⃣ Starting initial sync (this may take a while)..."
echo "   Syncing last 30 days of meetings..."
RESPONSE=$(curl -s -X POST "$WORKER_URL/sync" \
  -H "Content-Type: application/json" \
  -d '{
    "limit": 50,
    "fromDate": null
  }')

echo "$RESPONSE" | jq .

echo ""
echo "4️⃣ Checking sync status..."
curl -s "$WORKER_URL/analytics" | jq .

echo ""
echo "5️⃣ Starting vectorization process..."
curl -s -X POST "$WORKER_URL/process" | jq .

echo ""
echo "✅ Initial sync started!"
echo ""
echo "Next steps:"
echo "- Monitor progress at $WORKER_URL/"
echo "- Check analytics at $WORKER_URL/analytics"
echo "- Set up Fireflies webhook for real-time updates"
echo ""
echo "The sync and vectorization will continue in the background."
echo "Refresh the dashboard to see progress."