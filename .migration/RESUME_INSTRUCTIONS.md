# ISYNCSO Migration - Resume Instructions

## Quick Resume Prompt
Copy and paste this prompt to Claude Code after restart:

---

```
I'm resuming the ISYNCSO to Supabase migration project. Read the comprehensive state file at:

/Users/daviddebruin/talent-flow-3de6bce5/.migration/RESUME_INSTRUCTIONS.md

Then connect to Supabase via MCP and continue from Phase 1 - completing the dependency graph and generating the migration plan.
```

---

## Session Context

### What We're Building
A multi-agent system to migrate the **ISYNCSO/Playground** web app from Base44 to Supabase, creating a unified backend shared with the **SkillSync iOS app**.

### Project Locations
| Project | Path | Platform | Current Backend |
|---------|------|----------|-----------------|
| ISYNCSO/Playground | `/Users/daviddebruin/talent-flow-3de6bce5` | React Web | Base44 SDK |
| SkillSync | `/Users/daviddebruin/SkillSync/SkillSyncMac/SkillSync` | iOS Swift | Supabase ✅ |

### Supabase Project
- **Project Ref**: `hktkopulegnmdszxkwld`
- **URL**: `https://hktkopulegnmdszxkwld.supabase.co`
- **Status**: Active, used by SkillSync iOS

---

## What Was Completed

### Phase 0: Setup ✅
- [x] Created migration directory structure at `.migration/`
- [x] Initialized state management system
- [x] Configured Supabase MCP server
- [x] Configured Desktop Commander MCP server
- [x] Identified both project locations
- [x] Found existing Supabase credentials in SkillSync `.env`

### Phase 1: Discovery (Partially Complete)
- [x] **ISYNCSO Analysis** - Full codebase scan complete
- [x] **SkillSync Analysis** - Full codebase scan complete
- [ ] **Dependency Graph** - Not yet created
- [ ] **Migration Plan** - Not yet generated

---

## ISYNCSO Analysis Results

### Base44 Entities (15 total)
```
CRITICAL (migrate first):
- Candidate (30+ files, heavy CRUD)
- Campaign (10+ files)
- Task (10+ files)
- Project (15+ files)
- Organization (3 files)
- User/Auth (36+ .me() calls)

HIGH:
- OutreachMessage (8+ files)
- ChatConversation (3 files)

MEDIUM:
- Role (3 files)
- UserInvitation (1 file)
- RegenerationJob (2 files)

LOW (unused - skip):
- Team
- Client
- ChatProgress
- IntelligenceProgress
```

### Cloud Functions (60+ total)
```
LLM Functions (6):
- generateCandidateIntelligence
- generateOutreachMessage
- generateFollowUpMessage
- bulkGenerateIntelligence
- regenerateAllIntelligence
- claudeClient

Auth Functions (5):
- inviteUser
- acceptInvitation
- assignUserToOrganization
- syncDomainUsers
- getUsersByIds

Sync Functions (7):
- syncGetAllCandidates
- syncGetCandidateComplete
- syncGetAllCampaigns
- syncGetCampaignComplete
- syncGetDashboardAnalytics
- syncExportData
- getOutreachTasks

Campaign Functions (5):
- analyzeCampaignProject
- dailyCampaignMatching
- generateCampaignOutreach
- scrapeWebsiteVacancies
- deepScrapeVacancies

Profile Functions (6):
- fetchLinkedInProfilePicture
- updateCandidateProfilePictures
- autoFetchProfilePicture
- extractLinkedInProfilePicture
- bulkExtractProfilePictures
- autoLoadAllProfilePictures

Integration Functions (10+):
- googleSheetsAuth, syncGoogleSheet, googleOAuthUnified
- zapierWebhook, generateApiKey
- brightDataLinkedIn, testBrightDataConnection
- mcpServer, mcpToolsHandler, generateMCPToken
```

### Base44 Integrations (7)
1. `InvokeLLM` - AI/LLM calls → Groq/Anthropic router
2. `SendEmail` - Email sending → Resend
3. `UploadFile` - File uploads → Supabase Storage
4. `GenerateImage` - Image generation → Keep or replace
5. `ExtractDataFromUploadedFile` - File parsing → Edge function
6. `CreateFileSignedUrl` - Signed URLs → Supabase Storage
7. `UploadPrivateFile` - Private storage → Supabase Storage

---

## SkillSync Analysis Results

### Existing Supabase Tables
```sql
-- Already exist in Supabase (from SkillSync iOS)
users                -- User accounts (auth_id, email, name, job_title)
user_profiles        -- Extended profiles (skills, goals, learning_style)
activities           -- Activity tracking (app_name, window_title, duration)
deep_content         -- Content capture (text, code, emails, urls)
learned_skills       -- Skills inventory (skill_name, category, proficiency)
courses              -- Course catalog (title, provider, difficulty)
user_courses         -- User enrollments (status, progress_percent)
course_progress      -- Progress tracking (time_spent, completion)
company_data_cache   -- Company enrichment data
company_user_roles   -- User-company relationships
```

### SkillSync Services (74 total)
Key services already working with Supabase:
- `SupabaseService` - Central database client
- `AuthenticationService` - Session/auth management
- `RealtimeManager` - WebSocket subscriptions
- `EnhancedActivityMonitor` - Activity tracking

---

## What Needs to Happen Next

### Immediate Next Steps (after MCP activation)
1. **Connect to Supabase via MCP** - OAuth will prompt in browser
2. **Inspect existing schema** - See what tables exist
3. **Build dependency graph** - Map entity relationships
4. **Generate migration plan** - SQL + code changes

### New Tables to Create for ISYNCSO
```sql
-- ISYNCSO-specific tables to add
organizations        -- Multi-tenant organization management
candidates           -- Job candidates (core entity)
campaigns            -- Outreach campaigns
projects             -- Recruitment projects
tasks                -- Tasks and follow-ups
roles                -- Job roles/positions
outreach_messages    -- Individual outreach messages
chat_conversations   -- AI chat history
user_invitations     -- Organization invitations
regeneration_jobs    -- Intelligence generation jobs
```

### Credentials Still Needed
| Service | Purpose | Status |
|---------|---------|--------|
| Groq API Key | LLM router (cheap tier) | ❌ Not provided |
| Resend API Key | Email sending | ❌ Not provided |
| Anthropic API Key | LLM router (quality tier) | ✅ Already have |
| Vercel Token | Deployment (optional) | ❌ Not provided |

---

## Migration Architecture

### Agent System
```
┌─────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR AGENT (Main)                     │
│  - Coordinates all work                                          │
│  - Maintains state in .migration/                                │
│  - Reports progress                                              │
└─────────────────────────────┬───────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ SCHEMA AGENT  │    │  CODE AGENT   │    │  TEST AGENT   │
│ - DB design   │    │ - Refactoring │    │ - Unit tests  │
│ - Migrations  │    │ - API layers  │    │ - Integration │
│ - RLS policies│    │ - Functions   │    │ - Validation  │
└───────────────┘    └───────────────┘    └───────────────┘
```

### LLM Router Design
```
InvokeLLM calls → LLM Router
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
    CHEAP TIER              QUALITY TIER
    (Groq/Llama)            (Anthropic/Claude)
    - Summarization         - Compliance analysis
    - Data extraction       - Complex reasoning
    - Classification        - Customer content
    - Simple Q&A            - Agentic tasks
```

---

## File Structure

```
/Users/daviddebruin/talent-flow-3de6bce5/.migration/
├── RESUME_INSTRUCTIONS.md    ← YOU ARE HERE
├── state.json                ← Current migration state
├── agents/
│   └── orchestrator.log      ← Agent activity log
├── analysis/
│   └── initial_discovery.md  ← Entity/function inventory
├── checkpoints/              ← Rollback points (empty)
├── tasks/
│   ├── pending.json
│   ├── in_progress.json
│   ├── completed.json
│   └── failed.json
└── reports/
    ├── daily/                ← Daily progress (empty)
    └── summary.md            ← Executive summary
```

---

## MCP Servers Configured

```json
{
  "supabase": {
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "@supabase/mcp-server-supabase@latest", "--project-ref=hktkopulegnmdszxkwld"]
  },
  "desktop-commander": {
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "@anthropic-ai/desktop-commander@latest"]
  }
}
```

After restart, the Supabase MCP will:
1. Prompt for OAuth in browser (first time only)
2. Provide tools like `list_tables`, `execute_sql`, `get_schema`, etc.
3. Allow direct database operations

---

## Phase Checklist

```
[x] Phase 0: Agent Architecture Setup
[~] Phase 1: Discovery & Planning (IN PROGRESS)
    [x] Task 1.1: Full Codebase Analysis
    [x] Task 1.2: SkillSync Analysis
    [ ] Task 1.3: Dependency Graph
    [ ] Task 1.4: Migration Plan
[ ] Phase 2: Infrastructure Setup
[ ] Phase 3: Database Migration
[ ] Phase 4: API Abstraction Layer
[ ] Phase 5: Authentication Migration
[ ] Phase 6: LLM Router Implementation
[ ] Phase 7: Cloud Functions Migration
[ ] Phase 8: File Storage Migration
[ ] Phase 9: SkillSync Integration
[ ] Phase 10: Testing & Validation
[ ] Phase 11: Deployment & Cutover
[ ] Phase 12: Cleanup & Documentation
```

---

## Key Decisions Made

1. **Use existing Supabase project** - SkillSync's `hktkopulegnmdszxkwld`
2. **Skip unused entities** - Team, Client, ChatProgress, IntelligenceProgress
3. **LLM Router** - Groq for cheap tasks, Anthropic for quality
4. **Email** - Replace Base44 SendEmail with Resend
5. **Storage** - Replace Base44 UploadFile with Supabase Storage
6. **Auth** - Migrate Base44 auth to Supabase Auth

---

## Contact/Context

- **User**: David de Bruin (gody@isyncso.com)
- **Organization**: ISYNCSO
- **Products**:
  - ISYNCSO/Playground (recruitment web app)
  - SkillSync (learning/skills iOS app)

---

## Ready to Resume

After pasting the resume prompt, Claude should:
1. Read this file for full context
2. Connect to Supabase MCP (OAuth in browser)
3. Run `list_tables` to see existing schema
4. Continue with dependency graph and migration plan
