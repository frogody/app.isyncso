# Agent Registry

> Each agent is a scoped work context. Hard file boundaries. No overlap.

## Active Agents

### S1 — Talent + CRM + SYNC Agent
| Field | Value |
|-------|-------|
| **Branch** | `s1-talent-crm` |
| **Owner** | Session 1 (T1) |
| **Status** | Active |
| **Scope** | Talent module, CRM module, SYNC Agent |
| **File boundaries** | |

```
# Frontend components
src/components/talent/**
src/components/crm/**
src/components/agents/**
src/components/sync/**

# Pages
src/pages/Talent*.jsx
src/pages/CRM*.jsx
src/pages/SyncAgent.jsx

# Services & hooks
src/lib/services/talent-*
src/lib/services/crm-*
src/hooks/useTalent*
src/hooks/useCRM*
src/hooks/useSync*

# Edge functions (Talent/CRM/SYNC)
supabase/functions/sync/**
supabase/functions/analyzeCampaignProject/**
supabase/functions/generateCampaignOutreach/**
supabase/functions/generateCandidateIntelligence/**
supabase/functions/generateCompanyIntelligence/**
supabase/functions/process-sync-intel-queue/**
supabase/functions/executeTalentOutreach/**
supabase/functions/explorium-enrich/**
supabase/functions/exploriumFirmographics/**
supabase/functions/exploriumPeople/**
supabase/functions/upload-nest-data/**
supabase/functions/purchase-nest/**
supabase/functions/map-nest-columns/**
supabase/functions/sms-send/**
supabase/functions/sms-webhook/**
supabase/functions/sms-ai-respond/**
supabase/functions/sync-voice/**

# Migrations (talent/crm scoped)
supabase/migrations/*talent*
supabase/migrations/*candidate*
supabase/migrations/*campaign*
supabase/migrations/*nest*
supabase/migrations/*intel*
supabase/migrations/*crm*
supabase/migrations/*client_candidate*
```

---

## Proposed Agents (Not Yet Activated)

### S2 — Inventory + Logistics + Sync Studio
| Field | Value |
|-------|-------|
| **Scope** | Products, purchases, receiving, pallets, shipping, returns, Sync Studio |
| **File boundaries** | `src/components/{products,purchases,receiving,inventory}/**`, `src/pages/{Products,StockPurchases,Inventory,Pallet,Shipment,SyncStudio}*.jsx`, `supabase/functions/sync-studio-*/**` |

### S3 — Finance + Growth + Raise
| Field | Value |
|-------|-------|
| **Scope** | Finance module, Growth module, Raise module |
| **File boundaries** | `src/components/{finance,growth,raise}/**`, `src/pages/{Finance,Growth,Raise,Deals}*.jsx`, `supabase/functions/{growth-*,raise-*}/**` |

### S4 — Platform + Infra + Auth
| Field | Value |
|-------|-------|
| **Scope** | Layout, settings, auth, admin, onboarding, shared UI, deployment |
| **File boundaries** | `src/components/{layout,settings,admin,onboarding,shared,guards,ui}/**`, `src/pages/{Layout,Login,Settings,Admin,Onboarding}*.jsx`, `supabase/config.toml`, `vercel.json`, `vite.config.js` |

### S5 — bol.com + Shopify + Email Pool
| Field | Value |
|-------|-------|
| **Scope** | External marketplace integrations |
| **File boundaries** | `src/components/settings/Shopify*`, `supabase/functions/{bolcom-*,shopify-*,process-order-email}/**`, `supabase/migrations/*shopify*` |

### S6 — Learn + Create + Sentinel
| Field | Value |
|-------|-------|
| **Scope** | Learning platform, content creation, compliance |
| **File boundaries** | `src/components/{learn,lessons,courses,create,creator,sentinel,video}/**`, `src/pages/{Learn,Course,Lesson,Create,Sentinel}*.jsx` |

---

## Scope Conflict Matrix

Files that could be touched by multiple agents need explicit coordination:

| File | Primary Agent | Conflict Risk |
|------|--------------|---------------|
| `src/pages/index.jsx` (routes) | S4-Platform | Any agent adding routes — coordinate |
| `src/pages/Layout.jsx` | S4-Platform | Navigation changes — coordinate |
| `supabase/config.toml` | S4-Platform | Any agent adding edge functions — coordinate |
| `src/lib/db/schema.ts` | S4-Platform | Any agent adding types — coordinate |
| `src/lib/db/queries/index.ts` | S4-Platform | Any agent adding query exports — coordinate |
| `CLAUDE.md` | Any | Documentation — last writer wins, append only |
