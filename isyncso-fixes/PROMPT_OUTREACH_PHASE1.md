# Claude Code Prompt — Phase 1: Outreach Customization Settings

## Context

The ISYNCSO Talent Module has an existing outreach system with edge functions, outreach_tasks table, and campaign management. We're building a LinkedIn outreach module. Phase 1 creates the customization settings — a new database table, React hook, and settings UI panel.

The existing system already has:
- `intelligence_preferences` table with signal weights (for intelligence SCORING)
- `useIntelligencePreferences` hook in `src/hooks/`
- Campaign Settings tab in `src/pages/TalentCampaignDetail.jsx`
- `outreach_tasks` table with status/stage/message_type fields
- `generateCampaignOutreach` edge function in `supabase/functions/`

## Task

### Step 1: Create outreach_preferences migration

Create a new Supabase migration file: `supabase/migrations/YYYYMMDDHHMMSS_outreach_preferences.sql`

Use the current timestamp for the filename (check existing migration timestamps to pick the next one).

```sql
-- Outreach Preferences table for message customization
CREATE TABLE IF NOT EXISTS outreach_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
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
      "description": "Direct message to non-connections via InMail credits",
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
    },
    "email": {
      "enabled": true,
      "char_limit": 5000,
      "label": "Email",
      "description": "Direct email outreach",
      "default_tone": "professional",
      "template_instructions": ""
    }
  }'::jsonb,
  
  -- Message style defaults
  default_tone TEXT DEFAULT 'professional' CHECK (default_tone IN ('professional', 'casual', 'friendly', 'direct')),
  default_language TEXT DEFAULT 'en',
  formality TEXT DEFAULT 'formal' CHECK (formality IN ('formal', 'casual', 'friendly')),
  
  -- Data point priorities for message content (0-100 values)
  -- These control WHICH data points the AI prioritizes when crafting messages
  -- Different from intelligence_preferences which controls SCORING weights
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
    "timing_signals": 70,
    "work_history": 60,
    "education_match": 30
  }'::jsonb,
  
  -- Free-form custom instructions for the AI
  custom_instructions TEXT DEFAULT '',
  
  -- LinkedIn workflow settings
  linkedin_workflow JSONB DEFAULT '{
    "auto_advance_on_mark_sent": true,
    "show_profile_summary": true,
    "connection_first_strategy": true,
    "follow_up_days": [3, 7],
    "daily_limit": 25,
    "batch_size": 10
  }'::jsonb,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Org-wide defaults have NULL campaign_id
  -- Per-campaign overrides have campaign_id set
  UNIQUE(organization_id, COALESCE(campaign_id, '00000000-0000-0000-0000-000000000000'::uuid))
);

-- Indexes
CREATE INDEX idx_outreach_prefs_org ON outreach_preferences(organization_id);
CREATE INDEX idx_outreach_prefs_campaign ON outreach_preferences(campaign_id) WHERE campaign_id IS NOT NULL;

-- RLS
ALTER TABLE outreach_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org outreach preferences"
  ON outreach_preferences FOR SELECT
  USING (organization_id = auth_company_id());

CREATE POLICY "Users can insert their org outreach preferences"
  ON outreach_preferences FOR INSERT
  WITH CHECK (organization_id = auth_company_id());

CREATE POLICY "Users can update their org outreach preferences"
  ON outreach_preferences FOR UPDATE
  USING (organization_id = auth_company_id());

CREATE POLICY "Users can delete their org outreach preferences"
  ON outreach_preferences FOR DELETE
  USING (organization_id = auth_company_id());

-- Trigger for updated_at
CREATE TRIGGER outreach_preferences_updated_at
  BEFORE UPDATE ON outreach_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Step 2: Create useOutreachPreferences hook

Create `src/hooks/useOutreachPreferences.js`

Pattern it after the existing `useIntelligencePreferences.js` hook. It should:

1. Accept `organizationId` and optional `campaignId` parameters
2. Fetch outreach_preferences for the campaign (if exists), falling back to org-wide defaults
3. Merge campaign overrides with org defaults (campaign prefs override org prefs where set)
4. Provide `savePreferences(updates)` function that upserts to the table
5. Provide `resetToDefaults()` function
6. Return `{ preferences, loading, error, savePreferences, resetToDefaults }`

The DEFAULT_PREFERENCES constant should match the SQL defaults above.

Also export the DATA_POINT_LABELS constant:
```javascript
export const DATA_POINT_LABELS = {
  ma_activity: { label: 'M&A Activity', description: 'Mergers, acquisitions, or divestitures at the candidate\'s company' },
  layoffs: { label: 'Layoffs / Restructuring', description: 'Recent or upcoming layoffs, downsizing, or organizational changes' },
  promotion_gap: { label: 'Promotion Gap', description: 'Time since last promotion — longer gaps suggest readiness to move' },
  career_trajectory: { label: 'Career Trajectory', description: 'Growth vs plateau patterns in the candidate\'s career' },
  company_instability: { label: 'Company Instability', description: 'Combined signal from M&A, leadership changes, and market position' },
  compensation_gap: { label: 'Compensation Gap', description: 'Estimated gap between current comp and market rate for their role' },
  tenure_anniversary: { label: 'Tenure Anniversary', description: 'Key tenure milestones (2yr, 3yr, 5yr) when people commonly switch' },
  skill_match: { label: 'Skill Match', description: 'Alignment between candidate skills and the role requirements' },
  lateral_opportunities: { label: 'Lateral Opportunities', description: 'Relevant companies or roles the candidate might consider' },
  timing_signals: { label: 'Timing Signals', description: 'Seasonal patterns, budget cycles, or market timing indicators' },
  work_history: { label: 'Work History', description: 'Previous employers, career path, and industry experience' },
  education_match: { label: 'Education Match', description: 'Relevant degrees, certifications, or training' }
};
```

And the TONE_OPTIONS and PRESET_CONFIGS:
```javascript
export const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional', description: 'Formal business tone' },
  { value: 'casual', label: 'Casual', description: 'Relaxed but respectful' },
  { value: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
  { value: 'direct', label: 'Direct', description: 'Straightforward, no fluff' }
];

export const PRESET_CONFIGS = {
  aggressive: {
    label: 'Aggressive',
    description: 'Emphasizes urgency signals like layoffs, M&A, and company instability',
    priorities: { ma_activity: 100, layoffs: 100, company_instability: 100, promotion_gap: 80, timing_signals: 90, career_trajectory: 60, compensation_gap: 70, tenure_anniversary: 50, skill_match: 80, lateral_opportunities: 40, work_history: 30, education_match: 20 }
  },
  relationship: {
    label: 'Relationship Builder',
    description: 'Focuses on career growth, skill match, and mutual value',
    priorities: { skill_match: 100, career_trajectory: 100, work_history: 90, education_match: 70, lateral_opportunities: 80, compensation_gap: 50, timing_signals: 40, promotion_gap: 40, ma_activity: 30, layoffs: 20, company_instability: 20, tenure_anniversary: 30 }
  },
  balanced: {
    label: 'Balanced',
    description: 'Even mix of urgency and relationship signals',
    priorities: { ma_activity: 80, layoffs: 100, promotion_gap: 60, career_trajectory: 40, company_instability: 80, compensation_gap: 60, tenure_anniversary: 40, skill_match: 100, lateral_opportunities: 50, timing_signals: 70, work_history: 60, education_match: 30 }
  }
};
```

### Step 3: Create OutreachCustomizationPanel component

Create `src/components/talent/OutreachCustomizationPanel.jsx`

This component should:
1. Use the `useOutreachPreferences` hook
2. Render inside a card/panel with sections:

**Section 1: Message Types & Limits**
- For each message type in preferences.message_types:
  - Toggle switch (enabled/disabled)
  - Character limit input (number)
  - Default tone selector dropdown
  - Template instructions textarea (collapsible)
- Use the existing shadcn/ui components and Tailwind styling consistent with the rest of the talent module

**Section 2: Message Style**
- Default tone: dropdown with TONE_OPTIONS
- Language: dropdown (English, Dutch, German, French)
- Formality: radio group (Formal, Casual, Friendly)

**Section 3: Data Point Priorities**
- Preset buttons: Aggressive, Relationship, Balanced
- For each data point in DATA_POINT_LABELS:
  - Label with tooltip (description)
  - Slider 0-100 (or styled range input)
  - Current value display
- "Reset to Default" button

**Section 4: Custom Instructions**
- Textarea with placeholder: "e.g., Always mention our Amsterdam office, reference the candidate's most recent role change, don't mention salary..."
- Character count

**Section 5: LinkedIn Workflow Settings**
- Auto-advance on mark sent: toggle
- Connection-first strategy: toggle
- Daily limit: number input
- Follow-up intervals: two number inputs (days)
- Batch size: number input

**Styling**: Follow the existing talent module patterns — use the same card styles, button variants, and color scheme as CampaignSequenceEditor and the Intelligence Preferences components. Use Lucide React icons.

### Step 4: Integrate into TalentCampaignDetail.jsx

In `src/pages/TalentCampaignDetail.jsx`, find the Settings tab content and add the OutreachCustomizationPanel as a new section after the existing campaign settings.

Look for the Settings tab rendering (likely a section with campaign name, type, status, role/project linking) and add:

```jsx
{activeTab === 'settings' && (
  <div>
    {/* Existing campaign settings */}
    ...
    
    {/* NEW: Outreach Customization */}
    <OutreachCustomizationPanel 
      organizationId={campaign.organization_id}
      campaignId={campaign.id}
    />
  </div>
)}
```

### Step 5: Deploy migration

```bash
cd supabase
npx supabase db push
# OR if using migrations:
npx supabase migration up
```

### Verification

After deployment:
1. Check that outreach_preferences table exists with correct schema
2. Navigate to any campaign → Settings tab
3. Verify the OutreachCustomizationPanel renders with all sections
4. Test saving preferences (change a slider, save, reload — should persist)
5. Test preset buttons (clicking Aggressive should update all sliders)
6. Test the character limit inputs for each message type

---

END OF PROMPT. Write this complete content to the file.
