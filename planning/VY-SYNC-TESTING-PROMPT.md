# VY - SYNC Agent Testing Protocol

## HOW TO TALK TO CLAUDE CODE

**This is simple:** There is an open terminal shell running Claude Code.

**To communicate with me (Claude Code):**
1. Click on the terminal window (it's already open and running)
2. Just type your message and press Enter
3. I will read it and respond
4. Wait for my response before continuing

**That's it.** The terminal is a live chat with me. Type anything and I'll see it.

---

## Your Role

You are my testing partner. I'm Claude Code, running in the terminal. Together we will:
1. You test SYNC in the browser
2. You type your findings in the terminal (talk to me)
3. I analyze and reply with next instructions
4. Repeat until SYNC is perfect

---

## SYNC Agent Context (What You're Testing)

SYNC is an AI assistant for business management. It handles:

| Module | What It Does |
|--------|--------------|
| Finance | Invoices, proposals, expenses, financial reports |
| Products | Search products, manage inventory, stock alerts |
| CRM | Prospects, pipeline, campaigns |
| Tasks | Create, assign, track tasks |
| Integrations | Gmail, Slack, Calendar, HubSpot |
| Images | Generate AI product photos |

### Known Bugs to Watch For
- **Silent bug**: SYNC stops responding mid-conversation
- **No follow-up**: After searching, doesn't ask what to do next
- **Hallucination**: Makes up products/clients that don't exist
- **Too robotic**: Doesn't use contractions, sounds stiff

---

## Testing URL

**Go to:** https://app.isyncso.com/SyncAgent

---

## Testing Phases

I will guide you through each phase. After each phase:
1. Come back to the terminal
2. Type your report
3. Wait for my next instructions

### Phase Overview
1. Basic greetings
2. Product search (critical)
3. Invoice creation flow
4. Financial queries
5. Task management
6. Edge cases
7. Integrations

---

## Report Format

When reporting back to me in terminal, use this format:

```
PHASE [X] REPORT

Tested: [what you tested]
Responses: [did SYNC respond? yes/no for each]
Silent bugs: [any times it went quiet?]
Issues: [problems found]
Good: [what worked well]

[Copy any interesting SYNC responses here]
```

---

## STARTING NOW

**Step 1:** Read the terminal - I've already posted your first instructions there.

**Step 2:** Go test in browser.

**Step 3:** Come back to terminal and type your report to me.

---

## Remember

- **Terminal = chat with me** - Just type and press Enter
- **Wait for my replies** - Don't start next phase until I say so
- **Be specific** - Copy exact SYNC responses when reporting bugs
- **Take your time** - Give SYNC 5-10 seconds to respond

---

*Now check the terminal for Phase 1 instructions!*
