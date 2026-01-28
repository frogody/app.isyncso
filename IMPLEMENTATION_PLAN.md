# ISYNCSO Talent System Enhancement - Implementation Plan

**Created:** January 28, 2026
**Reference:** TALENT_SYSTEM_ANALYSIS_REPORT.docx
**Status:** In Progress

---

## Implementation Overview

This plan implements the improvements identified in the Talent System Analysis Report. Each phase has clear deliverables, testing checkpoints, and Claude Code prompts.

**Workflow:**
1. Cowork provides Claude Code prompt
2. Gody pastes prompt → Claude Code implements
3. Gody pastes response back to Cowork
4. Cowork tests via Chrome extension
5. Approve or iterate → move to next task

---

## Phase 1: Quick Wins & Foundation (Weeks 1-4)

### 1.1 Profile Executive Summary Card
**Priority:** High | **Effort:** 3-4 days | **Dependencies:** None

**Goal:** Add a scannable summary card at the top of CandidateDetailDrawer showing key decision points.

**Tasks:**
- [ ] Task 1.1.1: Create ProfileSummaryCard component
- [ ] Task 1.1.2: Integrate into CandidateDetailDrawer
- [ ] Task 1.1.3: Test and refine

**Files to modify:**
- `src/components/talent/CandidateDetailDrawer.jsx`
- New: `src/components/talent/ProfileSummaryCard.jsx`

**Testing Checklist:**
- [ ] Summary card appears at top of drawer
- [ ] Shows: Intel Score, Level Badge, Approach Badge
- [ ] Shows: Key timing signal with urgency indicator
- [ ] Shows: Best outreach angle (truncated)
- [ ] Shows: Top 3 skills
- [ ] Responsive on different screen sizes

---

### 1.2 Match Reason Cards in Campaign View
**Priority:** High | **Effort:** 2-3 days | **Dependencies:** None

**Goal:** Show expandable "Why This Match" cards on campaign candidate list.

**Tasks:**
- [ ] Task 1.2.1: Create MatchReasonCard component
- [ ] Task 1.2.2: Integrate into TalentCampaignDetail candidate rows
- [ ] Task 1.2.3: Test expansion/collapse behavior

**Files to modify:**
- `src/pages/TalentCampaignDetail.jsx`
- New: `src/components/talent/MatchReasonCard.jsx`

**Testing Checklist:**
- [ ] Match cards show on campaign detail page
- [ ] Click to expand/collapse works
- [ ] Shows match_factors breakdown (skills, experience, etc.)
- [ ] Shows ai_analysis text
- [ ] Shows match_reasons list

---

### 1.3 Quick Triage Hover Cards
**Priority:** Medium | **Effort:** 2-3 days | **Dependencies:** None

**Goal:** Add hover preview cards on candidate list for quick triage.

**Tasks:**
- [ ] Task 1.3.1: Create CandidateHoverCard component
- [ ] Task 1.3.2: Integrate into TalentCandidates list
- [ ] Task 1.3.3: Handle hover delay and positioning

**Files to modify:**
- `src/pages/TalentCandidates.jsx`
- New: `src/components/talent/CandidateHoverCard.jsx`

**Testing Checklist:**
- [ ] Hover on candidate row shows preview after 300ms
- [ ] Card shows key info without opening drawer
- [ ] Card dismisses on mouse leave
- [ ] Works in both table and grid view

---

### 1.4 Candidate Vector Embeddings (Foundation)
**Priority:** Critical | **Effort:** 2 weeks | **Dependencies:** None

**Goal:** Generate and store vector embeddings for all candidate profiles.

**Tasks:**
- [ ] Task 1.4.1: Create database migration for embedding column
- [ ] Task 1.4.2: Create generateCandidateEmbedding Edge Function
- [ ] Task 1.4.3: Create database trigger for auto-generation
- [ ] Task 1.4.4: Backfill existing candidates
- [ ] Task 1.4.5: Test embedding generation

**Files to create/modify:**
- New: `supabase/migrations/20260128200000_candidate_embeddings.sql`
- New: `supabase/functions/generateCandidateEmbedding/index.ts`

**Testing Checklist:**
- [ ] New candidates get embeddings automatically
- [ ] Backfill job completes for existing candidates
- [ ] Embeddings are 1024 dimensions
- [ ] Index created for fast similarity search

---

### 1.5 Semantic Search Endpoint
**Priority:** Critical | **Effort:** 1 week | **Dependencies:** 1.4

**Goal:** Create vector similarity search RPC function.

**Tasks:**
- [ ] Task 1.5.1: Create search_candidates_semantic RPC function
- [ ] Task 1.5.2: Test with sample queries
- [ ] Task 1.5.3: Optimize performance

**Files to create/modify:**
- `supabase/migrations/20260128200000_candidate_embeddings.sql` (add RPC)

**Testing Checklist:**
- [ ] RPC function returns similar candidates
- [ ] Respects organization_id filter
- [ ] Returns similarity scores
- [ ] Performance is acceptable (<500ms)

---

## Phase 2: Search & Matching (Weeks 5-10)

### 2.1 Natural Language Search Interface
**Priority:** High | **Effort:** 3 weeks | **Dependencies:** 1.4, 1.5

**Goal:** Add AI-powered query parsing to search bar.

**Tasks:**
- [ ] Task 2.1.1: Create naturalLanguageSearch Edge Function
- [ ] Task 2.1.2: Update SearchFilterBar with NL mode toggle
- [ ] Task 2.1.3: Create search result explanation component
- [ ] Task 2.1.4: Test various natural language queries

**Files to modify:**
- `src/components/talent/SearchFilterBar.jsx`
- New: `supabase/functions/naturalLanguageSearch/index.ts`
- New: `src/components/talent/SearchExplanation.jsx`

**Testing Checklist:**
- [ ] NL mode toggle works
- [ ] Query like "audit professionals at growing companies" returns relevant results
- [ ] Shows explanation of what was searched
- [ ] Graceful fallback on parse errors

---

### 2.2 Weighted Matching Criteria UI
**Priority:** High | **Effort:** 2 weeks | **Dependencies:** None

**Goal:** Allow recruiters to customize match criteria weights.

**Tasks:**
- [ ] Task 2.2.1: Create CriteriaWeightingStep component
- [ ] Task 2.2.2: Integrate into CampaignWizard
- [ ] Task 2.2.3: Update analyzeCampaignProject to use custom weights
- [ ] Task 2.2.4: Test weight customization

**Files to modify:**
- `src/components/talent/CampaignWizard.jsx`
- `supabase/functions/analyzeCampaignProject/index.ts`
- New: `src/components/talent/CriteriaWeightingStep.jsx`

**Testing Checklist:**
- [ ] Weight sliders appear in campaign wizard
- [ ] Weights are saved to campaign.role_context.criteria_weights
- [ ] AI matching respects custom weights
- [ ] Match scores reflect weight changes

---

## Phase 3: Intelligence & UX (Weeks 11-20)

### 3.1 Full RAG Search System
**Priority:** High | **Effort:** 6-8 weeks | **Dependencies:** 1.4, 1.5, 2.1

**Goal:** Comprehensive semantic search across all candidate data.

### 3.2 Smart Candidate Scoring Dashboard
**Priority:** Medium | **Effort:** 4-6 weeks | **Dependencies:** 3.1, 2.2

**Goal:** Proactive matching dashboard showing "Today's Top Matches".

### 3.3 Profile Display Redesign
**Priority:** Medium | **Effort:** 4-6 weeks | **Dependencies:** None (parallel)

**Goal:** Visual hierarchy optimization for candidate profiles.

---

## Progress Tracking

| Task | Status | Started | Completed | Notes |
|------|--------|---------|-----------|-------|
| 1.1.1 ProfileSummaryCard | Not Started | | | |
| 1.1.2 Integrate into Drawer | Not Started | | | |
| 1.1.3 Test and refine | Not Started | | | |
| 1.2.1 MatchReasonCard | Not Started | | | |
| 1.2.2 Integrate into Campaign | Not Started | | | |
| 1.2.3 Test expansion | Not Started | | | |
| ... | | | | |

---

## Context Recovery Instructions

**If context is lost, read these files:**
1. `IMPLEMENTATION_PLAN.md` - This file, current progress
2. `TALENT_SYSTEM_ANALYSIS_REPORT.docx` - Full analysis and specs
3. `CLAUDE.md` - Development guidelines and patterns

**Current working task:** Task 1.1.1 - Create ProfileSummaryCard component

---

## Claude Code Prompt Templates

### Standard Implementation Prompt Format:
```
## Task: [Brief description]

### Context
- Reference: IMPLEMENTATION_PLAN.md Task [X.X.X]
- Files: [list files to read/modify]
- Dependencies: [any completed tasks this builds on]

### Requirements
1. [Specific requirement 1]
2. [Specific requirement 2]
...

### Files to Modify
- `path/to/file.jsx` - [what to change]

### Technical Notes
- [Any specific patterns to follow]
- [Reference existing code patterns]

### Verification
After changes, confirm:
- [ ] [Check 1]
- [ ] [Check 2]
```
