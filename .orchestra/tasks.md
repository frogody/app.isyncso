# Task Board

> States: `[ ]` pending, `[>]` active, `[x]` done, `[!]` blocked, `[~]` paused, `[-]` cancelled

---

## S1 Queue (In Scope — Talent / CRM / SYNC Agent)

### P0 — Critical

`[ ]` **T001** | S1 | P0 | Verify & deploy Talent edge functions | PROMPT 2
- Functions: `analyzeCampaignProject`, `generateCampaignOutreach`, `process-sync-intel-queue`
- Check deployed status, deploy if needed with PAT `sbp_957c6cb9...`
- Verify each responds (not 404)
- Blocks: T002, T006

`[ ]` **T002** | S1 | P0 | End-to-end matching pipeline test | PROMPT 4
- Seed `intelligence_preferences` with defaults (absorbs T007)
- Pick existing campaign, run AI match
- Verify `candidate_campaign_matches` populated
- Blocked by: T001 | Blocks: T003

### P1 — High

`[ ]` **T003** | S1 | P1 | Create SYNC Agent talent actions | PROMPT 3
- Create `supabase/functions/sync/tools/talent.ts`
- Actions: search_candidates, create_campaign, run_matching, get_intelligence, manage_nests, view_candidate_profile, trigger_enrichment
- Wire into `sync/index.ts` router
- Blocked by: T002

`[ ]` **T004** | S1 | P1 | Audit CRM component structure | PROMPT 5
- Check: CRMContacts.jsx, CRMContactProfile.jsx, CRMCompanyProfile.jsx
- Are they self-contained or missing components?
- Build components if needed, verify rendering

`[ ]` **T005** | S1 | P1 | QA: Client candidate exclusion system | PROMPT 7
- Trace exclusion logic through all code paths
- Guards: TalentCandidates, analyzeCampaignProject, process-sync-intel-queue
- Test: alias exclusion, retroactive exclusion, recovery

### P2 — Medium

`[ ]` **T006** | S1 | P2 | Plan bulk enrichment strategy | PROMPT 6
- Audit enriched vs unenriched counts
- Estimate credit costs
- Propose prioritized strategy
- Build batch tooling (no execution without approval)
- Blocked by: T001

`[ ]` **T007** | S1 | P2 | Configure intelligence preferences | Part of PROMPT 4
- Merged into T002 execution (seed defaults as first step)

### P3 — Low

`[ ]` **T008** | S1 | P3 | Complete AUDIT_STATE.md Phases 3-5 | PROMPT 8
`[ ]` **T009** | S1 | P3 | Audit Talent pages for Dutch strings | PROMPT 8
`[ ]` **T014** | S1 | P3 | QA: SYNC frontend components | PROMPT 9

---

## Out of Scope (Needs Other Agent/Session)

`[!]` **T010** | S3 | P0 | Push s3-create-learn commits, merge into main | PROMPT 0
- Branch: `s3-create-learn` has 2 unpushed commits
- Needs: Separate session or S3 agent activation

`[!]` **T011** | S4 | P0 | Update CLAUDE.md with new Supabase PAT | PROMPT 0
- Old: `sbp_507885a1...` → New: `sbp_957c6cb9...`
- Needs: S4 agent (shared infra file)

`[!]` **T012** | S4 | P0 | Update s2-products-finance with main | PROMPT 0
- Blocked by: T010 (s3 merge must happen first)

`[!]` **T013** | S2 | P1 | S2 Products Consolidation (6 subtasks) | PROMPT 1
- Plan exists: `~/.claude/plans/indexed-waddling-origami.md`
- Blocked by: T012
- Needs: Separate session on `s2-products-finance` branch

---

## Execution Order (S1)

```
T001 (deploy edge functions)
  ├── T002 (matching pipeline + T007 merged)
  │     └── T003 (SYNC talent actions)
  └── T006 (enrichment strategy)

T004 (CRM audit)          ← can run parallel
T005 (exclusion QA)        ← can run parallel

T008 (audit docs)          ← after all P0/P1
T009 (Dutch strings)       ← after all P0/P1
T014 (SYNC frontend QA)   ← after all P0/P1
```

---

## Completed

(none yet)
