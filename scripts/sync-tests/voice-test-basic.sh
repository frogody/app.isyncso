#!/bin/bash
# voice-test-basic.sh - Basic voice response tests

SUPABASE_URL="https://sfxpmzicgpaxfntqleig.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDY0NjIsImV4cCI6MjA4MjE4MjQ2Mn0.337ohi8A4zu_6Hl1LpcPaWP8UkI5E4Om7ZgeU9_A8t4"

PASSED=0
FAILED=0

test_voice() {
    local message="$1"
    local test_name="$2"
    local voice="${3:-tara}"

    echo "========================================"
    echo "TEST: $test_name"
    echo "INPUT: $message"
    echo "VOICE: $voice"
    echo "----------------------------------------"

    response=$(curl -s -X POST "$SUPABASE_URL/functions/v1/sync-voice" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
        -d "{
            \"message\": \"$message\",
            \"voice\": \"$voice\",
            \"context\": {
                \"userId\": \"test-user\",
                \"companyId\": \"test-company\"
            }
        }")

    # Extract text response
    text=$(echo "$response" | jq -r '.text // .error // "No response"')
    echo "RESPONSE: $text"

    # Check for audio
    audio=$(echo "$response" | jq -r '.audio // empty')
    if [ -n "$audio" ]; then
        audio_size=$(echo "$audio" | wc -c | tr -d ' ')
        echo "AUDIO: [Present - $audio_size bytes]"
    else
        echo "AUDIO: [MISSING - ERROR]"
    fi

    # Validate response quality
    word_count=$(echo "$text" | wc -w | tr -d ' ')
    echo "WORD COUNT: $word_count"

    local issues=""

    if [ "$word_count" -gt 50 ]; then
        issues="$issues [TOO_LONG]"
    fi

    if echo "$text" | grep -q '\*\*\|##\|```'; then
        issues="$issues [HAS_MARKDOWN]"
    fi

    if [ -z "$text" ] || [ "$text" = "No response" ]; then
        issues="$issues [EMPTY_RESPONSE]"
    fi

    if [ -n "$issues" ]; then
        echo "ISSUES:$issues"
        echo "RESULT: FAIL"
        ((FAILED++))
    else
        echo "RESULT: PASS"
        ((PASSED++))
    fi

    echo "========================================"
    echo ""
    sleep 1
}

echo "================================================"
echo "    SYNC VOICE TEST SUITE: BASIC RESPONSES"
echo "    $(date)"
echo "================================================"
echo ""

# Test Suite: Basic Greetings
echo "=== GREETINGS ==="
test_voice "Hi" "Simple Greeting"
test_voice "Hey SYNC" "Named Greeting"
test_voice "Good morning" "Time-based Greeting"
test_voice "What's up?" "Casual Greeting"

# Test Suite: Simple Questions
echo "=== SIMPLE QUESTIONS ==="
test_voice "What can you help me with?" "Capabilities"
test_voice "How much revenue did I make this month?" "Financial Query"
test_voice "Do I have any urgent tasks?" "Task Query"
test_voice "Who am I talking to?" "Identity Question"

# Test Suite: Voice Quality - Different Voices
echo "=== DIFFERENT VOICES ==="
test_voice "Hello there!" "Voice Test Tara" "tara"
test_voice "Hello there!" "Voice Test Leah" "leah"
test_voice "Hello there!" "Voice Test Leo" "leo"
test_voice "Hello there!" "Voice Test Dan" "dan"

echo "================================================"
echo "    RESULTS"
echo "================================================"
echo "PASSED: $PASSED"
echo "FAILED: $FAILED"
echo ""

if [ "$FAILED" -gt 0 ]; then
    echo "OVERALL: FAILING"
    exit 1
else
    echo "OVERALL: PASSING"
    exit 0
fi
