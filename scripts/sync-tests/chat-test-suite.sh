#!/bin/bash
# chat-test-suite.sh - Comprehensive chat testing for SYNC agent

SUPABASE_URL="https://sfxpmzicgpaxfntqleig.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDY0NjIsImV4cCI6MjA4MjE4MjQ2Mn0.337ohi8A4zu_6Hl1LpcPaWP8UkI5E4Om7ZgeU9_A8t4"

SESSION_ID="chat-test-$(date +%s)"
PASSED=0
FAILED=0
SILENT_BUGS=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

test_chat() {
    local message="$1"
    local test_id="$2"
    local test_name="$3"
    local expected_pattern="$4"

    echo "========================================"
    echo "TEST ID: $test_id"
    echo "TEST NAME: $test_name"
    echo "INPUT: $message"
    echo "----------------------------------------"

    # Call the chat endpoint (non-streaming for easier testing)
    response=$(curl -s -X POST "$SUPABASE_URL/functions/v1/sync" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
        -d "{
            \"message\": \"$message\",
            \"sessionId\": \"$SESSION_ID\",
            \"stream\": false,
            \"context\": {
                \"userId\": \"test-user\",
                \"companyId\": \"test-company\"
            }
        }")

    # Extract the response text
    text=$(echo "$response" | jq -r '.response // .text // .error // "NO_RESPONSE"')

    # Truncate for display
    display_text=$(echo "$text" | head -c 500)
    if [ ${#text} -gt 500 ]; then
        display_text="$display_text... [truncated]"
    fi
    echo "RESPONSE: $display_text"

    # Run checks
    local issues=""
    local result="PASS"

    # Check 1: Not empty/silent
    if [ -z "$text" ] || [ "$text" = "NO_RESPONSE" ] || [ ${#text} -lt 5 ]; then
        issues="$issues [SILENT_BUG]"
        result="FAIL"
        ((SILENT_BUGS++))
    fi

    # Check 2: Has follow-up (question or actions block)
    if ! echo "$text" | grep -qE '\?|ACTIONS|anything else|what.*next|should I|want me'; then
        issues="$issues [NO_FOLLOWUP]"
        if [ "$result" != "FAIL" ]; then
            result="WARN"
        fi
    fi

    # Check 3: Expected pattern (if provided)
    if [ -n "$expected_pattern" ]; then
        if ! echo "$text" | grep -qiE "$expected_pattern"; then
            issues="$issues [MISSING_EXPECTED: $expected_pattern]"
            result="FAIL"
        fi
    fi

    # Check 4: Action block present when expected
    if echo "$message" | grep -qiE 'create|show|list|search|find|check|send'; then
        if ! echo "$text" | grep -qE '\[ACTION\]|\[ACTIONS\]|searched|found|created|checking|looking'; then
            issues="$issues [LIKELY_MISSING_ACTION]"
            if [ "$result" != "FAIL" ]; then
                result="WARN"
            fi
        fi
    fi

    # Report result
    case $result in
        "PASS")
            echo -e "RESULT: ${GREEN}PASS${NC}"
            ((PASSED++))
            ;;
        "WARN")
            echo -e "RESULT: ${YELLOW}PASS (with warnings)${NC}"
            echo "WARNINGS:$issues"
            ((PASSED++))
            ;;
        "FAIL")
            echo -e "RESULT: ${RED}FAIL${NC}"
            echo "ISSUES:$issues"
            ((FAILED++))
            ;;
    esac

    echo "========================================"
    echo ""
    sleep 1
}

echo "================================================"
echo "    SYNC CHAT TEST SUITE"
echo "    Session: $SESSION_ID"
echo "    $(date)"
echo "================================================"
echo ""

# Reset session for clean slate
SESSION_ID="chat-test-$(date +%s)"

# =========================================
# SECTION 1: GREETINGS
# =========================================
echo "=== SECTION 1: GREETINGS ==="
test_chat "Hi" "CHAT-001" "Simple Greeting" "help|hi|hello"
test_chat "Hey SYNC, how are you?" "CHAT-002" "Friendly Greeting" ""
test_chat "What can you do?" "CHAT-003" "Capabilities Question" "help|can|invoice|product"

# =========================================
# SECTION 2: PRODUCT SEARCH (Critical)
# =========================================
echo ""
echo "=== SECTION 2: PRODUCT SEARCH (Critical for silent bug) ==="
test_chat "Show me products" "CHAT-010" "Product List Request" ""
test_chat "Search for oneblade" "CHAT-011" "Product Search" ""
test_chat "Do we have any iPhones?" "CHAT-012" "Product Not Found" ""

# =========================================
# SECTION 3: INVOICE CREATION
# =========================================
echo ""
echo "=== SECTION 3: INVOICE CREATION ==="
test_chat "Create an invoice" "CHAT-021" "Incomplete Invoice Request" "who|which|client"
test_chat "For Acme Corp" "CHAT-022" "Follow-up Client" ""
test_chat "10 oneblades" "CHAT-023" "Follow-up Product" ""

# =========================================
# SECTION 4: FINANCIAL QUERIES
# =========================================
echo ""
echo "=== SECTION 4: FINANCIAL QUERIES ==="
test_chat "How's the business doing?" "CHAT-030" "Business Summary" ""
test_chat "What's my revenue this month?" "CHAT-031" "Revenue Query" ""
test_chat "Show me unpaid invoices" "CHAT-032" "Unpaid Invoices" ""

# =========================================
# SECTION 5: CRM/GROWTH
# =========================================
echo ""
echo "=== SECTION 5: CRM/GROWTH ==="
test_chat "Show me my pipeline" "CHAT-042" "Pipeline Stats" ""
test_chat "Add a new lead: Sarah from TechCorp" "CHAT-040" "Create Prospect" ""

# =========================================
# SECTION 6: TASKS
# =========================================
echo ""
echo "=== SECTION 6: TASKS ==="
test_chat "What's on my plate today?" "CHAT-051" "Task List" ""
test_chat "Create a task to follow up with John tomorrow" "CHAT-050" "Create Task" ""
test_chat "Am I behind on anything?" "CHAT-053" "Overdue Check" ""

# =========================================
# SECTION 7: INTEGRATIONS
# =========================================
echo ""
echo "=== SECTION 7: INTEGRATIONS ==="
test_chat "What integrations do I have?" "CHAT-080" "Integration List" ""
test_chat "Check my email" "CHAT-060" "Email Check" ""

# =========================================
# SECTION 8: IMAGE GENERATION
# =========================================
echo ""
echo "=== SECTION 8: IMAGE GENERATION ==="
test_chat "Generate an image" "CHAT-070" "Vague Image Request" "what|which|kind"

# =========================================
# SECTION 9: EDGE CASES
# =========================================
echo ""
echo "=== SECTION 9: EDGE CASES ==="
test_chat "Creaet an invocie" "CHAT-090" "Typo Handling" ""
test_chat "What's the weather like?" "CHAT-093" "Out of Scope" ""

echo ""
echo "================================================"
echo "    FINAL RESULTS"
echo "================================================"
echo "PASSED: $PASSED"
echo "FAILED: $FAILED"
echo "SILENT BUGS: $SILENT_BUGS"
echo ""

if [ "$SILENT_BUGS" -gt 0 ]; then
    echo -e "${RED}CRITICAL: Silent bugs detected!${NC}"
    exit 2
elif [ "$FAILED" -gt 0 ]; then
    echo -e "${RED}OVERALL: FAILING${NC}"
    exit 1
else
    echo -e "${GREEN}OVERALL: PASSING${NC}"
    exit 0
fi
