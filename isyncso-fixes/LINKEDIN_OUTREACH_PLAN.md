# ISYNCSO LinkedIn Outreach Module — Analysis & Implementation Plan

**Date**: 2026-02-09
**Author**: Claude (Cowork Analysis)
**Scope**: LinkedIn outreach with copy-paste workflow, message customization, data point configuration, and stage tracking

---

## Part 1: Current State Analysis

### What Already Exists (Very Comprehensive)

The ISYNCSO codebase already has a **mature outreach system** with 12+ frontend components, 9+ edge functions, and 15+ database tables. Here's the inventory:

#### Frontend Components
| Component | File | Status | Purpose |
|-----------|------|--------|---------|
| OutreachQueue | `src/components/talent/OutreachQueue.jsx` | Complete | Task queue with status filtering, bulk approve/delete |
| OutreachPipeline | `src/components/talent/OutreachPipeline.jsx` | Complete | Multi-stage workflow (Initial → Follow-up 1 → Follow-up 2) |
| OutreachMessageModal | `src/components/talent/OutreachMessageModal.jsx` | Complete | Message composition with AI generation (Email, LinkedIn, Connection Request) |
| OutreachWidget | `src/components/talent/summary-widgets/OutreachWidget.jsx` | Complete | Profile summary showing outreach hooks |
| ReadyForOutreachWidget | `src/components/talent/ReadyForOutreachWidget.jsx` | Complete | Dashboard widget for candidates ready to contact |
| CampaignSequenceEditor | `src/components/campaigns/CampaignSequenceEditor.jsx` | Complete | Drag-and-drop sequence builder with 5 step types |
| CampaignMetricsPanel | `src/components/campaigns/CampaignMetricsPanel.jsx` | Complete | Campaign performance tracking |
| CampaignAnalytics | `src/components/talent/CampaignAnalytics.jsx` | Complete | Full analytics dashboard with funnel, timeline, breakdown |
| LinkedInOutreachRide | `src/components/rides/LinkedInOutreachRide.jsx` | Complete | Standalone LinkedIn message wizard (not campaign-integrated) |
| TalentSMSOutreach | `src/pages/TalentSMSOutreach.jsx` | Complete | SMS conversations page |
| TalentCampaignDetail | `src/pages/TalentCampaignDetail.jsx` | Complete | Main campaign page with 5 tabs (Overview, Settings, Sequence, Outreach, Analytics) |

#### Edge Functions
| Function | Status | Purpose |
|----------|--------|---------|
| generateCampaignOutreach | Complete | AI message generation with stage-specific configs |
| processOutreachScheduler | Complete | Auto follow-up creation (3-day, 7-day intervals) |
| invokeGrok | Complete | LLM wrapper (Together.ai) |
| sms-send | Complete | Twilio SMS delivery |
| sms-webhook | Complete | Twilio delivery/reply tracking |
| sms-ai-respond | Complete | AI-powered SMS responses |
| twilio-numbers | Complete | Organization phone number management |
| execute-flow-node | Complete | Visual flow node execution |
| process-queue | Complete | Async job processing |

#### Database Tables
| Table | Status | Purpose |
|-------|--------|---------|
| outreach_tasks | Complete | Task management with stages, types, scheduling |
| sms_conversations | Complete | SMS conversation tracking |
| candidates | Complete | Rich intelligence + outreach tracking fields |
| campaigns | Complete | Campaign settings including daily_limit, outreach_style |
| candidate_campaign_matches | Complete | Match tracking with scores |
| intelligence_preferences | Complete | Signal weights (M&A: 15, layoffs: 20, promotion gap: 15, etc.) |
| outreach_flows | Complete | Visual flow definitions (React Flow) |
| flow_executions | Complete | Running flow instances |
| node_executions | Complete | Individual node execution logs |
| execution_queue | Complete | Async job management |
| knowledge_documents | Complete | RAG knowledge base with embeddings |
| prospect_intelligence | Complete | Enriched prospect data |
| interaction_memory | Complete | Historical interaction record |
| learned_patterns | Complete | Successful outreach patterns |
| sync_intel_queue | Complete | Enrichment pipeline |

### What's Missing (Gaps for LinkedIn Workflow)

#### Gap 1: LinkedIn Copy-Paste Workflow UI
The current OutreachPipeline generates messages and has a "Run Outreach" button for automated sending. However, LinkedIn doesn't have an API for direct messaging. Users need a **copy-paste workflow**:
- See the prepared message for each candidate
- Click "Copy" to copy message to clipboard
- Click "Open LinkedIn" to open the candidate's LinkedIn profile
- Click "Mark as Sent" after pasting in LinkedIn
- System advances candidate to next stage

#### Gap 2: Message Type Configuration with Character Limits
The OutreachMessageModal supports 3 types (Email, LinkedIn Message, LinkedIn Connection Request) but:
- No configurable character/token limits per type
- No enforcement of LinkedIn's actual limits (connection request: 300 chars, InMail: 1900 chars, message: ~8000 chars)
- No user-settable defaults per campaign

#### Gap 3: Outreach Data Point Configuration UI
The intelligence_preferences table already stores signal weights (M&A: 15, layoffs: 20, etc.) and the generateCandidateIntelligence function uses them for scoring. However:
- No dedicated UI for configuring which data points drive outreach MESSAGE CONTENT (separate from intelligence scoring)
- No way to tell the system "when crafting messages, prioritize mentioning M&A news over career trajectory"
- No outreach-specific customization panel

#### Gap 4: LinkedIn-Specific Message Constraints in Generation
The generateCampaignOutreach edge function uses word limits (150/100/60 words per stage) but doesn't enforce LinkedIn's character limits. Needs:
- Character limit enforcement per message type
- LinkedIn-specific formatting (no subject line for connection requests, shorter messages)
- Message type passed to the generation prompt

#### Gap 5: Stage Tracking for LinkedIn Flow
The existing stage machine (initial → follow_up_1 → follow_up_2 → completed) doesn't account for LinkedIn's unique flow:
- Connection request sent → waiting for acceptance
- Connection accepted → send first message
- First message sent → waiting for reply
- Follow-up stages

---

## Part 2: Implementation Plan

### Architecture Overview

```
┌────────────────────────────────────────────────────────┐
│ Campaign Detail Page (TalentCampaignDetail.jsx)        │
│                                                        │
│  [Overview] [Settings] [Sequence] [Outreach] [Analytics] │
│                                                        │
│  Outreach Tab (Enhanced)                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Mode Toggle: [Queue View] [LinkedIn Workflow]    │  │
│  │                                                  │  │
│  │ LinkedIn Workflow Mode:                          │  │
│  │ ┌──────────────────────────────────────────────┐│  │
│  │ │ Stage: [Connection Request] [First Message]  ││  │
│  │ │                                              ││  │
│  │ │ ┌─────────────────────────────────────────┐ ││  │
│  │ │ │ Candidate Card                          │ ││  │
│  │ │ │ Name: drs. Mark Lensen RA               │ ││  │
│  │ │ │ Score: 53 | Approach: targeted           │ ││  │
│  │ │ │ Status: Ready to Send                   │ ││  │
│  │ │ │                                         │ ││  │
│  │ │ │ Message (287/300 chars):                 │ ││  │
│  │ │ │ ┌─────────────────────────────────────┐ │ ││  │
│  │ │ │ │ Hi Mark, ik zag dat je bij Flynth...│ │ ││  │
│  │ │ │ └─────────────────────────────────────┘ │ ││  │
│  │ │ │                                         │ ││  │
│  │ │ │ [📋 Copy Message] [🔗 Open LinkedIn]   │ ││  │
│  │ │ │ [✅ Mark as Sent] [✏️ Edit] [🔄 Regen]  │ ││  │
│  │ │ └─────────────────────────────────────────┘ ││  │
│  │ │                                              ││  │
│  │ │ ┌─────────────────────────────────────────┐ ││  │
│  │ │ │ Next Candidate Card...                  │ ││  │
│  │ │ └─────────────────────────────────────────┘ ││  │
│  │ └──────────────────────────────────────────────┘│  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  Settings Tab (Enhanced)                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Outreach Customization Section                   │  │
│  │ ┌──────────────────────────────────────────────┐│  │
│  │ │ Message Types & Limits                       ││  │
│  │ │ • Connection Request: [300] chars            ││  │
│  │ │ • InMail: [1900] chars                       ││  │
│  │ │ • Post-Connection Message: [8000] chars      ││  │
│  │ │                                              ││  │
│  │ │ Message Style                                ││  │
│  │ │ • Tone: [Professional ▼]                     ││  │
│  │ │ • Language: [Dutch ▼] [English ▼]            ││  │
│  │ │ • Formality: [◉ Formal ○ Casual ○ Friendly] ││  │
│  │ │                                              ││  │
│  │ │ Data Point Priorities (for messages)         ││  │
│  │ │ • M&A Activity:         [████████░░] 80%    ││  │
│  │ │ • Layoffs/Restructure:  [██████████] 100%   ││  │
│  │ │ • Promotion Gap:        [██████░░░░] 60%    ││  │
│  │ │ • Career Trajectory:    [████░░░░░░] 40%    ││  │
│  │ │ • Company Instability:  [████████░░] 80%    ││  │
│  │ │ • Compensation Gap:     [██████░░░░] 60%    ││  │
│  │ │ • Tenure Anniversary:   [████░░░░░░] 40%    ││  │
│  │ │ • Skill Match:          [██████████] 100%   ││  │
│  │ │                                              ││  │
│  │ │ Custom Instructions                          ││  │
│  │ │ [Always mention our office in Amsterdam...]  ││  │
│  │ └──────────────────────────────────────────────┘│  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

### Phase 1: Outreach Customization Settings (Database + UI)

**Goal**: Let users configure how outreach messages are generated — message type limits, tone, data point priorities, and custom instructions.

#### 1.1 Database: Add outreach_preferences table

```sql
CREATE TABLE outreach_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Message type configuration
  message_types JSONB DEFAULT '{
    "linkedin_connection": {
      "enabled": true,
      "char_limit": 300,
      "label": "Connection Request",
      "description": "Short message sent with LinkedIn connection request",
      "default_tone": "professional",
      "template_instructions": ""
    },
    "linkedin_inmail": {
      "enabled": true,
      "char_limit": 1900,
      "label": "LinkedIn InMail",
      "description": "Direct message to non-connections via InMail",
      "default_tone": "professional",
      "template_instructions": ""
    },
    "linkedin_message": {
      "enabled": true,
      "char_limit": 8000,
      "label": "Post-Connection Message",
      "description": "Message after connection is accepted",
      "default_tone": "friendly",
      "template_instructions": ""
    }
  }',

  -- Message style
  default_tone TEXT DEFAULT 'professional' CHECK (default_tone IN ('professional', 'casual', 'friendly', 'direct')),
  default_language TEXT DEFAULT 'en',
  formality TEXT DEFAULT 'formal' CHECK (formality IN ('formal', 'casual', 'friendly')),

  -- Data point priorities for message content (0-100 slider values)
  data_point_priorities JSONB DEFAULT '{
    "ma_activity": 80,
    "layoffs": 100,
    "promotion_gap": 60,
    "career_trajectory": 40,
    "company_instability": 80,
    "compensation_gap": 60,
    "tenure_anniversary": 40,
    "skill_match": 100,
    "lateral_opportunities": 50,
    "timing_signals": 70
  }',

  -- Custom instructions
  custom_instructions TEXT DEFAULT '',

  -- LinkedIn workflow settings
  linkedin_workflow JSONB DEFAULT '{
    "auto_advance_on_mark_sent": true,
    "show_profile_summary": true,
    "connection_first_strategy": true,
    "follow_up_days": [3, 7],
    "daily_limit": 25
  }',

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(organization_id, campaign_id)
);

-- RLS policies
ALTER TABLE outreach_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_access" ON outreach_preferences
  FOR ALL USING (organization_id = auth_company_id());

-- Org-wide defaults (campaign_id = NULL)
-- Per-campaign overrides (campaign_id set)
```

#### 1.2 Frontend: OutreachCustomizationPanel component

**File**: `src/components/talent/OutreachCustomizationPanel.jsx`

This component renders inside the campaign Settings tab. It contains:

1. **Message Types & Limits Section**
   - Toggle to enable/disable each message type
   - Character limit input per type (with LinkedIn defaults)
   - Template instructions textarea per type

2. **Message Style Section**
   - Tone dropdown (Professional, Casual, Friendly, Direct)
   - Language selector (Dutch, English, German, etc.)
   - Formality radio buttons

3. **Data Point Priorities Section**
   - Slider for each data point (0-100)
   - Presets: "Aggressive" (layoffs/M&A high), "Relationship" (career trajectory high), "Balanced"
   - Explanation tooltip per data point

4. **Custom Instructions Section**
   - Textarea for free-form instructions
   - Examples: "Always mention our Amsterdam office", "Don't mention salary"

5. **LinkedIn Workflow Settings**
   - Auto-advance toggle
   - Daily limit input
   - Follow-up interval config
   - Connection-first strategy toggle

#### 1.3 Hook: useOutreachPreferences

**File**: `src/hooks/useOutreachPreferences.js`

```javascript
// Fetches outreach_preferences for org + optional campaign override
// Falls back to org-wide defaults if no campaign-specific prefs
// Provides save function with optimistic updates
// Merges campaign overrides with org defaults
```

---

### Phase 2: LinkedIn Message Generation Enhancement

**Goal**: Update the generateCampaignOutreach edge function to support LinkedIn-specific message types with character limits and data point prioritization.

#### 2.1 Update generateCampaignOutreach edge function

**File**: `supabase/functions/generateCampaignOutreach/index.ts`

Changes needed:

1. **Accept new parameters**:
   - `message_type`: 'linkedin_connection' | 'linkedin_inmail' | 'linkedin_message' | 'email'
   - `char_limit`: number (from outreach_preferences)
   - `data_point_priorities`: object with priority weights
   - `custom_instructions`: string
   - `tone`: string
   - `language`: string

2. **LinkedIn-specific prompt engineering**:
   - Connection request: "Write a LinkedIn connection request. MAXIMUM {char_limit} characters. No subject line. Must be personal and brief. Reference ONE specific data point."
   - InMail: "Write a LinkedIn InMail. MAXIMUM {char_limit} characters. Include a compelling subject line. Use {tone} tone."
   - Post-connection: "Write a LinkedIn message to a recently accepted connection. MAXIMUM {char_limit} characters. Reference your connection request context."

3. **Data point priority injection**:
   - Sort available data points by priority weight
   - Include top-priority data points in the prompt
   - Example: If layoffs priority is 100 and candidate's company had layoffs, make this the PRIMARY hook

4. **Character limit enforcement**:
   - Post-generation validation
   - If over limit, truncate intelligently (at sentence boundary)
   - Return actual character count in response

5. **Response format update**:
   ```json
   {
     "subject": null,
     "content": "Hi Mark, ...",
     "message_type": "linkedin_connection",
     "char_count": 287,
     "char_limit": 300,
     "stage": "initial",
     "data_points_used": ["ma_activity", "skill_match"],
     "personalization_score": 85,
     "language": "nl"
   }
   ```

---

### Phase 3: LinkedIn Copy-Paste Workflow UI

**Goal**: Build the core LinkedIn outreach workflow — a candidate queue with prepared messages, copy button, LinkedIn button, and stage tracking.

#### 3.1 New Component: LinkedInOutreachWorkflow

**File**: `src/components/talent/LinkedInOutreachWorkflow.jsx`

This is the main LinkedIn outreach view, embedded in the Outreach tab of TalentCampaignDetail.

**Layout**:
- Top: Stage selector tabs (Connection Request | First Message | Follow-up 1 | Follow-up 2)
- Stats bar: X ready | Y sent | Z replied | Daily: N/limit
- Candidate cards in a scrollable list

**Candidate Card Design**:
```
┌─────────────────────────────────────────────────────┐
│ 👤 drs. Mark Lensen RA                    Score: 53 │
│    Senior Accountant at Flynth          📍 Netherlands│
│    Approach: targeted | Timing: Medium urgency       │
│                                                      │
│  📝 Connection Request (287/300 chars)              │
│  ┌─────────────────────────────────────────────────┐│
│  │ Hi Mark, ik zag dat je uitgebreide ervaring     ││
│  │ hebt als Senior Accountant, o.a. bij Deloitte.  ││
│  │ We zoeken iemand met jouw profiel voor een      ││
│  │ interessante rol. Kan ik je meer vertellen?     ││
│  └─────────────────────────────────────────────────┘│
│                                                      │
│  [📋 Copy]  [🔗 LinkedIn]  [✅ Sent]  [✏️ Edit]  [🔄]│
└─────────────────────────────────────────────────────┘
```

**Button Behaviors**:
- **Copy**: Copies message to clipboard, shows toast "Copied! Now paste in LinkedIn"
- **LinkedIn**: Opens candidate's LinkedIn URL in new tab (`window.open(linkedin_url, '_blank')`)
- **Sent**: Marks outreach task as 'sent', advances candidate stage, updates outreach_tasks DB, shows next candidate
- **Edit**: Opens inline editor for the message (within char limit)
- **Regenerate**: Calls generateCampaignOutreach again with same params

**Stage Flow for LinkedIn**:
```
Connection Request Stage:
  → Generate connection request messages for all matched candidates
  → User copies & sends via LinkedIn
  → Mark as Sent → task status = 'sent', stage advances

First Message Stage (after connection accepted):
  → User manually marks connection as accepted OR system shows "pending acceptance"
  → Generate first message for accepted connections
  → User copies & sends via LinkedIn
  → Mark as Sent → task status = 'sent', stage advances

Follow-up 1 Stage (if no reply after X days):
  → Auto-generated follow-up message
  → Same copy-paste workflow

Follow-up 2 Stage (final):
  → Brief, door-open message
  → Same copy-paste workflow
```

#### 3.2 Batch Message Generation

**File**: Enhancement to OutreachPipeline.jsx or new utility

When entering LinkedIn Workflow mode:
1. Fetch all matched candidates without outreach tasks for current stage
2. For each, call generateCampaignOutreach with:
   - message_type from current stage
   - char_limit from outreach_preferences
   - data_point_priorities from outreach_preferences
   - custom_instructions from outreach_preferences
3. Create outreach_task records with status 'approved_ready'
4. Display in the LinkedIn workflow cards

#### 3.3 Update TalentCampaignDetail.jsx

Add a mode toggle to the Outreach tab:
- **Queue View** (existing): Shows OutreachQueue component
- **LinkedIn Workflow** (new): Shows LinkedInOutreachWorkflow component

The toggle should default to "LinkedIn Workflow" when campaign_type is 'linkedin'.

---

### Phase 4: Auto Stage Advancement & Tracking

**Goal**: Automatically advance candidates through stages when actions are taken, with LinkedIn-specific states.

#### 4.1 Enhance outreach_tasks table

```sql
-- Add LinkedIn-specific columns
ALTER TABLE outreach_tasks ADD COLUMN IF NOT EXISTS
  message_type TEXT CHECK (message_type IN (
    'email', 'linkedin_connection', 'linkedin_inmail',
    'linkedin_message', 'sms', 'call'
  ));

ALTER TABLE outreach_tasks ADD COLUMN IF NOT EXISTS
  char_count INTEGER;

ALTER TABLE outreach_tasks ADD COLUMN IF NOT EXISTS
  char_limit INTEGER;

ALTER TABLE outreach_tasks ADD COLUMN IF NOT EXISTS
  data_points_used TEXT[];

ALTER TABLE outreach_tasks ADD COLUMN IF NOT EXISTS
  personalization_score INTEGER;

ALTER TABLE outreach_tasks ADD COLUMN IF NOT EXISTS
  copied_at TIMESTAMPTZ;

ALTER TABLE outreach_tasks ADD COLUMN IF NOT EXISTS
  linkedin_opened_at TIMESTAMPTZ;
```

#### 4.2 LinkedIn Stage Machine

Update the stage progression to support LinkedIn's unique flow:

```
LinkedIn Campaign Stages:
  connection_request_ready    → User prepares connection request
  connection_request_sent     → User marked as sent in LinkedIn
  connection_pending          → Waiting for acceptance (3-14 days typical)
  connection_accepted         → User marks as accepted
  first_message_ready         → System generates first message
  first_message_sent          → User marked as sent
  awaiting_reply              → Waiting for candidate response
  follow_up_1_ready           → After X days, follow-up generated
  follow_up_1_sent            → Follow-up sent
  follow_up_2_ready           → Final follow-up generated
  follow_up_2_sent            → Final follow-up sent
  replied                     → Candidate replied (manual input)
  meeting_scheduled           → Meeting booked
  completed                   → Outreach sequence complete
  declined                    → Candidate declined/not interested
```

#### 4.3 Update trigger function

```sql
CREATE OR REPLACE FUNCTION update_candidate_outreach_on_task_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When task is marked as sent
  IF NEW.status = 'sent' AND (OLD.status IS DISTINCT FROM 'sent') THEN
    UPDATE candidates SET
      outreach_status = 'contacted',
      outreach_stage = NEW.stage,
      last_outreach_at = NOW()
    WHERE id = NEW.candidate_id;
  END IF;

  -- When candidate replies
  IF NEW.status = 'replied' AND (OLD.status IS DISTINCT FROM 'replied') THEN
    UPDATE candidates SET
      outreach_status = 'replied',
      last_outreach_at = NOW()
    WHERE id = NEW.candidate_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### 4.4 "Mark as Sent" API endpoint

When user clicks "Mark as Sent" in the LinkedIn Workflow:

1. Update outreach_task: `status = 'sent'`, `sent_at = NOW()`
2. Trigger fires → updates candidate outreach_status
3. Log in interaction_memory: `interaction_type = 'linkedin_connection_sent'`
4. If auto-advance enabled:
   - Create next-stage task as 'pending' with scheduled_at = NOW() + follow_up_days
   - When follow_up_days passes, processOutreachScheduler generates the message

---

### Phase 5: Integration & Polish

#### 5.1 Campaign Type Enhancement
Update campaign creation to support LinkedIn-specific options:
- Campaign type: "LinkedIn Outreach" (in addition to Email, Cold Call, Multi-Channel)
- Auto-sets outreach preferences to LinkedIn defaults
- Shows LinkedIn Workflow as default Outreach tab view

#### 5.2 Analytics Enhancement
Add LinkedIn-specific metrics to CampaignAnalytics:
- Connection requests sent
- Acceptance rate
- First messages sent
- Reply rate by stage
- Average time to acceptance
- Best performing data points (which hooks got replies)

#### 5.3 Keyboard Shortcuts
For power users doing bulk LinkedIn outreach:
- `C` = Copy message
- `L` = Open LinkedIn
- `S` = Mark as Sent
- `↓` = Next candidate
- `↑` = Previous candidate

---

## Part 3: Implementation Prompts for Claude Code

### Prompt 1: Database Migration + Hook (Phase 1.1 + 1.3)

Create the outreach_preferences table and the useOutreachPreferences hook.

### Prompt 2: OutreachCustomizationPanel (Phase 1.2)

Build the customization UI component with message types, data point sliders, and custom instructions.

### Prompt 3: generateCampaignOutreach Enhancement (Phase 2)

Update the edge function for LinkedIn-specific message generation with character limits and data point priorities.

### Prompt 4: LinkedInOutreachWorkflow Component (Phase 3)

Build the core LinkedIn copy-paste workflow UI with candidate cards, copy/LinkedIn/sent buttons.

### Prompt 5: Stage Tracking & Auto-Advancement (Phase 4)

Database migration for new columns, trigger updates, and stage machine implementation.

### Prompt 6: Integration & Polish (Phase 5)

Campaign type enhancement, analytics, and keyboard shortcuts.

---

## Part 4: Priority & Dependencies

```
Phase 1 (Settings) ←─── No dependencies, can start immediately
   │
   ▼
Phase 2 (Message Gen) ←── Depends on Phase 1 for preferences data
   │
   ▼
Phase 3 (LinkedIn UI) ←── Depends on Phase 2 for message generation
   │
   ▼
Phase 4 (Stage Tracking) ←── Depends on Phase 3 for workflow
   │
   ▼
Phase 5 (Polish) ←── Depends on all above
```

**Estimated effort per phase**:
- Phase 1: 1 session (migration + hook + panel component)
- Phase 2: 1 session (edge function enhancement)
- Phase 3: 1-2 sessions (main workflow UI + batch generation)
- Phase 4: 1 session (DB + triggers + API)
- Phase 5: 1 session (analytics + shortcuts + polish)

**Total: 5-6 Claude Code sessions**

---

## Part 5: Key Design Decisions

### Q1: Where to store outreach preferences?
**Decision**: New `outreach_preferences` table (not extending intelligence_preferences).
**Reason**: Separation of concerns. Intelligence preferences drive SCORING (which candidates to target). Outreach preferences drive MESSAGING (how to write messages). They're different use cases with different users.

### Q2: How to handle "Mark as Sent" without LinkedIn API?
**Decision**: Manual button click by user.
**Reason**: LinkedIn doesn't provide a public API for messaging. The copy-paste workflow is the standard approach used by all LinkedIn outreach tools (Lemlist, Apollo, Expandi). The "Mark as Sent" button is the trigger for stage advancement.

### Q3: Connection Request vs InMail strategy?
**Decision**: Default to connection-first strategy (configurable).
**Reason**: Connection requests have higher acceptance rates and are free. InMails cost LinkedIn credits. Connection request → first message is the standard LinkedIn outreach pattern for recruiters.

### Q4: Character limits - hard or soft?
**Decision**: Hard limits with smart truncation.
**Reason**: LinkedIn will reject messages over the limit. Better to enforce in generation than have users discover the error when pasting.

### Q5: Language detection?
**Decision**: User-configurable per campaign with auto-detect fallback.
**Reason**: Dutch recruiting often uses Dutch messages for Dutch candidates, English for international. The user should control this per campaign, with the AI detecting candidate language from their profile as a fallback.

---

END OF DOCUMENT.