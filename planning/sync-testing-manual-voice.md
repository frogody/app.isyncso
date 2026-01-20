# SYNC Voice Testing - Manual (Requires Human)

This plan contains all voice tests that require **your direct involvement** because:
- You need to hear the audio quality
- You need to speak to test speech recognition (future)
- You need to evaluate "human-like" tone subjectively

---

## Prerequisites

1. **Browser**: Chrome with microphone access
2. **URL**: https://app.isyncso.com/SyncAgent (voice mode)
3. **Audio**: Speakers/headphones to hear responses
4. **Time**: ~30 minutes for full test

---

## Part 1: Voice Quality Evaluation

### Test 1.1: Basic Voice Output

**Steps:**
1. Open SYNC in voice mode
2. Say or type: "Hi SYNC"
3. Listen to response

**Evaluate (1-5 scale):**
| Criteria | Score | Notes |
|----------|-------|-------|
| Audio clarity | | |
| Natural intonation | | |
| Appropriate speed | | |
| No artifacts/glitches | | |
| Warm/friendly tone | | |

### Test 1.2: Different Voices

**For each voice, say "Hello, how are you today?"**

| Voice | Clarity | Natural | Speed | Overall |
|-------|---------|---------|-------|---------|
| Tara | | | | |
| Leah | | | | |
| Leo | | | | |
| Dan | | | | |
| Mia | | | | |
| Zac | | | | |

**Best voice for iSyncSO:** _______________

### Test 1.3: Long Response Handling

**Input:** "Give me a summary of all my finances this month"

**Evaluate:**
- [ ] Response was appropriately SHORT (not reading a wall of text)
- [ ] Key info was communicated
- [ ] Didn't cut off mid-sentence
- [ ] Offered follow-up naturally

---

## Part 2: Conversational Flow Tests

### Test 2.1: Invoice Creation Flow

**Have a conversation (speak or type):**

| Turn | You Say | Expected SYNC Response | Actual | Pass? |
|------|---------|------------------------|--------|-------|
| 1 | "I need to create an invoice" | Asks who for | | |
| 2 | "For Acme Corp" | Asks what items | | |
| 3 | "10 oneblades" | Confirms product + asks to proceed | | |
| 4 | "Yes" | Creates + offers to send | | |
| 5 | "Send it to john@acme.com" | Confirms sent | | |

**Flow Issues:**
- [ ] Asked redundant questions
- [ ] Went silent at step: ____
- [ ] Response too long at step: ____
- [ ] Lost context at step: ____

### Test 2.2: Quick Task Creation

**Say:** "Remind me to call Sarah tomorrow at 3pm"

**Expected:** Single response confirming task created with details
**Actual:** _________________________________
**Pass:** [ ] Yes [ ] No

### Test 2.3: Financial Query

**Say:** "How's the business doing?"

**Expected:** Brief summary (revenue, expenses, maybe a tip)
**Actual:** _________________________________
**Pass:** [ ] Yes [ ] No

**Issues:**
- [ ] Too long/detailed for voice
- [ ] Used markdown/formatting
- [ ] Missing key numbers
- [ ] No follow-up offered

---

## Part 3: Human-Like Evaluation

### Test 3.1: Tone & Personality

**For each response, rate if it sounds like a helpful colleague vs. a robot:**

| Prompt | Human-like (1-5) | Notes |
|--------|------------------|-------|
| "Hi" | | |
| "I'm frustrated with unpaid invoices" | | |
| "Great news, we closed a big deal!" | | |
| "I forgot what I was doing" | | |
| "Thanks for your help" | | |

### Test 3.2: Empathy Check

**Say:** "I'm really stressed, I have so many overdue tasks"

**Good response should:**
- [ ] Acknowledge the stress
- [ ] Offer to help prioritize
- [ ] Not be dismissive
- [ ] Not be overly robotic ("I understand you are stressed")

**Rate empathy (1-5):** ___

### Test 3.3: Celebration Check

**Say:** "We just closed a €50,000 deal!"

**Good response should:**
- [ ] Celebrate/congratulate
- [ ] Maybe note the business impact
- [ ] Offer relevant next steps (add to CRM, create invoice)

**Rate enthusiasm (1-5):** ___

---

## Part 4: Error & Edge Cases

### Test 4.1: Misheard/Unclear Input

**Say something slightly unclear or mumbled**

**Expected:** Ask for clarification politely
**Actual:** _________________________________

### Test 4.2: Out of Scope Request

**Say:** "What's the weather like?"

**Expected:** Acknowledge can't help, redirect to what it CAN do
**Actual:** _________________________________
**Graceful?** [ ] Yes [ ] No

### Test 4.3: Interruption Handling

**Start saying something, then interrupt with a different topic**

**Example:** "Create an invoice for— actually, what tasks do I have?"

**Expected:** Handle pivot gracefully
**Actual:** _________________________________

---

## Part 5: Silent Bug Detection (Voice)

### Critical Test Scenarios

**For each, note if SYNC goes silent or gives incomplete response:**

| Prompt | Got Response? | Complete? | Notes |
|--------|---------------|-----------|-------|
| "Show me products" | | | |
| "What integrations do I have?" | | | |
| "Check my email" | | | |
| "List my invoices" | | | |
| "Get pipeline stats" | | | |
| "Search for oneblades" | | | |

**Silent Bug Count:** ___/6

---

## Part 6: Response Length Evaluation

### Voice responses should be SHORT

**For each test, count approximate words:**

| Prompt | Response Words | Too Long? |
|--------|----------------|-----------|
| "Hi" | | >20 is too long |
| "Create an invoice" | | >40 is too long |
| "What's my revenue?" | | >50 is too long |
| "Show me products" | | >40 is too long |
| "Help me with something" | | >30 is too long |

**Average response length:** ___ words
**Target:** <30 words for most responses

---

## Part 7: Contraction & Natural Speech Check

### Voice should use contractions

**Listen for these in responses:**

| Should Say | Shouldn't Say | Heard Correct? |
|------------|---------------|----------------|
| I'm | I am | |
| I'll | I will | |
| you're | you are | |
| let's | let us | |
| don't | do not | |
| can't | cannot | |
| that's | that is | |
| it's | it is | |

**Contraction usage rate:** ___/8

---

## Part 8: Overall Scores

### Summary Evaluation

| Category | Score (1-10) | Priority to Fix |
|----------|--------------|-----------------|
| Audio Quality | | Low/Med/High |
| Response Length | | Low/Med/High |
| Natural Tone | | Low/Med/High |
| Conversational Flow | | Low/Med/High |
| Silent Bug Frequency | | Low/Med/High |
| Empathy/Personality | | Low/Med/High |
| Follow-up Offers | | Low/Med/High |

### Top 3 Issues to Fix

1. ________________________________
2. ________________________________
3. ________________________________

### Top 3 Things Working Well

1. ________________________________
2. ________________________________
3. ________________________________

---

## Recommended Voice System Prompt Changes

Based on your testing, check which changes are needed:

- [ ] Shorter responses (reduce max_tokens)
- [ ] More contractions in prompt examples
- [ ] Better empathy phrases
- [ ] Celebration patterns
- [ ] "Never go silent" enforcement
- [ ] Better error recovery language
- [ ] Simpler vocabulary
- [ ] Remove markdown from voice responses

---

## Test Report Template

```
SYNC Voice Test Report
Date: [DATE]
Tester: [YOUR NAME]

AUDIO QUALITY
- Best Voice: [voice name]
- Audio Score: X/5
- Issues: [any glitches, artifacts]

CONVERSATIONAL QUALITY
- Flow Score: X/5
- Silent Bugs Found: X
- Average Response Length: X words

HUMAN-LIKE EVALUATION
- Tone Score: X/5
- Empathy Score: X/5
- Celebration Score: X/5

CRITICAL ISSUES
1. [issue]
2. [issue]
3. [issue]

RECOMMENDED FIXES
1. [fix]
2. [fix]
3. [fix]

OVERALL VOICE MODE SCORE: X/10
```

---

## Quick Reference: Voice Testing Prompts

Copy these to quickly test:

**Greetings:**
- "Hi SYNC"
- "Good morning"
- "Hey, how's it going?"

**Actions:**
- "Create an invoice for Acme Corp"
- "Show me my tasks"
- "What's running low on stock?"

**Financial:**
- "How's business this month?"
- "Any unpaid invoices?"

**Emotional:**
- "I'm stressed about deadlines"
- "We just closed a huge deal!"
- "Thanks for your help"

**Edge Cases:**
- "What's the weather?"
- "Tell me a joke"
- "I forgot what I was asking"

---

*Run these tests while listening carefully to the voice output. The goal is natural, helpful, human-like conversation that doesn't feel robotic or overwhelming.*
