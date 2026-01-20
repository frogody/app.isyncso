#!/bin/bash
# voice-conversation-flow.sh - Test multi-turn voice conversations

SUPABASE_URL="https://sfxpmzicgpaxfntqleig.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDY0NjIsImV4cCI6MjA4MjE4MjQ2Mn0.337ohi8A4zu_6Hl1LpcPaWP8UkI5E4Om7ZgeU9_A8t4"

# Generate unique session ID for conversation continuity
SESSION_ID="voice-conv-$(date +%s)"

voice_chat() {
    local message="$1"

    response=$(curl -s -X POST "$SUPABASE_URL/functions/v1/sync-voice" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
        -d "{
            \"message\": \"$message\",
            \"sessionId\": \"$SESSION_ID\",
            \"voice\": \"tara\",
            \"context\": {
                \"userId\": \"test-user\",
                \"companyId\": \"test-company\"
            }
        }")

    echo "$response" | jq -r '.text // .error // "NO_RESPONSE"'
}

echo "================================================"
echo "    CONVERSATIONAL FLOW TEST"
echo "    Session: $SESSION_ID"
echo "    $(date)"
echo "================================================"
echo ""

# =========================================
# FLOW 1: Invoice Creation
# =========================================
echo "=== FLOW 1: Invoice Creation ==="
echo ""

echo "USER: Hi SYNC"
response=$(voice_chat "Hi SYNC")
echo "SYNC: $response"
echo ""
sleep 1

echo "USER: I need to create an invoice"
response=$(voice_chat "I need to create an invoice")
echo "SYNC: $response"
echo ""
sleep 1

echo "USER: For Acme Corporation"
response=$(voice_chat "For Acme Corporation")
echo "SYNC: $response"
echo ""
sleep 1

echo "USER: 10 oneblades"
response=$(voice_chat "10 oneblades")
echo "SYNC: $response"
echo ""
sleep 1

echo "USER: Yes, create it"
response=$(voice_chat "Yes, create it")
echo "SYNC: $response"
echo ""
sleep 1

# =========================================
# FLOW 2: Quick Task
# =========================================
SESSION_ID="voice-conv-$(date +%s)"
echo ""
echo "=== FLOW 2: Quick Task ==="
echo ""

echo "USER: Remind me to call Sarah tomorrow at 3pm"
response=$(voice_chat "Remind me to call Sarah tomorrow at 3pm")
echo "SYNC: $response"
echo ""
sleep 1

# =========================================
# FLOW 3: Financial Check
# =========================================
SESSION_ID="voice-conv-$(date +%s)"
echo ""
echo "=== FLOW 3: Financial Check ==="
echo ""

echo "USER: How are we doing this month?"
response=$(voice_chat "How are we doing this month?")
echo "SYNC: $response"
echo ""
sleep 1

echo "USER: Any unpaid invoices?"
response=$(voice_chat "Any unpaid invoices?")
echo "SYNC: $response"
echo ""
sleep 1

# =========================================
# FLOW 4: Context Memory Test
# =========================================
SESSION_ID="voice-conv-$(date +%s)"
echo ""
echo "=== FLOW 4: Context Memory Test ==="
echo ""

echo "USER: Search for philips products"
response=$(voice_chat "Search for philips products")
echo "SYNC: $response"
echo ""
sleep 1

echo "USER: How much stock do we have?"
response=$(voice_chat "How much stock do we have?")
echo "SYNC: $response"
echo ""
sleep 1

echo "USER: Add 50 more"
response=$(voice_chat "Add 50 more")
echo "SYNC: $response"
echo ""

echo ""
echo "================================================"
echo "    FLOW TESTS COMPLETED"
echo "================================================"
echo ""
echo "Review the conversation above for:"
echo "1. Natural conversational flow"
echo "2. Context maintained across messages"
echo "3. No 'goes silent' issues"
echo "4. Short, voice-appropriate responses"
echo ""
