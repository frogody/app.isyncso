# Semantic Upgrade — Master Prompt

**Load this document at the start of any session working on the iSyncSO semantic upgrade.**

---

## What This Project Is

We are upgrading iSyncSO from a multi-module business suite that **narrates what happened** into an intelligence-driven operating system that **predicts what should happen next**. The platform currently operates at 15-20% of its intelligence potential. We're building the remaining 80%.

## Two Codebases

| Codebase | Path | Tech Stack | Purpose |
|----------|------|-----------|---------|
| **Web App** | `/Users/godyduinsbergen/app.isyncso` | React 18, Vite, Tailwind, Supabase (Postgres + Edge Functions) | Intelligence surfaces, SYNC Agent, dashboard, all user-facing modules |
| **Desktop App** | `/Users/godyduinsbergen/sync.desktop` | Electron 34, React 18, Vite, SQLite, TypeScript | On-device activity capture, 5-stage semantic pipeline, cloud sync to Supabase |

## Architecture: How Data Flows

```
USER'S COMPUTER (Desktop App)
    │
    ├─ Activity Tracker (5-sec poll) → window title, app, URL
    ├─ Context Manager (60-sec) → rolling snapshots
    ├─ Screen Capture (30-sec) → OCR → commitments, action items
    │
    ▼
Semantic Pipeline (on-device, runs every 60 sec)
    ├─ Stage 1: Activity Classification (rule engine + MLX)
    ├─ Stage 2: Entity Extraction (people, projects, orgs, tools)
    ├─ Stage 3: Thread Manager (groups activities into work episodes)
    ├─ Stage 4: Intent Classifier (thread purpose: SHIP/PLAN/MANAGE...)
    └─ Stage 5: Signature Computer (behavioral metrics)
    │
    ▼
SQLite (local) ──── Cloud Sync (every 5 min) ────▶ Supabase
                                                        │
                                                        ▼
                                              Web App (app.isyncso)
                                              ├─ SYNC Agent (51 actions, 10 modules)
                                              ├─ Dashboard → Business Pulse (NEW)
                                              ├─ CRM → Client Health Scores (NEW)
                                              ├─ Entity Graph (NEW)
                                              ├─ Context Bar (NEW)
                                              └─ Trust Score System (NEW)
```

## Current Problems (What We're Fixing)

| Problem | Detail | File to Fix |
|---------|--------|-------------|
| Entity extraction broken | 0.008 entities/event, 94.6% are file-path "projects" | `sync.desktop/.../entityRegistry.ts` |
| All threads dead | 30-min timeout kills everything | `sync.desktop/.../threadManager.ts` |
| Only 3/6 activity types | COMMUNICATING, ORGANIZING, OPERATING never fire | `sync.desktop/.../activityRuleEngine.ts` |
| Agent disconnected from semantic data | SYNC Agent has zero access to behavioral context | `app.isyncso/.../sync/index.ts` |
| No cross-module intelligence | Data stays siloed per module | Needs new infrastructure |
| No prediction capability | Everything is narration, not insight | Needs Pulse Engine + Health Scores |

## Phase Structure

| Phase | Goal | Tasks |
|-------|------|-------|
| **Phase 0** | Fix desktop pipeline + create prep docs | Thread timeouts, activity taxonomy, entity extraction, master prompt, tracker, file index |
| **Phase 1** | Build intelligence backbone | Entity Graph, Agent Context Bridge, Trust Scores |
| **Phase 2** | Ship first cross-module intelligence | Business Pulse, Client Health Scores, CRM Auto-Logging, Pulse UI |

## Source Documents (in this folder)

| Document | What It Contains | When to Reference |
|----------|-----------------|-------------------|
| `ISYNCSO_STRATEGIC_AI_ANALYSIS.md` | Master strategic synthesis of all analyses | Overall direction, priorities |
| `TRANSFORMATION_ARCHITECTURE.md` | Phased roadmap, trust model, dependency chain, flywheel | Implementation sequencing, trust levels |
| `OPPORTUNITY_DISCOVERY.md` | 31 scored opportunities with composite rankings | Feature priorities, what to build vs. skip |
| `SEMANTIC_SYSTEM_ANALYSIS.md` | Current pipeline state, value gaps, what works/doesn't | Understanding current system |
| `TECHNICAL_OVERVIEW.md` | Full app-by-app breakdown, all edge functions, schemas | Finding existing code to modify |
| `DATABASE_SCHEMA_ANALYSIS.md` | 140+ table analysis with columns and relationships | Database schema decisions |
| `MARKET_INTELLIGENCE_2026.md` | Competitive landscape, market timing, trust data | Strategic context, competitive positioning |
| `COMPETITIVE_MOAT_AND_RISKS.md` | Defensibility analysis, risk assessment, anti-recommendations | What NOT to build, risk mitigation |
| `IMPLEMENTATION_TRACKER.md` | Living checklist of all tasks and their status | **CHECK THIS FIRST** — know what's done |
| `FILE_REFERENCE_INDEX.md` | Maps every capability to exact files in both codebases | Finding the right file to modify |

## Desktop App — Key Semantic Pipeline Files

```
sync.desktop/src/main/services/semantic/
├── semanticProcessor.ts     # Orchestrator: classification + MLX + thread assignment
├── activityRuleEngine.ts    # Rule-based classification (70% of cases)
├── entityRegistry.ts        # Entity extraction & resolution
├── threadManager.ts         # Thread grouping + lifecycle (30-min timeout → 2h)
├── intentClassifier.ts      # Thread intent classification
├── signatureComputer.ts     # Behavioral metrics computation
└── types.ts                 # TypeScript type definitions

sync.desktop/src/main/services/
├── activityTracker.ts       # 5-sec window polling
├── cloudSyncService.ts      # 888 lines. Syncs 9 tables to Supabase every 5 min
├── summaryService.ts        # Hourly summaries
├── journalService.ts        # Daily journals at 12:05 AM
├── contextManager.ts        # 60-sec rolling context snapshots
├── screenCapture.ts         # Screenshot capture
├── ocrService.ts            # OCR text extraction
└── scheduler.ts             # Cron-like task scheduling
```

## Web App — Key Files for This Upgrade

```
app.isyncso/supabase/functions/
├── sync/index.ts                      # 4,127 lines. SYNC Agent orchestrator (MODIFY for context bridge)
├── sync/memory/entities.ts            # Entity extraction (LLM-based, Llama 3.3 70B)
├── sync/memory/rag.ts                 # RAG manager (vector similarity search)
├── sync/memory/embeddings.ts          # Together.ai embeddings (BAAI/bge-large-en-v1.5)
├── sync/tools/intent.ts              # Intent recognition (16 categories → 10 agents)
├── search-knowledge/index.ts          # Semantic knowledge search (3 modes)
├── semantic-entity-resolver/index.ts  # NEW — fuzzy match semantic → business entities
├── semantic-context-api/index.ts      # NEW — aggregate user semantic state for agent
├── generate-business-pulse/index.ts   # NEW — daily cross-module intelligence brief
├── compute-client-health/index.ts     # NEW — client health score computation
└── semantic-crm-logger/index.ts       # NEW — auto-log CRM activities from semantic data

app.isyncso/src/
├── pages/Dashboard.jsx                # MODIFY — integrate Business Pulse
├── pages/CRMContactProfile.jsx        # MODIFY — add health score badge
├── pages/CRMDashboard.jsx             # MODIFY — add at-risk clients widget
├── components/pulse/BusinessPulse.jsx # NEW — Business Pulse card stack
├── components/pulse/PulseCard.jsx     # NEW — individual pulse card
├── components/shared/ContextBar.jsx   # NEW (Phase 3) — persistent cross-module context
├── hooks/useTrustScores.ts            # NEW — trust level queries
└── hooks/useContextBar.ts             # NEW (Phase 3) — context bar resolution
```

## Database Tables — New (to create)

| Table | Purpose | Phase |
|-------|---------|-------|
| `entity_business_links` | Bridge semantic entities ↔ business entities | Phase 1 |
| `trust_scores` | Progressive autonomy per action type per user | Phase 1 |
| `business_pulse_items` | Daily cross-module intelligence brief | Phase 2 |
| `client_health_scores` | Composite client health per prospect | Phase 2 |

## Database Tables — Existing (semantic pipeline)

| Table | Source | Key Columns |
|-------|--------|-------------|
| `semantic_entities` | Desktop sync | entity_id, type, confidence, first_seen, last_seen |
| `semantic_activities` | Desktop sync | activity_type, activity_subtype, classification_method, confidence |
| `semantic_threads` | Desktop sync | thread_id, title, status, started_at, last_activity_at, primary_entities |
| `semantic_intents` | Desktop sync | intent_type, confidence, evidence, resolved_at, outcome |
| `behavioral_signatures` | Desktop sync | category, metric_name, current_value, trend, window_days |
| `sync_sessions` | Web app | Session persistence, message buffer, active entities |
| `sync_memory_chunks` | Web app | RAG vector storage (1024-dim embeddings) |
| `sync_entities` | Web app | Entity long-term storage with embeddings |
| `sync_action_templates` | Web app | Successful action patterns with embeddings |

## Coding Standards

- Follow existing patterns in each codebase
- Web app: React 18, Tailwind CSS, shadcn/ui components, Supabase client
- Desktop app: Electron, TypeScript strict, SQLite via better-sqlite3
- Edge functions: Deno runtime, Supabase client, CORS headers for app.isyncso.com
- **NEVER modify protected calculator files** (see CLAUDE.md): `src/lib/formulas.ts`, `src/lib/useCalculations.ts`, `src/lib/woningvorming.ts`
- All new tables need RLS policies with company_id scoping via `get_user_company_id()`
- Edge function deployment: `SUPABASE_ACCESS_TOKEN="sbp_9f7c20bb9f11485403ccaebe88a0b8b95554abee" npx supabase functions deploy <name> --project-ref sfxpmzicgpaxfntqleig --no-verify-jwt`

## Trust Model Summary

Every intelligent action operates on a 4-level spectrum (from `TRANSFORMATION_ARCHITECTURE.md` Section 2):

| Level | Behavior | Trust Required |
|-------|----------|----------------|
| 1 | Surfaces insight: "I noticed X" | None |
| 2 | Recommends action: "I suggest Y because X" | Low |
| 3 | Prepares for approval: "I've drafted Y. [Approve/Edit/Reject]" | Medium |
| 4 | Acts autonomously: "I did Y. [Undo within 30min]" | High |

**Hard caps**: Financial execution = Level 3 max. Pricing = Level 2 max. Compliance = Level 3 max.

## Key Metrics to Track

| Metric | Current | Target | Phase |
|--------|---------|--------|-------|
| Entity extraction rate | 0.008/event | >= 0.1/event | Phase 0 |
| Active threads | 0 | > 0, avg lifespan > 2h | Phase 0 |
| Activity types firing | 3/6 | 6/6 | Phase 0 |
| Semantic-to-business entity links | 0 | >= 50 | Phase 1 |
| Agent has semantic context | No | Yes | Phase 1 |
| Cross-module pulse items/day | 0 | >= 3 | Phase 2 |
| Client health score coverage | 0% | >= 80% of active clients | Phase 2 |
| Auto-logged CRM activities/day | 0 | >= 5 | Phase 2 |

---

**Before starting any work, check `IMPLEMENTATION_TRACKER.md` to see what's already done.**
