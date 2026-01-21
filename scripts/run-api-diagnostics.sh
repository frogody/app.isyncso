#!/bin/bash

# API Diagnostics CLI
# Usage: ./scripts/run-api-diagnostics.sh <action> [api_id]
#
# Actions:
#   health         - Check health of a specific API
#   health-all     - Check health of all APIs
#   crawl          - Crawl API documentation
#   scan           - Scan codebase for API calls
#   detect         - Detect mismatches between docs and implementation
#   status         - Get current diagnostics status
#   full           - Run full diagnostic cycle (scan + detect)

set -e

# Configuration
SUPABASE_URL="${SUPABASE_URL:-https://sfxpmzicgpaxfntqleig.supabase.co}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDY0NjIsImV4cCI6MjA4MjE4MjQ2Mn0.337ohi8A4zu_6Hl1LpcPaWP8UkI5E4Om7ZgeU9_A8t4}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to call the API diagnostics endpoint
call_api() {
    local action="$1"
    local api_id="$2"
    local mismatch_id="$3"

    local body="{\"action\": \"$action\""

    if [ -n "$api_id" ]; then
        body="${body}, \"apiId\": \"$api_id\""
    fi

    if [ -n "$mismatch_id" ]; then
        body="${body}, \"mismatchId\": \"$mismatch_id\""
    fi

    body="${body}}"

    echo -e "${BLUE}→ Calling api-diagnostics: $action${NC}"

    response=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/api-diagnostics" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
        -d "$body")

    echo "$response"
}

# Print usage
usage() {
    echo -e "${BLUE}API Diagnostics CLI${NC}"
    echo ""
    echo "Usage: $0 <action> [api_id]"
    echo ""
    echo "Actions:"
    echo "  health <api_id>    - Check health of a specific API"
    echo "  health-all         - Check health of all registered APIs"
    echo "  crawl <api_id>     - Crawl API documentation via Firecrawl"
    echo "  scan [api_id]      - Scan codebase for API calls"
    echo "  detect [api_id]    - Detect mismatches (requires prior crawl)"
    echo "  status [api_id]    - Get current diagnostics status"
    echo "  full [api_id]      - Run full diagnostic cycle"
    echo ""
    echo "Available APIs:"
    echo "  explorium, together, google, groq, tavily, composio"
    echo ""
    echo "Examples:"
    echo "  $0 health-all"
    echo "  $0 health explorium"
    echo "  $0 crawl explorium"
    echo "  $0 detect explorium"
    echo "  $0 full"
}

# Main logic
case "$1" in
    health)
        if [ -z "$2" ]; then
            echo -e "${RED}Error: API ID required for health check${NC}"
            echo "Usage: $0 health <api_id>"
            exit 1
        fi
        result=$(call_api "healthCheck" "$2")

        # Pretty print
        if echo "$result" | jq -e '.success == true' > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Health check completed${NC}"
            echo "$result" | jq -r '.data.report'
        else
            echo -e "${RED}✗ Health check failed${NC}"
            echo "$result" | jq -r '.message'
        fi
        ;;

    health-all)
        result=$(call_api "healthCheckAll")

        if echo "$result" | jq -e '.success == true' > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Health check completed${NC}"
            echo "$result" | jq -r '.data.report'
        else
            echo -e "${RED}✗ Health check failed${NC}"
            echo "$result" | jq -r '.message'
        fi
        ;;

    crawl)
        if [ -z "$2" ]; then
            echo -e "${RED}Error: API ID required for crawl${NC}"
            echo "Usage: $0 crawl <api_id>"
            exit 1
        fi
        echo -e "${YELLOW}Note: Crawling may take several minutes...${NC}"
        result=$(call_api "crawl" "$2")

        if echo "$result" | jq -e '.success == true' > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Crawl completed${NC}"
            echo "$result" | jq '.data'
        else
            echo -e "${RED}✗ Crawl failed${NC}"
            echo "$result" | jq -r '.message'
        fi
        ;;

    scan)
        result=$(call_api "scan" "$2")

        if echo "$result" | jq -e '.success == true' > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Scan completed${NC}"
            echo "$result" | jq -r '.data.report'
        else
            echo -e "${RED}✗ Scan failed${NC}"
            echo "$result" | jq -r '.message'
        fi
        ;;

    detect)
        result=$(call_api "detect" "$2")

        if echo "$result" | jq -e '.success == true' > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Detection completed${NC}"
            echo ""
            echo "$result" | jq -r '.data.report'
            echo ""

            # Show fix preview if there are fixable issues
            fixable=$(echo "$result" | jq -r '.data.summary.auto_fixable')
            if [ "$fixable" != "0" ] && [ "$fixable" != "null" ]; then
                echo -e "${YELLOW}Fix Preview:${NC}"
                echo "$result" | jq -r '.data.fixPreview'
            fi
        else
            echo -e "${RED}✗ Detection failed${NC}"
            echo "$result" | jq -r '.message'
        fi
        ;;

    status)
        result=$(call_api "status" "$2")

        if echo "$result" | jq -e '.success == true' > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Status retrieved${NC}"
            echo ""
            echo "Registered APIs:"
            echo "$result" | jq -r '.data.registered_apis[] | "  - \(.name) (\(.id)): \(.files_count) files"'
            echo ""
            echo "Open Mismatches:"
            echo "$result" | jq -r '"  Total: \(.data.open_mismatches)"'
            echo "$result" | jq -r '"  Critical: \(.data.mismatches_by_severity.critical)"'
            echo "$result" | jq -r '"  Warning: \(.data.mismatches_by_severity.warning)"'
        else
            echo -e "${RED}✗ Status fetch failed${NC}"
            echo "$result" | jq -r '.message'
        fi
        ;;

    full)
        echo -e "${BLUE}Running full diagnostic cycle...${NC}"
        echo ""

        # Step 1: Health check all
        echo -e "${BLUE}Step 1: Health Check${NC}"
        result=$(call_api "healthCheckAll")
        if echo "$result" | jq -e '.success == true' > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Health check completed${NC}"
            echo "$result" | jq -r '.data.report'
        else
            echo -e "${RED}✗ Health check failed${NC}"
        fi
        echo ""

        # Step 2: Scan
        echo -e "${BLUE}Step 2: Scanning codebase${NC}"
        result=$(call_api "scan" "$2")
        if echo "$result" | jq -e '.success == true' > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Scan completed${NC}"
            api_calls=$(echo "$result" | jq -r '.data.usages | length')
            echo "Found $api_calls API calls"
        else
            echo -e "${RED}✗ Scan failed${NC}"
        fi
        echo ""

        # Step 3: Detect
        echo -e "${BLUE}Step 3: Detecting mismatches${NC}"
        result=$(call_api "detect" "$2")
        if echo "$result" | jq -e '.success == true' > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Detection completed${NC}"
            echo ""
            echo "$result" | jq -r '.data.report'

            # Show summary
            echo ""
            echo "Summary:"
            echo "$result" | jq '.data.summary'
        else
            echo -e "${RED}✗ Detection failed${NC}"
        fi
        ;;

    -h|--help|help)
        usage
        ;;

    *)
        echo -e "${RED}Unknown action: $1${NC}"
        echo ""
        usage
        exit 1
        ;;
esac
