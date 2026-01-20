# SYNC Agent Testing & Improvement Plan

## Executive Summary

This plan provides comprehensive testing and improvement strategies for the SYNC AI agent, focusing on:
1. Chat conversation quality testing
2. Fixing the "goes silent" bug (promises info but doesn't deliver)
3. Human-like conversation improvements
4. Voice mode testing scripts

---

## Part 1: Chat Testing Framework

### 1.1 Known Issues to Test

Based on code audit, the following issues can cause SYNC to "go silent":

| Issue | Root Cause | Test Strategy |
|-------|------------|---------------|
| **Incomplete Action Execution** | Action executes but response not generated | Test action + follow-up combinations |
| **Search-and-Stop** | Shows search results without next steps | Test product/client searches |
| **Promise-No-Deliver** | Says "I'll check" but no action block follows | Test vague requests requiring actions |
| **Long Response Truncation** | Response exceeds token limit, cuts off | Test complex multi-item requests |
| **Error Swallowing** | Exception caught but no user message | Test edge cases with bad data |
| **Action Chaining Gaps** | First action succeeds, second never starts | Test multi-step workflows |

### 1.2 Conversational Quality Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| **Response Completeness** | Did SYNC answer the full question? | 100% |
| **Follow-Up Offered** | Did SYNC offer next steps? | >95% |
| **Confirmation Accuracy** | Did SYNC confirm data correctly? | 100% |
| **Action Execution** | Were promised actions executed? | 100% |
| **Human Tone** | Natural, warm, conversational? | >90% |
| **Response Length** | Appropriate for question? | Context-dependent |

---

## Part 2: Chat Test Cases (100+ Scenarios)

### 2.1 Basic Greeting & Context Tests

```
Test ID: CHAT-001
Category: Greeting
Input: "Hi"
Expected: Warm greeting + offer to help
Check: Response includes greeting AND question about what to help with
Pass Criteria: Natural tone, offers assistance
```

```
Test ID: CHAT-002
Category: Greeting
Input: "Hey SYNC, how are you?"
Expected: Friendly response + transition to business
Check: Acknowledges greeting, pivots to helping
Pass Criteria: Feels human, not robotic
```

```
Test ID: CHAT-003
Category: Context Awareness
Input: "What can you do?"
Expected: Brief overview of capabilities with examples
Check: Lists modules, uses [ACTIONS] for follow-up options
Pass Criteria: Not overwhelming, actionable suggestions
```

```
Test ID: CHAT-004
Category: Context Awareness
Input: "Who am I talking to?"
Expected: Introduction as SYNC + personality traits
Check: Mentions being iSyncSO AI assistant
Pass Criteria: Has personality, not generic
```

### 2.2 Product Search & Inventory Tests (CRITICAL - "Goes Silent" Area)

```
Test ID: CHAT-010
Category: Product Search - Silent Bug
Input: "Show me products"
Expected: MUST execute search + show results + offer actions
Check: [ACTION]{"action":"list_products"...}[/ACTION] present
Check: Results shown in formatted table
Check: [ACTIONS] block with options (add to invoice, check stock, etc.)
Pass Criteria: NEVER ends with just results - MUST offer next step
```

```
Test ID: CHAT-011
Category: Product Search - Silent Bug
Input: "Find oneblade"
Expected: Search + results + "What would you like to do?"
Check: Response ends with question or [ACTIONS]
Pass Criteria: Does NOT just show "Found: Philips OneBlade..."
```

```
Test ID: CHAT-012
Category: Product Search - Not Found
Input: "Do we have any iPhones?"
Expected: Search + "Not found" + offer alternatives
Check: Offers to (1) search differently, (2) add product, (3) list all
Pass Criteria: Helpful fallback, not dead-end
```

```
Test ID: CHAT-013
Category: Product Context Memory
Input: [First] "Find philips products" [Second] "Add 10 to invoice"
Expected: Second message should reference found product
Check: Uses context from search, doesn't ask "which product?"
Pass Criteria: Maintains conversation context
```

```
Test ID: CHAT-014
Category: Inventory Update
Input: "We just got 50 more oneblades in stock"
Expected: Confirm product + update inventory + show new total
Check: [ACTION]{"action":"update_inventory"...}[/ACTION]
Check: Confirmation message with new stock level
Pass Criteria: Proactive action, clear confirmation
```

```
Test ID: CHAT-015
Category: Low Stock Check
Input: "What's running low?"
Expected: Execute get_low_stock + show results + offer reorder
Check: Formatted table of low stock items
Check: Offers to create purchase order or task
Pass Criteria: Actionable response, not just data dump
```

### 2.3 Invoice/Proposal Creation Tests (CRITICAL - Multi-Step)

```
Test ID: CHAT-020
Category: Invoice - Complete Request
Input: "Create an invoice for Acme Corp for 10 oneblades"
Expected: Search product + create invoice + show preview + ask to send
Check: [ACTION]{"action":"search_products"...}[/ACTION]
Check: [ACTION]{"action":"create_invoice"...}[/ACTION]
Check: Invoice preview table with totals
Check: [ACTIONS] with send/edit options
Pass Criteria: Complete workflow, no missing steps
```

```
Test ID: CHAT-021
Category: Invoice - Silent Bug
Input: "Make an invoice"
Expected: Ask "For which client?" - NOT go silent
Check: Response is a question
Pass Criteria: Guides user through flow
```

```
Test ID: CHAT-022
Category: Proposal - Complex
Input: "Create a proposal for John at john@company.com with 55 oneblades and 20 razor blades"
Expected: Search both products + create + calculate totals + offer to send
Check: Both products found and added
Check: BTW (21%) calculated
Check: Total shown correctly
Pass Criteria: Handles multiple items in one request
```

```
Test ID: CHAT-023
Category: Invoice Modification
Input: [After creating] "Actually make it 60 oneblades"
Expected: Update quantity + recalculate + show new totals
Check: Does NOT start over
Check: Shows updated breakdown
Pass Criteria: Graceful modification
```

```
Test ID: CHAT-024
Category: Proposal Conversion
Input: "Convert my last proposal to an invoice"
Expected: Find latest proposal + convert + show invoice
Check: [ACTION]{"action":"convert_proposal_to_invoice"...}[/ACTION]
Pass Criteria: Understands context ("my last")
```

### 2.4 Financial Summary Tests

```
Test ID: CHAT-030
Category: Financial Summary - Silent Bug
Input: "How's the business doing?"
Expected: Get financial summary + formatted output + insights
Check: [ACTION]{"action":"get_financial_summary"...}[/ACTION]
Check: Table with revenue, expenses, net income
Check: At least one insight/tip
Pass Criteria: Complete picture, not raw numbers
```

```
Test ID: CHAT-031
Category: Financial Summary
Input: "What's my revenue this month?"
Expected: Specific revenue figure + context
Check: Shows current month revenue
Check: Compares to previous if available
Pass Criteria: Contextual information
```

```
Test ID: CHAT-032
Category: Unpaid Invoices
Input: "Show me unpaid invoices"
Expected: List + offer to send reminders
Check: [ACTION]{"action":"list_invoices","data":{"status":"sent"}}[/ACTION]
Check: Offers payment reminder action
Pass Criteria: Actionable next steps
```

### 2.5 CRM/Growth Tests

```
Test ID: CHAT-040
Category: Prospect Creation
Input: "Add a new lead: Sarah from TechCorp, sarah@techcorp.io"
Expected: Create prospect + confirm + offer next steps
Check: [ACTION]{"action":"create_prospect"...}[/ACTION]
Check: Offers to add to pipeline, schedule follow-up
Pass Criteria: Complete data capture
```

```
Test ID: CHAT-041
Category: Pipeline Update
Input: "Move Sarah to qualified"
Expected: Find prospect + update stage + confirm
Check: Uses search first if not in context
Check: Confirms new stage
Pass Criteria: Handles ambiguous name
```

```
Test ID: CHAT-042
Category: Pipeline Stats - Silent Bug
Input: "Show me my pipeline"
Expected: Stats + visual breakdown + offer drill-down
Check: [ACTION]{"action":"get_pipeline_stats"...}[/ACTION]
Check: Formatted breakdown by stage
Check: [ACTIONS] for stage details
Pass Criteria: NOT just raw data
```

```
Test ID: CHAT-043
Category: Client Search
Input: "Find that tech company I talked to last week"
Expected: Search prospects + show matches + clarify if needed
Check: Broad search executed
Check: Offers clarification if multiple matches
Pass Criteria: Helpful with vague requests
```

### 2.6 Task Management Tests

```
Test ID: CHAT-050
Category: Task Creation
Input: "Remind me to call Sarah tomorrow at 3pm"
Expected: Create task with due date + confirm
Check: [ACTION]{"action":"create_task"...}[/ACTION]
Check: Due date properly parsed
Pass Criteria: Natural language date parsing
```

```
Test ID: CHAT-051
Category: Task List - Silent Bug
Input: "What's on my plate today?"
Expected: List tasks + offer to complete/update
Check: [ACTION]{"action":"get_my_tasks"...}[/ACTION]
Check: Formatted task list
Check: Quick actions for each task
Pass Criteria: Actionable format
```

```
Test ID: CHAT-052
Category: Task Completion
Input: "Done with the client call task"
Expected: Find + complete + celebrate + ask what's next
Check: Task marked complete
Check: Positive acknowledgment
Check: Offers next task or action
Pass Criteria: Feels like progress
```

```
Test ID: CHAT-053
Category: Overdue Tasks
Input: "Am I behind on anything?"
Expected: Check overdue + show count/list + offer prioritization
Check: [ACTION]{"action":"get_overdue_tasks"...}[/ACTION]
Pass Criteria: Honest but supportive tone
```

### 2.7 Email PA Tests (Composio Integration)

```
Test ID: CHAT-060
Category: Email Check - Silent Bug
Input: "Check my email"
Expected: Fetch inbox + summarize + offer actions
Check: [ACTION]{"action":"check_inbox"...}[/ACTION]
Check: Summary of emails
Check: [ACTIONS] for reply, archive, create task
Pass Criteria: Complete email management flow
```

```
Test ID: CHAT-061
Category: Email Send
Input: "Send an email to john@example.com about the proposal"
Expected: Draft shown + send + confirm
Check: Subject and body generated
Check: Asks for confirmation before sending
Pass Criteria: Shows draft first
```

```
Test ID: CHAT-062
Category: Email Reply
Input: "Reply to Sarah's email and say I'll call tomorrow"
Expected: Find email + draft reply + send
Check: Context from original email
Check: Natural reply tone
Pass Criteria: Contextual response
```

### 2.8 Image Generation Tests

```
Test ID: CHAT-070
Category: Image - Clarification
Input: "Generate an image"
Expected: Ask about purpose/product - NOT silent
Check: Asks what kind of image
Pass Criteria: Guides through requirements
```

```
Test ID: CHAT-071
Category: Image - Product
Input: "Create a product photo of the Philips OneBlade"
Expected: Search product + ask style + show prompt + confirm
Check: Product found first
Check: Style/background questions
Check: Final prompt shown before generation
Pass Criteria: Step-by-step image workflow
```

```
Test ID: CHAT-072
Category: Image - Complete Request
Input: "Generate a white background e-commerce photo of the OneBlade"
Expected: Search + generate + show result + offer variations
Check: [ACTION]{"action":"generate_image","data":{"product_name":"Philips OneBlade"...}}[/ACTION]
Check: Offers angle/style variations
Pass Criteria: Complete without excessive questions
```

### 2.9 Integration Tests

```
Test ID: CHAT-080
Category: Integration Check
Input: "What integrations do I have?"
Expected: List connected apps + offer to connect more
Check: [ACTION]{"action":"composio_list_integrations"...}[/ACTION]
Check: Formatted list of connected apps
Pass Criteria: Clear connection status
```

```
Test ID: CHAT-081
Category: Slack Message
Input: "Send a message to the sales channel that we closed a deal"
Expected: Send + confirm + offer follow-up
Check: [ACTION]{"action":"composio_send_slack_message"...}[/ACTION]
Check: Channel name handled
Pass Criteria: Natural message composition
```

```
Test ID: CHAT-082
Category: Calendar Event
Input: "Schedule a meeting with the team for Friday at 2pm"
Expected: Create event + confirm + show details
Check: [ACTION]{"action":"composio_create_calendar_event"...}[/ACTION]
Check: Proper date/time parsing
Pass Criteria: Event created correctly
```

### 2.10 Edge Cases & Error Recovery

```
Test ID: CHAT-090
Category: Typo Handling
Input: "Creaet an invocie for john"
Expected: Understand intent despite typos
Check: Doesn't fail or ask to rephrase
Pass Criteria: Graceful typo correction
```

```
Test ID: CHAT-091
Category: Invalid Data
Input: "Create an invoice for amount of banana"
Expected: Ask for valid amount - NOT crash
Check: Helpful clarification request
Pass Criteria: Graceful error handling
```

```
Test ID: CHAT-092
Category: Impossible Request
Input: "Delete all my data"
Expected: Clarify/confirm - NOT execute blindly
Check: Warning about destructive action
Pass Criteria: Safety check for destructive actions
```

```
Test ID: CHAT-093
Category: Out of Scope
Input: "What's the weather like?"
Expected: Acknowledge limitation + redirect
Check: Suggests what it CAN help with
Pass Criteria: Not dismissive, offers alternatives
```

```
Test ID: CHAT-094
Category: Long Session Context
Input: [After 20+ exchanges] "What was the first thing I asked?"
Expected: Reference conversation history
Check: Uses session memory
Pass Criteria: Maintains long context
```

### 2.11 Multi-Step Workflow Tests (Critical for "Goes Silent")

```
Test ID: CHAT-100
Category: Complete Workflow - Silent Bug
Input: "Create a proposal for 10 oneblades for Acme Corp and send it to john@acme.com"
Expected: Search + create + SEND - complete the workflow
Check: All 3 steps executed
Check: Confirmation of email sent
Pass Criteria: Does NOT stop after creating proposal
```

```
Test ID: CHAT-101
Category: Chained Actions
Input: "Add a lead and then create a follow-up task for tomorrow"
Expected: Create prospect + create task + confirm both
Check: Both actions executed
Check: Task linked to prospect context
Pass Criteria: Smooth action chaining
```

```
Test ID: CHAT-102
Category: Conditional Flow
Input: "If we have oneblades in stock, create a proposal for 50 for my last client"
Expected: Check stock + create proposal + use last client
Check: Conditional logic handled
Check: Context ("last client") resolved
Pass Criteria: Complex request understood
```

---

## Part 3: Human-Like Conversation Improvements

### 3.1 Current System Prompt Issues

Based on the audit, the system prompt has good rules but execution may fail. Key areas to improve:

| Issue | Current Behavior | Desired Behavior |
|-------|------------------|------------------|
| **Robotic Confirmations** | "I have created invoice #123" | "Done! Invoice ready for John - €5,000 total. Want me to send it?" |
| **No Emotion** | Flat responses | Celebrate wins, empathize with issues |
| **Over-Explaining** | Long action descriptions | Brief, then act |
| **Missing Context** | Ignores previous exchanges | References earlier in conversation |
| **Generic Questions** | "What would you like?" | "Add more items, or ready to send?" |

### 3.2 Recommended System Prompt Additions

```markdown
## HUMAN-LIKE RESPONSE PATTERNS

### Celebrate Successes
- "Nice! That's €X,XXX in the pipeline now!"
- "Done! Your client's going to love this proposal."
- "Sent! Now let's see how fast they pay."

### Show Empathy
- "Ugh, late payments are frustrating. Let me help track those down."
- "That's a lot on your plate - let's tackle it together."
- "I see some overdue tasks - want help prioritizing?"

### Use Conversational Bridges
- "Speaking of which..." (when transitioning)
- "By the way..." (for proactive suggestions)
- "One more thing..." (before finishing)

### Reference the Relationship
- "Last time you asked about X, so..."
- "You usually prefer white backgrounds - same here?"
- "Your usual client Acme Corp?"

### Express Personality
- "Let me dig into that real quick."
- "Ooh, good question - let me check."
- "Here we go!" (before showing results)
```

### 3.3 Response Tone Guidelines

| Context | Tone | Example |
|---------|------|---------|
| Task Complete | Celebratory | "Nice! Invoice sent to John." |
| Error/Issue | Helpful & Calm | "Hmm, that didn't work. Here's what I can do instead..." |
| Waiting for Input | Friendly & Brief | "What's it for?" |
| Showing Data | Informative | "Here's the breakdown..." |
| Offering Options | Inviting | "A few options here..." |
| Clarifying | Curious | "Just to make sure - did you mean...?" |

---

## Part 4: Bug Fix Recommendations

### 4.1 "Goes Silent" Bug Analysis

The bug occurs when SYNC:
1. Executes an action successfully
2. Gets results back
3. Fails to generate a follow-up response

**Root Causes (in order of likelihood):**

1. **Response Truncation** - Token limit hit mid-response
   - Fix: Reduce max_tokens for intermediate responses
   - Monitor: Check for incomplete sentences

2. **Missing Follow-Up in System Prompt** - Rules say "offer next steps" but model doesn't always follow
   - Fix: Add examples showing complete response patterns
   - Add: "NEVER end without a question or [ACTIONS] block"

3. **Streaming Interruption** - SSE stream ends prematurely
   - Fix: Add sentinel token to verify complete response
   - Monitor: Check for `[/ACTIONS]` or `?` at end

4. **Action Result Handling** - Action succeeds but result not incorporated
   - Fix: Ensure action results are always acknowledged
   - Add: Template for "action complete" responses

### 4.2 Specific Fixes for index.ts

```typescript
// Add after line ~1848 (Error Recovery section)

## CRITICAL: NEVER GO SILENT

**After EVERY response, you MUST end with one of these:**

1. A direct question: "Should I create that now?"
2. An [ACTIONS] block with options
3. "Anything else?" or "What's next?"
4. A completion message: "Done! Let me know if you need anything else."

**FORBIDDEN ending patterns:**
❌ "Found: Philips OneBlade at €35.19" (no follow-up)
❌ "Here are your invoices:" followed by just a list
❌ "Processing..." without a result
❌ Any response that just shows data without asking what to do

**If you've shown search results, ALWAYS ask:**
"What would you like to do with [this/these]?"

**If you've completed an action, ALWAYS offer:**
"Want me to [relevant next action]?"
```

### 4.3 Action Execution Wrapper

Add validation that every response is complete:

```typescript
// In index.ts, after generating response
function validateResponse(response: string): string {
  const endsWithQuestion = response.trim().endsWith('?');
  const hasActionsBlock = response.includes('[ACTIONS]') && response.includes('[/ACTIONS]');
  const hasCompletionPhrase = /anything else|what's next|let me know|done!/i.test(response);

  if (!endsWithQuestion && !hasActionsBlock && !hasCompletionPhrase) {
    // Force a follow-up
    return response + "\n\nAnything else I can help with?";
  }
  return response;
}
```

---

## Part 5: Voice Testing Scripts

### 5.1 Voice Testing Prerequisites

```bash
# Required: curl, jq, base64, ffplay (or similar audio player)

# Set up environment
export SUPABASE_URL="https://sfxpmzicgpaxfntqleig.supabase.co"
export SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDY0NjIsImV4cCI6MjA4MjE4MjQ2Mn0.337ohi8A4zu_6Hl1LpcPaWP8UkI5E4Om7ZgeU9_A8t4"
```

### 5.2 Voice Test Script: Basic Responses

```bash
#!/bin/bash
# voice-test-basic.sh

SUPABASE_URL="https://sfxpmzicgpaxfntqleig.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDY0NjIsImV4cCI6MjA4MjE4MjQ2Mn0.337ohi8A4zu_6Hl1LpcPaWP8UkI5E4Om7ZgeU9_A8t4"

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
        echo "AUDIO: [Present - $(echo "$audio" | wc -c) bytes]"
        # Optionally play the audio
        # echo "$audio" | base64 -d > /tmp/test_audio.wav && ffplay -nodisp -autoexit /tmp/test_audio.wav 2>/dev/null
    else
        echo "AUDIO: [MISSING - ERROR]"
    fi

    # Validate response quality
    word_count=$(echo "$text" | wc -w)
    echo "WORD COUNT: $word_count"

    if [ "$word_count" -gt 50 ]; then
        echo "WARNING: Response too long for voice (>50 words)"
    fi

    if echo "$text" | grep -q '\*\*\|##\|```'; then
        echo "WARNING: Contains markdown (not voice-friendly)"
    fi

    echo "========================================"
    echo ""
    sleep 2  # Rate limiting
}

# Test Suite: Basic Greetings
echo "=== VOICE TEST SUITE: BASIC GREETINGS ==="
test_voice "Hi" "Greeting 1"
test_voice "Hey SYNC" "Greeting 2"
test_voice "Good morning" "Greeting 3"
test_voice "What's up?" "Greeting 4"

# Test Suite: Simple Questions
echo "=== VOICE TEST SUITE: SIMPLE QUESTIONS ==="
test_voice "What can you help me with?" "Capabilities"
test_voice "How much revenue did I make this month?" "Financial Query"
test_voice "Do I have any urgent tasks?" "Task Query"

# Test Suite: Voice Quality
echo "=== VOICE TEST SUITE: DIFFERENT VOICES ==="
test_voice "Hello there!" "Voice Test Tara" "tara"
test_voice "Hello there!" "Voice Test Leah" "leah"
test_voice "Hello there!" "Voice Test Leo" "leo"
test_voice "Hello there!" "Voice Test Dan" "dan"
```

### 5.3 Voice Test Script: Conversational Flow

```bash
#!/bin/bash
# voice-test-conversation.sh

SUPABASE_URL="https://sfxpmzicgpaxfntqleig.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Generate unique session ID
SESSION_ID="voice-test-$(date +%s)"

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

    echo "$response" | jq -r '.text'
}

echo "=== CONVERSATIONAL FLOW TEST ==="
echo ""

echo "USER: Hi SYNC"
echo "SYNC: $(voice_chat "Hi SYNC")"
echo ""

echo "USER: Create an invoice"
echo "SYNC: $(voice_chat "Create an invoice")"
echo ""

echo "USER: For Acme Corp"
echo "SYNC: $(voice_chat "For Acme Corp")"
echo ""

echo "USER: 10 oneblades"
echo "SYNC: $(voice_chat "10 oneblades")"
echo ""

echo "USER: Yes, create it"
echo "SYNC: $(voice_chat "Yes, create it")"
echo ""

echo "USER: Send it to john@acme.com"
echo "SYNC: $(voice_chat "Send it to john@acme.com")"
echo ""
```

### 5.4 Voice Test Script: Response Quality Checker

```bash
#!/bin/bash
# voice-quality-check.sh

SUPABASE_URL="https://sfxpmzicgpaxfntqleig.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

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
        issues="$issues [TOO_LONG:$word_count words]"
    fi

    # Check for markdown
    if echo "$text" | grep -qE '\*\*|##|```|\|'; then
        issues="$issues [HAS_MARKDOWN]"
    fi

    # Check for lists
    if echo "$text" | grep -qE '^\s*[-*•]\s|^\s*[0-9]+\.'; then
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
        issues="$issues [NO_ENDING_PUNCTUATION]"
    fi

    # Check for contractions (should use for natural speech)
    if ! echo "$text" | grep -qiE "I'm|I'll|you're|don't|can't|won't|let's"; then
        if [ "$word_count" -gt 10 ]; then
            issues="$issues [NO_CONTRACTIONS]"
        fi
    fi

    # Report
    echo "TEST: $test_name"
    echo "INPUT: $message"
    echo "RESPONSE: $text"
    echo "WORDS: $word_count"
    if [ -n "$issues" ]; then
        echo "ISSUES:$issues"
        echo "RESULT: FAIL"
    else
        echo "RESULT: PASS"
    fi
    echo "---"
}

echo "=== VOICE QUALITY CHECKS ==="
echo ""

check_response_quality "Hi" "Simple Greeting"
check_response_quality "What's my revenue this month?" "Financial Question"
check_response_quality "Create an invoice for John" "Action Request"
check_response_quality "Show me all my unpaid invoices" "List Request"
check_response_quality "Help me understand the pipeline" "Complex Request"
check_response_quality "What tasks are overdue?" "Task Query"
check_response_quality "Generate an image" "Image Request"
```

### 5.5 Voice Test Script: Silent Bug Detection

```bash
#!/bin/bash
# voice-silent-bug-test.sh

SUPABASE_URL="https://sfxpmzicgpaxfntqleig.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

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

    echo "TEST: $test_name"
    echo "INPUT: $message"

    if [ -z "$text" ] && [ -z "$error" ]; then
        echo "RESULT: SILENT BUG DETECTED - No response at all"
        echo "RAW: $response"
    elif [ -n "$error" ]; then
        echo "RESULT: ERROR - $error"
    elif [ ${#text} -lt 10 ]; then
        echo "RESULT: SUSPICIOUSLY SHORT - '$text'"
    else
        echo "RESPONSE: $text"
        # Check if response ends with engagement
        if echo "$text" | grep -qE '\?$|!$|else|next|help'; then
            echo "RESULT: PASS - Has follow-up"
        else
            echo "RESULT: WARNING - May be incomplete (no follow-up)"
        fi
    fi
    echo "---"
    sleep 2
}

echo "=== SILENT BUG DETECTION TESTS ==="
echo ""

# These are the scenarios most likely to trigger silence
test_for_silence "Show me products" "Product List (Known Issue)"
test_for_silence "Search for oneblade" "Product Search (Known Issue)"
test_for_silence "What integrations do I have?" "Integration List"
test_for_silence "Check my email" "Email Check"
test_for_silence "List my invoices" "Invoice List"
test_for_silence "Get pipeline stats" "Pipeline Stats"
test_for_silence "Show me low stock items" "Low Stock Query"
test_for_silence "Create an invoice" "Incomplete Request"
```

### 5.6 Automated Test Runner

```bash
#!/bin/bash
# run-all-voice-tests.sh

echo "================================================"
echo "    SYNC VOICE TEST SUITE"
echo "    $(date)"
echo "================================================"
echo ""

# Track results
PASSED=0
FAILED=0
WARNINGS=0

run_test() {
    local script="$1"
    echo "Running: $script"
    if bash "$script" 2>&1; then
        ((PASSED++))
    else
        ((FAILED++))
    fi
    echo ""
}

# Run all test scripts
run_test "voice-test-basic.sh"
run_test "voice-test-conversation.sh"
run_test "voice-quality-check.sh"
run_test "voice-silent-bug-test.sh"

echo "================================================"
echo "    TEST SUMMARY"
echo "================================================"
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo "Warnings: $WARNINGS"
echo ""

if [ "$FAILED" -gt 0 ]; then
    echo "OVERALL: FAILING"
    exit 1
else
    echo "OVERALL: PASSING"
    exit 0
fi
```

---

## Part 6: Implementation Checklist

### 6.1 Immediate Actions (Fix Silent Bug)

- [ ] Add "NEVER GO SILENT" section to system prompt
- [ ] Add response validation wrapper in index.ts
- [ ] Deploy and test with CHAT-010 through CHAT-015
- [ ] Monitor logs for incomplete responses

### 6.2 Short-Term Improvements (Conversation Quality)

- [ ] Add human-like response patterns to system prompt
- [ ] Implement conversation celebration/empathy phrases
- [ ] Add contextual memory usage examples
- [ ] Deploy voice tests and fix any failures

### 6.3 Medium-Term Enhancements

- [ ] Build automated test suite runner
- [ ] Add response quality monitoring dashboard
- [ ] Implement A/B testing for prompt variations
- [ ] Create user feedback collection mechanism

### 6.4 Test Coverage Goals

| Category | Test Cases | Priority |
|----------|-----------|----------|
| Basic Greeting | 10 | High |
| Product Search | 15 | Critical |
| Invoice/Proposal | 20 | Critical |
| Financial Summary | 10 | High |
| CRM/Growth | 15 | Medium |
| Tasks | 10 | Medium |
| Email PA | 10 | High |
| Image Generation | 10 | Medium |
| Edge Cases | 20 | High |

---

## Part 7: Metrics & Monitoring

### 7.1 Key Performance Indicators

| KPI | Target | Measurement |
|-----|--------|-------------|
| Response Completion Rate | >99% | Responses ending with ? or [ACTIONS] |
| Action Execution Rate | >98% | Actions promised vs. executed |
| Voice Response Length | <40 words | Average word count |
| User Satisfaction | >4.5/5 | Post-conversation rating |
| Silent Bug Incidents | 0/day | Responses <10 chars |

### 7.2 Logging Additions

```typescript
// Add to sync/index.ts
const logResponseMetrics = (response: string, sessionId: string) => {
  const metrics = {
    sessionId,
    timestamp: new Date().toISOString(),
    wordCount: response.split(' ').length,
    hasQuestion: response.trim().endsWith('?'),
    hasActions: response.includes('[ACTIONS]'),
    hasActionBlock: response.includes('[ACTION]'),
    responseLength: response.length,
    endsWithEngagement: /\?$|else|next|help/i.test(response.trim())
  };

  console.log('SYNC_METRICS:', JSON.stringify(metrics));

  // Alert on potential silent bug
  if (metrics.wordCount < 5 && !metrics.hasQuestion) {
    console.error('SILENT_BUG_ALERT:', sessionId, response);
  }
};
```

---

## Appendix A: Complete Test Case Index

| ID | Category | Description |
|----|----------|-------------|
| CHAT-001 | Greeting | Simple "Hi" |
| CHAT-002 | Greeting | "How are you?" |
| CHAT-003 | Context | "What can you do?" |
| CHAT-004 | Context | "Who am I talking to?" |
| CHAT-010 | Product Search | "Show me products" |
| CHAT-011 | Product Search | "Find oneblade" |
| CHAT-012 | Product Search | Not found handling |
| CHAT-013 | Product Context | Memory across messages |
| CHAT-014 | Inventory | Stock update |
| CHAT-015 | Inventory | Low stock check |
| CHAT-020 | Invoice | Complete request |
| CHAT-021 | Invoice | Incomplete request |
| CHAT-022 | Proposal | Multiple items |
| CHAT-023 | Invoice | Modification |
| CHAT-024 | Proposal | Conversion |
| CHAT-030 | Financial | Summary request |
| CHAT-031 | Financial | Specific metric |
| CHAT-032 | Financial | Unpaid invoices |
| CHAT-040 | CRM | Create prospect |
| CHAT-041 | CRM | Pipeline update |
| CHAT-042 | CRM | Pipeline stats |
| CHAT-043 | CRM | Vague search |
| CHAT-050 | Tasks | Create with date |
| CHAT-051 | Tasks | List my tasks |
| CHAT-052 | Tasks | Complete task |
| CHAT-053 | Tasks | Overdue check |
| CHAT-060 | Email | Check inbox |
| CHAT-061 | Email | Send email |
| CHAT-062 | Email | Reply to email |
| CHAT-070 | Image | Vague request |
| CHAT-071 | Image | Product photo |
| CHAT-072 | Image | Complete request |
| CHAT-080 | Integration | List connections |
| CHAT-081 | Integration | Slack message |
| CHAT-082 | Integration | Calendar event |
| CHAT-090 | Edge Case | Typo handling |
| CHAT-091 | Edge Case | Invalid data |
| CHAT-092 | Edge Case | Destructive action |
| CHAT-093 | Edge Case | Out of scope |
| CHAT-094 | Edge Case | Long session |
| CHAT-100 | Workflow | Complete multi-step |
| CHAT-101 | Workflow | Chained actions |
| CHAT-102 | Workflow | Conditional flow |

---

## Appendix B: Voice-Specific Rules

The voice system prompt (`sync-voice/index.ts`) should enforce:

```markdown
CRITICAL VOICE RULES:
1. MAX 40 WORDS per response
2. NO markdown formatting (no **, ##, ```, |)
3. NO bullet points or numbered lists
4. NO URLs or code snippets
5. USE contractions (I'm, you're, let's, don't)
6. ALWAYS end with clear next step or question
7. SPEAK naturally - as if talking to a friend
8. AVOID technical jargon unless user used it first
9. ACKNOWLEDGE what user said before responding
10. BE WARM - use phrases like "Sure!", "Got it!", "Great idea!"
```

---

*Document Version: 1.0*
*Created: January 2026*
*Author: Claude Code*
