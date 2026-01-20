#!/bin/bash
# voice-quality-check.sh - Check voice response quality metrics

SUPABASE_URL="https://sfxpmzicgpaxfntqleig.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDY0NjIsImV4cCI6MjA4MjE4MjQ2Mn0.337ohi8A4zu_6Hl1LpcPaWP8UkI5E4Om7ZgeU9_A8t4"

PASSED=0
FAILED=0
WARNINGS=0

check_response_quality() {
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

    text=$(echo "$response" | jq -r '.text // "ERROR"')

    # Quality checks
    local issues=""

    # Check length (voice should be short)
    word_count=$(echo "$text" | wc -w | tr -d ' ')
    if [ "$word_count" -gt 40 ]; then
        issues="$issues [TOO_LONG:$word_count]"
    fi

    # Check for markdown
    if echo "$text" | grep -qE '\*\*|##|```|\|'; then
        issues="$issues [HAS_MARKDOWN]"
    fi

    # Check for lists
    if echo "$text" | grep -qE '^\s*[-*]\s|^\s*[0-9]+\.'; then
        issues="$issues [HAS_LIST]"
    fi

    # Check for URLs
    if echo "$text" | grep -qE 'https?://'; then
        issues="$issues [HAS_URL]"
    fi

    # Check for technical jargon
    if echo "$text" | grep -qiE 'json|api|database|function|error code'; then
        issues="$issues [TECHNICAL_JARGON]"
    fi

    # Check ends naturally
    if ! echo "$text" | grep -qE '[.!?]$'; then
        issues="$issues [NO_PUNCTUATION]"
    fi

    # Check for contractions (should use for natural speech)
    if ! echo "$text" | grep -qiE "I'm|I'll|you're|don't|can't|won't|let's|that's|it's"; then
        if [ "$word_count" -gt 15 ]; then
            issues="$issues [NO_CONTRACTIONS]"
            ((WARNINGS++))
        fi
    fi

    # Report
    echo "----------------------------------------"
    echo "TEST: $test_name"
    echo "INPUT: $message"
    echo "RESPONSE: $text"
    echo "WORDS: $word_count"

    if echo "$issues" | grep -qE '\[TOO_LONG|\[HAS_MARKDOWN|\[HAS_LIST|\[HAS_URL|\[TECHNICAL_JARGON'; then
        echo "ISSUES:$issues"
        echo "RESULT: FAIL"
        ((FAILED++))
    elif [ -n "$issues" ]; then
        echo "WARNINGS:$issues"
        echo "RESULT: PASS (with warnings)"
        ((PASSED++))
    else
        echo "RESULT: PASS"
        ((PASSED++))
    fi
    sleep 1
}

echo "================================================"
echo "    VOICE QUALITY CHECKS"
echo "    $(date)"
echo "================================================"

check_response_quality "Hi" "Simple Greeting"
check_response_quality "What's my revenue this month?" "Financial Question"
check_response_quality "Create an invoice for John" "Action Request"
check_response_quality "Show me all my unpaid invoices" "List Request"
check_response_quality "Help me understand the pipeline" "Complex Request"
check_response_quality "What tasks are overdue?" "Task Query"
check_response_quality "Generate an image" "Image Request"
check_response_quality "Send an email to Sarah about the meeting" "Email Request"
check_response_quality "What integrations do I have connected?" "Integration Query"
check_response_quality "Add a new lead named Mike from TechCorp" "CRM Request"

echo "================================================"
echo "    RESULTS"
echo "================================================"
echo "PASSED: $PASSED"
echo "FAILED: $FAILED"
echo "WARNINGS: $WARNINGS"
echo ""

if [ "$FAILED" -gt 0 ]; then
    echo "OVERALL: FAILING"
    exit 1
else
    echo "OVERALL: PASSING"
    exit 0
fi
