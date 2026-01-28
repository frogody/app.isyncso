# ME-4: Weighted Matching Criteria UI - Implementation Plan

## Overview
**Objective**: Allow recruiters to customize match criteria weights when creating campaigns, enabling tailored candidate matching based on role priorities.

**Current State**:
- CampaignWizard has 4 steps: Select Project → Select Role → Define Role Context → Review
- `analyzeCampaignProject` uses hardcoded weights: skills(25%), experience(20%), title(15%), location(10%), timing(20%), culture(10%)
- Slider component exists in `/src/components/ui/slider.jsx` (Radix-based)
- Match factors: `skills_fit`, `experience_fit`, `title_fit`, `location_fit`, `timing_score`, `culture_fit`

**Target State**:
- New wizard step 3.5: "Customize Matching Weights"
- Interactive sliders with real-time total validation
- Quick preset templates (Balanced, Skills-First, Urgency-First, Timing-First)
- Custom weights stored per campaign and used by matching algorithm

**Effort**: 2 weeks across 3 phases

---

## Phase 1: Create CriteriaWeightingStep Component

### Objective
Create a new `CriteriaWeightingStep` component with interactive weight sliders, validation, and preset templates.

### Claude Code Prompt

```
# Create CriteriaWeightingStep Component for Campaign Wizard

## Context
Building ME-4: Weighted Matching Criteria UI for the ISYNCSO Talent System. We need a new wizard step component that allows recruiters to customize how candidates are scored.

## File to Create
`/src/components/talent/campaign/CriteriaWeightingStep.jsx`

## Design Requirements

### Component Structure
```javascript
import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
  Award, Briefcase, Target, MapPin, Clock, Users,
  Sparkles, RotateCcw, CheckCircle2, AlertCircle
} from 'lucide-react';

// Match factor configuration
const MATCH_FACTORS = [
  {
    key: "skills_fit",
    label: "Skills Match",
    icon: Award,
    color: "blue",
    description: "Technical & domain expertise alignment with role requirements"
  },
  {
    key: "experience_fit",
    label: "Experience Level",
    icon: Briefcase,
    color: "purple",
    description: "Years of experience and seniority level fit"
  },
  {
    key: "title_fit",
    label: "Title Alignment",
    icon: Target,
    color: "cyan",
    description: "Current role title relevance to target position"
  },
  {
    key: "location_fit",
    label: "Location",
    icon: MapPin,
    color: "emerald",
    description: "Geographic proximity or remote work compatibility"
  },
  {
    key: "timing_score",
    label: "Flight Risk / Timing",
    icon: Clock,
    color: "amber",
    description: "Likelihood candidate will change jobs soon (high = ready to move)"
  },
  {
    key: "culture_fit",
    label: "Culture Fit",
    icon: Users,
    color: "rose",
    description: "Company background and values alignment"
  }
];

// Preset weight templates
const PRESETS = {
  balanced: {
    name: "Balanced",
    description: "Equal emphasis across all factors",
    weights: { skills_fit: 20, experience_fit: 20, title_fit: 15, location_fit: 10, timing_score: 20, culture_fit: 15 }
  },
  skills_first: {
    name: "Skills First",
    description: "Prioritize technical qualifications",
    weights: { skills_fit: 40, experience_fit: 25, title_fit: 15, location_fit: 5, timing_score: 10, culture_fit: 5 }
  },
  urgency_first: {
    name: "Urgency First",
    description: "Target candidates ready to move now",
    weights: { skills_fit: 15, experience_fit: 15, title_fit: 10, location_fit: 5, timing_score: 40, culture_fit: 15 }
  },
  culture_focus: {
    name: "Culture Focus",
    description: "Emphasize team and values fit",
    weights: { skills_fit: 20, experience_fit: 15, title_fit: 10, location_fit: 10, timing_score: 15, culture_fit: 30 }
  }
};

const DEFAULT_WEIGHTS = PRESETS.balanced.weights;
```

### Component Props
```javascript
CriteriaWeightingStep.propTypes = {
  weights: PropTypes.shape({
    skills_fit: PropTypes.number,
    experience_fit: PropTypes.number,
    title_fit: PropTypes.number,
    location_fit: PropTypes.number,
    timing_score: PropTypes.number,
    culture_fit: PropTypes.number,
  }),
  onChange: PropTypes.func.isRequired, // Callback when weights change
  onPresetApply: PropTypes.func,       // Optional callback when preset applied
};
```

### Visual Design

1. **Header Section**:
   - Title: "Customize Matching Weights"
   - Subtitle: "Adjust how we prioritize different factors when scoring candidates"
   - Sparkles icon in purple

2. **Total Weight Indicator** (always visible):
   - Circular progress or linear bar showing total percentage
   - Green when exactly 100%, amber when not
   - Text: "Total: XX%" with validation message

3. **Weight Sliders** (6 sliders in a card grid):
   - Each slider in its own card with:
     - Icon (color-coded)
     - Factor label
     - Current percentage value (bold, right-aligned)
     - Slider (0-50 range, step of 5)
     - Description text (muted, small)
   - Hover effect on cards

4. **Preset Buttons** (bottom section):
   - 4 preset buttons in a 2x2 grid
   - Each shows preset name
   - Highlight currently active preset (if weights match)
   - "Reset to Default" button

### Slider Behavior
- Range: 0 to 50 (individual max)
- Step: 5% increments
- Total MUST equal 100%
- When adjusting one slider, don't auto-adjust others (user controls all)
- Show warning if total ≠ 100%

### Animation Requirements
- Fade in cards with stagger effect (0.05s delay per card)
- Smooth slider thumb movement
- Total indicator color transition on validation change
- Preset button subtle scale on hover

### Code Structure
```javascript
const CriteriaWeightingStep = ({ weights = DEFAULT_WEIGHTS, onChange, onPresetApply }) => {
  const [localWeights, setLocalWeights] = useState(weights);

  const totalWeight = useMemo(() =>
    Object.values(localWeights).reduce((sum, w) => sum + w, 0),
    [localWeights]
  );

  const isValid = totalWeight === 100;

  const activePreset = useMemo(() => {
    return Object.entries(PRESETS).find(([key, preset]) =>
      Object.entries(preset.weights).every(([k, v]) => localWeights[k] === v)
    )?.[0] || null;
  }, [localWeights]);

  const handleWeightChange = useCallback((factorKey, value) => {
    const newWeights = { ...localWeights, [factorKey]: value };
    setLocalWeights(newWeights);
    onChange(newWeights);
  }, [localWeights, onChange]);

  const applyPreset = useCallback((presetKey) => {
    const preset = PRESETS[presetKey];
    setLocalWeights(preset.weights);
    onChange(preset.weights);
    onPresetApply?.(presetKey);
  }, [onChange, onPresetApply]);

  // Render implementation...
};

// Sub-component for individual weight slider
const WeightSlider = ({ factor, value, onChange }) => {
  const Icon = factor.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-zinc-800/50 border border-zinc-700/50 rounded-xl space-y-3
                 hover:border-zinc-600/50 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg bg-${factor.color}-500/20`}>
            <Icon className={`w-4 h-4 text-${factor.color}-400`} />
          </div>
          <span className="text-sm font-medium text-zinc-200">{factor.label}</span>
        </div>
        <span className={`text-lg font-bold text-${factor.color}-400`}>
          {value}%
        </span>
      </div>

      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={0}
        max={50}
        step={5}
        className="w-full"
      />

      <p className="text-xs text-zinc-500">{factor.description}</p>
    </motion.div>
  );
};

export default CriteriaWeightingStep;
export { MATCH_FACTORS, PRESETS, DEFAULT_WEIGHTS };
```

## Styling
- Use TailwindCSS classes
- Cards: `bg-zinc-800/50 border border-zinc-700/50 rounded-xl`
- Valid state: `bg-emerald-500/10 border-emerald-500/30 text-emerald-400`
- Invalid state: `bg-amber-500/10 border-amber-500/30 text-amber-400`
- Preset active: `bg-red-500/20 border-red-500/50`

## Export
Add to `/src/components/talent/campaign/index.js`:
```javascript
export { default as CriteriaWeightingStep, MATCH_FACTORS, PRESETS, DEFAULT_WEIGHTS } from './CriteriaWeightingStep';
```
```

---

## Phase 2: Integrate into CampaignWizard

### Objective
Add the CriteriaWeightingStep as step 3.5 in the campaign creation wizard and store weights in campaign data.

### Claude Code Prompt

```
# Integrate CriteriaWeightingStep into CampaignWizard

## Context
Continuing ME-4 implementation. Phase 1 created the CriteriaWeightingStep component. Now we need to integrate it into the existing CampaignWizard.

## File to Modify
`/src/components/talent/CampaignWizard.jsx`

## Current State (Key Lines)
- Line 85-93: roleContext state definition (6 fields)
- Line 96: step state (1-4)
- Line 299-306: Campaign creation with role_context
- Navigation: 4 steps (Select Project → Select Role → Define Role Context → Review)

## Required Changes

### 1. Import the new component (at top of file)
```javascript
import { CriteriaWeightingStep, DEFAULT_WEIGHTS } from './campaign/CriteriaWeightingStep';
```

### 2. Add criteriaWeights state (after roleContext state, ~line 93)
```javascript
const [criteriaWeights, setCriteriaWeights] = useState(DEFAULT_WEIGHTS);
```

### 3. Update step navigation logic
Change from 4 steps to 5 steps:
- Step 1: Select Project (unchanged)
- Step 2: Select Role (unchanged)
- Step 3: Define Role Context (unchanged)
- Step 4: **NEW** - Customize Matching Weights
- Step 5: Review & Launch (was step 4)

Update the step indicator and navigation:
```javascript
const TOTAL_STEPS = 5;
const STEP_LABELS = [
  "Select Project",
  "Select Role",
  "Define Role Context",
  "Matching Weights",
  "Review & Launch"
];
```

### 4. Add Step 4 UI (after step 3, before review step)
Insert between the roleContext step and the review step:

```jsx
{/* Step 4: Matching Weights Configuration */}
{step === 4 && (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    className="space-y-6"
  >
    <CriteriaWeightingStep
      weights={criteriaWeights}
      onChange={setCriteriaWeights}
      onPresetApply={(preset) => {
        console.log('Applied preset:', preset);
      }}
    />
  </motion.div>
)}
```

### 5. Update Review step number
Change `step === 4` to `step === 5` for the review/launch step.

### 6. Update handleNext validation
Add validation for step 4 (weights must equal 100%):

```javascript
const handleNext = () => {
  // Existing validations for steps 1-3...

  // Step 4: Validate weights total 100%
  if (step === 4) {
    const total = Object.values(criteriaWeights).reduce((sum, w) => sum + w, 0);
    if (total !== 100) {
      toast.error("Weights must total 100%");
      return;
    }
  }

  setStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
};
```

### 7. Store weights in campaign creation (~line 299-306)
Update the campaign creation payload to include criteria_weights:

```javascript
const { data: campaign, error: campaignError } = await supabase
  .from("campaigns")
  .insert({
    organization_id: organizationId,
    project_id: selectedProject.id,
    role_id: selectedRole.id,
    name: campaignName || `Campaign for ${selectedRole?.title}`,
    description: campaignDescription,
    campaign_type: "talent",
    status: "draft",
    role_context: {
      ...roleContext,
      role_title: selectedRole?.title,
      project_name: selectedProject?.title || selectedProject?.name,
      outreach_channel: outreachChannel,
      criteria_weights: criteriaWeights, // NEW: Store weights
    },
    outreach_style: {
      channel: outreachChannel,
      tone: "professional",
    },
  })
  .select()
  .single();
```

### 8. Update step indicator UI
Update the step progress indicator (usually near the top of the wizard):

```jsx
{/* Step Indicator */}
<div className="flex items-center justify-between mb-8">
  {STEP_LABELS.map((label, idx) => (
    <div key={idx} className="flex items-center">
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
        ${step > idx + 1 ? 'bg-emerald-500 text-white' :
          step === idx + 1 ? 'bg-red-500 text-white' :
          'bg-zinc-700 text-zinc-400'}
      `}>
        {step > idx + 1 ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
      </div>
      <span className={`ml-2 text-sm hidden md:block ${
        step === idx + 1 ? 'text-white' : 'text-zinc-500'
      }`}>
        {label}
      </span>
      {idx < STEP_LABELS.length - 1 && (
        <div className={`w-12 h-0.5 mx-2 ${
          step > idx + 1 ? 'bg-emerald-500' : 'bg-zinc-700'
        }`} />
      )}
    </div>
  ))}
</div>
```

### 9. Add "Skip" option for advanced users
Allow skipping weights step with default values:

```jsx
{step === 4 && (
  <div className="flex justify-between mt-4">
    <Button variant="ghost" size="sm" onClick={() => setStep(5)}>
      Skip (use defaults)
    </Button>
  </div>
)}
```

## Testing Checklist
1. Navigate through all 5 wizard steps
2. Weight sliders are functional and responsive
3. Total validation prevents proceeding if ≠ 100%
4. Presets correctly update all sliders
5. Weights are saved in campaign.role_context.criteria_weights
6. Skip button advances with default weights
7. Back navigation preserves weight selections
```

---

## Phase 3: Update analyzeCampaignProject Edge Function

### Objective
Modify the Edge Function to use custom criteria weights from campaign data instead of hardcoded values.

### Claude Code Prompt

```
# Update analyzeCampaignProject to Use Custom Weights

## Context
Continuing ME-4 implementation. Phases 1-2 created the UI for customizing weights and storing them in campaign.role_context.criteria_weights. Now we need to update the Edge Function to use these custom weights.

## File to Modify
`/supabase/functions/analyzeCampaignProject/index.ts`

## Current State
- Line 477-483: Hardcoded weight calculation
- Line 294: AI prompt with hardcoded weights
- Line 108-116: MatchFactors interface definition

## Required Changes

### 1. Add CriteriaWeights interface (after MatchFactors, ~line 116)
```typescript
interface CriteriaWeights {
  skills_fit: number;
  experience_fit: number;
  title_fit: number;
  location_fit: number;
  timing_score: number;
  culture_fit: number;
}

const DEFAULT_WEIGHTS: CriteriaWeights = {
  skills_fit: 25,
  experience_fit: 20,
  title_fit: 15,
  location_fit: 10,
  timing_score: 20,
  culture_fit: 10
};
```

### 2. Extract weights from campaign role_context
Find where campaign data is fetched and extract criteria_weights:

```typescript
// After fetching campaign data (~line 180-200)
const criteriaWeights: CriteriaWeights = campaign?.role_context?.criteria_weights
  ? {
      skills_fit: campaign.role_context.criteria_weights.skills_fit ?? DEFAULT_WEIGHTS.skills_fit,
      experience_fit: campaign.role_context.criteria_weights.experience_fit ?? DEFAULT_WEIGHTS.experience_fit,
      title_fit: campaign.role_context.criteria_weights.title_fit ?? DEFAULT_WEIGHTS.title_fit,
      location_fit: campaign.role_context.criteria_weights.location_fit ?? DEFAULT_WEIGHTS.location_fit,
      timing_score: campaign.role_context.criteria_weights.timing_score ?? DEFAULT_WEIGHTS.timing_score,
      culture_fit: campaign.role_context.criteria_weights.culture_fit ?? DEFAULT_WEIGHTS.culture_fit,
    }
  : DEFAULT_WEIGHTS;

// Normalize weights to ensure they sum to 100
const totalWeight = Object.values(criteriaWeights).reduce((sum, w) => sum + w, 0);
const normalizedWeights: CriteriaWeights = totalWeight === 100
  ? criteriaWeights
  : Object.fromEntries(
      Object.entries(criteriaWeights).map(([k, v]) => [k, Math.round((v / totalWeight) * 100)])
    ) as CriteriaWeights;

console.log('Using criteria weights:', normalizedWeights);
```

### 3. Update the fallback scoring algorithm (~line 477-483)
Replace hardcoded weights with dynamic weights:

**Before:**
```typescript
const score = Math.round(
  factors.skills_fit * 0.25 +
  factors.experience_fit * 0.20 +
  factors.title_fit * 0.15 +
  factors.location_fit * 0.10 +
  factors.timing_score * 0.20 +
  factors.culture_fit * 0.10
);
```

**After:**
```typescript
const calculateWeightedScore = (factors: MatchFactors, weights: CriteriaWeights): number => {
  return Math.round(
    factors.skills_fit * (weights.skills_fit / 100) +
    factors.experience_fit * (weights.experience_fit / 100) +
    factors.title_fit * (weights.title_fit / 100) +
    factors.location_fit * (weights.location_fit / 100) +
    factors.timing_score * (weights.timing_score / 100) +
    factors.culture_fit * (weights.culture_fit / 100)
  );
};

// In the fallback calculation section:
const score = calculateWeightedScore(factors, normalizedWeights);
```

### 4. Update the Groq AI prompt (~line 294)
Pass custom weights to the AI for consistent scoring:

**Find the prompt construction section and update:**
```typescript
const buildAnalysisPrompt = (roleProfile: any, candidates: any[], weights: CriteriaWeights) => {
  const weightDescription = `
SCORING WEIGHTS (must sum to 100):
- Skills Match: ${weights.skills_fit}%
- Experience Level: ${weights.experience_fit}%
- Title Alignment: ${weights.title_fit}%
- Location Fit: ${weights.location_fit}%
- Flight Risk/Timing: ${weights.timing_score}%
- Culture Fit: ${weights.culture_fit}%

Use these exact weights when calculating the overall match_score.
`;

  return `
You are an expert technical recruiter analyzing candidate fit for a role.

ROLE PROFILE:
${JSON.stringify(roleProfile, null, 2)}

${weightDescription}

CANDIDATES TO ANALYZE:
${JSON.stringify(candidates, null, 2)}

For each candidate, provide:
1. match_score (0-100): Weighted average using the weights above
2. match_factors: Individual scores for each factor (0-100)
3. match_reasons: Array of 2-3 key reasons for the score
4. key_strengths: Array of top strengths for this role
5. concerns: Array of potential concerns or gaps
6. outreach_angle: Best approach for reaching out
7. reasoning: Brief explanation of the analysis

IMPORTANT: The match_score MUST be calculated using the provided weights.

Return as JSON array.
`;
};

// Then use it:
const prompt = buildAnalysisPrompt(roleProfile, candidateBatch, normalizedWeights);
```

### 5. Add weights to match results
Include the weights used in the response for transparency:

```typescript
// In the response formatting section (~line 550-570)
const formatMatchResult = (candidate: any, analysis: any, weights: CriteriaWeights) => ({
  candidate_id: candidate.id,
  candidate_name: candidate.name,
  match_score: analysis.match_score,
  match_factors: analysis.match_factors,
  match_reasons: analysis.match_reasons,
  key_strengths: analysis.key_strengths,
  concerns: analysis.concerns,
  outreach_angle: analysis.outreach_angle,
  reasoning: analysis.reasoning,
  weights_used: weights, // NEW: Include weights for transparency
  scored_at: new Date().toISOString(),
});
```

### 6. Handle edge cases
Add validation and fallback logic:

```typescript
// Validate weights early in the function
const validateWeights = (weights: any): weights is CriteriaWeights => {
  if (!weights || typeof weights !== 'object') return false;

  const requiredKeys = ['skills_fit', 'experience_fit', 'title_fit', 'location_fit', 'timing_score', 'culture_fit'];
  const hasAllKeys = requiredKeys.every(key => typeof weights[key] === 'number');

  if (!hasAllKeys) return false;

  const total = requiredKeys.reduce((sum, key) => sum + weights[key], 0);
  return total >= 95 && total <= 105; // Allow small rounding errors
};

// Use in main logic:
const criteriaWeights = validateWeights(campaign?.role_context?.criteria_weights)
  ? campaign.role_context.criteria_weights
  : DEFAULT_WEIGHTS;
```

## Testing Checklist
1. Create campaign with custom weights (e.g., Skills: 50%, Timing: 30%, others: 5% each)
2. Run matching on campaign
3. Verify match_scores reflect the custom weights
4. Verify weights_used field appears in match results
5. Test with missing/invalid weights (should use defaults)
6. Test AI analysis uses correct weight descriptions
7. Compare results between default and custom weights
```

---

## Phase 4: Display Weights in Campaign Detail (Optional Enhancement)

### Objective
Show the configured weights in the campaign detail page for transparency.

### Claude Code Prompt

```
# Display Configured Weights in Campaign Detail

## Context
Optional enhancement for ME-4. Show recruiters which weights are being used for candidate matching in the campaign detail view.

## File to Modify
`/src/pages/TalentCampaignDetail.jsx`

## Add Weights Display Widget

### 1. Create WeightsDisplayWidget component
Add inline or create separate file:

```jsx
const WeightsDisplayWidget = ({ weights }) => {
  if (!weights) return null;

  const factors = [
    { key: 'skills_fit', label: 'Skills', color: 'blue' },
    { key: 'experience_fit', label: 'Experience', color: 'purple' },
    { key: 'title_fit', label: 'Title', color: 'cyan' },
    { key: 'location_fit', label: 'Location', color: 'emerald' },
    { key: 'timing_score', label: 'Timing', color: 'amber' },
    { key: 'culture_fit', label: 'Culture', color: 'rose' },
  ];

  return (
    <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
      <h4 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
        <Sliders className="w-4 h-4 text-purple-400" />
        Matching Weights
      </h4>
      <div className="space-y-2">
        {factors.map(({ key, label, color }) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 w-20">{label}</span>
            <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
              <div
                className={`h-full bg-${color}-500`}
                style={{ width: `${weights[key] || 0}%` }}
              />
            </div>
            <span className={`text-xs font-medium text-${color}-400 w-8 text-right`}>
              {weights[key] || 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 2. Add to Campaign Overview section
In the Overview tab, add after Campaign Details card:

```jsx
{/* Matching Configuration */}
{campaign?.role_context?.criteria_weights && (
  <WeightsDisplayWidget weights={campaign.role_context.criteria_weights} />
)}
```

### 3. Add Edit Weights button (optional)
Allow editing weights from campaign detail:

```jsx
<Button
  variant="ghost"
  size="sm"
  onClick={() => setShowWeightsModal(true)}
  className="text-purple-400 hover:text-purple-300"
>
  <Pencil className="w-3 h-3 mr-1" />
  Edit Weights
</Button>
```

## Testing Checklist
1. Weights display shows correctly for campaigns with custom weights
2. Gracefully handles campaigns without weights (shows nothing or defaults)
3. Bar widths match percentage values
4. Colors match factor identity
```

---

## Summary

| Phase | Component/File | Effort | Description |
|-------|---------------|--------|-------------|
| 1 | CriteriaWeightingStep.jsx | 3-4 days | New component with sliders, validation, presets |
| 2 | CampaignWizard.jsx | 2-3 days | Integrate as step 4, update navigation, store weights |
| 3 | analyzeCampaignProject/index.ts | 3-4 days | Apply custom weights in scoring algorithm |
| 4 | TalentCampaignDetail.jsx | 1 day | Display weights in campaign overview (optional) |

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Campaign Creation Flow                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Step 1-3: Project/Role/Context  →  Step 4: Weight Configuration    │
│                                            │                         │
│                                            ▼                         │
│                               ┌──────────────────────┐              │
│                               │  criteriaWeights     │              │
│                               │  {                   │              │
│                               │    skills_fit: 30,   │              │
│                               │    experience_fit:20,│              │
│                               │    title_fit: 15,    │              │
│                               │    location_fit: 10, │              │
│                               │    timing_score: 15, │              │
│                               │    culture_fit: 10   │              │
│                               │  }                   │              │
│                               └──────────────────────┘              │
│                                            │                         │
│                                            ▼                         │
│                      Step 5: Review & Create Campaign                │
│                                            │                         │
│                                            ▼                         │
│              Stored in: campaign.role_context.criteria_weights       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        Candidate Matching Flow                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  "Run Matching" clicked  →  analyzeCampaignProject Edge Function    │
│                                            │                         │
│                                            ▼                         │
│                    Extract criteria_weights from campaign            │
│                                            │                         │
│                                            ▼                         │
│              ┌─────────────────────────────────────────┐            │
│              │  Stage 1: Pre-filter candidates         │            │
│              │  Stage 2: AI analysis with weights      │◄── Weights │
│              │  Stage 3: Calculate weighted scores     │◄── Weights │
│              └─────────────────────────────────────────┘            │
│                                            │                         │
│                                            ▼                         │
│                    Match results with weights_used field             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Preset Templates Reference

| Preset | Skills | Experience | Title | Location | Timing | Culture | Use Case |
|--------|--------|------------|-------|----------|--------|---------|----------|
| Balanced | 20% | 20% | 15% | 10% | 20% | 15% | General hiring |
| Skills First | 40% | 25% | 15% | 5% | 10% | 5% | Technical roles |
| Urgency First | 15% | 15% | 10% | 5% | 40% | 15% | Hot market, quick fills |
| Culture Focus | 20% | 15% | 10% | 10% | 15% | 30% | Team fit critical |

## Commit Messages
- Phase 1: `feat(ME-4): Create CriteriaWeightingStep component with sliders and presets`
- Phase 2: `feat(ME-4): Integrate matching weights step into CampaignWizard`
- Phase 3: `feat(ME-4): Update analyzeCampaignProject to use custom criteria weights`
- Phase 4: `feat(ME-4): Display configured weights in campaign detail view`
- Phase 5: `feat(ME-4): Add signal-based matching with intelligence data filters`

---

## Phase 5: Signal-Based Matching (Advanced)

### Objective
Enable recruiters to filter and boost candidates based on specific intelligence signals (M&A activity, layoffs, promotions, etc.) that already exist in the candidate data.

### Background - Available Signal Data

The system already stores rich intelligence signals on candidates:

```typescript
// Existing candidate fields that contain matchable signals
interface CandidateIntelligence {
  timing_signals?: Array<{
    trigger: string;      // "Company undergoing M&A", "Recent layoffs announced"
    window: string;       // "3-6 months", "immediate"
    urgency: "low" | "medium" | "high";
  }>;
  company_pain_points?: string[];    // ["Leadership instability", "Funding concerns"]
  key_insights?: string[];           // ["Recently promoted but restless"]
  intelligence_factors?: Array<{
    factor: string;       // "Company Health", "Career Momentum"
    score: number;        // 0-100
    reason: string;       // "M&A activity detected"
    category: string;     // "company", "career", "market"
  }>;
  recent_ma_news?: string;           // M&A news text
  outreach_hooks?: string[];         // Personalization angles
}
```

### Claude Code Prompt - Part A: Signal Configuration Component

```
# Create SignalMatchingConfig Component

## Context
Extending ME-4 with signal-based matching. We need a component that lets recruiters select which intelligence signals should boost candidate scores.

## File to Create
`/src/components/talent/campaign/SignalMatchingConfig.jsx`

## Signal Definitions

```javascript
// Predefined signals that can be detected in candidate data
export const INTELLIGENCE_SIGNALS = [
  {
    id: "ma_activity",
    label: "M&A Activity",
    description: "Company undergoing merger, acquisition, or being acquired",
    icon: "Building2",
    color: "red",
    category: "company",
    patterns: ["M&A", "merger", "acquisition", "acquired", "acquiring", "buyout"],
    fields: ["timing_signals.trigger", "recent_ma_news", "intelligence_factors.reason"],
    defaultBoost: 15,
  },
  {
    id: "layoffs",
    label: "Layoffs/Restructuring",
    description: "Company has announced layoffs or restructuring",
    icon: "UserMinus",
    color: "orange",
    category: "company",
    patterns: ["layoff", "restructur", "downsiz", "RIF", "workforce reduction"],
    fields: ["timing_signals.trigger", "company_pain_points"],
    defaultBoost: 20,
  },
  {
    id: "leadership_change",
    label: "Leadership Change",
    description: "New CEO, CTO, or major leadership transition",
    icon: "Crown",
    color: "purple",
    category: "company",
    patterns: ["new CEO", "new CTO", "leadership change", "new management", "executive departure"],
    fields: ["timing_signals.trigger", "company_pain_points"],
    defaultBoost: 10,
  },
  {
    id: "funding_round",
    label: "Recent Funding",
    description: "Company raised funding (may indicate growth or instability)",
    icon: "TrendingUp",
    color: "emerald",
    category: "company",
    patterns: ["funding", "raised", "Series [A-Z]", "investment round", "IPO"],
    fields: ["timing_signals.trigger", "key_insights"],
    defaultBoost: 5,
  },
  {
    id: "recent_promotion",
    label: "Recently Promoted",
    description: "Candidate was promoted in last 6-18 months",
    icon: "Award",
    color: "amber",
    category: "career",
    patterns: ["promot", "new role", "elevated to", "moved up"],
    fields: ["timing_signals.trigger", "key_insights"],
    defaultBoost: -5,  // Negative = less likely to move
  },
  {
    id: "tenure_anniversary",
    label: "Work Anniversary",
    description: "Approaching 2, 3, or 5 year mark (common switch points)",
    icon: "Calendar",
    color: "blue",
    category: "career",
    patterns: ["anniversary", "2 year", "3 year", "5 year", "tenure"],
    fields: ["timing_signals.trigger"],
    defaultBoost: 10,
  },
  {
    id: "stagnation",
    label: "Career Stagnation",
    description: "No promotion or growth in 2+ years",
    icon: "Pause",
    color: "zinc",
    category: "career",
    patterns: ["stagnant", "no promotion", "same role", "plateau"],
    fields: ["key_insights", "intelligence_factors.reason"],
    defaultBoost: 15,
  },
  {
    id: "high_flight_risk",
    label: "High Flight Risk",
    description: "Intelligence score indicates high likelihood to move",
    icon: "Rocket",
    color: "rose",
    category: "timing",
    patterns: null,  // Special: check intelligence_score >= 70
    fields: ["intelligence_score"],
    defaultBoost: 20,
  },
];

export const SIGNAL_CATEGORIES = [
  { id: "company", label: "Company Signals", description: "Events at their current employer" },
  { id: "career", label: "Career Signals", description: "Individual career patterns" },
  { id: "timing", label: "Timing Signals", description: "Readiness indicators" },
];
```

## Component Props

```javascript
SignalMatchingConfig.propTypes = {
  selectedSignals: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    enabled: PropTypes.bool.isRequired,
    boost: PropTypes.number.isRequired,  // -20 to +30 score boost
    required: PropTypes.bool,            // If true, filter OUT candidates without this signal
  })),
  onChange: PropTypes.func.isRequired,
  showAdvanced: PropTypes.bool,          // Show boost sliders vs simple toggles
};
```

## Visual Design

### Simple Mode (default)
```
┌─────────────────────────────────────────────────────────────────┐
│  📡 Signal Filters                                    [Advanced]│
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  COMPANY SIGNALS                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 🏢 M&A Activity                              [Toggle ON] │   │
│  │ Company undergoing merger or acquisition                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 👥 Layoffs/Restructuring                     [Toggle ON] │   │
│  │ Company has announced layoffs                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  CAREER SIGNALS                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 🎖️ Recently Promoted                        [Toggle OFF] │   │
│  │ Promoted in last 6-18 months (less likely to move)        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Advanced Mode
```
┌─────────────────────────────────────────────────────────────────┐
│  📡 Signal Filters                                     [Simple] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🏢 M&A Activity                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ [✓] Enabled     [ ] Required                              │   │
│  │                                                            │   │
│  │ Score Boost: [====●=====] +15                             │   │
│  │              -20          +30                              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  👥 Layoffs/Restructuring                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ [✓] Enabled     [✓] Required (filter out others)         │   │
│  │                                                            │   │
│  │ Score Boost: [======●===] +20                             │   │
│  │              -20          +30                              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Implementation

```jsx
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building2, UserMinus, Crown, TrendingUp, Award,
  Calendar, Pause, Rocket, ChevronDown, ChevronUp,
  Settings2, Filter, Zap
} from 'lucide-react';

const ICON_MAP = {
  Building2, UserMinus, Crown, TrendingUp, Award,
  Calendar, Pause, Rocket
};

const SignalMatchingConfig = ({
  selectedSignals = [],
  onChange,
  showAdvanced: initialAdvanced = false
}) => {
  const [showAdvanced, setShowAdvanced] = useState(initialAdvanced);
  const [expandedCategory, setExpandedCategory] = useState("company");

  // Group signals by category
  const signalsByCategory = useMemo(() => {
    return SIGNAL_CATEGORIES.map(cat => ({
      ...cat,
      signals: INTELLIGENCE_SIGNALS.filter(s => s.category === cat.id)
    }));
  }, []);

  // Get current config for a signal
  const getSignalConfig = (signalId) => {
    const existing = selectedSignals.find(s => s.id === signalId);
    const defaultSignal = INTELLIGENCE_SIGNALS.find(s => s.id === signalId);
    return existing || {
      id: signalId,
      enabled: false,
      boost: defaultSignal?.defaultBoost || 10,
      required: false
    };
  };

  // Update signal config
  const updateSignal = (signalId, updates) => {
    const current = getSignalConfig(signalId);
    const updated = { ...current, ...updates };

    const newSignals = selectedSignals.filter(s => s.id !== signalId);
    if (updated.enabled) {
      newSignals.push(updated);
    }
    onChange(newSignals);
  };

  // Count active signals
  const activeCount = selectedSignals.filter(s => s.enabled).length;
  const requiredCount = selectedSignals.filter(s => s.required).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-purple-400" />
          <h3 className="font-medium text-white">Signal Filters</h3>
          {activeCount > 0 && (
            <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
              {activeCount} active
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-zinc-400 hover:text-white"
        >
          <Settings2 className="w-4 h-4 mr-1" />
          {showAdvanced ? "Simple" : "Advanced"}
        </Button>
      </div>

      {/* Description */}
      <p className="text-sm text-zinc-500">
        Boost or filter candidates based on intelligence signals detected in their profile.
        {requiredCount > 0 && (
          <span className="text-amber-400 ml-1">
            ({requiredCount} required filter{requiredCount > 1 ? 's' : ''} active)
          </span>
        )}
      </p>

      {/* Signal Categories */}
      <div className="space-y-3">
        {signalsByCategory.map(category => (
          <div key={category.id} className="rounded-lg border border-zinc-700/50 overflow-hidden">
            {/* Category Header */}
            <button
              onClick={() => setExpandedCategory(
                expandedCategory === category.id ? null : category.id
              )}
              className="w-full flex items-center justify-between p-3 bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
            >
              <div>
                <span className="text-sm font-medium text-zinc-200">{category.label}</span>
                <span className="text-xs text-zinc-500 ml-2">{category.description}</span>
              </div>
              {expandedCategory === category.id ? (
                <ChevronUp className="w-4 h-4 text-zinc-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-zinc-400" />
              )}
            </button>

            {/* Signals in Category */}
            <AnimatePresence>
              {expandedCategory === category.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-2 space-y-2">
                    {category.signals.map(signal => {
                      const config = getSignalConfig(signal.id);
                      const Icon = ICON_MAP[signal.icon];

                      return (
                        <SignalCard
                          key={signal.id}
                          signal={signal}
                          config={config}
                          showAdvanced={showAdvanced}
                          onUpdate={(updates) => updateSignal(signal.id, updates)}
                          Icon={Icon}
                        />
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const urgencySignals = INTELLIGENCE_SIGNALS
              .filter(s => ["ma_activity", "layoffs", "high_flight_risk"].includes(s.id))
              .map(s => ({ id: s.id, enabled: true, boost: s.defaultBoost, required: false }));
            onChange(urgencySignals);
          }}
          className="text-xs"
        >
          <Zap className="w-3 h-3 mr-1" />
          Urgency Preset
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange([])}
          className="text-xs text-zinc-500"
        >
          Clear All
        </Button>
      </div>
    </div>
  );
};

// Individual signal card
const SignalCard = ({ signal, config, showAdvanced, onUpdate, Icon }) => {
  return (
    <div className={`p-3 rounded-lg border transition-all ${
      config.enabled
        ? `bg-${signal.color}-500/10 border-${signal.color}-500/30`
        : "bg-zinc-900/50 border-zinc-700/30"
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${
            config.enabled ? `bg-${signal.color}-500/20` : "bg-zinc-800"
          }`}>
            <Icon className={`w-4 h-4 ${
              config.enabled ? `text-${signal.color}-400` : "text-zinc-500"
            }`} />
          </div>
          <div>
            <p className={`text-sm font-medium ${
              config.enabled ? "text-white" : "text-zinc-400"
            }`}>
              {signal.label}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">{signal.description}</p>
          </div>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={(enabled) => onUpdate({ enabled })}
        />
      </div>

      {/* Advanced Options */}
      {showAdvanced && config.enabled && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="mt-3 pt-3 border-t border-zinc-700/30 space-y-3"
        >
          {/* Required Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">Required (filter out others)</span>
            <Switch
              checked={config.required}
              onCheckedChange={(required) => onUpdate({ required })}
              className="scale-75"
            />
          </div>

          {/* Boost Slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Score Boost</span>
              <span className={`text-xs font-medium ${
                config.boost > 0 ? "text-emerald-400" :
                config.boost < 0 ? "text-rose-400" : "text-zinc-400"
              }`}>
                {config.boost > 0 ? "+" : ""}{config.boost}
              </span>
            </div>
            <Slider
              value={[config.boost]}
              onValueChange={([boost]) => onUpdate({ boost })}
              min={-20}
              max={30}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-zinc-600">
              <span>-20</span>
              <span>+30</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default SignalMatchingConfig;
export { INTELLIGENCE_SIGNALS, SIGNAL_CATEGORIES };
```

## Export
Add to `/src/components/talent/campaign/index.js`:
```javascript
export { default as SignalMatchingConfig, INTELLIGENCE_SIGNALS, SIGNAL_CATEGORIES } from './SignalMatchingConfig';
```
```

---

### Claude Code Prompt - Part B: Integrate Signal Config into Wizard

```
# Add Signal Matching to CampaignWizard

## Context
Phase 5 Part B - Integrate SignalMatchingConfig into the CampaignWizard below the weight sliders.

## File to Modify
`/src/components/talent/CampaignWizard.jsx`

## Changes Required

### 1. Import the new component
```javascript
import { SignalMatchingConfig } from './campaign/SignalMatchingConfig';
```

### 2. Add signalFilters state (after criteriaWeights state)
```javascript
const [signalFilters, setSignalFilters] = useState([]);
```

### 3. Add Signal Config UI to Step 4 (Matching Weights)
Add below the CriteriaWeightingStep component:

```jsx
{step === 4 && (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    className="space-y-8"
  >
    {/* Weight Sliders */}
    <CriteriaWeightingStep
      weights={criteriaWeights}
      onChange={setCriteriaWeights}
    />

    {/* Divider */}
    <div className="border-t border-zinc-700/50" />

    {/* Signal Filters */}
    <SignalMatchingConfig
      selectedSignals={signalFilters}
      onChange={setSignalFilters}
    />
  </motion.div>
)}
```

### 4. Store signal filters in campaign creation
Update the campaign insert payload:

```javascript
role_context: {
  ...roleContext,
  role_title: selectedRole?.title,
  project_name: selectedProject?.title || selectedProject?.name,
  outreach_channel: outreachChannel,
  criteria_weights: criteriaWeights,
  signal_filters: signalFilters,  // NEW: Store signal config
},
```

## Testing
1. Navigate to campaign wizard step 4
2. Signal filters appear below weight sliders
3. Toggles enable/disable signals
4. Advanced mode shows boost sliders
5. Signal config is saved to campaign.role_context.signal_filters
```

---

### Claude Code Prompt - Part C: Update Matching Algorithm

```
# Update analyzeCampaignProject for Signal-Based Matching

## Context
Phase 5 Part C - Modify the Edge Function to use signal filters for pre-filtering and score boosting.

## File to Modify
`/supabase/functions/analyzeCampaignProject/index.ts`

## Required Changes

### 1. Add Signal Filter Types (after CriteriaWeights interface)

```typescript
interface SignalFilter {
  id: string;
  enabled: boolean;
  boost: number;      // -20 to +30
  required: boolean;  // If true, filter out candidates without this signal
}

interface SignalDefinition {
  id: string;
  patterns: string[] | null;
  fields: string[];
}

const SIGNAL_DEFINITIONS: SignalDefinition[] = [
  {
    id: "ma_activity",
    patterns: ["M&A", "merger", "acquisition", "acquired", "acquiring", "buyout"],
    fields: ["timing_signals", "recent_ma_news", "intelligence_factors"],
  },
  {
    id: "layoffs",
    patterns: ["layoff", "restructur", "downsiz", "RIF", "workforce reduction"],
    fields: ["timing_signals", "company_pain_points"],
  },
  {
    id: "leadership_change",
    patterns: ["new CEO", "new CTO", "leadership change", "new management"],
    fields: ["timing_signals", "company_pain_points"],
  },
  {
    id: "funding_round",
    patterns: ["funding", "raised", "Series [A-Z]", "investment round", "IPO"],
    fields: ["timing_signals", "key_insights"],
  },
  {
    id: "recent_promotion",
    patterns: ["promot", "new role", "elevated to"],
    fields: ["timing_signals", "key_insights"],
  },
  {
    id: "tenure_anniversary",
    patterns: ["anniversary", "2 year", "3 year", "5 year", "tenure"],
    fields: ["timing_signals"],
  },
  {
    id: "stagnation",
    patterns: ["stagnant", "no promotion", "same role", "plateau"],
    fields: ["key_insights", "intelligence_factors"],
  },
  {
    id: "high_flight_risk",
    patterns: null,  // Special handling
    fields: ["intelligence_score"],
  },
];
```

### 2. Create Signal Detection Function

```typescript
/**
 * Check if a candidate matches a specific signal
 */
function candidateHasSignal(candidate: any, signalId: string): boolean {
  const signalDef = SIGNAL_DEFINITIONS.find(s => s.id === signalId);
  if (!signalDef) return false;

  // Special case: high_flight_risk
  if (signalId === "high_flight_risk") {
    return (candidate.intelligence_score || 0) >= 70;
  }

  // Pattern-based matching
  if (!signalDef.patterns) return false;

  const patternsRegex = new RegExp(signalDef.patterns.join("|"), "i");

  for (const field of signalDef.fields) {
    const value = getNestedValue(candidate, field);

    if (typeof value === "string" && patternsRegex.test(value)) {
      return true;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const text = typeof item === "string" ? item :
                     item?.trigger || item?.reason || JSON.stringify(item);
        if (patternsRegex.test(text)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Get nested object value by dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((curr, key) => curr?.[key], obj);
}

/**
 * Calculate signal boost for a candidate
 */
function calculateSignalBoost(candidate: any, signalFilters: SignalFilter[]): number {
  let totalBoost = 0;

  for (const filter of signalFilters) {
    if (!filter.enabled) continue;

    const hasSignal = candidateHasSignal(candidate, filter.id);
    if (hasSignal) {
      totalBoost += filter.boost;
      console.log(`  Signal match: ${filter.id} (+${filter.boost})`);
    }
  }

  return totalBoost;
}

/**
 * Check if candidate passes required signal filters
 */
function passesRequiredSignals(candidate: any, signalFilters: SignalFilter[]): boolean {
  const requiredFilters = signalFilters.filter(f => f.enabled && f.required);

  for (const filter of requiredFilters) {
    if (!candidateHasSignal(candidate, filter.id)) {
      return false;
    }
  }

  return true;
}
```

### 3. Update Pre-Filter Stage (Stage 1)

Find the pre-filter section (~line 400) and add signal filtering:

```typescript
// STAGE 1: Pre-filter candidates
let filteredCandidates = allCandidates.filter(candidate => {
  // ... existing filters ...

  // NEW: Required signal filters
  const signalFilters = campaign?.role_context?.signal_filters || [];
  if (!passesRequiredSignals(candidate, signalFilters)) {
    console.log(`  Filtered out: Missing required signals`);
    return false;
  }

  return true;
});

console.log(`Pre-filter: ${filteredCandidates.length} candidates passed (from ${allCandidates.length})`);
```

### 4. Update Score Calculation (Stage 3)

Find the score calculation section (~line 477) and add signal boost:

```typescript
// Calculate weighted score
const baseScore = calculateWeightedScore(factors, normalizedWeights);

// Apply signal boosts
const signalFilters = campaign?.role_context?.signal_filters || [];
const signalBoost = calculateSignalBoost(candidate, signalFilters);

// Final score (capped at 0-100)
const finalScore = Math.min(100, Math.max(0, baseScore + signalBoost));

console.log(`Candidate ${candidate.name}: base=${baseScore}, signalBoost=${signalBoost}, final=${finalScore}`);
```

### 5. Include Signal Matches in Response

Add to the match result formatting:

```typescript
const formatMatchResult = (candidate: any, analysis: any, weights: CriteriaWeights, signalFilters: SignalFilter[]) => {
  // Detect which signals matched
  const matchedSignals = signalFilters
    .filter(f => f.enabled && candidateHasSignal(candidate, f.id))
    .map(f => ({
      id: f.id,
      boost: f.boost,
    }));

  return {
    candidate_id: candidate.id,
    candidate_name: candidate.name,
    match_score: analysis.match_score,
    match_factors: analysis.match_factors,
    match_reasons: analysis.match_reasons,
    key_strengths: analysis.key_strengths,
    concerns: analysis.concerns,
    outreach_angle: analysis.outreach_angle,
    reasoning: analysis.reasoning,
    weights_used: weights,
    signals_matched: matchedSignals,  // NEW: Include matched signals
    signal_boost_applied: matchedSignals.reduce((sum, s) => sum + s.boost, 0),
    scored_at: new Date().toISOString(),
  };
};
```

## Testing Checklist
1. Create campaign with "M&A Activity" signal set to required
2. Run matching - only candidates with M&A signals should appear
3. Create campaign with "Layoffs" signal with +20 boost
4. Run matching - candidates with layoff signals should score higher
5. Verify signal_boost_applied appears in match results
6. Test high_flight_risk signal (intelligence_score >= 70)
7. Test multiple signals combined
```

---

### Claude Code Prompt - Part D: Display Matched Signals in UI

```
# Display Matched Signals in Campaign Match Results

## Context
Phase 5 Part D - Show which signals matched for each candidate in the campaign detail view.

## File to Modify
`/src/pages/TalentCampaignDetail.jsx`

## Add Signal Badges to CandidateMatchResultCard

Find the CandidateMatchResultCard component and add signal badges:

```jsx
// Inside CandidateMatchResultCard, after the match score display

{/* Matched Signals */}
{match.signals_matched?.length > 0 && (
  <div className="flex flex-wrap gap-1.5 mt-2">
    {match.signals_matched.map((signal) => {
      const signalDef = INTELLIGENCE_SIGNALS.find(s => s.id === signal.id);
      if (!signalDef) return null;

      return (
        <div
          key={signal.id}
          className={`
            inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
            bg-${signalDef.color}-500/20 text-${signalDef.color}-400
            border border-${signalDef.color}-500/30
          `}
        >
          <span>{signalDef.label}</span>
          {signal.boost !== 0 && (
            <span className={signal.boost > 0 ? "text-emerald-400" : "text-rose-400"}>
              {signal.boost > 0 ? "+" : ""}{signal.boost}
            </span>
          )}
        </div>
      );
    })}
  </div>
)}

{/* Signal Boost Total */}
{match.signal_boost_applied > 0 && (
  <div className="mt-1 text-xs text-emerald-400">
    +{match.signal_boost_applied} from signals
  </div>
)}
```

## Import Signal Definitions
```javascript
import { INTELLIGENCE_SIGNALS } from '@/components/talent/campaign/SignalMatchingConfig';
```

## Testing
1. View campaign with matched candidates that have signals
2. Signal badges appear on candidate cards
3. Boost amounts shown next to signal names
4. Total signal boost displayed
```

---

## Updated Summary

| Phase | Component/File | Effort | Description |
|-------|---------------|--------|-------------|
| 1 | CriteriaWeightingStep.jsx | 3-4 days | Weight sliders with validation and presets |
| 2 | CampaignWizard.jsx | 2-3 days | Integrate weights into wizard step 4 |
| 3 | analyzeCampaignProject/index.ts | 3-4 days | Apply custom weights in scoring |
| 4 | TalentCampaignDetail.jsx | 1 day | Display weights in campaign view |
| **5A** | **SignalMatchingConfig.jsx** | **2-3 days** | **Signal toggle UI with categories** |
| **5B** | **CampaignWizard.jsx** | **1 day** | **Add signal config to wizard** |
| **5C** | **analyzeCampaignProject/index.ts** | **2-3 days** | **Signal detection & score boosting** |
| **5D** | **TalentCampaignDetail.jsx** | **1 day** | **Display matched signals** |

**Total Effort: ~3 weeks**

---

## Signal-Based Matching Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Campaign Creation                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Step 4: Matching Configuration                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  WEIGHT SLIDERS          │  SIGNAL FILTERS                   │    │
│  │  ○ Skills: 25%           │  ☑ M&A Activity (+15)             │    │
│  │  ○ Experience: 20%       │  ☑ Layoffs (+20) [Required]       │    │
│  │  ○ Title: 15%            │  ☐ Recent Promotion (-5)          │    │
│  │  ○ Location: 10%         │  ☑ High Flight Risk (+20)         │    │
│  │  ○ Timing: 20%           │                                    │    │
│  │  ○ Culture: 10%          │                                    │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│         Stored in: campaign.role_context.signal_filters             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        Matching Algorithm                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  STAGE 1: Pre-Filter                                                 │
│  ├─ Existing filters (skills, title, etc.)                          │
│  └─ NEW: Required signal filters                                     │
│         → Filter OUT candidates without required signals             │
│                                                                      │
│  STAGE 2: AI Analysis                                                │
│  └─ Calculate base match_factors                                     │
│                                                                      │
│  STAGE 3: Score Calculation                                          │
│  ├─ base_score = weighted_average(factors, weights)                 │
│  ├─ signal_boost = sum(matched_signal.boost)                        │
│  └─ final_score = min(100, base_score + signal_boost)               │
│                                                                      │
│  Example:                                                            │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ Candidate: John Smith                                          │  │
│  │ ├─ Base score: 72                                              │  │
│  │ ├─ Matched: M&A Activity (+15), High Flight Risk (+20)        │  │
│  │ ├─ Signal boost: +35                                           │  │
│  │ └─ Final score: 100 (capped)                                   │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Available Signals Reference

| Signal | Category | Default Boost | Detection Method |
|--------|----------|---------------|------------------|
| M&A Activity | Company | +15 | Pattern match on timing_signals, recent_ma_news |
| Layoffs/Restructuring | Company | +20 | Pattern match on timing_signals, company_pain_points |
| Leadership Change | Company | +10 | Pattern match on timing_signals |
| Recent Funding | Company | +5 | Pattern match on timing_signals, key_insights |
| Recently Promoted | Career | -5 | Pattern match (less likely to move) |
| Work Anniversary | Career | +10 | Pattern match on timing_signals |
| Career Stagnation | Career | +15 | Pattern match on key_insights |
| High Flight Risk | Timing | +20 | intelligence_score >= 70 |
