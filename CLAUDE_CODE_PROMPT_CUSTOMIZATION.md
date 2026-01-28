# Claude Code Prompt: User-Level Panel Customization Feature

## Objective
Add a customization button at the user level that allows users to customize which data fields are displayed in the CandidateDetailDrawer panel.

## Current State
The `CandidateDetailDrawer.jsx` component displays candidate information in multiple tabs:
- **Profile Tab**: Contact info, additional info, experience, education, skills
- **Intelligence Tab**: Flight Risk Score, Outreach Angle, Outreach Hooks, Key Insights, Employer Pain Points, Inferred Skills, Lateral Opportunities, Company Correlations
- **Company Tab**: Company info, tech stack, employee ratings, funding, M&A news
- **Activity Tab**: Candidate activity history

## Requirements

### 1. Create User Preferences Table (Supabase)
Create a new table `user_panel_preferences` with the following schema:

```sql
CREATE TABLE user_panel_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  panel_config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_panel_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own preferences
CREATE POLICY "Users can manage their own preferences" ON user_panel_preferences
  FOR ALL USING (auth.uid() = user_id);
```

### 2. Default Panel Configuration Structure
The `panel_config` JSONB should have this structure:

```json
{
  "profile": {
    "enabled": true,
    "sections": {
      "contact_info": { "enabled": true, "order": 1 },
      "additional_info": { "enabled": true, "order": 2 },
      "experience": { "enabled": true, "order": 3 },
      "education": { "enabled": true, "order": 4 },
      "skills": { "enabled": true, "order": 5 }
    }
  },
  "intelligence": {
    "enabled": true,
    "sections": {
      "flight_risk_score": { "enabled": true, "order": 1 },
      "best_outreach_angle": { "enabled": true, "order": 2 },
      "outreach_hooks": { "enabled": true, "order": 3 },
      "key_insights": { "enabled": true, "order": 4 },
      "employer_pain_points": { "enabled": true, "order": 5 },
      "inferred_skills": { "enabled": true, "order": 6 },
      "lateral_opportunities": { "enabled": true, "order": 7 },
      "company_correlations": { "enabled": true, "order": 8 }
    }
  },
  "company": {
    "enabled": true,
    "sections": {
      "company_info": { "enabled": true, "order": 1 },
      "tech_stack": { "enabled": true, "order": 2 },
      "employee_ratings": { "enabled": true, "order": 3 },
      "funding_info": { "enabled": true, "order": 4 },
      "ma_news": { "enabled": true, "order": 5 }
    }
  },
  "activity": {
    "enabled": true
  }
}
```

### 3. Create Customization Modal Component
Create a new component `src/components/talent/PanelCustomizationModal.jsx`:

```jsx
// Features needed:
// - Modal dialog with sections for each tab
// - Toggle switches for each section (enabled/disabled)
// - Drag-and-drop reordering within each tab (optional, use react-beautiful-dnd or similar)
// - "Reset to Defaults" button
// - "Save" and "Cancel" buttons
// - Preview of changes before saving
```

### 4. Add Customization Button to CandidateDetailDrawer
Add a settings/customize button in the panel header:
- Position: Top-right corner, next to the close (X) button
- Icon: Use Settings or Sliders icon from lucide-react
- On click: Opens the PanelCustomizationModal

```jsx
// In the drawer header, add:
<button
  onClick={() => setShowCustomizationModal(true)}
  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
  title="Customize panel"
>
  <Settings className="w-5 h-5 text-zinc-400" />
</button>
```

### 5. Create Custom Hook for User Preferences
Create `src/hooks/usePanelPreferences.js`:

```javascript
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const DEFAULT_CONFIG = { /* default config structure from above */ };

export const usePanelPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch user preferences
  useEffect(() => {
    if (!user) return;

    const fetchPreferences = async () => {
      const { data, error } = await supabase
        .from('user_panel_preferences')
        .select('panel_config')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        setError(error);
      } else if (data) {
        setPreferences({ ...DEFAULT_CONFIG, ...data.panel_config });
      }
      setLoading(false);
    };

    fetchPreferences();
  }, [user]);

  // Save preferences
  const savePreferences = async (newConfig) => {
    if (!user) return;

    const { error } = await supabase
      .from('user_panel_preferences')
      .upsert({
        user_id: user.id,
        panel_config: newConfig,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) {
      setError(error);
      return false;
    }

    setPreferences(newConfig);
    return true;
  };

  // Reset to defaults
  const resetToDefaults = async () => {
    return savePreferences(DEFAULT_CONFIG);
  };

  return {
    preferences,
    loading,
    error,
    savePreferences,
    resetToDefaults,
    isSectionEnabled: (tab, section) => {
      return preferences[tab]?.sections?.[section]?.enabled ?? true;
    },
    isTabEnabled: (tab) => {
      return preferences[tab]?.enabled ?? true;
    },
    getSectionOrder: (tab) => {
      const sections = preferences[tab]?.sections || {};
      return Object.entries(sections)
        .filter(([_, config]) => config.enabled)
        .sort((a, b) => a[1].order - b[1].order)
        .map(([key]) => key);
    }
  };
};
```

### 6. Update CandidateDetailDrawer to Use Preferences
Modify the existing tabs and sections to conditionally render based on user preferences:

```jsx
// In CandidateDetailDrawer.jsx:
import { usePanelPreferences } from '@/hooks/usePanelPreferences';

// Inside the component:
const {
  preferences,
  isSectionEnabled,
  isTabEnabled,
  getSectionOrder
} = usePanelPreferences();

// Filter tabs based on preferences
const visibleTabs = tabs.filter(tab => isTabEnabled(tab.id));

// In each tab content, conditionally render sections:
// Example for Intelligence tab:
{isSectionEnabled('intelligence', 'flight_risk_score') && (
  <FlightRiskScoreSection candidate={candidate} />
)}

{isSectionEnabled('intelligence', 'inferred_skills') && (
  <InferredSkillsSection candidate={candidate} />
)}
// ... etc
```

### 7. UI Design for Customization Modal

```
┌─────────────────────────────────────────────────────────┐
│  Customize Panel Display                            ✕   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Profile Tab  ────────────────────────── [Toggle ON]    │
│    ├── Contact Information              [✓]             │
│    ├── Additional Information           [✓]             │
│    ├── Experience                       [✓]             │
│    ├── Education                        [✓]             │
│    └── Skills                           [✓]             │
│                                                         │
│  Intelligence Tab  ──────────────────── [Toggle ON]     │
│    ├── Flight Risk Score                [✓]             │
│    ├── Best Outreach Angle              [✓]             │
│    ├── Outreach Hooks                   [✓]             │
│    ├── Key Insights                     [✓]             │
│    ├── Employer Pain Points             [✓]             │
│    ├── Inferred Skills                  [✓]             │
│    ├── Lateral Opportunities            [✓]             │
│    └── Company Correlations             [✓]             │
│                                                         │
│  Company Tab  ───────────────────────── [Toggle ON]     │
│    ├── Company Info                     [✓]             │
│    ├── Tech Stack                       [✓]             │
│    ├── Employee Ratings                 [✓]             │
│    ├── Funding Information              [✓]             │
│    └── M&A News                         [✓]             │
│                                                         │
│  Activity Tab  ──────────────────────── [Toggle ON]     │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [Reset to Defaults]              [Cancel]    [Save]    │
└─────────────────────────────────────────────────────────┘
```

### 8. Files to Create/Modify

**New Files:**
- `src/components/talent/PanelCustomizationModal.jsx` - The modal component
- `src/hooks/usePanelPreferences.js` - Custom hook for preferences
- Database migration for `user_panel_preferences` table

**Files to Modify:**
- `src/components/talent/CandidateDetailDrawer.jsx`:
  - Add Settings button in header
  - Import and use usePanelPreferences hook
  - Conditionally render tabs and sections based on preferences
  - Add state and handler for customization modal

### 9. Additional Considerations

1. **Performance**: Cache preferences in local storage for faster loading
2. **Sync**: Consider real-time sync if user has multiple tabs open
3. **Defaults**: New sections added in future should default to enabled
4. **Migration**: Handle cases where user has old config structure
5. **Loading State**: Show skeleton/loading state while preferences load

### 10. Testing Checklist

- [ ] User can open customization modal from panel
- [ ] Toggling a section off hides it from the panel
- [ ] Toggling a tab off removes it from the tab bar
- [ ] Preferences persist after page refresh
- [ ] Reset to defaults works correctly
- [ ] Different users have independent preferences
- [ ] Works correctly when no preferences exist (uses defaults)
- [ ] Gracefully handles database errors

## Implementation Order

1. Create database table and RLS policies
2. Create usePanelPreferences hook
3. Create PanelCustomizationModal component
4. Add Settings button to CandidateDetailDrawer
5. Update CandidateDetailDrawer to use preferences
6. Test all functionality
7. Add loading states and error handling
