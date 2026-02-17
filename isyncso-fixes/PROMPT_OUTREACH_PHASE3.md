# Claude Code Prompt — Phase 3: LinkedIn Copy-Paste Workflow UI

## Context

Phases 1-2 are deployed and live:
- **Phase 1**: `outreach_preferences` table, `useOutreachPreferences` hook, `OutreachCustomizationPanel` in the "Customize" tab
- **Phase 2**: `generateCampaignOutreach` edge function enhanced with LinkedIn message types, char limits, data point priorities

Phase 3 builds the core LinkedIn outreach workflow UI — the copy-paste interface that recruiters use daily.

The existing codebase has:
- `src/components/talent/OutreachPipeline.jsx` — Multi-stage pipeline for automated outreach
- `src/components/talent/OutreachQueue.jsx` — Task queue with status management
- `src/components/talent/OutreachMessageModal.jsx` — Message composer (supports Email, LinkedIn Message, LinkedIn Connection Request types)
- `src/pages/TalentCampaignDetail.jsx` — Main campaign page with tabs: Overview, Settings, Sequence, Outreach, Customize, Analytics
- `supabase/functions/generateCampaignOutreach/index.ts` — Enhanced message generator (Phase 2, commit 91ed9a2)
- `outreach_tasks` table with: id, campaign_id, candidate_id, status ('pending'|'approved_ready'|'sent'|'completed'|'cancelled'|'replied'|'failed'), stage, task_type, message_content, subject, content, candidate_name, metadata (JSONB), sent_at, completed_at, scheduled_at
- `outreach_preferences` table with: message_types (JSONB), data_point_priorities (JSONB), custom_instructions, linkedin_workflow (JSONB), default_tone, default_language, formality
- `useOutreachPreferences` hook — exports DEFAULT_PREFERENCES, DATA_POINT_LABELS, TONE_OPTIONS, PRESET_CONFIGS
- `candidates` table has `linkedin_url` field, plus intelligence fields: intelligence_score, recommended_approach, outreach_status, outreach_stage, outreach_messages (JSONB), last_outreach_at
- `candidate_campaign_matches` table links candidates to campaigns with match scores

**Phase 2 generateCampaignOutreach response format**:
```json
{
  "subject": null,
  "content": "Hi Mark, als Senior Accountant met...",
  "stage": "initial",
  "generated_at": "2026-02-09T...",
  "intelligence_used": ["best_outreach_angle", "timing_signals", "match_data"],
  "personalization_score": 85,
  "message_type": "linkedin_connection",
  "char_count": 232,
  "char_limit": 300,
  "data_points_used": ["skill_match", "work_history"],
  "language": "nl"
}
```

**Phase 2 generateCampaignOutreach request params (new Phase 2 additions)**:
- `message_type`: 'linkedin_connection' | 'linkedin_inmail' | 'linkedin_message' | 'email'
- `char_limit`: number (from outreach_preferences message_types)
- `data_point_priorities`: Record<string, number> (from outreach_preferences)
- `custom_instructions`: string (from outreach_preferences)
- `tone`: string (from outreach_preferences)
- `language`: string (from outreach_preferences)
- `formality`: string (from outreach_preferences)

**Organization ID**: a4ed7122-51a9-4810-8fc0-731c6d77e29f
**Campaign ID (test)**: c1fcc9a1-16ab-40c2-a85d-7901e8e0f152
**Supabase URL**: https://sfxpmzicgpaxfntqleig.supabase.co

## Task

### Step 1: Create LinkedInOutreachWorkflow component

Create `src/components/talent/LinkedInOutreachWorkflow.jsx`

This is the main LinkedIn outreach view. It replaces the OutreachPipeline when in LinkedIn mode.

**Component Structure**:

```
LinkedInOutreachWorkflow
├── StageSelector (tabs: Connection Request, First Message, Follow-up 1, Follow-up 2)
├── StatsBar (ready count, sent count, replied count, daily progress)
├── ActionBar (Generate All, filters, search)
└── CandidateCardList
    └── LinkedInCandidateCard (for each candidate)
        ├── CandidateInfo (name, title, company, score, approach)
        ├── MessagePreview (editable message with char count)
        └── ActionButtons (Copy, LinkedIn, Mark Sent, Edit, Regenerate)
```

**Props**:
```jsx
{
  campaign: Object,       // Full campaign object
  candidates: Array,      // Matched candidates with intelligence data
  organizationId: String, // From auth context
}
```

**State Management**:
- `activeStage`: 'connection_request' | 'first_message' | 'follow_up_1' | 'follow_up_2'
- `outreachTasks`: Array of tasks fetched from outreach_tasks table
- `generatingIds`: Set of candidate IDs currently being generated
- `dailySentCount`: Number sent today (for daily limit enforcement)
- `searchQuery`: Filter text
- `selectedIds`: Set for bulk operations

**Data Flow**:
1. On mount: Fetch outreach_tasks for this campaign + stage
2. Match tasks to candidates (by candidate_id)
3. Show candidates without tasks as "Ready to Generate"
4. Show candidates with tasks as "Ready to Send" / "Sent" / "Replied"

**Key Functions**:

`generateMessage(candidateId)`:
- Fetch outreach preferences via useOutreachPreferences
- Get message_type from activeStage mapping:
  - connection_request → 'linkedin_connection'
  - first_message → 'linkedin_message'
  - follow_up_1 → 'linkedin_message'
  - follow_up_2 → 'linkedin_message'
- Call generateCampaignOutreach edge function with all preferences
- Create/update outreach_task with status 'approved_ready'

`generateAllMessages()`:
- For all candidates without tasks in current stage
- Generate in batches (batch_size from preferences, default 10)
- Show progress indicator
- Handle rate limits gracefully

`copyMessage(taskId)`:
- Copy task.content to clipboard using navigator.clipboard.writeText()
- Show toast notification: "Message copied! Open LinkedIn to paste"
- Update task: copied_at = NOW()
- Auto-focus the LinkedIn button

`openLinkedIn(candidateLinkedInUrl)`:
- window.open(linkedin_url, '_blank')
- Update task: linkedin_opened_at = NOW()

`markAsSent(taskId)`:
- Update outreach_task: status = 'sent', sent_at = NOW()
- If auto_advance enabled in preferences:
  - If current stage is connection_request → show "Waiting for acceptance" state
  - Otherwise → increment daily sent counter
- Show next candidate card (auto-scroll)
- Toast: "Marked as sent! Next candidate ready."

`markAsAccepted(taskId)`:
- Only for connection_request stage
- Create next-stage task (first_message) as 'pending'
- Toast: "Connection accepted! First message will be generated."

`markAsReplied(taskId)`:
- Update task: status = 'replied'
- Show option to log the reply content
- Remove from active queue

### Step 2: Create LinkedInCandidateCard component

Create `src/components/talent/LinkedInCandidateCard.jsx`

This is a single candidate card in the LinkedIn workflow.

**Design** (use existing talent module styling patterns — Tailwind + shadcn/ui):

```
┌────────────────────────────────────────────────────────────┐
│  👤 drs. Mark Lensen RA                          Score: 53 │
│     Senior Accountant at Flynth                📍 Netherlands│
│     Approach: targeted | Stage: Ready to Send              │
│                                                            │
│  📝 Connection Request                          287/300 ✓  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Hi Mark, als Senior Accountant met Big4-ervaring     │  │
│  │ (Deloitte) pas je precies bij een rol waar we naar   │  │
│  │ zoeken. Kan ik je er meer over vertellen?             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  Data points used: skill_match, work_history               │
│  Personalization: 85/100                                   │
│                                                            │
│  [📋 Copy]  [🔗 LinkedIn]  [✅ Sent]  [✏️ Edit]  [🔄 Regen] │
└────────────────────────────────────────────────────────────┘
```

**States**:
- `no_task`: Show "Generate" button
- `generating`: Show spinner
- `approved_ready`: Show full card with message + action buttons
- `sent`: Show with dimmed styling + "Waiting for reply" or "Mark Accepted" (for connection requests)
- `replied`: Show with green border + reply indicator

**Edit Mode**:
When Edit is clicked:
- Message becomes an editable textarea
- Show live character count with color coding (green = under limit, yellow = close, red = over)
- Show Save and Cancel buttons
- On save: update outreach_task content in DB

**Character Count Display**:
- Green: 0-80% of limit
- Yellow: 80-95% of limit
- Red: 95-100% of limit
- Error state: Over limit (with exact count)

**Button Behaviors**:
- Copy: Copies to clipboard, brief success animation (button turns green with checkmark for 2s)
- LinkedIn: Opens in new tab. If candidate has no linkedin_url, show warning "No LinkedIn URL — search manually"
- Sent: Confirmation dialog "Mark this outreach as sent?", then advances
- Edit: Toggle edit mode
- Regen: Confirmation "Regenerate message? Current message will be lost", then calls generateMessage()

### Step 3: Create StageSelector component

Inline or small subcomponent showing stage tabs:

```jsx
const STAGE_CONFIG = [
  {
    key: 'connection_request',
    label: 'Connection Request',
    message_type: 'linkedin_connection',
    icon: UserPlus,
    description: 'Send connection requests with personalized notes'
  },
  {
    key: 'first_message',
    label: 'First Message',
    message_type: 'linkedin_message',
    icon: MessageSquare,
    description: 'Message candidates who accepted your connection'
  },
  {
    key: 'follow_up_1',
    label: 'Follow-up 1',
    message_type: 'linkedin_message',
    icon: Reply,
    description: 'Follow up with candidates who haven\'t replied'
  },
  {
    key: 'follow_up_2',
    label: 'Follow-up 2',
    message_type: 'linkedin_message',
    icon: ReplyAll,
    description: 'Final follow-up — brief and respectful'
  }
];
```

Each tab shows a badge with the count of candidates in that stage.

### Step 4: Add LinkedIn Workflow mode to TalentCampaignDetail.jsx

In `src/pages/TalentCampaignDetail.jsx`, modify the Outreach tab to include a mode toggle:

```jsx
{activeTab === 'outreach' && (
  <div>
    {/* Mode toggle */}
    <div className="flex items-center gap-2 mb-4">
      <button
        onClick={() => setOutreachMode('queue')}
        className={outreachMode === 'queue' ? 'active' : ''}
      >
        Queue View
      </button>
      <button
        onClick={() => setOutreachMode('linkedin')}
        className={outreachMode === 'linkedin' ? 'active' : ''}
      >
        LinkedIn Workflow
      </button>
    </div>

    {outreachMode === 'queue' && (
      <OutreachQueue campaign={campaign} ... />
    )}

    {outreachMode === 'linkedin' && (
      <LinkedInOutreachWorkflow
        campaign={campaign}
        candidates={matchedCandidates}
        organizationId={organizationId}
      />
    )}
  </div>
)}
```

Default `outreachMode` to 'linkedin' when `campaign.campaign_type === 'linkedin'`.

### Step 5: Add keyboard shortcuts

Inside LinkedInOutreachWorkflow, add keyboard event handlers:

```javascript
useEffect(() => {
  const handler = (e) => {
    // Only when no input/textarea is focused
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const focusedCard = cards[focusedIndex];
    if (!focusedCard) return;

    switch(e.key) {
      case 'c': copyMessage(focusedCard.taskId); break;
      case 'l': openLinkedIn(focusedCard.linkedinUrl); break;
      case 's': markAsSent(focusedCard.taskId); break;
      case 'ArrowDown': setFocusedIndex(i => Math.min(i + 1, cards.length - 1)); break;
      case 'ArrowUp': setFocusedIndex(i => Math.max(i - 1, 0)); break;
      case 'e': toggleEdit(focusedCard.taskId); break;
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [focusedIndex, cards]);
```

Show a small keyboard shortcut hint at the bottom of the workflow view.

### Verification

After building:
1. Navigate to a LinkedIn campaign → Outreach tab
2. Verify mode toggle appears (Queue View / LinkedIn Workflow)
3. Click LinkedIn Workflow
4. Verify stage tabs show (Connection Request, First Message, Follow-up 1, Follow-up 2)
5. Click "Generate All" for connection requests
6. Verify messages appear in candidate cards
7. Verify character counts are correct and color-coded
8. Test Copy button — message should be in clipboard
9. Test LinkedIn button — should open LinkedIn profile (or show warning if no URL)
10. Test Mark as Sent — should update status and show next candidate
11. Test Edit mode — should allow editing with live char count
12. Test Regenerate — should create new message
13. Test keyboard shortcuts (c, l, s, arrows)
14. Verify daily limit enforcement

**IMPORTANT**: Style this component consistent with the existing talent module UI. Use the same card patterns, button styles, colors, and spacing as OutreachPipeline.jsx and OutreachQueue.jsx. Don't introduce new design patterns.

### Step 6: Data fetching implementation details

**Fetching matched candidates for the workflow**:

The workflow needs to combine data from multiple sources. Here's the data flow:

```javascript
// 1. Fetch matched candidates from candidate_campaign_matches
const { data: matches } = await supabase
  .from('candidate_campaign_matches')
  .select(`
    id, candidate_id, match_score, match_reasons, match_details,
    candidates (
      id, full_name, current_title, current_company, linkedin_url,
      location, skills, experience, education,
      intelligence_score, intelligence_level, intelligence_urgency,
      recommended_approach, intelligence_factors, intelligence_timing,
      outreach_status, outreach_stage, last_outreach_at
    )
  `)
  .eq('campaign_id', campaign.id)
  .not('candidates', 'is', null);

// 2. Fetch existing outreach_tasks for this campaign + current stage
const { data: tasks } = await supabase
  .from('outreach_tasks')
  .select('*')
  .eq('campaign_id', campaign.id)
  .eq('stage', activeStageMapping[activeStage]);  // Map UI stage to DB stage

// 3. Merge: candidates + their match data + existing tasks
const mergedCandidates = matches.map(m => ({
  ...m.candidates,
  match_score: m.match_score,
  match_reasons: m.match_reasons,
  match_details: m.match_details,
  outreach_task: tasks?.find(t => t.candidate_id === m.candidate_id) || null
}));
```

**Stage to DB stage mapping**:
```javascript
const STAGE_DB_MAPPING = {
  connection_request: 'initial',      // Maps to outreach_tasks stage
  first_message: 'first_message',
  follow_up_1: 'follow_up_1',
  follow_up_2: 'follow_up_2'
};

const STAGE_MESSAGE_TYPE = {
  connection_request: 'linkedin_connection',
  first_message: 'linkedin_message',
  follow_up_1: 'linkedin_message',
  follow_up_2: 'linkedin_message'
};
```

**Creating outreach tasks after generation**:
```javascript
// After calling generateCampaignOutreach and getting response:
const { data: task } = await supabase
  .from('outreach_tasks')
  .upsert({
    organization_id: organizationId,
    campaign_id: campaign.id,
    candidate_id: candidateId,
    task_type: 'initial_outreach',
    stage: STAGE_DB_MAPPING[activeStage],
    message_content: response.content,
    subject: response.subject,
    content: response.content,
    candidate_name: candidate.full_name,
    status: 'approved_ready',
    metadata: {
      message_type: response.message_type,
      char_count: response.char_count,
      char_limit: response.char_limit,
      data_points_used: response.data_points_used,
      personalization_score: response.personalization_score,
      intelligence_used: response.intelligence_used,
      language: response.language,
      generated_at: response.generated_at
    }
  }, {
    onConflict: 'campaign_id,candidate_id,stage'
  })
  .select()
  .single();
```

**Calling generateCampaignOutreach with outreach preferences**:
```javascript
// Get preferences from hook
const { preferences } = useOutreachPreferences(organizationId, campaign.id);

// Get message type config from preferences
const messageType = STAGE_MESSAGE_TYPE[activeStage];
const typeConfig = preferences.message_types?.[messageType] || {};

// Build the request — MUST include candidate intelligence data
const generateRequest = {
  campaign_id: campaign.id,
  candidate_id: candidate.id,
  organization_id: organizationId,

  // Basic info
  candidate_name: candidate.full_name,
  candidate_title: candidate.current_title,
  candidate_company: candidate.current_company,
  candidate_skills: candidate.skills,

  // Match data
  match_score: candidate.match_score,
  match_reasons: candidate.match_reasons,

  // Intelligence data (crucial for personalization!)
  intelligence_score: candidate.intelligence_score,
  recommended_approach: candidate.recommended_approach,
  intelligence_factors: candidate.intelligence_factors,
  // Note: outreach_hooks, best_outreach_angle, timing_signals, company_pain_points,
  // key_insights, lateral_opportunities come from candidate intelligence
  // They may be stored in candidate.outreach_messages or need to be fetched separately

  // Role context from campaign
  role_title: campaign.role_title || campaign.name,
  company_name: campaign.company_name,
  role_context: campaign.role_context,

  // Stage
  stage: activeStage === 'connection_request' ? 'initial' : activeStage,
  campaign_type: 'linkedin',

  // Phase 2 preferences
  message_type: messageType,
  char_limit: typeConfig.char_limit,
  data_point_priorities: preferences.data_point_priorities,
  custom_instructions: preferences.custom_instructions,
  tone: typeConfig.default_tone || preferences.default_tone,
  language: preferences.default_language,
  formality: preferences.formality
};

const response = await supabase.functions.invoke('generateCampaignOutreach', {
  body: generateRequest
});
```

**IMPORTANT: Intelligence data availability**
The candidate intelligence (outreach_hooks, best_outreach_angle, timing_signals, etc.) may be stored in different places depending on how generateCandidateIntelligence was run. Check:
1. `candidates.outreach_messages` JSONB — may contain generated intel
2. `candidates.intelligence_factors` — array of factor objects
3. `candidates.intelligence_timing` — timing signals
4. The intelligence may need to be regenerated or fetched from a separate intelligence table

Look at how `OutreachPipeline.jsx` and `OutreachWidget.jsx` fetch this data to understand the existing pattern. The key intelligence fields for outreach personalization are: outreach_hooks, best_outreach_angle, timing_signals, company_pain_points, key_insights, lateral_opportunities.

### Step 7: Build verification

```bash
npm run build
```

Ensure no TypeScript/ESLint errors. Fix any import issues.
