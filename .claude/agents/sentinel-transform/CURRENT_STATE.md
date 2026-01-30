# SENTINEL Current State Analysis

> **Analyzed**: 2026-01-31
> **Source**: Frontend analysis via Claude in Chrome + Claude Code

---

## Project Configuration

| Property | Value |
|----------|-------|
| **Framework** | React 18 + Vite |
| **Language** | JavaScript (JSX) - No TypeScript on components |
| **Styling** | Tailwind CSS |
| **Database** | Supabase |
| **Routing** | React Router DOM v7 |
| **State Management** | Local React state only |
| **Animation** | animated.js (legacy), Framer Motion (partial) |

---

## File Inventory

### Pages

| File | Path | Lines | TypeScript |
|------|------|-------|------------|
| Sentinel.jsx | `/src/pages/Sentinel.jsx` | ~200 | ❌ |
| SentinelDashboard.jsx | `/src/pages/SentinelDashboard.jsx` | ~500 | ❌ |
| AISystemInventory.jsx | `/src/pages/AISystemInventory.jsx` | ~600 | ❌ |
| ComplianceRoadmap.jsx | `/src/pages/ComplianceRoadmap.jsx` | ~450 | ❌ |
| DocumentGenerator.jsx | `/src/pages/DocumentGenerator.jsx` | ~350 | ❌ |

### Components

| File | Path | Lines | TypeScript |
|------|------|-------|------------|
| AISystemModal.jsx | `/src/components/sentinel/AISystemModal.jsx` | ~400 | ❌ |
| RiskAssessmentWizard.jsx | `/src/components/sentinel/RiskAssessmentWizard.jsx` | ~600 | ❌ |
| EnhancedSystemCard.jsx | `/src/components/sentinel/EnhancedSystemCard.jsx` | ~150 | ❌ |
| QuickActions.jsx | `/src/components/sentinel/QuickActions.jsx` | ~100 | ❌ |
| WorkflowStepper.jsx | `/src/components/sentinel/WorkflowStepper.jsx` | ~200 | ❌ |
| RiskClassificationBadge.jsx | `/src/components/sentinel/RiskClassificationBadge.jsx` | ~80 | ❌ |
| TechnicalDocTemplate.jsx | `/src/components/sentinel/TechnicalDocTemplate.jsx` | ~300 | ❌ |
| DeclarationOfConformity.jsx | `/src/components/sentinel/DeclarationOfConformity.jsx` | ~250 | ❌ |

### Data Layer

| File | Path | Exports |
|------|------|---------|
| entities.js | `/src/api/entities.js` | `AISystem`, `Obligation`, `ComplianceRequirement`, `RegulatoryDocument` |
| supabaseClient.js | `/src/api/supabaseClient.js` | Supabase client instance |

### Utilities

| File | Path | Purpose |
|------|------|---------|
| index.ts | `/src/utils/index.ts` | `createPageUrl()` routing helper |
| compliance.ts | `/src/lib/agents/agents/compliance.ts` | LLM compliance agent (demo, not wired) |

---

## Current Styling Patterns

### Color Classes Used

```css
/* Primary Theme (Mint Green) */
bg-[#86EFAC]           /* Solid primary */
bg-[#86EFAC]/10        /* 10% tint background */
bg-[#86EFAC]/20        /* 20% tint background */
text-[#86EFAC]         /* Primary text */
border-[#86EFAC]/30    /* Primary border */
border-[#86EFAC]/50    /* Stronger border */

/* Backgrounds */
bg-black               /* Page background */
bg-zinc-900/50         /* Card surface */
bg-zinc-900/60         /* Elevated surface */
bg-white/5             /* Subtle overlay */

/* Borders */
border-zinc-800/60     /* Default card border */
border-white/10        /* Light border */

/* Text */
text-white             /* Primary text */
text-gray-300          /* Secondary text */
text-gray-400          /* Muted text */
text-zinc-400          /* Alternative muted */
text-zinc-500          /* Disabled/placeholder */

/* Semantic */
text-red-400           /* Error */
bg-red-500/20          /* Error background */
text-yellow-400        /* Warning */
text-green-400         /* Success */
```

### Border Radius Patterns

```css
rounded-xl             /* 12px - Cards, navigation */
rounded-lg             /* 8px - Buttons, inputs */
rounded-full           /* 9999px - Badges, avatars */
rounded-md             /* 6px - Small elements */
```

**Issue**: Design system specifies 20px for cards, current uses 12px.

### Animation Classes

```css
transition-all duration-200
transition-all duration-300
hover:scale-105
hover:bg-zinc-800/50
```

---

## Data Flow Analysis

### Current Pattern

```
Page Component
    ↓
    └── useEffect(() => {
          db.entities.AISystem.list()
            .then(setData)
        }, [])
    ↓
Local State (useState)
    ↓
Render
```

### Issues with Current Pattern

1. **No caching** - Every mount triggers fresh fetch
2. **No error handling** - Errors may crash or show blank
3. **No loading states** - Components pop in without indication
4. **No deduplication** - Same data fetched multiple times
5. **Tight coupling** - Data fetching mixed with presentation

### Target Pattern

```
Page Component
    ↓
    └── useAISystems({ filters, pagination })
         ↓
         └── React Query / Custom cache
              ↓
              └── db.entities.AISystem.list()
    ↓
Hook returns { data, loading, error, refetch }
    ↓
Render with loading/error states
```

---

## Component Analysis

### SentinelDashboard

**Current Structure**:
```
SentinelDashboard
├── Header (inline)
│   ├── Title
│   └── Register Button
├── Stats Row (inline)
│   ├── Compliance Score Gauge
│   ├── AI Systems Count
│   ├── High-Risk Count
│   ├── Compliant Count
│   └── In Progress Count
├── Workflow Steps (inline)
│   ├── Register Step
│   ├── Classify Step
│   ├── Plan Step
│   └── Document Step
├── Quick Actions (inline)
│   ├── Register New System
│   ├── View Roadmap
│   └── Generate Documents
├── Risk Classification Card (inline)
│   └── Risk Level Rows
├── Compliance Status Card (inline)
│   └── Status Rows
└── Welcome CTA (inline)
```

**Problems**:
- All components defined inline
- No separation of concerns
- No reusability
- Hardcoded colors/values

### AISystemInventory

**Current Structure**:
```
AISystemInventory
├── Header (inline)
├── Stats Row (reused pattern)
├── Search/Filter Bar (inline)
└── System Grid/List
    └── SystemCard (inline or component)
```

**Problems**:
- Pagination logic mixed with UI
- Filter state managed locally
- No URL sync for filters

---

## Database Tables Used

### ai_systems

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| organization_id | UUID | FK to organizations |
| name | TEXT | System name |
| description | TEXT | System description |
| vendor | TEXT | System vendor/provider |
| version | TEXT | System version |
| risk_classification | TEXT | prohibited, high_risk, gpai, limited_risk, minimal_risk, unclassified |
| compliance_status | TEXT | not_started, in_progress, compliant, non_compliant |
| purpose | TEXT | Intended use |
| affected_persons | TEXT[] | Categories of affected people |
| created_at | TIMESTAMP | Creation date |
| updated_at | TIMESTAMP | Last update |

### Related Tables

- `obligations` - EU AI Act requirements
- `compliance_requirements` - Specific compliance items
- `regulatory_documents` - Generated documents

---

## Edge Functions

| Function | Purpose | Status |
|----------|---------|--------|
| `analyzeAISystem` | CIDE AI research pre-fill | Active |
| `generateComplianceDoc` | Generate Annex IV docs | Unknown |

---

## Known Issues

### Technical Debt

1. **No TypeScript** - All components are JSX
2. **No Tests** - Zero test coverage
3. **No Error Boundaries** - Errors crash entire sections
4. **Hardcoded Colors** - Design tokens not used
5. **animated.js Dependency** - Legacy animation library
6. **No Custom Hooks** - Data fetching duplicated
7. **No Loading States** - Poor UX during data fetch
8. **No Empty States** - Blank screens when no data

### Design Issues

1. **Card radius** - 12px instead of 20px
2. **Button styles** - Not consistent pill shape
3. **Shadow usage** - Minimal/none on cards
4. **Color inconsistency** - Mix of #86EFAC and other greens

### Performance Issues

1. **No lazy loading** - All components load at once
2. **No data caching** - Redundant API calls
3. **Large bundles** - No code splitting

---

## Recommended Priority Order

1. **Phase 1**: Create design tokens + base components
2. **Phase 2**: Migrate dashboard (highest visibility)
3. **Phase 3**: Create custom hooks (foundation for others)
4. **Phase 4**: Migrate inventory page
5. **Phase 5**: Migrate roadmap + document generator
6. **Phase 6**: Add tests + polish

---

*This analysis should be updated as components are migrated*
