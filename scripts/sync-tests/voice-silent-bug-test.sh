#!/bin/bash
# voice-silent-bug-test.sh - Test for the "goes silent" bug

SUPABASE_URL="https://sfxpmzicgpaxfntqleig.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDY0NjIsImV4cCI6MjA4MjE4MjQ2Mn0.337ohi8A4zu_6Hl1LpcPaWP8UkI5E4Om7ZgeU9_A8t4"

SILENT_COUNT=0
INCOMPLETE_COUNT=0
PASSED=0

test_for_silence() {
    local message="$1"
    local test_name="$2"

    response=$(curl -s -X POST "$SUPABASE_URL/functions/v1/sync-voice" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
        -d "{
            \"message\": \"$message\",
            \"voice\": \"tara\",
            \"context\": {
                \"userId\": \"test-user\",
                \"companyId\": \"test-company\"
            }
        }")

    text=$(echo "$response" | jq -r '.text // ""')
    error=$(echo "$response" | jq -r '.error // ""')

    echo "----------------------------------------"
    echo "TEST: $test_name"
    echo "INPUT: $message"

    if [ -z "$text" ] && [ -z "$error" ]; then
        echo "RESULT: SILENT BUG - No response at all"
        echo "RAW RESPONSE: $response"
        ((SILENT_COUNT++))
    elif [ -n "$error" ]; then
        echo "RESULT: ERROR - $error"
        ((SILENT_COUNT++))
    elif [ ${#text} -lt 10 ]; then
        echo "RESULT: SUSPICIOUSLY SHORT - '$text'"
        ((SILENT_COUNT++))
    else
        echo "RESPONSE: $text"
        # Check if response ends with engagement
        if echo "$text" | grep -qE '\?$|!$|else|next|help|want|would you|should I'; then
            echo "RESULT: PASS - Has follow-up"
            ((PASSED++))
        else
            echo "RESULT: WARNING - May be incomplete (no follow-up invitation)"
            ((INCOMPLETE_COUNT++))
        fi
    fi
    sleep 1
}

echo "================================================"
echo "    SILENT BUG DETECTION TESTS"
echo "    $(date)"
echo "================================================"
echo ""
echo "Testing scenarios most likely to trigger silence..."
echo ""

# These are the scenarios most likely to trigger silence
test_for_silence "Show me products" "Product List"
test_for_silence "Search for oneblade" "Product Search"
test_for_silence "What integrations do I have?" "Integration List"
test_for_silence "Check my email" "Email Check"
test_for_silence "List my invoices" "Invoice List"
test_for_silence "Get pipeline stats" "Pipeline Stats"
test_for_silence "Show me low stock items" "Low Stock Query"
test_for_silence "Create an invoice" "Incomplete Request"
test_for_silence "Find prospects" "Prospect Search"
test_for_silence "What tasks do I have?" "Task List"
test_for_silence "Show me my calendar" "Calendar Query"
test_for_silence "Search for John" "Contact Search"

echo ""
echo "================================================"
echo "    RESULTS"
echo "================================================"
echo "PASSED: $PASSED"
echo "SILENT BUGS: $SILENT_COUNT"
echo "INCOMPLETE: $INCOMPLETE_COUNT"
echo ""

total_issues=$((SILENT_COUNT + INCOMPLETE_COUNT))
if [ "$SILENT_COUNT" -gt 0 ]; then
    echo "OVERALL: CRITICAL - Silent bugs detected!"
    exit 2
elif [ "$INCOMPLETE_COUNT" -gt 0 ]; then
    echo "OVERALL: WARNING - Some responses may be incomplete"
    exit 1
else
    echo "OVERALL: PASSING"
    exit 0
fi
