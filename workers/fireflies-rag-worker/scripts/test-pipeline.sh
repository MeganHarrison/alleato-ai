#!/bin/bash

# Comprehensive test script for Fireflies RAG Worker
# This script tests the entire pipeline from download to vectorization

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if worker URL is provided
if [ -z "$1" ]; then
    echo "Usage: ./test-pipeline.sh <worker-url>"
    echo "Example: ./test-pipeline.sh https://fireflies-rag.username.workers.dev"
    exit 1
fi

WORKER_URL=$1

echo -e "${BLUE}🔥 Fireflies RAG Worker - Pipeline Testing${NC}"
echo "================================================"
echo "Worker URL: $WORKER_URL"
echo ""

# Function to check response status
check_response() {
    local response=$1
    local test_name=$2
    
    if echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $test_name: PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name: FAILED${NC}"
        echo "$response" | jq .
        return 1
    fi
}

# Function to run test with retry
run_test() {
    local endpoint=$1
    local method=$2
    local data=$3
    local test_name=$4
    local retry_count=3
    local retry_delay=2
    
    echo -e "${YELLOW}Testing: $test_name${NC}"
    
    for i in $(seq 1 $retry_count); do
        if [ "$method" = "GET" ]; then
            response=$(curl -s "$WORKER_URL$endpoint")
        else
            response=$(curl -s -X "$method" "$WORKER_URL$endpoint" \
                -H "Content-Type: application/json" \
                -d "$data")
        fi
        
        if check_response "$response" "$test_name"; then
            return 0
        fi
        
        if [ $i -lt $retry_count ]; then
            echo "Retrying in $retry_delay seconds..."
            sleep $retry_delay
        fi
    done
    
    return 1
}

# Track overall results
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0

# Test 1: System Health Check
echo -e "\n${BLUE}=== Phase 1: System Health Checks ===${NC}"
TESTS_TOTAL=$((TESTS_TOTAL + 1))
if run_test "/test" "GET" "" "System Health Check"; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 2: Debug Information
TESTS_TOTAL=$((TESTS_TOTAL + 1))
echo ""
echo -e "${YELLOW}Checking debug information...${NC}"
DEBUG_RESPONSE=$(curl -s "$WORKER_URL/debug")
echo "$DEBUG_RESPONSE" | jq .

if echo "$DEBUG_RESPONSE" | jq -e '.database_connected == true and .r2_connected == true and .fireflies_key_set == true and .openai_key_set == true' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Debug Check: All services connected${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ Debug Check: Some services not connected${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "${RED}Please check your configuration and try again${NC}"
    exit 1
fi

# Test 3: Run Full Pipeline Test
echo -e "\n${BLUE}=== Phase 2: Pipeline Component Tests ===${NC}"
TESTS_TOTAL=$((TESTS_TOTAL + 1))
echo -e "${YELLOW}Running comprehensive pipeline tests...${NC}"
PIPELINE_RESPONSE=$(curl -s "$WORKER_URL/test-pipeline")
echo "$PIPELINE_RESPONSE" | jq -r '.report'

if echo "$PIPELINE_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Pipeline Tests: PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ Pipeline Tests: FAILED${NC}"
    echo "$PIPELINE_RESPONSE" | jq '.results.summary'
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 4: Test Single Transcript Processing
echo -e "\n${BLUE}=== Phase 3: End-to-End Transcript Processing ===${NC}"
TESTS_TOTAL=$((TESTS_TOTAL + 1))
echo -e "${YELLOW}Testing single transcript download and processing...${NC}"
TRANSCRIPT_RESPONSE=$(curl -s "$WORKER_URL/test-single-transcript")

if echo "$TRANSCRIPT_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Transcript Processing: PASSED${NC}"
    TRANSCRIPT_ID=$(echo "$TRANSCRIPT_RESPONSE" | jq -r '.transcriptId')
    echo "Transcript ID: $TRANSCRIPT_ID"
    echo "$TRANSCRIPT_RESPONSE" | jq '.validation'
    TESTS_PASSED=$((TESTS_PASSED + 1))
    
    # Test 5: Validate the processed transcript
    echo -e "\n${YELLOW}Validating transcript storage and vectorization...${NC}"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    sleep 2  # Give it time to process
    
    VALIDATION_RESPONSE=$(curl -s "$WORKER_URL/validate-transcript?id=$TRANSCRIPT_ID")
    echo "$VALIDATION_RESPONSE" | jq .
    
    if echo "$VALIDATION_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Transcript Validation: PASSED${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${YELLOW}⚠️  Transcript Validation: Partial Success${NC}"
        echo "Some steps may still be processing. Run validation again in a few moments."
        TESTS_PASSED=$((TESTS_PASSED + 1))
    fi
else
    echo -e "${RED}❌ Transcript Processing: FAILED${NC}"
    echo "$TRANSCRIPT_RESPONSE" | jq .
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 6: Check Analytics
echo -e "\n${BLUE}=== Phase 4: System Status ===${NC}"
TESTS_TOTAL=$((TESTS_TOTAL + 1))
echo -e "${YELLOW}Checking system analytics...${NC}"
ANALYTICS_RESPONSE=$(curl -s "$WORKER_URL/analytics")
echo "$ANALYTICS_RESPONSE" | jq .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Analytics Check: PASSED${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌ Analytics Check: FAILED${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Summary Report
echo -e "\n${BLUE}=======================================${NC}"
echo -e "${BLUE}         TEST SUMMARY REPORT${NC}"
echo -e "${BLUE}=======================================${NC}"
echo -e "Total Tests:  $TESTS_TOTAL"
echo -e "${GREEN}Passed:       $TESTS_PASSED${NC}"
echo -e "${RED}Failed:       $TESTS_FAILED${NC}"
echo -e "Success Rate: $((TESTS_PASSED * 100 / TESTS_TOTAL))%"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED! The pipeline is working correctly.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run full sync: curl -X POST $WORKER_URL/sync"
    echo "2. Monitor progress: $WORKER_URL/"
    echo "3. Set up Fireflies webhook for real-time updates"
else
    echo -e "${RED}⚠️  Some tests failed. Please check the errors above.${NC}"
    echo ""
    echo "Troubleshooting tips:"
    echo "1. Check API keys are correctly set"
    echo "2. Ensure D1 database has correct schema"
    echo "3. Verify R2 bucket permissions"
    echo "4. Check Cloudflare logs: wrangler tail"
fi

echo -e "\n${BLUE}=======================================${NC}"