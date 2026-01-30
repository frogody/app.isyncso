# SENTINEL Transformation Agent - Master Context

> **Agent ID**: sentinel-transform
> **Version**: 1.0.0
> **Created**: 2026-01-31
> **Purpose**: Complete redesign and rebuild of SENTINEL EU AI Act Compliance Module

---

## Agent Reference Files

This agent has access to the following context files. **Always read these before making changes:**

| File | Path | Purpose |
|------|------|---------|
| **Master Context** | `.claude/agents/sentinel-transform/AGENT_CONTEXT.md` | This file - overview and instructions |
| **Design Tokens** | `.claude/agents/sentinel-transform/DESIGN_TOKENS.md` | Color, typography, spacing specifications |
| **Component Specs** | `.claude/agents/sentinel-transform/COMPONENT_SPECS.md` | Component-by-component migration specs |
| **Migration Checklist** | `.claude/agents/sentinel-transform/MIGRATION_CHECKLIST.md` | Task tracking and progress |
| **Current State Analysis** | `.claude/agents/sentinel-transform/CURRENT_STATE.md` | Analysis of existing implementation |
| **Design System Reference** | `ISYNCSO_Design_System_Analysis_MeetSync_Reference.docx` | Original design system document |
| **Main Guidelines** | `CLAUDE.md` | Project-wide development guidelines |

---

## Mission Statement

Transform SENTINEL from its current implementation to a modern, design-system-compliant, production-ready module with:

1. **Design System Alignment** - Apply ISYNCSO design tokens consistently
2. **Framer Motion Animations** - Replace animated.js with Framer Motion
3. **TypeScript Migration** - Add type safety to all components
4. **Custom Hooks** - Extract data fetching into reusable hooks
5. **Error Handling** - Add error boundaries and graceful degradation
6. **Testing** - Add component and integration tests

---

## Current State Summary

### Tech Stack
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase
- **Routing**: React Router DOM v7
- **State**: Local React state (no library)

### Files to Transform

#### Pages (`/src/pages/`)
| File | Lines | Priority |
|------|-------|----------|
| `Sentinel.jsx` | ~200 | Medium |
| `SentinelDashboard.jsx` | ~500 | **High** |
| `AISystemInventory.jsx` | ~600 | **High** |
| `ComplianceRoadmap.jsx` | ~450 | High |
| `DocumentGenerator.jsx` | ~350 | Medium |

#### Components (`/src/components/sentinel/`)
| Component | Purpose | Priority |
|-----------|---------|----------|
| `AISystemModal.jsx` | Registration modal | **High** |
| `RiskAssessmentWizard.jsx` | 5-step classification | **High** |
| `EnhancedSystemCard.jsx` | System display card | High |
| `QuickActions.jsx` | Dashboard actions | Medium |
| `WorkflowStepper.jsx` | Progress workflow | Medium |
| `RiskClassificationBadge.jsx` | Risk badges | Low |
| `TechnicalDocTemplate.jsx` | Doc template | Low |
| `DeclarationOfConformity.jsx` | Conformity template | Low |

---

## Transformation Phases

### Phase 1: Foundation (Priority: Critical)
1. Create `/src/tokens/sentinel.ts` with design tokens
2. Create `/src/hooks/sentinel/` directory for custom hooks
3. Create `/src/components/sentinel/ui/` for base UI components
4. Set up error boundary wrapper

### Phase 2: Design System (Priority: High)
1. Update Tailwind config with Sentinel tokens
2. Create base components (Button, Card, Badge, Input)
3. Implement animation variants with Framer Motion

### Phase 3: Component Migration (Priority: High)
1. Migrate StatCard component
2. Migrate ActionCard component
3. Migrate WorkflowStepper
4. Migrate RiskBadge
5. Update all pages to use new components

### Phase 4: Data Layer (Priority: Medium)
1. Create `useAISystems` hook
2. Create `useComplianceStatus` hook
3. Create `useRoadmap` hook
4. Add React Query for caching

### Phase 5: Polish (Priority: Medium)
1. Add loading skeletons
2. Add error states
3. Add empty states
4. Add success/toast notifications

### Phase 6: Testing (Priority: Low)
1. Add component unit tests
2. Add hook tests
3. Add integration tests

---

## Critical Rules

### DO:
- Always read the relevant context file before modifying a component
- Use Framer Motion for all animations
- Follow the design token specifications exactly
- Add TypeScript types to all new code
- Create custom hooks for data fetching
- Add JSDoc comments to exported functions
- Test changes locally before committing

### DON'T:
- Don't use animated.js (deprecated)
- Don't hardcode colors - use design tokens
- Don't skip error handling
- Don't mix old and new patterns in the same component
- Don't create one-off styles - use design system
- Don't commit without testing

---

## Quick Commands

```bash
# Run dev server
npm run dev

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Deploy edge function
SUPABASE_ACCESS_TOKEN="sbp_b998952de7493074e84b50702e83f1db14be1479" \
npx supabase functions deploy [function-name] --project-ref sfxpmzicgpaxfntqleig --no-verify-jwt
```

---

## Progress Tracking

Update `.claude/agents/sentinel-transform/MIGRATION_CHECKLIST.md` after completing each task.

Report status format:
```
## Status Update: [DATE]
- Completed: [list]
- In Progress: [list]
- Blocked: [list with reasons]
- Next: [planned tasks]
```
