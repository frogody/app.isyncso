# QW-2: Match Reason Cards in Campaign View - Implementation Plan

## Overview
**Objective**: Show expandable "Why This Match" cards on campaign candidate list that display match_factors breakdown and ai_analysis prominently.

**Current State**:
- `CandidateMatchResultCard` in TalentCampaignDetail.jsx has a basic expandable "Show AI Analysis" section
- `MatchFactorsBar` component exists but shows only simple vertical bars
- Match data (match_reasons, match_factors, ai_analysis) exists but isn't displayed prominently

**Target State**:
- Prominent "Why This Match?" expandable section with visual factor breakdown
- Each factor shows percentage with contextual explanation
- AI insights displayed in a scannable, card-based format

**Effort**: 2-3 days across 3 phases

---

## Phase 1: Create MatchReasonCards Component

### Objective
Create a new `MatchReasonCards` component that displays match factors as individual visual cards with percentages, labels, and contextual insights.

### Claude Code Prompt

```
# Create MatchReasonCards Component for Campaign View

## Context
Building QW-2: Match Reason Cards feature for the ISYNCSO Talent System. We need to create a component that displays match factors (skills_fit, experience_fit, title_fit, timing_score, culture_fit) as visually appealing cards with percentages and insights.

## File to Create
`/src/components/talent/campaign/MatchReasonCards.jsx`

## Design Requirements

### Visual Design
- Use a horizontal scrollable card layout for the 5 match factors
- Each factor card should show:
  - Icon (use lucide-react icons)
  - Factor label (e.g., "Skills Match", "Experience Fit")
  - Percentage score with animated radial progress
  - 1-2 line contextual insight when available
- Color code by score: green (80+), yellow (60-79), orange (40-59), red (<40)
- Dark theme consistent with existing UI (zinc-800/900 backgrounds, colored accents)

### Component Props
```javascript
MatchReasonCards.propTypes = {
  factors: PropTypes.shape({
    skills_fit: PropTypes.number,
    experience_fit: PropTypes.number,
    title_fit: PropTypes.number,
    timing_score: PropTypes.number,
    culture_fit: PropTypes.number,
  }),
  insights: PropTypes.shape({
    key_strengths: PropTypes.arrayOf(PropTypes.string),
    concerns: PropTypes.arrayOf(PropTypes.string),
  }),
  compact: PropTypes.bool, // For smaller display mode
};
```

### Factor Configuration
```javascript
const FACTOR_CONFIG = {
  skills_fit: {
    label: 'Skills Match',
    icon: 'Award',
    description: 'How well skills align with requirements'
  },
  experience_fit: {
    label: 'Experience',
    icon: 'Briefcase',
    description: 'Years and relevance of experience'
  },
  title_fit: {
    label: 'Title Fit',
    icon: 'Target',
    description: 'Current role alignment'
  },
  timing_score: {
    label: 'Timing',
    icon: 'Clock',
    description: 'Career timing indicators'
  },
  culture_fit: {
    label: 'Culture',
    icon: 'Users',
    description: 'Team and culture alignment'
  }
};
```

### Animation Requirements
- Use framer-motion for card entrance animations (stagger effect)
- Animate percentage numbers counting up
- Smooth hover states with subtle scale transform

### Code Structure
```javascript
import React from 'react';
import { motion } from 'framer-motion';
import { Award, Briefcase, Target, Clock, Users } from 'lucide-react';

const MatchReasonCards = ({ factors, insights, compact = false }) => {
  // Implementation here
};

// Sub-component for individual factor card
const FactorCard = ({ factorKey, score, config, compact, index }) => {
  // Individual card with radial progress
};

// Radial progress indicator
const RadialProgress = ({ score, color, size = 48 }) => {
  // SVG-based radial progress
};

export default MatchReasonCards;
```

## Styling
- Use TailwindCSS classes
- Cards: `bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-4`
- Hover: `hover:border-[color]-500/50 hover:bg-zinc-800/80 transition-all`
- Text: Factor labels in `text-sm font-medium text-zinc-300`, percentages in `text-2xl font-bold text-[color]-400`

## Export
Add to `/src/components/talent/campaign/index.js`:
```javascript
export { default as MatchReasonCards } from './MatchReasonCards';
```

Create the index.js if it doesn't exist.
```

---

## Phase 2: Update CandidateMatchResultCard with "Why This Match?" Section

### Objective
Integrate the MatchReasonCards component into CandidateMatchResultCard with a prominent "Why This Match?" expandable section.

### Claude Code Prompt

```
# Integrate MatchReasonCards into CandidateMatchResultCard

## Context
Continuing QW-2 implementation. Phase 1 created the MatchReasonCards component. Now we need to integrate it into the existing CandidateMatchResultCard component in the campaign detail view.

## File to Modify
`/src/pages/TalentCampaignDetail.jsx`

## Current State
The CandidateMatchResultCard component (around line 200-413) has:
- Basic card layout with avatar, name, title, company
- Match score display
- Expandable "Show AI Analysis" section with AnimatePresence
- Shows key_strengths, concerns, AI reasoning when expanded

## Required Changes

### 1. Import the new component (at top of file)
```javascript
import { MatchReasonCards } from '../components/talent/campaign';
```

### 2. Replace the "Show AI Analysis" section
Find the current expandable section (around line 300-350) and restructure it:

**Before**: Simple toggle button "Show/Hide AI Analysis"

**After**: Two-part expandable UI:
- Always visible: MatchReasonCards component showing the 5 factors as compact cards
- Expandable section: Detailed AI analysis (key_strengths, concerns, reasoning)

### 3. Updated UI Structure
```jsx
{/* Why This Match Section - Always Visible */}
<div className="mt-4 pt-4 border-t border-zinc-700/50">
  <div className="flex items-center justify-between mb-3">
    <h4 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
      <Sparkles className="w-4 h-4 text-purple-400" />
      Why This Match?
    </h4>
    <button
      onClick={() => setExpanded(!expanded)}
      className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
    >
      {expanded ? 'Hide Details' : 'See Full Analysis'}
      {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
    </button>
  </div>

  {/* Always show factor cards */}
  <MatchReasonCards
    factors={match.match_factors}
    insights={{
      key_strengths: analysis?.key_strengths,
      concerns: analysis?.concerns
    }}
    compact={!expanded}
  />

  {/* Expandable detailed analysis */}
  <AnimatePresence>
    {expanded && (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        {/* Existing AI analysis content: key_strengths, concerns, reasoning */}
        <div className="mt-4 space-y-4">
          {/* Key Strengths */}
          {analysis?.key_strengths?.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
                Key Strengths
              </h5>
              <ul className="space-y-1">
                {analysis.key_strengths.map((strength, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Concerns */}
          {analysis?.concerns?.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs font-medium text-amber-400 uppercase tracking-wider">
                Considerations
              </h5>
              <ul className="space-y-1">
                {analysis.concerns.map((concern, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    {concern}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* AI Reasoning */}
          {analysis?.reasoning && (
            <div className="space-y-2">
              <h5 className="text-xs font-medium text-purple-400 uppercase tracking-wider">
                AI Reasoning
              </h5>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {analysis.reasoning}
              </p>
            </div>
          )}
        </div>
      </motion.div>
    )}
  </AnimatePresence>
</div>
```

### 4. Add necessary imports
Ensure these are imported:
```javascript
import { ChevronUp, ChevronDown, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
```

### 5. Handle missing data gracefully
Add fallback handling if match_factors is missing:
```javascript
const factors = match.match_factors || {
  skills_fit: match.match_score || 0,
  experience_fit: match.match_score || 0,
  title_fit: match.match_score || 0,
  timing_score: 50,
  culture_fit: 50
};
```

## Testing
1. Navigate to a campaign with matched candidates
2. Each candidate card should show the "Why This Match?" section
3. Factor cards should display with correct percentages and colors
4. Click "See Full Analysis" to expand detailed view
5. All animations should be smooth
```

---

## Phase 3: Polish and Consistency Updates

### Objective
Apply the Match Reason Cards pattern to other match card variants and add finishing touches.

### Claude Code Prompt

```
# Polish Match Reason Cards and Apply Pattern Across Components

## Context
QW-2 Phases 1-2 complete. The MatchReasonCards component is integrated into CandidateMatchResultCard. Now we need to:
1. Update the existing MatchFactorsBar component to use consistent styling
2. Add hover tooltips to factor cards showing detailed descriptions
3. Ensure mobile responsiveness
4. Add empty/loading states

## Files to Modify

### 1. Update MatchFactorsBar in CandidateMatchCard.jsx
Path: `/src/components/talent/CandidateMatchCard.jsx`

The existing MatchFactorsBar shows simple vertical bars. Update it to match the new design language while keeping it compact for use in smaller card variants.

**Changes**:
- Use the same color-coding logic as MatchReasonCards
- Add tooltips on hover showing factor name and percentage
- Improve bar styling to match new design

```jsx
const MatchFactorsBar = ({ factors, size = 'default' }) => {
  const factorData = [
    { key: "skills_fit", label: "Skills", color: "blue" },
    { key: "experience_fit", label: "Experience", color: "purple" },
    { key: "title_fit", label: "Title", color: "cyan" },
    { key: "timing_score", label: "Timing", color: "amber" },
    { key: "culture_fit", label: "Culture", color: "emerald" },
  ];

  const getScoreColor = (score) => {
    if (score >= 80) return 'emerald';
    if (score >= 60) return 'yellow';
    if (score >= 40) return 'orange';
    return 'red';
  };

  return (
    <div className={`flex items-end gap-1 ${size === 'compact' ? 'h-8' : 'h-12'}`}>
      {factorData.map(({ key, label, color }) => {
        const score = factors?.[key] ?? 0;
        const height = Math.max(10, score);
        const dynamicColor = getScoreColor(score);

        return (
          <div key={key} className="group relative flex-1">
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1
                          bg-zinc-900 border border-zinc-700 rounded text-xs whitespace-nowrap
                          opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              <span className="text-zinc-300">{label}:</span>
              <span className={`ml-1 font-medium text-${dynamicColor}-400`}>{score}%</span>
            </div>

            {/* Bar */}
            <motion.div
              className={`w-full rounded-t bg-${dynamicColor}-500/80`}
              initial={{ height: 0 }}
              animate={{ height: `${height}%` }}
              transition={{ duration: 0.5, delay: factorData.indexOf({ key }) * 0.1 }}
            />
          </div>
        );
      })}
    </div>
  );
};
```

### 2. Add Tooltips to MatchReasonCards
Path: `/src/components/talent/campaign/MatchReasonCards.jsx`

Add hover tooltips to each factor card showing:
- Full factor description
- Comparison to average candidates (if available)

```jsx
const FactorCard = ({ factorKey, score, config, compact, index }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <motion.div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      // ... existing props
    >
      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2
                      bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl
                      text-xs max-w-48 z-20"
          >
            <p className="text-zinc-300">{config.description}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Existing card content */}
    </motion.div>
  );
};
```

### 3. Mobile Responsiveness
Update MatchReasonCards for mobile:

```jsx
// In the main grid container
<div className={`
  ${compact
    ? 'flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700'
    : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3'
  }
`}>
  {/* Cards */}
</div>
```

### 4. Empty/Loading States
Add to MatchReasonCards:

```jsx
// Loading state
if (!factors) {
  return (
    <div className="flex gap-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex-1 h-24 bg-zinc-800/50 rounded-xl animate-pulse" />
      ))}
    </div>
  );
}

// Empty state (all zeros or undefined)
const hasValidData = Object.values(factors).some(v => v > 0);
if (!hasValidData) {
  return (
    <div className="p-4 bg-zinc-800/30 rounded-xl border border-zinc-700/30 text-center">
      <p className="text-sm text-zinc-500">Match factors not yet analyzed</p>
    </div>
  );
}
```

## Testing Checklist
1. [ ] Factor cards display correctly with all score ranges (0-100)
2. [ ] Color coding works: green (80+), yellow (60-79), orange (40-59), red (<40)
3. [ ] Hover tooltips appear and disappear smoothly
4. [ ] Mobile view scrolls horizontally in compact mode
5. [ ] Loading skeleton appears when data is fetching
6. [ ] Empty state shows when no factor data exists
7. [ ] Animations are smooth and performant
8. [ ] All existing campaign functionality still works
```

---

## Summary

| Phase | Component/File | Effort | Description |
|-------|---------------|--------|-------------|
| 1 | MatchReasonCards.jsx | 1 day | New component for visual factor breakdown |
| 2 | TalentCampaignDetail.jsx | 1 day | Integrate "Why This Match?" section |
| 3 | Polish & consistency | 0.5-1 day | Tooltips, mobile, empty states |

## Data Dependencies
The implementation relies on these fields from match data:
```javascript
match = {
  match_score: 85,           // Overall score (0-100)
  match_factors: {
    skills_fit: 90,          // Skills alignment (0-100)
    experience_fit: 85,      // Experience relevance (0-100)
    title_fit: 80,           // Title match (0-100)
    timing_score: 75,        // Career timing (0-100)
    culture_fit: 70          // Culture alignment (0-100)
  },
  ai_analysis: {
    key_strengths: [...],    // Array of strength strings
    concerns: [...],         // Array of concern strings
    reasoning: "..."         // AI explanation text
  },
  match_reasons: [...]       // Legacy: array of reason strings
}
```

## Commit Messages
- Phase 1: `feat(QW-2): Create MatchReasonCards component with visual factor breakdown`
- Phase 2: `feat(QW-2): Integrate Why This Match section into CandidateMatchResultCard`
- Phase 3: `feat(QW-2): Polish Match Reason Cards - tooltips, mobile, empty states`
