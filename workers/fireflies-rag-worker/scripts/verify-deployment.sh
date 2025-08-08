#!/bin/bash

# Quick deployment verification script
# Checks that everything is configured correctly

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔥 Fireflies RAG Worker - Deployment Verification"
echo "=============================================="
echo ""

# Check for required files
echo "Checking required files..."

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 exists"
        return 0
    else
        echo -e "${RED}✗${NC} $1 missing"
        return 1
    fi
}

FILES_OK=true
check_file "wrangler.toml" || FILES_OK=false
check_file "schema.sql" || FILES_OK=false
check_file "package.json" || FILES_OK=false
check_file "src/index.js" || FILES_OK=false

if [ "$FILES_OK" = false ]; then
    echo -e "\n${RED}Missing required files. Please ensure all files are present.${NC}"
    exit 1
fi

# Check wrangler.toml configuration
echo -e "\nChecking wrangler.toml configuration..."

if grep -q "your-database-id-here" wrangler.toml; then
    echo -e "${RED}✗${NC} Database ID not configured in wrangler.toml"
    echo "  Please update the database_id in wrangler.toml"
    exit 1
else
    echo -e "${GREEN}✓${NC} Database ID configured"
fi

# Check if logged into Wrangler
echo -e "\nChecking Wrangler authentication..."
if wrangler whoami >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Logged into Wrangler"
else
    echo -e "${RED}✗${NC} Not logged into Wrangler"
    echo "  Run: wrangler login"
    exit 1
fi

# Check D1 database exists
echo -e "\nChecking D1 database..."
if wrangler d1 list 2>/dev/null | grep -q "alleato-meetings"; then
    echo -e "${GREEN}✓${NC} D1 database 'alleato-meetings' exists"
else
    echo -e "${YELLOW}⚠${NC}  D1 database 'alleato-meetings' not found"
    echo "  Run: wrangler d1 create alleato-meetings"
fi

# Check R2 bucket exists
echo -e "\nChecking R2 bucket..."
if wrangler r2 bucket list 2>/dev/null | grep -q "meeting-transcripts"; then
    echo -e "${GREEN}✓${NC} R2 bucket 'meeting-transcripts' exists"
else
    echo -e "${YELLOW}⚠${NC}  R2 bucket 'meeting-transcripts' not found"
    echo "  Run: wrangler r2 bucket create meeting-transcripts"
fi

# Check Node.js version
echo -e "\nChecking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 16 ]; then
    echo -e "${GREEN}✓${NC} Node.js version $(node -v) (16+ required)"
else
    echo -e "${RED}✗${NC} Node.js version $(node -v) is too old (16+ required)"
    exit 1
fi

# Check npm dependencies
echo -e "\nChecking npm dependencies..."
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} Dependencies installed"
else
    echo -e "${YELLOW}⚠${NC}  Dependencies not installed"
    echo "  Run: npm install"
fi

echo -e "\n=============================================="
echo -e "${GREEN}Pre-deployment checks complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Set your API keys:"
echo "   wrangler secret put FIREFLIES_API_KEY"
echo "   wrangler secret put OPENAI_API_KEY"
echo ""
echo "2. Deploy the worker:"
echo "   wrangler deploy"
echo ""
echo "3. Run the test pipeline:"
echo "   ./scripts/test-pipeline.sh https://your-worker.workers.dev"
echo ""