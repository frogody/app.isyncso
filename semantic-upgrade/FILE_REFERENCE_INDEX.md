# Semantic Upgrade — File Reference Index

Maps every capability to exact files in both codebases.

---

## Desktop App (`/Users/godyduinsbergen/sync.desktop`)

### Semantic Pipeline Core

| Capability | File | Lines | What to Change |
|-----------|------|-------|----------------|
| **Activity Classification** | `src/main/services/semantic/semanticProcessor.ts` | ~494 | Orchestrator — update to pass new activity types |
| **Rule Engine** | `src/main/services/semantic/activityRuleEngine.ts` | — | Add COMMUNICATING, ORGANIZING, OPERATING rules |
| **Entity Extraction** | `src/main/services/semantic/entityRegistry.ts` | — | Improve person/org detection from window titles |
| **Thread Management** | `src/main/services/semantic/threadManager.ts` | — | Change 30-min timeout → 2h pause, 8h abandon |
| **Intent Classification** | `src/main/services/semantic/intentClassifier.ts` | — | May need updates after thread timeout fix |
| **Behavioral Signatures** | `src/main/services/semantic/signatureComputer.ts` | — | Verify computation runs with new activity types |
| **Type Definitions** | `src/main/services/semantic/types.ts` | — | Add new entity types if needed |

### Activity Capture

| Capability | File | Lines | Notes |
|-----------|------|-------|-------|
| Window polling | `src/main/services/activityTracker.ts` | — | 5-sec interval, macOS get-windows |
| Accessibility capture | `src/deep-context/capture/accessibilityCapture.ts` | — | macOS accessibility API |
| File watching | `src/deep-context/capture/fileWatcher.ts` | — | File system monitoring |
| Privacy filter | `src/deep-context/privacy/privacyFilter.ts` | — | Sensitive app exclusion |
| Screen capture | `src/main/services/screenCapture.ts` | — | Screenshot for OCR |
| OCR | `src/main/services/ocrService.ts` | — | macOS Vision + Tesseract.js |

### Cloud Sync

| Capability | File | Lines | Notes |
|-----------|------|-------|-------|
| **Cloud sync orchestrator** | `src/main/services/cloudSyncService.ts` | 888 | Syncs 9 tables every 5 min |
| Database init | `src/main/db/database.ts` | — | SQLite schema creation |
| Database queries | `src/main/db/queries.ts` | — | CRUD operations |
| Scheduler | `src/main/services/scheduler.ts` | — | Cron-like task scheduling |

### Aggregation

| Capability | File | Lines | Notes |
|-----------|------|-------|-------|
| Hourly summaries | `src/main/services/summaryService.ts` | — | Top-of-hour aggregation |
| Daily journals | `src/main/services/journalService.ts` | — | 12:05 AM journal generation |
| Context manager | `src/main/services/contextManager.ts` | — | 60-sec rolling snapshots |

---

## Web App (`/Users/godyduinsbergen/app.isyncso`)

### SYNC Agent (Backend)

| Capability | File | Lines | What to Change |
|-----------|------|-------|----------------|
| **Main orchestrator** | `supabase/functions/sync/index.ts` | 4,127 | Inject semantic context into system prompt (~line 449-1127) |
| Intent recognition | `supabase/functions/sync/tools/intent.ts` | 504 | 16 categories → 10 agents, multi-stage |
| Entity extraction (chat) | `supabase/functions/sync/memory/entities.ts` | 349 | LLM-based (Llama 3.3 70B) |
| RAG manager | `supabase/functions/sync/memory/rag.ts` | 264 | Vector similarity search |
| Embeddings | `supabase/functions/sync/memory/embeddings.ts` | 167 | Together.ai BAAI/bge-large-en-v1.5 |
| Session persistence | `supabase/functions/sync/memory/session.ts` | 305 | Session CRUD |
| Message buffer | `supabase/functions/sync/memory/buffer.ts` | 258 | Auto-summarize at 20 messages |
| Action learning | `supabase/functions/sync/memory/actions.ts` | 278 | Successful action patterns |
| Pattern learning | `supabase/functions/sync/memory/learning.ts` | 536 | Extract & apply behaviors |
| Knowledge search | `supabase/functions/search-knowledge/index.ts` | 292 | 3 search modes |

### New Edge Functions (TO CREATE)

| Function | Purpose | Phase | Depends On |
|----------|---------|-------|-----------|
| `semantic-entity-resolver/index.ts` | Fuzzy match semantic entities → business records | 1.1 | Phase 0 complete |
| `semantic-context-api/index.ts` | Aggregate user semantic state for agent prompt | 1.2 | 1.1 |
| `generate-business-pulse/index.ts` | Daily cross-module intelligence brief | 2.1 | 1.1 |
| `compute-client-health/index.ts` | Client health score computation | 2.2 | 1.1 |
| `semantic-crm-logger/index.ts` | Auto-log CRM activities from semantic data | 2.3 | 1.1, 0.2 |

### Frontend — Pages to Modify

| Page | File | What to Add |
|------|------|------------|
| Dashboard | `src/pages/Dashboard.jsx` | Business Pulse section |
| CRM Contact Profile | `src/pages/CRMContactProfile.jsx` | Health score badge |
| CRM Dashboard | `src/pages/CRMDashboard.jsx` | At-risk clients widget |
| Layout | `src/components/Layout.jsx` | Context Bar (Phase 3) |

### Frontend — New Components (TO CREATE)

| Component | File | Purpose | Phase |
|-----------|------|---------|-------|
| BusinessPulse | `src/components/pulse/BusinessPulse.jsx` | Card stack of 3-7 items | 2.4 |
| PulseCard | `src/components/pulse/PulseCard.jsx` | Individual pulse card | 2.4 |
| HealthScoreBadge | `src/components/crm/HealthScoreBadge.jsx` | Score display on CRM | 2.5 |
| ContextBar | `src/components/shared/ContextBar.jsx` | Persistent cross-module context | 3.1 |

### Frontend — New Hooks (TO CREATE)

| Hook | File | Purpose | Phase |
|------|------|---------|-------|
| useTrustScores | `src/hooks/useTrustScores.ts` | Trust level queries | 1.3 |
| useBusinessPulse | `src/hooks/useBusinessPulse.ts` | Fetch pulse items | 2.4 |
| useClientHealth | `src/hooks/useClientHealth.ts` | Fetch health scores | 2.5 |
| useContextBar | `src/hooks/useContextBar.ts` | Context bar resolution | 3.1 |

### Database — New Migrations (TO CREATE)

| Migration | Tables/Functions Created | Phase |
|-----------|------------------------|-------|
| `YYYYMMDD_entity_business_links.sql` | `entity_business_links` table + `resolve_semantic_entity()` RPC | 1.1 |
| `YYYYMMDD_trust_scores.sql` | `trust_scores` table + graduation/demotion RPCs | 1.3 |
| `YYYYMMDD_business_pulse.sql` | `business_pulse_items` table | 2.1 |
| `YYYYMMDD_client_health.sql` | `client_health_scores` table + `compute_client_health()` RPC | 2.2 |

### Database — Existing Semantic Tables (in Supabase)

| Table | Source | Key for This Upgrade |
|-------|--------|---------------------|
| `semantic_entities` | Desktop sync | Cross-reference with prospects/products/candidates |
| `semantic_activities` | Desktop sync | Trigger CRM auto-logging on COMMUNICATING type |
| `semantic_threads` | Desktop sync | Feed active threads into agent context |
| `semantic_intents` | Desktop sync | Feed intent into agent context |
| `behavioral_signatures` | Desktop sync | Feed patterns into agent context |
| `sync_sessions` | Web app | Session state for agent |
| `sync_memory_chunks` | Web app | RAG vector storage |
| `sync_entities` | Web app | Long-term entity storage |
| `prospects` | Web app | CRM contacts (link target for entity graph) |
| `products` | Web app | Product catalog (link target for entity graph) |
| `candidates` | Web app | Talent candidates (link target for entity graph) |
| `invoices` | Web app | Finance data (input for pulse + health scores) |
| `tasks` | Web app | Task data (input for pulse) |

### Existing Utilities to Reuse

| Utility | Location | Reuse For |
|---------|----------|----------|
| `normalize_company_name()` | `supabase/migrations/` (RPC) | Entity name fuzzy matching |
| `pg_trgm` extension | Supabase Postgres | Similarity matching for entity resolution |
| `auth_uid()` / `auth_company_id()` | Supabase RPC wrappers | RLS policies on new tables |
| `get_user_company_id()` | Supabase RPC | Company scoping in new edge functions |
| Entity wrapper pattern | `src/api/supabaseClient.js` | CRUD for new tables |
| Edge function CORS pattern | Any existing edge function | Headers for new edge functions |

---

## Quick Lookup: "I need to work on X, which files?"

| I'm working on... | Read these files first |
|-------------------|----------------------|
| Thread timeout fix | `sync.desktop/.../threadManager.ts`, `sync.desktop/.../types.ts` |
| Activity taxonomy | `sync.desktop/.../activityRuleEngine.ts`, `sync.desktop/.../semanticProcessor.ts` |
| Entity extraction | `sync.desktop/.../entityRegistry.ts`, `sync.desktop/.../types.ts` |
| Entity Graph | `semantic-upgrade/OPPORTUNITY_DISCOVERY.md` #2, existing `semantic_entities` schema |
| Agent Context Bridge | `app.isyncso/.../sync/index.ts` (system prompt ~line 449), `semantic-upgrade/TRANSFORMATION_ARCHITECTURE.md` Section 4.1 |
| Trust Scores | `semantic-upgrade/TRANSFORMATION_ARCHITECTURE.md` Section 2 |
| Business Pulse | `semantic-upgrade/OPPORTUNITY_DISCOVERY.md` #23, `semantic-upgrade/TRANSFORMATION_ARCHITECTURE.md` Section 1.2 |
| Client Health Score | `semantic-upgrade/OPPORTUNITY_DISCOVERY.md` #16 |
| CRM Auto-Logging | `semantic-upgrade/OPPORTUNITY_DISCOVERY.md` #14 |
| Pulse UI | `src/pages/Dashboard.jsx`, existing shadcn/ui patterns |
