# Agent 1: Matching Algorithm Audit Report

**File under review:** `supabase/functions/analyzeCampaignProject/index.ts`
**Date:** 2026-02-26

---

## 1. Current Architecture Analysis

### 1.1 Pipeline Overview

The matching system is a 3-stage pipeline plus pre-processing filters:

```
Candidates (DB) -> Data Completeness Filter -> Company Rule Filter ->
  Stage 1: Rule-based Pre-filter (deal-breakers, must-haves, title, skills, intelligence, target company)
  Stage 2: Deep AI Analysis (Groq LLM, batches of 5) OR Fallback Rule-based Analysis
  Stage 3: Priority Ranking (timing urgency + outreach hook boosts)
-> Final ranked matches stored to campaign + candidate_campaign_matches table
```

### 1.2 Strengths

- **Well-structured multi-stage pipeline.** Cheap rule-based filtering first, expensive LLM analysis only on survivors, then final priority re-ranking.
- **Comprehensive role context model.** The `RoleContext` interface supports must-haves, deal-breakers, target companies, ideal background, experience level, and custom criteria weights.
- **Configurable criteria weights.** The `CriteriaWeights` system with normalization to 100% and presets is well-designed. `validateAndNormalizeWeights()` handles edge cases properly (zero total, non-100 total, missing fields).
- **Signal-based matching.** 8 signals (M&A, layoffs, leadership change, funding, promotion, tenure anniversary, stagnation, high flight risk) with configurable boost/required filters.
- **Company rule enforcement (ISS-003).** "Do not poach" and boost rules correctly implemented -- exclusion happens before Stage 1, boost happens after scoring.
- **Data completeness guard (ISS-005).** `hasMinimumMatchData()` prevents garbage-in-garbage-out by requiring `(current role OR work history) AND (skills OR education OR work history)`.
- **Conservative fallback defaults (ISS-001).** Default factors start at 20-30 baseline (not 50), confidence capped at 80% for rule-based analysis.

### 1.3 Weaknesses

- **No embedding-based pre-filtering.** ALL candidates in the organization are loaded from the database (`SELECT *`) and filtered in-memory. For pools of 5,000+ candidates, this does not scale.
- **LLM model mismatch.** Line 521 uses `meta-llama/llama-4-scout-17b-16e-instruct` but the CLAUDE.md documentation says `llama-3.3-70b-versatile`. The 17B model will produce lower-quality scoring.
- **Batch size too small.** Batches of 5 with sequential processing: 50 candidates = 10 API calls with ~1-2s overhead each.
- **No retry logic for LLM calls.** A transient 429 rate-limit error causes the entire batch to silently fall back to rule-based scoring.
- **No parallelism in LLM calls.** The `for` loop is sequential. These batches are independent and could use `Promise.allSettled()` for 5-10x latency reduction.
- **Stage 3 is weak.** Only +5 for high-urgency timing and +2 per outreach hook (max +5). This double-dips with timing_score already embedded in the weighted score.
- **`SELECT *` on candidates.** Large JSONB columns (`raw_data`, `work_history`, `education`, `intelligence`) are loaded but mostly unused during matching.

---

## 2. Vector Embedding Implementation Plan

### 2.1 Existing Infrastructure

The codebase already has robust vector embedding infrastructure:

| Component | Status | Details |
|-----------|--------|---------|
| **pgvector extension** | Enabled | `CREATE EXTENSION IF NOT EXISTS vector;` in `20260204150000_rag_outreach_system.sql` |
| **HNSW indexes** | In use | On `knowledge_documents`, `prospect_intelligence`, `interaction_memory`, `learned_patterns` |
| **Embedding model** | Configured | `BAAI/bge-large-en-v1.5` via Together.ai, 1024 dimensions |
| **Embedding functions** | Available | `supabase/functions/sync/memory/embeddings.ts` -- `generateEmbedding()`, `generateEmbeddings()` (batch), `cosineSimilarity()`, `embeddingToPostgresVector()` |
| **TOGETHER_API_KEY** | Set | Already used by SYNC memory system |
| **Candidate table** | No vector column | Needs migration to add `profile_embedding vector(1024)` |

### 2.2 Step 1: Database Migration

```sql
-- Migration: 20260226_candidate_profile_embeddings.sql

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS profile_embedding vector(1024);

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS embedding_generated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_candidates_profile_embedding
  ON public.candidates USING hnsw (profile_embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_candidates_has_embedding
  ON public.candidates (organization_id)
  WHERE profile_embedding IS NOT NULL;
```

### 2.3 Step 2: Embedding Generation on Enrichment

Add to `generateCandidateIntelligence/index.ts` after intelligence is saved:

```typescript
import { generateEmbedding, embeddingToPostgresVector } from '../sync/memory/embeddings.ts';

function buildCandidateEmbeddingText(candidate: CandidateData, intelligence: any): string {
  const parts: string[] = [];
  if (candidate.job_title) parts.push(`Current role: ${candidate.job_title}`);
  if (candidate.company_name) parts.push(`Company: ${candidate.company_name}`);
  if (candidate.skills?.length) parts.push(`Skills: ${candidate.skills.join(', ')}`);
  if (candidate.years_at_company) parts.push(`${candidate.years_at_company} years at current company`);
  if (candidate.industry) parts.push(`Industry: ${candidate.industry}`);
  if (candidate.person_home_location) parts.push(`Location: ${candidate.person_home_location}`);
  if (intelligence?.career_trajectory) parts.push(`Career trajectory: ${intelligence.career_trajectory}`);
  if (intelligence?.key_insights?.length) parts.push(`Key insights: ${intelligence.key_insights.slice(0, 3).join('. ')}`);
  return parts.join('. ');
}

// After saving intelligence to DB:
const embeddingText = buildCandidateEmbeddingText(candidate, intelligence);
const embedding = await generateEmbedding(embeddingText);
const pgVector = embeddingToPostgresVector(embedding);

await supabase
  .from('candidates')
  .update({
    profile_embedding: pgVector,
    embedding_generated_at: new Date().toISOString()
  })
  .eq('id', candidate.id);
```

### 2.4 Step 3: Role Embedding + Stage 0 Vector Pre-filter

In `analyzeCampaignProject/index.ts`, build a role description embedding and use pgvector to retrieve top-200 similar candidates before any rule-based processing:

```typescript
function buildRoleEmbeddingText(role: Role, roleContext: RoleContext | undefined): string {
  const parts: string[] = [];
  parts.push(`Role: ${role.title}`);
  if (role.department) parts.push(`Department: ${role.department}`);
  if (role.requirements) parts.push(`Requirements: ${role.requirements}`);
  if (roleContext?.perfect_fit_criteria) parts.push(`Ideal candidate: ${roleContext.perfect_fit_criteria}`);
  const mustHaves = normalizeToArray(roleContext?.must_haves);
  if (mustHaves.length) parts.push(`Must have: ${mustHaves.join(', ')}`);
  if (roleContext?.ideal_background) parts.push(`Ideal background: ${roleContext.ideal_background}`);
  return parts.join('. ');
}

// Stage 0: Vector Pre-filter
const roleText = buildRoleEmbeddingText(role, roleContext);
const roleEmbedding = await generateEmbedding(roleText);
const pgVector = embeddingToPostgresVector(roleEmbedding);

const { data: similarCandidates } = await supabase
  .rpc('match_candidates_by_embedding', {
    p_organization_id: organizationId,
    p_query_embedding: pgVector,
    p_match_count: 200,
    p_match_threshold: 0.3
  });
```

Supporting SQL RPC:

```sql
CREATE OR REPLACE FUNCTION match_candidates_by_embedding(
  p_organization_id UUID,
  p_query_embedding vector(1024),
  p_match_count INTEGER DEFAULT 200,
  p_match_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (id UUID, similarity FLOAT)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, (1 - (c.profile_embedding <=> p_query_embedding))::FLOAT as similarity
  FROM public.candidates c
  WHERE c.organization_id = p_organization_id
    AND c.profile_embedding IS NOT NULL
    AND c.excluded_reason IS NULL
    AND (1 - (c.profile_embedding <=> p_query_embedding)) >= p_match_threshold
  ORDER BY c.profile_embedding <=> p_query_embedding
  LIMIT p_match_count;
END;
$$;
```

### 2.5 Graceful Degradation

Fully backward-compatible:
- If `TOGETHER_API_KEY` is missing, vector pre-filter is skipped
- If `candidate_ids` are explicitly provided, vector pre-filter is skipped
- Candidates without embeddings still go through the full pipeline on fallback

### 2.6 Cost Estimates

| Metric | Current | With Vector Pre-filter |
|--------|---------|----------------------|
| Candidates loaded from DB | 5,000 | 200 |
| Together.ai cost per run | 0 | ~$0.0001 (1 embedding call) |
| Per-candidate embedding (one-time) | 0 | ~$0.0001 |
| Total latency estimate | ~15-25s | ~8-15s |

---

## 3. Signal Detection Audit

### 3.1 Issue 1: M&A Pattern Misses Common Phrasings

**Current:** `["M&A", "merger", "acquisition", "acquired", "acquiring", "buyout"]`

**Missing:** `takeover`, `take over`, `consolidat`, `divestiture`, `divest`, `spin-off`, `spinoff`, `carve-out`, `private equity`, `PE-backed`, `absorbed`

**Recommended:** Use `"acqui"` as prefix stem to catch acquired/acquiring/acquisition in one pattern.

### 3.2 Issue 2: Layoffs Pattern Misses International Terminology

**Current:** `["layoff", "restructur", "downsiz", "RIF", "workforce reduction"]`

**Missing:** `redundanc` (UK/EU), `headcount reduction`, `furlough`, `hiring freeze`, `reorganiz`, `reorg`, `right-siz`, `cost.?cutting`

### 3.3 Issue 3: Leadership Change Is Too Narrow

**Current:** `["new CEO", "new CTO", "leadership change", "new management"]`

**Missing:** `new CFO`, `new COO`, `new VP`, `new CMO`, `CEO depart`, `CEO resign`, `executive departure`, `leadership transition`, `board change`, `founder left`, `interim CEO`

### 3.4 Issue 4: Funding Round Has False Positives

**Current:** `["funding", "raised", "Series", "investment round", "IPO"]`

**Problem:** `"funding"` matches "funding allocation". `"raised"` matches "raised concerns". `"Series"` with `"i"` flag matches "a series of meetings".

**Fix:** Use more specific patterns: `"funding round"`, `"raised \\$"`, `"raised \\d+[MBK]"`, `"Series [A-F]"`, `"seed round"`, `"capital raise"`

### 3.5 Issue 5: Tenure Anniversary Is Too Generic

**Current:** `["anniversary", "2 year", "3 year", "5 year", "tenure"]`

**Problem:** `"anniversary"` matches wedding/company anniversaries. Year patterns miss hyphenated forms.

**Fix:** `"work anniversary"`, `"\\d[- ]year anniversary"`, `"tenure at"`, `"years at (the )?company"`

### 3.6 Issue 6: Missing Signal Categories

**Proposed new signals:**

- **`company_decline`**: `"revenue decline"`, `"losing market"`, `"stock drop"`, `"profit warning"`, `"missed targets"`
- **`relocation_disruption`**: `"office clos"`, `"return to office"`, `"RTO mandate"`, `"remote revoked"`
- **`team_attrition`**: `"colleagues leaving"`, `"mass exodus"`, `"attrition"`, `"department shut"`

### 3.7 Structural Issue: Fields Not Searched

Several candidate fields containing signal-relevant text are never searched: `notes`, `career_trajectory`, `flight_risk_factors`, `intelligence_level`, `recommended_approach`. These should be added to the `fields` array.

### 3.8 Performance: Pre-compile Regexes

A new `RegExp` is constructed per signal per candidate. With 8 signals and 200 candidates = 1,600 compilations. Pre-compile once at module load.

---

## 4. Fallback Scoring Improvements

### 4.1 Issue 1: Skills Matching is Substring-based (False Positives)

Current code at line 621: `candidate.skills.filter(s => reqLower.includes(s.toLowerCase()))`. A skill of `"R"` or `"Go"` would match any requirement text containing those letters.

**Fix:** Use word-boundary regex matching with minimum skill length of 2:

```typescript
function skillMatchesRequirement(skill: string, requirement: string): boolean {
  if (skill.length < 2) return false;
  const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'i');
  return regex.test(requirement);
}
```

### 4.2 Issue 2: Title Matching Does Not Handle Seniority

"Senior Software Engineer" vs "Software Engineer" scores poorly because "Senior" does not match.

**Fix:** Add seniority equivalence tables:

```typescript
const TITLE_EQUIVALENCES: Record<string, string[]> = {
  'senior': ['sr', 'lead', 'principal', 'staff'],
  'junior': ['jr', 'associate', 'entry'],
  'engineer': ['developer', 'programmer', 'dev'],
  'manager': ['head', 'director', 'lead'],
  'analyst': ['specialist', 'consultant', 'advisor'],
  'vp': ['vice president', 'svp', 'evp'],
};
```

### 4.3 Issue 3: Location Matching Is Too Simple

Only checks for word overlap and 8 hardcoded countries.

**Fix:** Add region equivalence tables:

```typescript
const REGION_EQUIVALENCES: Record<string, string[]> = {
  'randstad': ['amsterdam', 'rotterdam', 'den haag', 'the hague', 'utrecht'],
  'bay area': ['san francisco', 'sf', 'san jose', 'oakland', 'palo alto', 'mountain view'],
  'benelux': ['netherlands', 'belgium', 'luxembourg'],
  'dach': ['germany', 'austria', 'switzerland'],
  'nyc': ['new york', 'manhattan', 'brooklyn'],
};
```

### 4.4 Issue 4: Experience Fit Does Not Use Work History

Only checks `candidate.years_experience`. Many candidates have `work_history` JSONB with start dates.

**Fix:** Compute years from `work_history` earliest start date. Fallback: estimate `work_history.length * 2.5` years.

### 4.5 Issue 5: No Certification Matching

Certifications are ignored entirely. For specialized roles (CPA, PMP, AWS), they are strong signals.

**Fix:** Check certifications against `role.requirements` and must-haves.

### 4.6 Issue 6: Culture Fit Ignores Past Employers

Only checks current company against target companies.

**Fix:** Check `work_history` past companies against target companies. A candidate who previously worked at a target company gets a culture fit boost.

---

## 5. Additional Issues and Opportunities

### 5.1 LLM Model Discrepancy (P0)

Line 521: `model: "meta-llama/llama-4-scout-17b-16e-instruct"`
Documented: `llama-3.3-70b-versatile`

The 17B model will produce lower quality analysis. This needs investigation -- was it an intentional switch or accidental?

### 5.2 Sequential Batch Processing (P1)

10 sequential API calls could be parallelized with `Promise.allSettled()` and concurrency limit of 3-4 for 60-70% latency reduction.

### 5.3 Missing Retry Logic (P0)

A single 429 error degrades an entire batch to rule-based fallback. Add exponential backoff retry for 429 and 5xx responses.

### 5.4 SELECT * Inefficiency (P1)

Select only the ~20 columns needed by the matching algorithm instead of all 50+ columns including large JSONB blobs.

### 5.5 Pre-filter Threshold Too Low (P3)

`quickScore >= 20` can be met by a single signal. Consider requiring `quickScore >= 25 && reasons.length >= 2`.

### 5.6 Double-Counting Timing in Stage 3 (P3)

`timing_score` is already weighted in Stage 2 at 20%. Stage 3 adds +5 for high-urgency timing. Signal boost adds +20 for high flight risk. Triple-counting inflates timing-heavy candidates.

### 5.7 Related Title Pairs Incomplete (P3)

Only 5 categories (accountant, engineer, manager, analyst, sales). Missing: marketing, product, data, design, operations, hr.

---

## Summary of Prioritized Recommendations

| Priority | Recommendation | Impact | Effort |
|----------|---------------|--------|--------|
| **P0** | Fix LLM model discrepancy (17B vs 70B) | High | Low |
| **P0** | Add retry logic for LLM API calls | High | Low |
| **P1** | Implement vector pre-filter (Stage 0) | High | Medium |
| **P1** | Parallelize LLM batch calls | High | Low |
| **P1** | Select specific columns instead of SELECT * | Medium | Low |
| **P2** | Improve signal detection patterns | Medium | Low |
| **P2** | Add word-boundary skill matching in fallback | Medium | Low |
| **P2** | Add missing signal categories | Medium | Low |
| **P2** | Search additional candidate fields for signals | Medium | Low |
| **P3** | Enhance fallback with work history, certs, regions | Medium | Medium |
| **P3** | Fix double-counting of timing in Stage 3 | Low | Low |
| **P3** | Raise pre-filter threshold | Low | Low |
| **P3** | Pre-compile signal regexes | Low | Low |
| **P3** | Expand related title pairs | Low | Low |
