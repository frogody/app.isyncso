# Claude Code Prompt — Phase 4 & 5: Stage Tracking + Integration

## Context

Phases 1-3 created outreach customization settings, enhanced message generation, and built the LinkedIn copy-paste workflow UI. Phase 4 adds LinkedIn-specific stage tracking and auto-advancement. Phase 5 integrates everything and adds polish.

## Phase 4: Stage Tracking & Auto-Advancement

### Step 1: Database migration for LinkedIn stage tracking

Create a new migration: `supabase/migrations/YYYYMMDDHHMMSS_linkedin_stage_tracking.sql`

```sql
-- Add LinkedIn-specific columns to outreach_tasks
ALTER TABLE outreach_tasks ADD COLUMN IF NOT EXISTS message_type TEXT;
ALTER TABLE outreach_tasks ADD COLUMN IF NOT EXISTS char_count INTEGER;
ALTER TABLE outreach_tasks ADD COLUMN IF NOT EXISTS char_limit INTEGER;
ALTER TABLE outreach_tasks ADD COLUMN IF NOT EXISTS data_points_used TEXT[];
ALTER TABLE outreach_tasks ADD COLUMN IF NOT EXISTS personalization_score INTEGER;
ALTER TABLE outreach_tasks ADD COLUMN IF NOT EXISTS copied_at TIMESTAMPTZ;
ALTER TABLE outreach_tasks ADD COLUMN IF NOT EXISTS linkedin_opened_at TIMESTAMPTZ;
ALTER TABLE outreach_tasks ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

-- Add check constraint for message_type
ALTER TABLE outreach_tasks DROP CONSTRAINT IF EXISTS outreach_tasks_message_type_check;
ALTER TABLE outreach_tasks ADD CONSTRAINT outreach_tasks_message_type_check
  CHECK (message_type IS NULL OR message_type IN (
    'email', 'linkedin_connection', 'linkedin_inmail',
    'linkedin_message', 'sms', 'call'
  ));

-- Expand the stage values to include LinkedIn-specific stages
-- First drop the old constraint if it exists
ALTER TABLE outreach_tasks DROP CONSTRAINT IF EXISTS outreach_tasks_stage_check;
ALTER TABLE outreach_tasks ADD CONSTRAINT outreach_tasks_stage_check
  CHECK (stage IS NULL OR stage IN (
    -- Original stages
    'initial', 'first_message', 'follow_up_1', 'follow_up_2',
    'no_reply', 'connected', 'awaiting_reply', 'completed',
    -- LinkedIn-specific stages
    'connection_request', 'connection_pending', 'connection_accepted',
    'linkedin_first_message', 'linkedin_follow_up_1', 'linkedin_follow_up_2',
    'meeting_scheduled', 'declined'
  ));

-- Add LinkedIn-specific tracking to candidates
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS linkedin_connection_status TEXT DEFAULT 'none'
  CHECK (linkedin_connection_status IN ('none', 'request_sent', 'pending', 'accepted', 'declined'));
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS linkedin_connection_sent_at TIMESTAMPTZ;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS linkedin_connection_accepted_at TIMESTAMPTZ;

-- Update the trigger function to handle LinkedIn stages
CREATE OR REPLACE FUNCTION update_candidate_outreach_on_task_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When a LinkedIn connection request is sent
  IF NEW.message_type = 'linkedin_connection' AND NEW.status = 'sent'
     AND (OLD.status IS DISTINCT FROM 'sent') THEN
    UPDATE candidates SET
      outreach_status = 'contacted',
      outreach_stage = 'connection_request',
      linkedin_connection_status = 'request_sent',
      linkedin_connection_sent_at = NOW(),
      last_outreach_at = NOW()
    WHERE id = NEW.candidate_id;

  -- When any other task is sent
  ELSIF NEW.status = 'sent' AND (OLD.status IS DISTINCT FROM 'sent') THEN
    UPDATE candidates SET
      outreach_status = 'contacted',
      outreach_stage = COALESCE(NEW.stage, 'initial'),
      last_outreach_at = NOW()
    WHERE id = NEW.candidate_id;
  END IF;

  -- When candidate replies (any message type)
  IF NEW.status = 'replied' AND (OLD.status IS DISTINCT FROM 'replied') THEN
    UPDATE candidates SET
      outreach_status = 'replied',
      last_outreach_at = NOW()
    WHERE id = NEW.candidate_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Index for LinkedIn-specific queries
CREATE INDEX IF NOT EXISTS idx_outreach_tasks_message_type ON outreach_tasks(message_type);
CREATE INDEX IF NOT EXISTS idx_candidates_linkedin_status ON candidates(linkedin_connection_status);

-- Add a function to advance LinkedIn stage
CREATE OR REPLACE FUNCTION advance_linkedin_stage(
  p_candidate_id UUID,
  p_campaign_id UUID,
  p_current_stage TEXT
) RETURNS TEXT AS $$
DECLARE
  v_next_stage TEXT;
BEGIN
  v_next_stage := CASE p_current_stage
    WHEN 'connection_request' THEN 'connection_pending'
    WHEN 'connection_pending' THEN 'connection_accepted'
    WHEN 'connection_accepted' THEN 'linkedin_first_message'
    WHEN 'linkedin_first_message' THEN 'linkedin_follow_up_1'
    WHEN 'linkedin_follow_up_1' THEN 'linkedin_follow_up_2'
    WHEN 'linkedin_follow_up_2' THEN 'completed'
    ELSE 'completed'
  END;

  RETURN v_next_stage;
END;
$$ LANGUAGE plpgsql;
```

### Step 2: Create markLinkedInAction API utility

Create `src/utils/linkedinOutreachActions.js`

```javascript
// Utility functions for LinkedIn outreach workflow actions

import { supabase } from '../api/supabaseClient';

/**
 * Mark a LinkedIn outreach task as having its message copied
 */
export async function markCopied(taskId) {
  const { error } = await supabase
    .from('outreach_tasks')
    .update({ copied_at: new Date().toISOString() })
    .eq('id', taskId);

  if (error) throw error;
  return true;
}

/**
 * Mark that the LinkedIn profile was opened
 */
export async function markLinkedInOpened(taskId) {
  const { error } = await supabase
    .from('outreach_tasks')
    .update({ linkedin_opened_at: new Date().toISOString() })
    .eq('id', taskId);

  if (error) throw error;
  return true;
}

/**
 * Mark outreach as sent — updates task + triggers candidate stage update
 */
export async function markAsSent(taskId) {
  const { data, error } = await supabase
    .from('outreach_tasks')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString()
    })
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;

  // Log in interaction_memory if table exists
  try {
    await supabase.from('interaction_memory').insert({
      workspace_id: data.organization_id,
      prospect_id: data.candidate_id,
      interaction_type: data.message_type === 'linkedin_connection'
        ? 'linkedin_connection_sent'
        : 'linkedin_message_sent',
      channel: 'linkedin',
      content: { subject: data.subject, message: data.content },
      outcome: 'pending',
      summary: `${data.message_type} sent to candidate`
    });
  } catch (e) {
    console.warn('Could not log to interaction_memory:', e);
  }

  return data;
}

/**
 * Mark LinkedIn connection as accepted — enables first message stage
 */
export async function markConnectionAccepted(candidateId, campaignId) {
  // Update candidate LinkedIn status
  const { error: candError } = await supabase
    .from('candidates')
    .update({
      linkedin_connection_status: 'accepted',
      linkedin_connection_accepted_at: new Date().toISOString()
    })
    .eq('id', candidateId);

  if (candError) throw candError;

  // Create a pending first_message task
  const { data: existingTask } = await supabase
    .from('outreach_tasks')
    .select('id')
    .eq('candidate_id', candidateId)
    .eq('campaign_id', campaignId)
    .eq('stage', 'linkedin_first_message')
    .maybeSingle();

  if (!existingTask) {
    const { error: taskError } = await supabase
      .from('outreach_tasks')
      .insert({
        candidate_id: candidateId,
        campaign_id: campaignId,
        organization_id: (await supabase.from('campaigns').select('organization_id').eq('id', campaignId).single()).data.organization_id,
        stage: 'linkedin_first_message',
        message_type: 'linkedin_message',
        status: 'pending',
        task_type: 'initial_outreach'
      });

    if (taskError) throw taskError;
  }

  // Log interaction
  try {
    await supabase.from('interaction_memory').insert({
      prospect_id: candidateId,
      interaction_type: 'linkedin_connection_accepted',
      channel: 'linkedin',
      outcome: 'positive'
    });
  } catch (e) {
    console.warn('Could not log to interaction_memory:', e);
  }

  return true;
}

/**
 * Mark candidate as replied
 */
export async function markAsReplied(taskId, replyContent = '') {
  const { data, error } = await supabase
    .from('outreach_tasks')
    .update({
      status: 'replied',
      completed_at: new Date().toISOString(),
      metadata: { reply_content: replyContent, replied_at: new Date().toISOString() }
    })
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get daily sent count for rate limiting
 */
export async function getDailySentCount(organizationId, campaignId = null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let query = supabase
    .from('outreach_tasks')
    .select('id', { count: 'exact' })
    .eq('organization_id', organizationId)
    .eq('status', 'sent')
    .gte('sent_at', today.toISOString())
    .in('message_type', ['linkedin_connection', 'linkedin_inmail', 'linkedin_message']);

  if (campaignId) {
    query = query.eq('campaign_id', campaignId);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}
```

### Step 3: Deploy migration

```bash
cd supabase
npx supabase db push
```

---

## Phase 5: Integration & Polish

### Step 1: Update Campaign Creation

In the campaign creation flow (find the create campaign form/modal), add "LinkedIn Outreach" as a campaign type option:

```javascript
const CAMPAIGN_TYPES = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'linkedin', label: 'LinkedIn Outreach', icon: Linkedin },
  { value: 'cold_call', label: 'Cold Call', icon: Phone },
  { value: 'multi_channel', label: 'Multi-Channel', icon: Layers },
];
```

When campaign_type is 'linkedin':
- Default outreach_preferences to LinkedIn settings (connection-first strategy)
- Show LinkedIn Workflow as default Outreach tab view
- Pre-populate sequence with LinkedIn steps

### Step 2: Enhance CampaignAnalytics for LinkedIn

In `src/components/talent/CampaignAnalytics.jsx`, add LinkedIn-specific metrics:

Add a new section or enhance existing metrics to show:
- Connection requests sent (count of tasks with message_type='linkedin_connection' and status='sent')
- Acceptance rate (accepted / sent * 100)
- First messages sent
- Reply rate by stage
- Average time to acceptance (avg of linkedin_connection_accepted_at - linkedin_connection_sent_at)
- Best performing data points (aggregate data_points_used from tasks with status='replied')
- Daily activity chart (sent per day over last 30 days)

Query pattern:
```javascript
// Fetch LinkedIn outreach stats
const { data: linkedinStats } = await supabase
  .from('outreach_tasks')
  .select('message_type, status, stage, sent_at, data_points_used, personalization_score')
  .eq('campaign_id', campaignId)
  .in('message_type', ['linkedin_connection', 'linkedin_inmail', 'linkedin_message']);
```

### Step 3: Add LinkedIn URL validation to candidate matching

In the matching pipeline (or in the LinkedInOutreachWorkflow), flag candidates without linkedin_url:
- Show a warning icon on candidates without LinkedIn URLs
- Provide a "Search LinkedIn" button that opens LinkedIn search with the candidate's name and company
- URL pattern: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(name + ' ' + company)}`

### Step 4: Quick-action integration in CandidateDetailDrawer

In `src/components/talent/CandidateDetailDrawer.jsx`, add a LinkedIn outreach quick-action:
- If candidate has pending outreach task: show "View Outreach" link to campaign outreach tab
- If candidate has no outreach: show "Create LinkedIn Message" button
- Show outreach history: list of all outreach_tasks for this candidate with status/date

### Step 5: Final verification checklist

Run through this complete flow:
1. Create a new campaign with type "LinkedIn Outreach"
2. Go to Settings → verify OutreachCustomizationPanel loads
3. Configure: Connection request limit 300 chars, Dutch language, Balanced preset
4. Go to Outreach → verify LinkedIn Workflow mode is default
5. Click "Generate All" for Connection Request stage
6. Verify messages are generated under 300 chars, in Dutch
7. Click Copy on first candidate → verify clipboard
8. Click LinkedIn → verify profile opens in new tab
9. Click Mark as Sent → verify task updates, candidate stage advances
10. Switch to "First Message" stage → candidate should show as "Pending Acceptance"
11. Mark connection as accepted → verify first message task created
12. Generate first message → verify longer format, references connection
13. Check Analytics → verify LinkedIn-specific metrics show
14. Check keyboard shortcuts (c, l, s, arrows)

---

END OF PROMPT.