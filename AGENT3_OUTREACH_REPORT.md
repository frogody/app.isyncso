# Agent 3: Outreach Pipeline Audit Report

**Date:** 2026-02-26
**Scope:** End-to-end outreach pipeline from campaign matching through message generation to delivery
**Files Audited:** 9 components, 2 edge functions, 1 hook

---

## 1. Intelligence Field Pass-Through Audit

### Fields Tracked End-to-End

| Intelligence Field | DB Fetch (OutreachPipeline) | Sent to Edge Fn | Used in LLM Prompt | Verdict |
|---|---|---|---|---|
| `intelligence_score` | YES | YES | YES - in user prompt when >= 70 | **PASS** |
| `best_outreach_angle` | YES | YES | YES - top priority data point, always priority 110 | **PASS** |
| `timing_signals` | YES | YES | YES - ranked by urgency, high-urgency prioritized | **PASS** |
| `outreach_hooks` | YES | YES | YES - used as "PERSONALIZATION ANGLES" | **PASS** |
| `company_pain_points` | YES | YES | YES - mapped to company instability/layoffs/M&A priorities | **PASS** |
| `key_insights` | YES | YES | YES - mapped to career_trajectory/work_history priorities | **PASS** |
| `lateral_opportunities` | YES | YES | YES - included with own priority weight | **PASS** |
| `intelligence_factors` | YES | YES | YES - top 2 factors by weight/score, sorted | **PASS** |
| `recommended_approach` | YES | YES | YES - mapped to nurture/targeted/immediate guide | **PASS** |
| `intelligence_level` | YES | NOT sent | NOT used | **GAP** |
| `role_context` | N/A (campaign field) | YES | YES - selling_points, perfect_fit_criteria, unique_aspects | **PASS** |
| `match_score` | from match object | YES | YES - in user prompt | **PASS** |
| `match_reasons` | from match object | YES | YES - as "MATCH REASONS" data point | **PASS** |
| `match_details` | from match object | YES | NOT used in prompt | **GAP (minor)** |
| `candidate_skills` | YES | YES | YES - first 5 skills in user prompt | **PASS** |

**10 of 12 intelligence fields make it end-to-end.** Two gaps:

1. **`intelligence_level`** (e.g., "Low", "Medium", "High", "Critical") -- Fetched from DB but never sent to the edge function. Low priority since `intelligence_score` (the numeric value) IS passed.

2. **`match_details`** -- Sent to the edge function but never consumed in the prompt template. Minor since `match_reasons` covers the narrative.

### LinkedInOutreachWorkflow Pass-Through

`LinkedInOutreachWorkflow.jsx` passes ALL the same intelligence fields to `generateCampaignOutreach`, mirroring `OutreachPipeline.jsx`. It also passes Phase 2 preferences (message_type, char_limit, data_point_priorities, custom_instructions, tone, language, formality). **Full pass-through confirmed for both code paths.**

### OutreachMessageModal -- CRITICAL GAP

**`OutreachMessageModal.jsx` does NOT use candidate intelligence at all.** Its `generateMessage()` function calls a completely different edge function (`invokeGrok`) with a basic prompt containing only: Name, Company, Title, Location. It does NOT pass intelligence_score, best_outreach_angle, timing_signals, outreach_hooks, company_pain_points, key_insights, or any other intelligence data. Messages generated via the standalone modal produce **generic, non-personalized messages** despite rich intelligence being available.

---

## 2. Channel Formatting Analysis

### Channel Configuration in Edge Function

The edge function defines four message type configurations:

| Channel | Has Subject | Max Subject | Default Max Body | Hook Count | Format Instruction |
|---|---|---|---|---|---|
| `linkedin_connection` | No | 0 | 300 chars | 1 | 2-3 sentences, ONE hook, soft question |
| `linkedin_inmail` | Yes | 200 chars | 1900 chars | 3 | Professional, 2-3 personalization points, clear CTA |
| `linkedin_message` | No | 0 | 8000 chars | 4 | Conversational, reference connection, multiple data points |
| `email` | Yes | 200 chars | 5000 chars | 3 | Professional, structured opening/value/CTA |

### Per-Channel Prompt Differentiation

YES -- the system prompt IS different per channel:
1. System prompt includes `MESSAGE TYPE` and `FORMAT` which varies per channel.
2. Character limit is enforced with channel-specific warnings ("LinkedIn will reject messages over this limit").
3. Subject line inclusion/exclusion is controlled per type.
4. Hook count varies: connection requests use 1, InMails 3, post-connection 4.
5. Extra rules for connection requests: "Keep it to 2-3 sentences max."

### Post-Generation Validation

YES -- there are post-generation validation checks:
1. `truncateToCharLimit()` truncates at sentence boundaries if content exceeds maxChars.
2. Subject is nulled for types without subjects; generated via `generateSmartSubject()` if missing.
3. Subject truncated to maxSubjectChars if too long.

### SMS Channel -- Major Gap

**SMS is partially supported but inconsistently handled.**
- There is NO dedicated `sms` message type config in `MESSAGE_TYPE_CONFIGS`. SMS falls through to the `email` config (5000 chars, has subject line).
- The 160-character SMS limit is NOT enforced.
- `executeTalentOutreach` DOES handle SMS delivery via `sms-send` edge function -- delivery works, generation does not.

### Channel Gaps

| Gap | Severity | Details |
|---|---|---|
| No SMS message type config | **HIGH** | SMS messages generated with email defaults (5000 char limit, subject line) instead of 160-char no-subject format |
| No HTML formatting for email | LOW | Email content is plain text |
| No signature injection | **MEDIUM** | No recruiter signature appended to email messages |
| LinkedIn char limits not real-time validated on client | LOW | Validation is server-side only |

---

## 3. Follow-Up Stage Analysis

### Stage Differentiation in LLM Prompt

| Stage | System Prompt Context | Tone | Urgency |
|---|---|---|---|
| `initial` | "First outreach. Be warm, specific, show research." | genuinely interested | low |
| `follow_up_1` | "Follow-up after no response. Add new value, reference timing signals." | helpful and understanding | medium |
| `follow_up_2` | "Final follow-up. Brief, respectful, leave door open." | professional | low |

### CRITICAL: No Reference to Original Message

When generating follow_up_1 or follow_up_2, the edge function does NOT receive the previously generated initial message. This means:

1. The LLM has NO knowledge of what was said in the initial outreach.
2. It cannot "reference something NEW" because it does not know what was already said.
3. There is NO mechanism to prevent repeating the same hooks, angles, or data points.
4. The follow-up prompt says "Add new value" but the system cannot know what "new" means without the prior message.

The prior messages ARE stored on the client (`match.outreach_messages[stage]`) but are simply never sent to the edge function.

### Timing Logic

Stage delays (0, 3, 5 days) are **purely informational labels in the UI**. There is NO automated scheduling -- tasks are created immediately with status `approved_ready`. The `scheduled_at` field exists but is never auto-populated based on stage delays.

### Repetition Prevention

**There is NO deduplication or repetition prevention.** Without passing prior messages, there is real risk of same hooks, data points, and CTAs being repeated across stages.

---

## 4. End-to-End Data Flow Map

```
PHASE 1: INTELLIGENCE GENERATION
  Nest Purchase -> copy_nest_to_organization RPC -> sync_intel_queue
  -> generateCandidateIntelligence -> writes 10+ fields to candidates table

PHASE 2: CAMPAIGN MATCHING
  CampaignWizard -> campaign with role_context
  -> analyzeCampaignProject -> AI matching -> writes to campaigns.matched_candidates + candidate_campaign_matches

PHASE 3: MESSAGE GENERATION (3 code paths)
  PATH A: OutreachPipeline.jsx (email) -> generateCampaignOutreach with ALL 9 intel fields
  PATH B: LinkedInOutreachWorkflow.jsx (LinkedIn) -> same + Phase 2 preferences
  PATH C: OutreachMessageModal.jsx -> invokeGrok with ONLY name/title/company [BROKEN]

PHASE 4: EDGE FUNCTION PROCESSING
  generateCampaignOutreach -> resolve msg type -> rank data points by priority
  -> build system+user prompt -> Together.ai LLM -> post-validate char limits -> return

PHASE 5: DELIVERY
  outreach_tasks (approved_ready) -> executeTalentOutreach
  -> rate limit check -> LinkedIn via Composio / Email via Gmail / SMS via Twilio
  -> update status + log
```

---

## 5. Issues Found & Code Fixes

### Issue 1: OutreachMessageModal Uses Wrong Edge Function (CRITICAL)

**File:** `src/components/talent/OutreachMessageModal.jsx`

Calls `invokeGrok` with basic prompt instead of `generateCampaignOutreach`. Fix: Replace `generateMessage()` to call the proper edge function with full intelligence payload.

### Issue 2: No SMS Message Type Config (HIGH)

**File:** `supabase/functions/generateCampaignOutreach/index.ts`

Add `sms` entry to `MESSAGE_TYPE_CONFIGS` with `defaultMaxChars: 160`, `hasSubject: false`, `hookCount: 1`. Update message type resolution to map `campaign_type === "sms"` to the `sms` config.

### Issue 3: Follow-Ups Lack Prior Message Context (HIGH)

**Files:** `OutreachPipeline.jsx` + `generateCampaignOutreach/index.ts`

Pass `prior_messages` (previously generated messages for earlier stages) in the request body. Consume them in the prompt with explicit instruction: "Use DIFFERENT hooks, angles, and data points than the messages above."

### Issue 4: intelligence_level Not Forwarded (LOW)

**File:** `OutreachPipeline.jsx`

Add `intelligence_level: candidate.intelligence_level` to the request body.

### Issue 5: OutreachPipeline Missing Phase 2 Preferences (MEDIUM)

**File:** `OutreachPipeline.jsx`

Add `useOutreachPreferences` hook and forward `data_point_priorities`, `custom_instructions`, `tone`, `language`, `formality` to the edge function -- matching what `LinkedInOutreachWorkflow` already does.

### Issue 6: Outreach Task Field Mismatch (MEDIUM)

**File:** `OutreachPipeline.jsx`

`runOutreach()` saves `content` but `executeTalentOutreach` looks for `message_content`. Add `message_content` to the task data to match the execution engine's field lookup chain.

### Issue 7: No Channel Field in OutreachPipeline Tasks (MEDIUM)

**File:** `OutreachPipeline.jsx`

Tasks use `task_type` but execution engine routes by `channel`. Add `channel` field mapped from `campaign.campaign_type`.

---

## 6. Recommendations

### Priority 1 (Fix Now)
1. Fix OutreachMessageModal to use `generateCampaignOutreach` with full intelligence
2. Add prior message context to follow-up generation
3. Add `message_content` and `channel` fields to OutreachPipeline task creation

### Priority 2 (Next Sprint)
4. Add SMS message type config with 160-char limit
5. Forward Phase 2 preferences from OutreachPipeline
6. Add recruiter signature injection for email outreach

### Priority 3 (Enhancement)
7. Client-side character count display
8. Automated follow-up scheduling based on stage delays
9. Deduplication tracking across stages
10. A/B testing framework
11. Email HTML formatting support
12. **Centralize the generation call** into a shared `useOutreachGeneration()` hook -- currently 3 separate code paths duplicate the same intelligence payload assembly, and 1 path is broken entirely

### Architecture Note

The system has **three separate code paths** calling `generateCampaignOutreach` plus one (`OutreachMessageModal`) calling a different function entirely. A shared hook would eliminate this duplication and ensure any future intelligence fields are automatically available everywhere.

---

## Appendix: File Reference

| File | Path | Role |
|---|---|---|
| OutreachPipeline | `src/components/talent/OutreachPipeline.jsx` | Multi-stage pipeline UI (email/multi-channel) |
| LinkedInOutreachWorkflow | `src/components/talent/LinkedInOutreachWorkflow.jsx` | LinkedIn-specific 4-stage workflow |
| OutreachMessageModal | `src/components/talent/OutreachMessageModal.jsx` | Standalone compose/edit modal |
| OutreachPreviewModal | `src/components/talent/OutreachPreviewModal.jsx` | Message preview with approve/edit |
| OutreachQueue | `src/components/talent/OutreachQueue.jsx` | Task queue with bulk operations |
| OutreachCustomizationPanel | `src/components/talent/OutreachCustomizationPanel.jsx` | Phase 2 preferences UI |
| useOutreachPreferences | `src/hooks/useOutreachPreferences.js` | Hook for outreach preferences |
| generateCampaignOutreach | `supabase/functions/generateCampaignOutreach/index.ts` | Edge function: LLM message generation |
| executeTalentOutreach | `supabase/functions/executeTalentOutreach/index.ts` | Edge function: message delivery |
