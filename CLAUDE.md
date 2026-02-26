# iSyncSO Development Guidelines

This file contains critical development rules and patterns that must be followed when building features for the iSyncSO application.

---

## 🔴 CRITICAL: Collaborative Development Workflow (Cowork + Claude Code)

**This workflow is MANDATORY and must be preserved after conversation compacting.**

### How We Work

1. **Cowork Mode (Gody's desktop)** - Acts as the architect, tester, and QA lead
2. **Claude Code (Terminal)** - Acts as the implementation engineer executing code changes

### Workflow Process

```
┌─────────────────────────────────────────────────────────────────┐
│ COWORK (Architect/Tester)                                       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 1. Analyze requirements and create phased plan              │ │
│ │ 2. Generate Claude Code prompts for each phase              │ │
│ │ 3. Gody pastes prompt into terminal → Claude Code executes  │ │
│ │ 4. Gody pastes Claude Code's reply back to Cowork           │ │
│ │ 5. Cowork tests changes (UX + code quality)                 │ │
│ │ 6. Approve or request fixes → repeat                        │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                           ↓                                     │
│                    ┌──────────────┐                             │
│                    │ Claude Code  │                             │
│                    │  (Terminal)  │                             │
│                    └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

### Cowork Responsibilities

- **Planning**: Break tasks into phased implementation plans
- **Prompt Generation**: Create clear, actionable prompts for Claude Code
- **UX Testing**: Navigate the frontend as a user to verify changes
- **Code Review**: Review implementation for production-readiness
- **Quality Assurance**: Ensure changes are complete and correct

### Claude Code Prompt Format

When generating prompts for Claude Code, use this format:

```
## Task: [Brief description]

### Context
[Relevant file paths, current state, dependencies]

### Requirements
1. [Specific change 1]
2. [Specific change 2]
...

### Files to Modify
- `path/to/file1.jsx` - [what to change]
- `path/to/file2.jsx` - [what to change]

### Verification
After changes, confirm:
- [ ] [Verification step 1]
- [ ] [Verification step 2]
```

### Testing Protocol

After each Claude Code implementation:

1. **Visual Check**: Navigate to the affected page(s) in browser
2. **Console Check**: Look for errors in browser console
3. **Functionality Check**: Test the specific feature changed
4. **Regression Check**: Ensure related features still work
5. **Code Quality**: Review the actual code changes for:
   - Consistent styling patterns
   - No hardcoded values
   - Proper error handling
   - Production-ready practices

### Current Project: Admin Panel UI Fixes

**Status**: In Progress (Jan 2026)

**Issues Being Fixed**:
1. ✅ Identified: Duplicate sidebar in AdminAI.jsx
2. ✅ Identified: White theme on AdminBilling.jsx
3. ✅ Identified: White theme on AdminIntegrations.jsx
4. ✅ Identified: Global outline issue in index.css

**Phased Plan**: See below in "Admin UI Fix Plan" section

---

## Supabase MCP - ALWAYS USE FOR DATABASE OPERATIONS

**CRITICAL: Always use the Supabase MCP for all database operations.** The MCP is configured and provides direct SQL execution capabilities.

### Available MCP Tools
- `mcp__supabase__execute_sql` - Run any SQL query directly
- `mcp__supabase__list_tables` - List all database tables
- `mcp__supabase__get_table_schema` - Get table structure
- `mcp__supabase__apply_migration` - Apply SQL migrations
- Storage tools for bucket/file operations

### When to Use Supabase MCP
- Running database migrations
- Creating/altering tables
- Setting up RLS policies
- Managing storage buckets and policies
- Any direct SQL execution needed
- Checking database schema/structure

### Example Usage
```
// Run a migration
mcp__supabase__execute_sql("CREATE TABLE foo (id UUID PRIMARY KEY)")

// Apply RLS policy
mcp__supabase__execute_sql("CREATE POLICY \"Users can view own data\" ON foo FOR SELECT USING (user_id = auth.uid())")
```

**DO NOT** ask the user to run SQL manually in the Supabase Dashboard - use the MCP instead.

## RBAC (Role-Based Access Control) - MANDATORY

Every feature in iSyncSO must implement proper permission checks. The RBAC system is the foundation of security and access control.

### Role Hierarchy
| Role | Level | Access |
|------|-------|--------|
| super_admin | 100 | Full system access |
| admin | 80 | Company-wide management |
| manager | 60 | Team/department management |
| user | 40 | Standard features |
| learner | 30 | Learning features only |
| viewer | 20 | Read-only access |

### Permission Format
Permissions follow the pattern: `{resource}.{action}`

Resources: `users`, `teams`, `departments`, `companies`, `courses`, `workflows`, `projects`, `finance`, `inbox`, `analytics`, `settings`, `integrations`, `admin`

Actions: `view`, `create`, `edit`, `delete`, `manage`, `export`

Examples:
- `finance.view` - Can view finance data
- `users.edit` - Can edit user profiles
- `admin.access` - Can access admin panel

### Implementation Checklist

When creating any new page or feature:

1. **Import guards and hooks**:
```jsx
import { PermissionGuard } from '@/components/guards';
import { usePermissions } from '@/components/context/PermissionContext';
```

2. **Check permissions for page access**:
```jsx
const { hasPermission, isLoading } = usePermissions();

// Early return if no permission
if (!hasPermission('feature.view')) {
  return <AccessDenied />;
}
```

3. **Wrap sensitive UI elements**:
```jsx
// Hide button if no create permission
{hasPermission('feature.create') && (
  <Button onClick={handleCreate}>Create New</Button>
)}

// Or use PermissionGuard component
<PermissionGuard permission="feature.delete">
  <DeleteButton />
</PermissionGuard>
```

4. **Add permission to navigation** (in Layout.jsx):
```jsx
{
  title: "Feature Name",
  url: createPageUrl("FeaturePage"),
  icon: FeatureIcon,
  permission: "feature.view", // Required permission
}
```

### Guard Components

| Component | Use Case |
|-----------|----------|
| `PermissionGuard` | Check specific permission |
| `RoleGuard` | Check role or minimum level |
| `AdminGuard` | Admin-only content |
| `ManagerGuard` | Manager and above |

### Database RLS

All database queries should be protected by Row Level Security (RLS) policies. The RBAC helper functions are available:

- `user_has_permission(user_id, permission_name)` - Check permission
- `user_has_role(user_id, role_name)` - Check role
- `is_admin(user_id)` - Admin check (level >= 80)
- `is_super_admin(user_id)` - Super admin check (level >= 100)
- `is_manager(user_id)` - Manager check (level >= 60)

## File Organization

```
src/
├── components/
│   ├── context/
│   │   ├── UserContext.jsx      # User state
│   │   └── PermissionContext.jsx # RBAC state
│   ├── guards/
│   │   ├── index.js             # Export all guards
│   │   └── PermissionGuard.jsx  # Guard components
│   └── ...
├── pages/
│   └── [PageName].jsx           # Page components
└── api/
    └── supabaseClient.js        # Supabase client
```

## Testing RBAC

When testing features:
1. Test as super_admin - should see everything
2. Test as user - should only see permitted features
3. Test as viewer - should only see read-only content
4. Test without roles - should show access denied

## Adding New Permissions

1. Add to SQL migration:
```sql
INSERT INTO public.rbac_permissions (name, resource, action, description)
VALUES ('newfeature.view', 'newfeature', 'view', 'View new feature');
```

2. Assign to appropriate roles using `assign_permission_to_role` pattern

3. Run migration in Supabase SQL Editor

## Security Rules

- NEVER expose admin functionality without `AdminGuard`
- NEVER skip permission checks on sensitive operations
- ALWAYS use RLS policies for database access
- ALWAYS check permissions client-side AND server-side
- NEVER trust client-side permission checks alone

## Quick Reference

```jsx
// Check single permission
const canView = hasPermission('resource.view');

// Check multiple permissions (any)
const canEdit = hasPermission('resource.edit') || hasPermission('resource.manage');

// Check role level
const isAtLeastManager = hierarchyLevel >= 60;

// Use guard component
<PermissionGuard permission="resource.action" showMessage>
  <ProtectedContent />
</PermissionGuard>
```

---

**Remember**: Every feature interaction should answer: "Does this user have permission to do this?"

## Supabase Configuration

**Project: isyncso-sync**

| Key | Value |
|-----|-------|
| Project ID | `sfxpmzicgpaxfntqleig` |
| API URL | `https://sfxpmzicgpaxfntqleig.supabase.co` |
| Anon Public Key | Set in `.env` as `VITE_SUPABASE_ANON_KEY` — get from Supabase Dashboard > Settings > API |
| Service Role Key | Set in `.env` as `SUPABASE_SERVICE_ROLE_KEY` — get from Supabase Dashboard > Settings > API |
| Publishable Key | Set in `.env` as `SUPABASE_PUBLISHABLE_KEY` — get from Supabase Dashboard |
| Secret Key | Set in `.env` as `SUPABASE_SECRET_KEY` — get from Supabase Dashboard |
| Personal Access Token (PAT) | Set in env as `SUPABASE_ACCESS_TOKEN` — generate at supabase.com/dashboard/account/tokens |

### Database Connection

```
Host: aws-0-us-west-1.pooler.supabase.com
Port: 6543
Database: postgres
User: postgres.sfxpmzicgpaxfntqleig
```

### Running Migrations

**PRIMARY METHOD - Use MCP (see top of this file):**
```
mcp__supabase__execute_sql("<SQL here>")
```

**Fallback - Supabase CLI:**
```bash
SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" npx supabase db push
```

### MCP Configuration

The Supabase MCP is configured in `.claude.json`:
```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=sfxpmzicgpaxfntqleig&features=database,storage",
      "headers": {
        "Authorization": "Bearer $SUPABASE_ACCESS_TOKEN"
      }
    }
  }
}
```

**Features enabled:** `database`, `storage`

This allows Claude to:
- Execute SQL directly
- Manage database schema
- Handle storage buckets and policies
- Run migrations without user intervention

### GitHub Integration

Supabase is connected to GitHub for automatic database migrations.

| Setting | Value |
|---------|-------|
| GitHub Repository | `frogody/app.isyncso` |
| Supabase directory | `.` (root) |
| Production branch | `main` |
| Deploy to production | Enabled |
| Automatic branching | Enabled |
| Branch limit | 50 |
| Supabase changes only | Enabled |

**How it works:**
- Pushing to `main` branch automatically deploys migrations to production
- Pull requests automatically create preview branches for testing
- Only changes to Supabase files trigger preview branches

**Migration workflow:**
1. Create migration file in `supabase/migrations/` with timestamp prefix (e.g., `20260106123000_my_migration.sql`)
2. Commit and push to a feature branch
3. Create PR - Supabase creates a preview branch for testing
4. Merge PR to `main` - migration automatically applies to production

### Alternative: Supabase Management API

When CLI/MCP isn't working, use the Management API directly:
```bash
curl -s -X POST "https://api.supabase.com/v1/projects/sfxpmzicgpaxfntqleig/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "YOUR SQL HERE"}'
```

---

## Storage Buckets

| Bucket | Public | Size Limit | MIME Types | Purpose |
|--------|--------|------------|------------|---------|
| `avatars` | Yes | 5MB | image/* | User profile pictures |
| `documents` | No | 50MB | pdf, doc, docx, txt | Private documents |
| `attachments` | No | 25MB | any | Message/task attachments |
| `exports` | No | 100MB | json, csv, xlsx | Data exports |
| `product-images` | Yes | 10MB | image/* | Product catalog images |
| `generated-content` | Yes | unlimited | any | AI-generated images/videos |
| `brand-assets` | Yes | 10MB | image/*, svg | Company logos & branding |

### Storage RLS Pattern

All buckets follow this RLS policy pattern on `storage.objects`:
```sql
-- Public read (if bucket is public)
CREATE POLICY "Public read" ON storage.objects FOR SELECT USING (bucket_id = 'bucket-name');

-- Authenticated upload/update/delete
CREATE POLICY "Auth upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'bucket-name' AND auth.role() = 'authenticated');
CREATE POLICY "Auth update" ON storage.objects FOR UPDATE USING (bucket_id = 'bucket-name' AND auth.role() = 'authenticated');
CREATE POLICY "Auth delete" ON storage.objects FOR DELETE USING (bucket_id = 'bucket-name' AND auth.role() = 'authenticated');
```

---

## Edge Functions

### Configuration (`supabase/config.toml`)

```toml
[functions.sync]
verify_jwt = false

[functions.generate-image]
verify_jwt = false

[functions.generate-video]
verify_jwt = false

[functions.enhance-prompt]
verify_jwt = false
```

### Deployed Functions

| Function | JWT | Purpose |
|----------|-----|---------|
| `sync` | No | SYNC AI agent - natural language commands |
| `generate-image` | No | AI image generation (Together.ai FLUX) |
| `generate-video` | No | AI video generation |
| `enhance-prompt` | No | Prompt enhancement for image gen |
| `process-invoice` | No | AI invoice processing (Groq LLM text extraction) |

### Deploying Edge Functions

```bash
SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" npx supabase functions deploy <function-name> --project-ref sfxpmzicgpaxfntqleig --no-verify-jwt
```

### Edge Function Secrets

```bash
# List secrets
SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" npx supabase secrets list --project-ref sfxpmzicgpaxfntqleig

# Set secret
SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" npx supabase secrets set KEY="value" --project-ref sfxpmzicgpaxfntqleig
```

---

## SYNC Agent - Comprehensive Architecture

SYNC is the AI orchestrator for iSyncSO. It processes natural language commands and executes 51 actions across 10 modules.

### Architecture Overview

```
supabase/functions/sync/
├── index.ts              # Main orchestrator (~1800 lines)
│   ├── SYNC_SYSTEM_PROMPT   # Personality, rules, examples (~700 lines)
│   ├── Agent routing        # Keyword/pattern matching
│   ├── Action parsing       # [ACTION]...[/ACTION] extraction
│   └── Request handlers     # Streaming + standard responses
│
├── tools/                # Action executors (51 actions total)
│   ├── finance.ts        # 8 actions: invoices, proposals, expenses
│   ├── products.ts       # 6 actions: inventory, catalog
│   ├── growth.ts         # 9 actions: CRM, pipeline, campaigns
│   ├── tasks.ts          # 8 actions: task management
│   ├── inbox.ts          # 5 actions: messaging
│   ├── team.ts           # 6 actions: team management
│   ├── learn.ts          # 4 actions: courses, learning
│   ├── sentinel.ts       # 3 actions: AI compliance
│   ├── create.ts         # 2 actions: image generation
│   ├── research.ts       # 2 actions: web search
│   └── types.ts          # ActionContext, ActionResult types
│
├── workflows/            # Multi-agent system
│   ├── agents.ts         # Specialized agent prompts (FINANCE, GROWTH, etc.)
│   ├── engine.ts         # Workflow execution (parallel, sequential, iterative)
│   ├── types.ts          # WorkflowContext, WorkflowResult
│   └── index.ts          # Exports
│
├── memory/               # Persistent memory system
│   ├── session.ts        # DB-backed sessions (sync_sessions table)
│   ├── buffer.ts         # Message summarization
│   ├── entities.ts       # Entity extraction (clients, products)
│   ├── rag.ts            # Vector retrieval (sync_memory_chunks)
│   ├── actions.ts        # Action templates (sync_action_templates)
│   ├── embeddings.ts     # Together.ai embeddings (BAAI/bge-large-en-v1.5)
│   └── types.ts          # Memory types
│
└── utils/helpers.ts      # Formatting utilities
```

### LLM Configuration

```typescript
// Primary model (index.ts, agents.ts, engine.ts)
model: 'moonshotai/Kimi-K2-Instruct'  // Together.ai - best open-source agentic model

// Embeddings (memory/embeddings.ts)
model: 'BAAI/bge-large-en-v1.5'  // 1024 dimensions

// Image generation (generate-image/index.ts)
models: {
  'flux-kontext-pro': 'black-forest-labs/FLUX.1-Kontext-pro',  // Product images with reference
  'flux-pro': 'black-forest-labs/FLUX.1.1-pro',                 // Marketing/creative
  'flux-schnell': 'black-forest-labs/FLUX.1-schnell',           // Quick drafts
}
```

### All 51 Actions by Module

**FINANCE (8 actions)**
- `create_proposal` - Create proposal with items
- `create_invoice` - Create invoice with items
- `list_invoices` - List invoices (status, client filters)
- `update_invoice` - Update invoice status
- `create_expense` - Log expense
- `list_expenses` - List expenses
- `get_financial_summary` - Revenue/expense summary
- `convert_proposal_to_invoice` - Convert accepted proposal

**PRODUCTS (6 actions)**
- `search_products` - Search by name
- `create_product` - Add new product
- `update_product` - Update details/pricing
- `update_inventory` - Update stock quantity
- `list_products` - List all products
- `get_low_stock` - Products below threshold

**GROWTH/CRM (9 actions)**
- `create_prospect` - Add prospect/lead
- `update_prospect` - Update details
- `search_prospects` - Search by name/email/company
- `list_prospects` - List with filters
- `move_pipeline_stage` - Move through pipeline
- `get_pipeline_stats` - Pipeline overview
- `create_campaign` - Create outreach campaign
- `list_campaigns` - List campaigns
- `update_campaign` - Update campaign

**TASKS (8 actions)**
- `create_task` - Create task
- `update_task` - Update details
- `assign_task` - Assign to user
- `list_tasks` - List with filters
- `complete_task` - Mark complete
- `delete_task` - Delete task
- `get_my_tasks` - User's tasks
- `get_overdue_tasks` - Overdue tasks

**INBOX (5 actions)**
- `list_conversations` - List chats
- `create_conversation` - Start conversation
- `send_message` - Send message
- `search_messages` - Search history
- `get_unread_count` - Unread count

**TEAM (6 actions)**
- `create_team` - Create team
- `list_teams` - List teams
- `add_team_member` - Add member
- `remove_team_member` - Remove member
- `list_team_members` - List members
- `invite_user` - Send invitation

**LEARN (4 actions)**
- `list_courses` - List courses
- `get_learning_progress` - User progress
- `enroll_course` - Enroll in course
- `recommend_courses` - AI recommendations

**SENTINEL (3 actions)**
- `register_ai_system` - Register for compliance
- `list_ai_systems` - List systems
- `get_compliance_status` - EU AI Act status

**CREATE (2 actions)**
- `generate_image` - AI image generation
- `list_generated_content` - List generated content

**RESEARCH (2 actions)**
- `web_search` - Search the internet
- `lookup_product_info` - Product specs/pricing

### Memory System

SYNC has persistent memory across sessions:

```sql
-- Session persistence (replaces in-memory Map)
sync_sessions (
  session_id, user_id, company_id,
  messages JSONB,           -- Recent message buffer
  conversation_summary,     -- Compressed history
  active_entities JSONB,    -- Tracked clients/products
  context JSONB
)

-- RAG vectors for semantic retrieval
sync_memory_chunks (
  chunk_type,  -- 'conversation', 'summary', 'entity', 'action_success'
  content,
  embedding vector(1024),
  importance_score
)

-- Successful action patterns
sync_action_templates (
  action_type,
  intent_description,
  example_request,
  action_data JSONB,
  embedding vector(1024)
)
```

### System Prompt Key Sections

The system prompt in `index.ts` (lines ~449-1127) defines SYNC's behavior:

| Section | Lines | Purpose |
|---------|-------|---------|
| Personality | ~451-458 | Friendly, conversational tone |
| Conversation Flow | ~459-545 | One question at a time, verify info |
| Product Verification | ~546-620 | MUST search before confirming products |
| Continue After Search | ~621-649 | Always ask follow-up after results |
| Available Actions | ~650-750 | Action list with examples |
| Image Generation | ~805-961 | Detailed prompt crafting guide |
| Advanced Intelligence | ~1070-1127 | Smart shortcuts, proactive insights |

### Adding a New Action

```typescript
// 1. Add action name to category in index.ts
const NEW_MODULE_ACTIONS = ['my_new_action'];

// 2. Create executor in tools/newmodule.ts
export async function myNewAction(
  ctx: ActionContext,
  data: { param1: string; param2?: number }
): Promise<ActionResult> {
  const { supabase, companyId, userId } = ctx;

  // Execute action...
  const { data: result, error } = await supabase
    .from('table')
    .insert({ ... });

  if (error) return errorResult(`Failed: ${error.message}`);
  return successResult('Action completed!', result, '/redirect-page');
}

// 3. Add routing in index.ts executeAction()
if (NEW_MODULE_ACTIONS.includes(action.action)) {
  return executeNewModuleAction(ctx, action.action, action.data);
}

// 4. Add example to system prompt
[ACTION]{"action": "my_new_action", "data": {"param1": "value"}}[/ACTION]
```

### Image Generation Flow

```typescript
// 1. User requests image for product
// 2. SYNC searches products → gets featured_image + gallery URLs
// 3. Calls generate-image edge function with:
{
  prompt: "Professional product photo...",
  product_name: "Philips OneBlade",      // CRITICAL for reference
  product_images: ["url1", "url2"],      // Actual product images
  use_case: "product_scene",             // Routes to flux-kontext-pro
  style: "photorealistic"
}
// 4. FLUX Kontext Pro preserves product appearance from reference
// 5. Result uploaded to generated-content bucket
```

### Deploying SYNC Changes

```bash
# Deploy after any changes to sync function
SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" \
npx supabase functions deploy sync --project-ref sfxpmzicgpaxfntqleig --no-verify-jwt

# System prompt changes take effect immediately after deploy
# No build step needed - just redeploy
```

### Frontend Integration

```javascript
// src/pages/SyncAgent.jsx - Full page with avatar
// src/components/sync/SyncChat.jsx - Embedded chat

const response = await fetch(`${SUPABASE_URL}/functions/v1/sync`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${ANON_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: userMessage,
    sessionId: sessionId,           // Persists conversation
    stream: true,                   // SSE streaming
    context: { userId, companyId }
  })
});
```

### Troubleshooting SYNC

| Issue | Cause | Fix |
|-------|-------|-----|
| 401 error | JWT verification | Add `verify_jwt = false` to config.toml, redeploy |
| Stops after search | Missing follow-up prompt | Check "Continue After Search" section |
| Wrong product image | Missing product_name | Include `product_name` in generate_image |
| Action not found | Not in routing | Add to action list + executeAction switch |
| Memory not persisting | Session not saved | Check memorySystem.session.updateSession |
| Kimi K2 errors | Model issues | Falls back to Llama-3.3-70B-Instruct-Turbo-Free |

### Key Files Quick Reference

| File | Purpose | When to Edit |
|------|---------|--------------|
| `index.ts` | Main orchestrator, system prompt | Behavior changes, new modules |
| `tools/*.ts` | Action implementations | New actions, fix action bugs |
| `workflows/agents.ts` | Specialized agent prompts | Multi-agent behavior |
| `memory/session.ts` | Session persistence | Memory issues |
| `generate-image/index.ts` | Image generation | Model routing, quality |
| `create.ts` | Image action | Product image reference |

---

## Recent Fixes & Achievements (Jan 2026)

### SYNC Agent Fixes
1. **401 Authentication Error** - Fixed by:
   - Added `verify_jwt = false` to `supabase/config.toml`
   - Redeployed with `--no-verify-jwt` flag
   - Updated `SyncChat.jsx` to use explicit fetch with auth headers

2. **Date Awareness** - SYNC now knows today's date via dynamic injection in system prompt

### CreateImages Page
- Fixed `ReferenceError: enhancedPrompt is not defined` - changed to `finalPrompt`

### Brand Assets Storage
- Created `brand-assets` bucket for logo uploads
- Added RLS policies for authenticated upload/update/delete
- Public read access for displaying logos

### Invoice Processing with AI (Jan 2026)

**Implementation:** AI-powered invoice extraction using PDF text parsing + Groq LLM

#### Architecture

1. **Client-side (InventoryExpenses.jsx)**:
   - PDF text extraction using `pdf.js` (Mozilla's PDF parser)
   - Extracts full text content from all pages
   - Converts PDF to PNG image for fallback
   - Uploads both to Supabase storage
   - Sends pdfText (string) to edge function

2. **Server-side (process-invoice edge function)**:
   - Primary: Text-based extraction with Groq LLM (`llama-3.3-70b-versatile`)
   - Fallback: Image-based extraction with Google Gemini (if pdfText missing)
   - Async background processing (returns immediately, processes in background)
   - Updates database with extracted data or error

#### Implementation Details

**Client-side PDF extraction:**
```javascript
import * as pdfjsLib from 'pdfjs-dist';

async function extractPdfText(pdfFile) {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }
  return fullText.trim();
}
```

**Edge function call:**
```javascript
// Use direct fetch instead of supabase.functions.invoke for proper JSON serialization
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-invoice`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      storagePath: '...',
      bucket: 'attachments',
      companyId: '...',
      userId: '...',
      pdfText: extractedText, // Send text directly
    }),
  }
);
```

#### Challenges & Solutions

**Challenge 1: Vision Model API Failures**
- ❌ Claude API: 404 errors for all model versions (claude-3-5-sonnet-20241022, claude-3-opus-20240229)
  - API key doesn't have model access
- ❌ Together.ai: "Model requires dedicated endpoint" error
  - Serverless endpoints don't support vision models
- ❌ Google Gemini: "API key not valid"
  - Invalid API key

**Solution:** Pivot from vision models to text-based extraction
- Extract PDF text directly using pdf.js
- Use Groq's Llama 3.3 70B for structured data extraction
- Faster (10-20 sec), more reliable, no image conversion needed

**Challenge 2: Edge Function Secrets**
- Updated `GROQ_API_KEY` secret but function still used old/invalid key
- Edge functions don't automatically reload secrets

**Solution:** Must redeploy edge function after updating secrets
```bash
# Update secret
SUPABASE_ACCESS_TOKEN="..." npx supabase secrets set GROQ_API_KEY="gsk_..." --project-ref sfxpmzicgpaxfntqleig

# CRITICAL: Redeploy function to pick up new secret
SUPABASE_ACCESS_TOKEN="..." npx supabase functions deploy process-invoice --project-ref sfxpmzicgpaxfntqleig --no-verify-jwt
```

**Challenge 3: pdfText Not Reaching Server**
- Client logs showed pdfText present (2999 chars)
- Server logs showed pdfText: undefined
- Used `supabase.functions.invoke()` which doesn't properly serialize complex bodies

**Solution:** Switch to direct `fetch()` with `JSON.stringify()`
- Ensures proper JSON serialization
- pdfText transmitted correctly as string

#### Edge Function Configuration

**Must add to `supabase/config.toml`:**
```toml
[functions.process-invoice]
verify_jwt = false
```

**Available Secrets:**
- `GROQ_API_KEY` - Groq LLM API (llama-3.3-70b-versatile)
- `GOOGLE_API_KEY` - Google Gemini fallback (not currently valid)
- `ANTHROPIC_API_KEY` - Claude API (not currently working for this project)

#### Current Status (Jan 11, 2026)

✅ PDF text extraction working (client-side)
✅ pdfText successfully sent to edge function
✅ Groq API key updated and deployed
🔄 Testing in production (https://app.isyncso.com/inventoryexpenses)

**Expected Behavior:**
1. Upload PDF invoice → extracts ~3000 chars of text
2. Calls edge function → processes for 10-20 seconds
3. Returns extracted data: supplier, line items, totals
4. Creates expense record with `status: 'pending'` or `'approved'`

**Debugging:**
```bash
# Check recent expenses in database
curl -s -X POST 'https://api.supabase.com/v1/projects/sfxpmzicgpaxfntqleig/database/query' \
  -H 'Authorization: Bearer sbp_...' \
  -H 'Content-Type: application/json' \
  -d @query.json
```

### Key Learnings
- Supabase Edge Functions require `verify_jwt = false` in config.toml for public access
- **Edge Functions DO NOT auto-reload secrets** - must redeploy after `secrets set`
- Use direct `fetch()` instead of `supabase.functions.invoke()` for complex request bodies
- Use Management API (`api.supabase.com/v1/projects/.../database/query`) when CLI fails
- Browser caching can mask deployed fixes - instruct users to hard refresh (Cmd+Shift+R)
- PDF.js text extraction is faster and more reliable than vision models for invoices
- Groq's Llama 3.3 70B provides fast, accurate structured data extraction (~10-20 seconds)

---

## RLS Performance Optimization (Jan 11, 2026)

Fixed 1720 Supabase Performance/Security Advisor warnings down to ~0.

### Problem: Auth RLS Initialization Plan

Supabase's `auth.uid()`, `auth.role()`, and `current_setting()` functions are VOLATILE by default, causing PostgreSQL to re-evaluate them for every row scanned. This creates significant performance overhead.

### Solution: STABLE SECURITY DEFINER Wrapper Functions

Created optimized wrapper functions that cache auth values per query:

```sql
-- These functions are STABLE (cached per query) and SECURITY DEFINER (run as owner)
CREATE OR REPLACE FUNCTION public.auth_uid()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT auth.uid() $$;

CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT auth.role()::text $$;

CREATE OR REPLACE FUNCTION public.auth_company_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT company_id FROM public.users WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.auth_hierarchy_level()
RETURNS INTEGER LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COALESCE(MAX(r.hierarchy_level), 0)
     FROM public.rbac_user_roles ur
     JOIN public.rbac_roles r ON ur.role_id = r.id
     WHERE ur.user_id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.user_in_company(check_company_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND company_id = check_company_id) $$;
```

### What Was Fixed

| Issue Type | Count | Fix Applied |
|------------|-------|-------------|
| `auth.uid()` in policies | 154 | Replaced with `public.auth_uid()` |
| `auth.role()` in policies | 111 | Replaced with `public.auth_role()` |
| Storage policies | 10 | Updated to use wrapper functions |
| Helper functions using auth | 6 | Updated to use wrapper functions |
| Duplicate permissive policies | 73 | Consolidated into single policies |
| Service role policies | 71 | Removed (service_role bypasses RLS) |
| Functions without search_path | 51 | Added `SET search_path = public` |
| Overly permissive policies | 10 | Added proper restrictions |

### RLS Policy Best Practices

**DO:**
```sql
-- Use wrapper functions
CREATE POLICY "users_select" ON public.users
FOR SELECT TO authenticated
USING (company_id = auth_company_id());

-- Set search_path on all functions
CREATE OR REPLACE FUNCTION my_function()
RETURNS ... LANGUAGE plpgsql
SET search_path = public
AS $$ ... $$;
```

**DON'T:**
```sql
-- Don't use auth.uid() directly in policies
CREATE POLICY "bad_policy" ON public.users
FOR SELECT USING (id = auth.uid());  -- SLOW!

-- Don't create service_role policies (redundant)
CREATE POLICY "Service role access" ON public.users
FOR ALL TO service_role USING (true);  -- USELESS!

-- Don't create duplicate policies for same table+action
CREATE POLICY "policy1" ON t FOR SELECT USING (...);
CREATE POLICY "policy2" ON t FOR SELECT USING (...);  -- BAD!
```

### Applying Fixes via Management API

When MCP/CLI isn't available, use the Management API:

```python
import json
import subprocess

def run_query(sql):
    cmd = [
        'curl', '-s', '-X', 'POST',
        'https://api.supabase.com/v1/projects/sfxpmzicgpaxfntqleig/database/query',
        '-H', 'Authorization: Bearer $SUPABASE_ACCESS_TOKEN',
        '-H', 'Content-Type: application/json',
        '-d', json.dumps({"query": sql})
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return json.loads(result.stdout) if result.stdout else []

# Example: Update a policy
run_query('''
    DROP POLICY IF EXISTS "old_policy" ON public.users;
    CREATE POLICY "new_policy" ON public.users
    FOR SELECT TO authenticated
    USING (company_id = auth_company_id());
''')
```

---

## Composio Integration (Third-Party Services)

SYNC can connect to 30+ third-party services via Composio for executing actions on behalf of users.

### Architecture Overview

```
src/
├── types/composio.ts           # TypeScript types
├── hooks/useComposio.js        # React hook for all operations
├── lib/composio.js             # Utility functions & integration catalog
└── components/integrations/
    ├── ConnectionManager.jsx   # Main UI for managing connections
    └── IntegrationCard.jsx     # Individual integration display

supabase/functions/
├── composio-connect/           # Main API for all Composio operations
└── composio-webhooks/          # Webhook handler for triggers
```

### Supported Integrations (30+)

| Category | Apps |
|----------|------|
| CRM & Sales | HubSpot, Salesforce, Pipedrive, Zoho CRM |
| Communication | Slack, Microsoft Teams, Discord, Zoom |
| Email & Calendar | Gmail, Google Calendar, Outlook |
| Project Management | Notion, Asana, Trello, Jira, Monday.com, ClickUp, Linear |
| File Storage | Google Drive, Dropbox, OneDrive, Box |
| Finance | QuickBooks, Stripe, Xero |
| Support | Zendesk, Intercom, Freshdesk |
| Social | LinkedIn, Twitter/X |
| Other | Airtable, GitHub, Shopify |

### Database Schema

```sql
-- Connection references (tokens managed by Composio)
user_integrations (
  id, user_id, composio_connected_account_id,
  toolkit_slug, status, connected_at, last_used_at, metadata
)

-- Webhook events for triggers
composio_webhook_events (
  id, user_id, connected_account_id, trigger_slug,
  payload, processed, processed_at, error
)

-- Trigger subscriptions
composio_trigger_subscriptions (
  id, user_id, connected_account_id, trigger_slug,
  composio_subscription_id, webhook_url, status, config
)
```

### Edge Function API (`composio-connect`)

Single endpoint handling all operations via `action` parameter:

| Action | Description |
|--------|-------------|
| `listAuthConfigs` | Get available auth configs for a toolkit |
| `initiateConnection` | Start OAuth flow, return redirect URL |
| `getConnectionStatus` | Check if connection is active |
| `listConnections` | Get all user's connected accounts |
| `disconnectAccount` | Remove a connection |
| `refreshConnection` | Force token refresh |
| `executeTool` | Execute any Composio tool |
| `listTools` | List available tools for a toolkit |
| `listTriggers` | List available triggers for a toolkit |
| `subscribeTrigger` | Subscribe to a trigger |
| `unsubscribeTrigger` | Unsubscribe from a trigger |

### Usage Example

```javascript
import { useComposio } from '@/hooks/useComposio';
import { ToolHelpers } from '@/lib/composio';

function MyComponent() {
  const composio = useComposio();
  const { user } = useUser();

  // Send email via Gmail
  const sendEmail = async () => {
    const connection = await composio.getConnection(user.id, 'gmail');
    if (!connection) return toast.error('Connect Gmail first');

    const { toolSlug, arguments: args } = ToolHelpers.gmail.sendEmail(
      'john@example.com',
      'Meeting Tomorrow',
      'Hi John, confirming our meeting at 3pm.'
    );

    await composio.executeTool(toolSlug, {
      connectedAccountId: connection.composio_connected_account_id,
      arguments: args,
    });
  };

  // Create HubSpot contact
  const createContact = async () => {
    const connection = await composio.getConnection(user.id, 'hubspot');
    const { toolSlug, arguments: args } = ToolHelpers.hubspot.createContact(
      'jane@company.com', 'Jane', 'Doe', 'Acme Corp'
    );

    await composio.executeTool(toolSlug, {
      connectedAccountId: connection.composio_connected_account_id,
      arguments: args,
    });
  };
}
```

### Deploying Composio Functions

```bash
# Set API key
SUPABASE_ACCESS_TOKEN="sbp_xxx" npx supabase secrets set COMPOSIO_API_KEY="your_key" --project-ref sfxpmzicgpaxfntqleig

# Deploy functions
SUPABASE_ACCESS_TOKEN="sbp_xxx" npx supabase functions deploy composio-connect --project-ref sfxpmzicgpaxfntqleig --no-verify-jwt
SUPABASE_ACCESS_TOKEN="sbp_xxx" npx supabase functions deploy composio-webhooks --project-ref sfxpmzicgpaxfntqleig --no-verify-jwt
```

### Key Points

- **Tokens managed by Composio** - Never store OAuth tokens, only connection IDs
- **OAuth popup flow** - Better UX than redirect-based auth
- **Auto token refresh** - Composio handles token refresh automatically
- **Poll for connection** - Wait for OAuth completion with 2s interval, 2min timeout
- **User isolation** - Each user's connections are isolated via RLS

---

## Talent Outreach System (Jan 26, 2026)

### Overview

Complete recruiter workflow for internal corporate recruiters to find and reach out to candidates. The user persona is someone doing internal recruitment for a ~300 person software company.

**User Flow:**
```
Create Role → Browse Nests → Buy Nest → Auto-Intel → Match → Personalized Outreach
```

### Key Components

#### 1. Nests (Candidate Pools)
- **NestsMarketplace** (`src/pages/NestsMarketplace.jsx`) - Browse/buy candidate pools
- **TalentNestDetail** (`src/pages/TalentNestDetail.jsx`) - View owned nest details
- **NestDetail** (`src/pages/NestDetail.jsx`) - Marketplace nest preview + purchase

#### 2. SYNC Intel (Candidate Intelligence)
- **sync_intel_queue** table - Queue candidates for background intel processing
- **generateCandidateIntelligence** edge function - Generates intelligence data

**Intelligence Fields:**
```javascript
{
  intelligence_score: number,     // 0-100 "flight risk" score
  intelligence_level: string,     // 'Low', 'Medium', 'High', 'Critical'
  best_outreach_angle: string,    // THE key hook to use
  timing_signals: [{              // Why NOW is the right time
    trigger: string,
    urgency: 'high' | 'medium' | 'low'
  }],
  outreach_hooks: string[],       // Specific angles that work
  company_pain_points: array,     // Their employer's issues
  key_insights: string[],
  career_trajectory: string,
  recommended_approach: string    // 'aggressive', 'nurture', 'network'
}
```

#### 3. Campaign Wizard
**File:** `src/components/talent/CampaignWizard.jsx`

4-step wizard for creating campaigns:
1. **Project Selection** - Pick or create a project
2. **Role Selection** - Pick role from project
3. **Role Context** - Define perfect fit criteria
4. **Campaign Settings** - Name, type, channels

**Role Context (saved to campaign.role_context):**
```javascript
{
  perfect_fit_criteria: string,   // What makes someone perfect
  selling_points: string,         // Why join us
  must_haves: string[],           // Required skills/experience
  deal_breakers: string[],        // Instant disqualifiers
  target_companies: string[],     // Companies to poach from
  ideal_background: string,
  experience_level: string        // 'entry', 'mid', 'senior', 'lead'
}
```

#### 4. Smart AI Matching
**File:** `supabase/functions/analyzeCampaignProject/index.ts`

Multi-stage AI-powered matching:

**Stage 1: Pre-Filter (Rule-based)**
- Deal breakers check (instant disqualification)
- Must-haves coverage check
- Target company bonus
- Intelligence/timing bonus

**Stage 2: Deep AI Analysis (Groq LLM)**
- Batch processing (5 candidates per API call)
- Model: `llama-3.3-70b-versatile`
- 6 scoring dimensions:
  - Skills Fit (25% weight)
  - Experience Fit (20% weight)
  - Title Fit (15% weight)
  - Timing Score (20% weight) - from intelligence
  - Location Fit (10% weight)
  - Culture Fit (10% weight)

**Stage 3: Priority Ranking**
- Timing urgency boost (+5 for high-urgency signals)
- Outreach hooks bonus (+2 per hook, max +5)

**Response includes:**
```javascript
{
  matched_candidates: [{
    candidate_id,
    match_score,
    match_reasons: [],
    ai_analysis: string,          // Expert assessment
    match_factors: {              // Detailed breakdown
      skills_fit, experience_fit, title_fit,
      location_fit, timing_score, culture_fit
    },
    priority_rank: number,
    // + all intelligence fields
  }],
  ai_powered: boolean,
  role_context_used: boolean
}
```

#### 5. Match Display
**File:** `src/components/talent/CandidateMatchCard.jsx`

Shows for each matched candidate:
- **Match Score Ring** - Visual percentage
- **AI Analysis** - Expert assessment (purple gradient)
- **Match Breakdown** - Bar chart of 5 factors
- **Why They Match** - List of match reasons
- **Best Approach** - Intelligence insight (amber)
- **Act Now** - High-urgency timing alert (red)
- **Hook** - First outreach hook (green)

#### 6. Outreach Message Generation
**File:** `supabase/functions/generateCampaignOutreach/index.ts`

Generates hyper-personalized outreach messages using ALL intelligence data:

**Input:**
```javascript
{
  campaign_id,
  candidate_id,
  candidate_name, candidate_title, candidate_company,
  // Match data
  match_score, match_reasons,
  // Intelligence (the gold)
  intelligence_score, best_outreach_angle, timing_signals,
  outreach_hooks, company_pain_points, key_insights,
  // Role context
  role_context: { perfect_fit_criteria, selling_points, ... },
  role_title, company_name,
  // Settings
  stage: 'initial' | 'follow_up_1' | 'follow_up_2',
  campaign_type: 'email' | 'linkedin' | 'sms'
}
```

### Critical Integration Points

#### Auto-Intel on Nest Purchase
**File:** `supabase/migrations/20260126200000_fix_nest_purchase_intel.sql`

When user buys a nest from marketplace:
1. `stripe-webhook` → calls `copy_nest_to_organization` RPC
2. RPC copies candidates AND queues them for intel:
```sql
INSERT INTO sync_intel_queue (candidate_id, organization_id, source, priority, status)
SELECT unnest(v_new_candidate_ids), p_organization_id, 'nest_purchase', 2, 'pending'
ON CONFLICT DO NOTHING;
```

#### OutreachPipeline Intelligence Passing
**File:** `src/components/talent/OutreachPipeline.jsx`

When generating messages, passes ALL intelligence fields:
```javascript
body: JSON.stringify({
  // Basic info
  candidate_name, candidate_title, candidate_company, candidate_skills,
  // Match data
  match_score, match_reasons, match_details,
  // INTELLIGENCE (critical!)
  intelligence_score, recommended_approach, outreach_hooks,
  best_outreach_angle, timing_signals, company_pain_points,
  key_insights, lateral_opportunities, intelligence_factors,
  // Role context
  role_context, role_title, company_name,
  // Settings
  stage, campaign_type
})
```

### Database Tables

```sql
-- Campaigns
campaigns (
  id, organization_id, name, status,
  campaign_type,            -- 'email', 'linkedin', 'sms'
  role_context JSONB,       -- From CampaignWizard step 3
  matched_candidates JSONB, -- Array of match results
  project_id, role_id
)

-- Individual matches (for candidate-side viewing)
candidate_campaign_matches (
  candidate_id, campaign_id, organization_id,
  match_score, match_reasons,
  best_outreach_angle, timing_signals, outreach_hooks,
  intelligence_score, recommended_approach,
  status, matched_at
)

-- Intel queue
sync_intel_queue (
  candidate_id, organization_id,
  source,     -- 'manual', 'nest_purchase', 'import'
  priority,   -- 1=high, 2=normal, 3=low
  status      -- 'pending', 'processing', 'completed', 'failed'
)
```

### Key Files Reference

| File | Purpose |
|------|---------|
| `CampaignWizard.jsx` | 4-step campaign creation |
| `TalentCampaignDetail.jsx` | Campaign detail + run matching |
| `OutreachPipeline.jsx` | Message generation pipeline |
| `CandidateMatchCard.jsx` | Match result display |
| `analyzeCampaignProject/index.ts` | Smart AI matching |
| `generateCampaignOutreach/index.ts` | Message generation |
| `20260126200000_fix_nest_purchase_intel.sql` | Auto-queue intel |

### Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| No intelligence on purchased nest | Old `copy_nest_to_organization` | Apply migration, verify function queues intel |
| Match cards show no "Best Approach" | Missing `best_outreach_angle` | Check candidate has intel, check field passing |
| AI matching not running | No GROQ_API_KEY | Set secret and redeploy function |
| Messages not personalized | Missing intelligence fields | Check OutreachPipeline passes all fields |
| CampaignWizard errors | Wrong org ID field | Use `user.organization_id` not `company_id` |

### Deployment Commands

```bash
# Deploy smart matching
SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" \
npx supabase functions deploy analyzeCampaignProject --project-ref sfxpmzicgpaxfntqleig --no-verify-jwt

# Deploy message generation
SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" \
npx supabase functions deploy generateCampaignOutreach --project-ref sfxpmzicgpaxfntqleig --no-verify-jwt

# Apply SQL via Management API
curl -s -X POST 'https://api.supabase.com/v1/projects/sfxpmzicgpaxfntqleig/database/query' \
  -H 'Authorization: Bearer $SUPABASE_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"query": "YOUR SQL"}'
```

---

## Candidate Detail Drawer Enhancements (Jan 27, 2026)

### Overview

Major enhancements to the `CandidateDetailDrawer.jsx` component for displaying richer candidate intelligence and company data.

### New Features Added

#### 1. Quick Stats Header
Displays key metrics at the top of the candidate drawer:
- **Years at Company** - Tenure at current employer
- **Times Promoted** - Internal promotions
- **Company Changes** - Job hopping indicator

```jsx
const QuickStats = ({ candidate }) => (
  <div className="flex items-center gap-4">
    <div className="flex items-center gap-1.5">
      <Calendar className="w-4 h-4 text-zinc-500" />
      <span className="text-sm text-zinc-400">{candidate.years_at_company || '?'} yrs</span>
    </div>
    <div className="flex items-center gap-1.5">
      <TrendingUp className="w-4 h-4 text-green-400" />
      <span className="text-sm text-zinc-400">{candidate.times_promoted || 0} promos</span>
    </div>
    <div className="flex items-center gap-1.5">
      <Building2 className="w-4 h-4 text-blue-400" />
      <span className="text-sm text-zinc-400">{candidate.times_company_hopped || 0} changes</span>
    </div>
  </div>
);
```

#### 2. Company Tab
New tab showing company intelligence:
- **Company Info** - Industry, size, headquarters, description
- **Technology Stack** - Tech used at candidate's company
- **Employee Ratings** - Glassdoor/review data
- **Funding Information** - Latest funding rounds
- **M&A News** - Recent mergers & acquisitions
- **Growth Signals** - Hiring/revenue growth indicators

#### 3. Enhanced Intelligence Tab
Added three new sections:
- **Inferred Skills** - AI-detected skills not explicitly listed
- **Lateral Opportunities** - Alternative roles the candidate could fill
- **Company Correlations** - Insights about their employer patterns

### User Panel Customization Feature

Users can now customize which sections/tabs are visible in the drawer.

#### Database Table
```sql
CREATE TABLE user_panel_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID,
  panel_config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);
```

#### Hook: `usePanelPreferences.js`
```javascript
const {
  preferences,         // Current config
  loading, saving,
  savePreferences,     // Persist to DB
  resetToDefaults,     // Reset all
  isSectionEnabled,    // Check if section visible
  isTabEnabled,        // Check if tab visible
  getSectionOrder,     // Get ordered enabled sections
} = usePanelPreferences();
```

#### Modal: `PanelCustomizationModal.jsx`
- Expandable tab sections with toggle switches
- Section-level toggles within each tab
- Reset to Defaults button
- Save/Cancel actions

#### Files Created/Modified
| File | Purpose |
|------|---------|
| `src/hooks/usePanelPreferences.js` | Hook for preferences management |
| `src/components/talent/PanelCustomizationModal.jsx` | Settings modal UI |
| `src/components/talent/CandidateDetailDrawer.jsx` | Added Company tab, Quick Stats, enhanced Intel |

### Data Normalization Fixes

Fixed field name mismatches between database schema and component expectations.

#### Problem
Database columns didn't match what the component expected:
- `job_title` vs `current_title`
- `company_name` vs `current_company`
- `person_home_location` vs `location`
- `linkedin_profile` vs `linkedin_url`
- `intelligence_timing` vs `timing_signals`

#### Solution
Added normalization in `fetchCandidateDetails()`:

```javascript
const normalizedCandidate = {
  ...data,
  // Profile fields
  current_title: data.current_title || data.job_title || null,
  current_company: data.current_company || data.company_name || null,
  location: data.location || data.person_home_location || null,
  linkedin_url: data.linkedin_url || data.linkedin_profile || null,

  // Intelligence fields
  timing_signals: data.timing_signals || data.intelligence_timing || [],
  key_insights: data.key_insights || data.intelligence_data?.key_insights || [],

  // Company intelligence - build from individual fields
  company_intelligence: data.company_intelligence || {
    industry: data.industry || data.company_industry || null,
    employee_count: data.company_employee_count || null,
    tech_stack: data.company_tech_stack || [],
    funding: data.company_latest_funding || null,
    ma_news: data.recent_ma_news ? [{ headline: data.recent_ma_news }] : [],
  },
};
```

### Polymorphic Data Handling

Fixed display of `lateral_opportunities` and `company_correlations` which had varying data formats from AI generation.

#### lateral_opportunities
Could be strings OR objects:
```javascript
// Strings: ["Deloitte", "KPMG", "PwC"]
// Objects: [{ role: "Senior Consultant", fit_score: 85 }]

const displayText = typeof opp === 'string'
  ? opp
  : opp.role || opp.title || opp.name || opp.company || JSON.stringify(opp);
```

#### company_correlations
Could be company names OR inference objects:
```javascript
// Strings: ["Google", "Meta"]
// Objects: { inference: "...", observation: "...", outreach_angle: "..." }

if (company.inference || company.observation || company.outreach_angle) {
  // Render as insight card with observation, inference, outreach angle
}
```

### Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Empty Contact Info section | Field name mismatch | Normalize `job_title` → `current_title`, etc. |
| Company tab shows "Unknown Company" | Missing company data fields | Build `company_intelligence` from individual columns |
| Lateral Opportunities wrong format | AI stored company names instead of roles | Handle both string and object formats |
| Company Correlations shows [object Object] | AI stored inference objects | Detect and render observation/inference/outreach_angle |

---

## LinkedIn Skills & Career Data (Jan 28, 2026)

### Overview

Replicates the CRM Contact Profile's "Skills & Career" tab functionality for Talent Candidates. Displays rich LinkedIn data including Skills, Work History, Education, Certifications, and Interests in both the drawer panel and full profile page.

### Database Migration

Added new columns to `candidates` table (`20260128100000_candidate_linkedin_career_data.sql`):

```sql
-- LinkedIn Career Data columns
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS work_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS education JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS location_city TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS location_region TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS location_country TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS mobile_phone TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS work_phone TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS email_status TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS age_group TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS gender TEXT;

-- GIN indexes for JSONB searches
CREATE INDEX IF NOT EXISTS idx_candidates_work_history ON public.candidates USING gin(work_history);
CREATE INDEX IF NOT EXISTS idx_candidates_education ON public.candidates USING gin(education);
CREATE INDEX IF NOT EXISTS idx_candidates_certifications ON public.candidates USING gin(certifications);
CREATE INDEX IF NOT EXISTS idx_candidates_interests ON public.candidates USING gin(interests);
```

### Panel Customization Config

Updated `DEFAULT_PANEL_CONFIG` in `usePanelPreferences.js`:

```javascript
profile: {
  sections: {
    analysis_cards: { enabled: true, order: 0, label: "Analysis Cards" },
    contact_info: { enabled: true, order: 1, label: "Contact Information" },
    professional_summary: { enabled: true, order: 2, label: "Professional Summary" },
    skills: { enabled: true, order: 3, label: "Skills" },
    work_history: { enabled: true, order: 4, label: "Work History" },
    education: { enabled: true, order: 5, label: "Education" },
    certifications: { enabled: true, order: 6, label: "Certifications" },
    interests: { enabled: true, order: 7, label: "Interests" },
    experience: { enabled: true, order: 8, label: "Experience (Legacy)" },
    additional_info: { enabled: true, order: 9, label: "Additional Information" }
  }
}
```

### Enrichment Function Updates

Both `CandidateDetailDrawer.jsx` and `TalentCandidateProfile.jsx` `enrichContact()` functions now save ALL LinkedIn data:

```javascript
const updateData = {
  // Contact info
  verified_email, verified_phone, verified_mobile, personal_email,
  mobile_phone, work_phone, email_status,

  // Location details
  location_city, location_region, location_country,

  // Demographics
  age_group, gender,

  // Skills, Education, Work History - CRITICAL for Skills & Career tab
  skills: enriched.skills?.length ? enriched.skills : candidate.skills,
  work_history: enriched.work_history?.length ? enriched.work_history : candidate.work_history,
  education: enriched.education?.length ? enriched.education : candidate.education,
  certifications: enriched.certifications?.length ? enriched.certifications : candidate.certifications,
  interests: enriched.interests?.length ? enriched.interests : candidate.interests,
};
```

### UI Sections Added

#### CandidateDetailDrawer ProfileTab
- **Skills** - Red badges with count, handles object/string formats
- **Work History** - Job cards with title, company, dates, description
- **Education** - Degree/institution display with graduation year
- **Certifications** - Green badge icon with issuer and date
- **Interests** - Purple topic badges

#### TalentCandidateProfile Overview Tab
Same sections with matching styling (bg-white/[0.03], rounded-2xl conventions):
- **Skills** - Red badges
- **Work History** - Red-themed job cards
- **Education** - Purple-themed cards
- **Certifications** - Green badge icons
- **Interests** - Pink badges

### Polymorphic Data Handling

All sections handle varying data formats from Explorium API:

```javascript
// Skills - string or object
const skillName = typeof skill === 'object'
  ? (skill?.name || skill?.skill || JSON.stringify(skill))
  : String(skill);

// Work History - nested objects
const jobTitle = typeof job.title === 'object' ? job.title?.name : (job.title || job.job_title);
const companyName = typeof job.company === 'object' ? job.company?.name : (job.company || job.company_name);

// Education - arrays or strings
const degreeName = Array.isArray(edu.degrees) ? edu.degrees.join(', ') : (edu.degree || edu.field_of_study);
const schoolName = typeof edu.school === 'object' ? edu.school?.name : (edu.school || edu.institution);
```

### Files Modified

| File | Changes |
|------|---------|
| `supabase/migrations/20260128100000_candidate_linkedin_career_data.sql` | New migration for columns |
| `src/hooks/usePanelPreferences.js` | Added work_history, certifications, interests to config |
| `src/components/talent/CandidateDetailDrawer.jsx` | Added career sections to ProfileTab, updated enrichContact |
| `src/pages/TalentCandidateProfile.jsx` | Added career sections to Overview tab, updated enrichContact |

### Verification

1. Navigate to `/talentcandidateprofile?id=<candidate-id>`
2. Click "Enrich" button (requires LinkedIn URL)
3. Scroll down in Overview tab to see: Skills, Work History, Education, Certifications, Interests
4. Open drawer panel to see same sections in ProfileTab

---

## SMS Outreach (Twilio Integration)

### Overview
Direct SMS outreach to candidates using Twilio.

**Files:**
- `TalentSMSOutreach.jsx` - SMS campaign management
- `TalentCandidateProfile.jsx` - Direct SMS from profile
- `PhoneNumberManager.jsx` - Purchase/manage phone numbers
- `supabase/functions/twilio-*` - Twilio edge functions

### Edge Functions

| Function | Purpose |
|----------|---------|
| `twilio-numbers` | List/purchase phone numbers |
| `twilio-send-sms` | Send SMS messages |
| `twilio-webhooks` | Handle incoming SMS |

### Key Tables

```sql
twilio_phone_numbers (
  id, organization_id, phone_number, friendly_name,
  capabilities JSONB, status, monthly_cost
)

sms_messages (
  id, organization_id, campaign_id, candidate_id,
  from_number, to_number, body, status,
  direction, twilio_sid
)
```

### SMS from Candidate Profile

The candidate profile has a "Send SMS" button that:
1. Opens modal with message input
2. Can generate AI message using `generateCampaignOutreach`
3. Uses ALL candidate intelligence for personalization
4. Sends via `twilio-send-sms`

```javascript
// Direct SMS (no campaign context)
body: JSON.stringify({
  candidate_name, candidate_title, candidate_company,
  candidate_skills: candidate.skills || [],
  campaign_type: "sms",
  stage: "initial",
  // Intelligence fields
  intelligence_score, best_outreach_angle, timing_signals,
  outreach_hooks, company_pain_points, key_insights
})
```

---

## ME-4: Weighted Matching Criteria & Signal-Based Matching (Jan 28, 2026)

### Overview

Extended the campaign wizard and AI matching engine with two major features:
1. **Criteria Weighting** - Recruiters customize how match factors are weighted (skills, experience, title, location, timing, culture)
2. **Signal-Based Matching** - Boost/filter candidates based on intelligence signals (M&A activity, layoffs, flight risk, etc.)

### Components Created

#### CriteriaWeightingStep
**File:** `src/components/talent/campaign/CriteriaWeightingStep.jsx`

UI for adjusting match factor weights with sliders (0-50, step 5). Weights must sum to 100%.

| Export | Purpose |
|--------|---------|
| `default` (CriteriaWeightingStep) | Main component with sliders and presets |
| `MATCH_FACTORS` | 6 factor definitions (skills_fit, experience_fit, title_fit, location_fit, timing_score, culture_fit) |
| `PRESETS` | 4 presets: balanced, skills_first, urgency_first, culture_focus |
| `DEFAULT_WEIGHTS` | Balanced preset weights |

Sub-components: `WeightSlider`, `TotalIndicator` (progress bar, green at 100%)

#### SignalMatchingConfig
**File:** `src/components/talent/campaign/SignalMatchingConfig.jsx`

UI for toggling intelligence signal filters with optional boost/required settings.

| Export | Purpose |
|--------|---------|
| `default` (SignalMatchingConfig) | Main component with signal toggles |
| `INTELLIGENCE_SIGNALS` | 8 signal definitions |
| `SIGNAL_CATEGORIES` | 3 categories: company, career, timing |

**8 Signals:**

| Signal ID | Category | Default Boost | Description |
|-----------|----------|---------------|-------------|
| `ma_activity` | company | +15 | M&A activity at employer |
| `layoffs` | company | +20 | Layoffs/restructuring |
| `leadership_change` | company | +10 | New CEO/CTO |
| `funding_round` | company | +5 | Recent funding |
| `recent_promotion` | career | -5 | Recently promoted (less likely to move) |
| `tenure_anniversary` | career | +10 | At 2/3/5 year mark |
| `stagnation` | career | +15 | No growth in 2+ years |
| `high_flight_risk` | timing | +20 | Intelligence score >= 70 |

Features:
- Simple/Advanced toggle (advanced shows required filter + boost slider)
- "Urgency Preset" quick action
- Accordion categories with expand/collapse

#### MatchReasonCards (previously created)
**File:** `src/components/talent/campaign/MatchReasonCards.jsx`

Displays match factor scores as cards with animated radial SVG progress rings.

#### Barrel Export
**File:** `src/components/talent/campaign/index.js`
```javascript
export { default as MatchReasonCards } from './MatchReasonCards';
export { default as CriteriaWeightingStep, MATCH_FACTORS, PRESETS, DEFAULT_WEIGHTS } from './CriteriaWeightingStep';
export { default as SignalMatchingConfig, INTELLIGENCE_SIGNALS, SIGNAL_CATEGORIES } from './SignalMatchingConfig';
```

### CampaignWizard Integration

**File:** `src/components/talent/CampaignWizard.jsx`

- Wizard expanded from 4 to 5 steps: Project → Role → Context → **Match Weights** → Review
- Step 4 renders both `CriteriaWeightingStep` and `SignalMatchingConfig` separated by a divider
- Content area has `max-h-[calc(80vh-140px)] overflow-y-auto` for scrollability
- State: `criteriaWeights` (DEFAULT_WEIGHTS), `signalFilters` ([])
- Validation: weights must sum to 100 to proceed
- Both stored in campaign `role_context`:
  ```javascript
  role_context: {
    ...roleContext,
    criteria_weights: criteriaWeights,
    signal_filters: signalFilters,
  }
  ```
- Reset on dialog close

### Edge Function: analyzeCampaignProject

**File:** `supabase/functions/analyzeCampaignProject/index.ts`

#### Custom Weights
- Added `CriteriaWeights` interface and `DEFAULT_WEIGHTS` constant
- `validateAndNormalizeWeights()` - validates/normalizes weights from campaign, fallback to defaults, ensures sum=100
- `calculateWeightedScore()` - dynamic weighted score calculation replacing hardcoded percentages
- AI prompt includes dynamic weight percentages: `Skills ${weights.skills_fit}%, Experience ${weights.experience_fit}%...`
- Weights extracted from `effectiveRoleContext.criteria_weights` after campaign fetch
- Passed through `deepAIAnalysis()` and `fallbackDeepAnalysis()`
- Response includes `weights_used` field

#### Signal Detection
- `SignalFilter` and `SignalDefinition` interfaces
- `SIGNAL_DEFINITIONS` array with 8 signal patterns
- `candidateHasSignal()` - pattern-based detection in candidate fields (regex matching across nested data)
- `calculateSignalBoost()` - sums boost values for matched signals
- `passesRequiredSignals()` - pre-filter: rejects candidates missing required signals
- Signal boost applied after base score calculation, capped at 0-100
- Match results include `signals_matched` and `signal_boost_applied`

### Campaign Detail Display

**File:** `src/pages/TalentCampaignDetail.jsx`

#### Weights Display Widget
Shows configured weights as horizontal bars below Campaign Details card:
```jsx
{campaign?.role_context?.criteria_weights && (
  <div><!-- 6 color-coded weight bars with percentages --></div>
)}
```

#### Signal Badges
`SignalBadges` component shows matched signals on each candidate card:
- Color-coded pill badges matching signal theme colors
- Shows boost value (e.g. "+15", "-5")
- Total signal boost indicator: "+X from signals"
- Rendered between MatchReasonCards and expandable analysis

Uses static Tailwind color maps (`signalBgMap`, `signalTextMap`, `signalBorderMap`) to avoid dynamic class purging.

### Key Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Vercel build failed | `CriteriaWeightingStep` imported as named export `{ CriteriaWeightingStep }` but is a default export | Changed to `import CriteriaWeightingStep, { DEFAULT_WEIGHTS }` |
| Vercel build failed | `SignalMatchingConfig.jsx` imported but file didn't exist yet | Created the component file |
| Wizard overflows viewport | Step 4 content (weights + signals) too tall for dialog | Added `max-h-[calc(80vh-140px)] overflow-y-auto` to content area |
| Missing `@react-pdf/renderer` | `useReportGenerator.jsx` imports it but not installed | `npm install @react-pdf/renderer` |

### Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/components/talent/campaign/CriteriaWeightingStep.jsx` | Created (previous session) | Weight sliders UI |
| `src/components/talent/campaign/SignalMatchingConfig.jsx` | Created | Signal toggles UI |
| `src/components/talent/campaign/index.js` | Updated | Barrel exports |
| `src/components/talent/CampaignWizard.jsx` | Modified | Step 4 integration, scroll fix, import fix |
| `src/pages/TalentCampaignDetail.jsx` | Modified | Weights display, signal badges, import |
| `supabase/functions/analyzeCampaignProject/index.ts` | Modified | Custom weights, signal detection/boosting |

### Deployment

```bash
# Edge function
SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" \
npx supabase functions deploy analyzeCampaignProject --project-ref sfxpmzicgpaxfntqleig --no-verify-jwt

# Frontend auto-deploys via Vercel on push to main
```

---

## UI Color Palette Unification (Jan 30, 2026)

### Overview

Comprehensive migration of the entire platform to a unified **cyan/blue** color palette. Previously, different sections used inconsistent colors (green, amber, orange, purple, pink, emerald). Now all environments follow these rules:

### Color Rules

| Usage | Color | Example |
|-------|-------|---------|
| Primary accents | Cyan (`cyan-400`, `cyan-500`, `cyan-600`) | Buttons, active states, badges |
| Secondary accents | Blue (`blue-400`, `blue-500`) | Secondary info, pricing models |
| Neutral/Draft | Zinc (`zinc-400`, `zinc-500`) | Draft badges, disabled states |
| Errors/Destructive | Red (`red-400`, `red-500`) | Delete buttons, failed status, errors |
| App branding (Workspace) | Per-app colors | Learn=cyan, Growth=indigo, Sentinel=sage, Finance=blue, Raise=blue, Talent=red |

### What Was Changed

**Products Environment** (19 component files):
- All green "Published" badges → cyan
- All amber/gold "In Stock" badges → cyan
- All orange document icons → cyan
- All purple pricing accents → blue
- Files: `ProductCard.jsx`, `ProductDetail.jsx`, `ActivityTimeline.jsx`, `ProductImageUploader.jsx`, `DocumentsSection.jsx`, `PricingTiers.jsx`, `InlineEdit.jsx`, `ProductHero.jsx`, `VariantsManager.jsx`, `SpecificationsTable.jsx`, `BundleManager.jsx`, `BundlePricingCalculator.jsx`, `BundleEditor.jsx`, `QuickActions.jsx`, `PricingTable.jsx`, `OneTimePricingEditor.jsx`, `DigitalPricingManager.jsx`, `SubscriptionPlanEditor.jsx`, `AddOnEditor.jsx`, `BarcodeDisplay.jsx`, `ProductInquiryModal.jsx`, `ProductModal.jsx`

**Settings - Integrations** (`src/pages/Integrations.jsx`):
- All emerald status indicators → cyan
- All orange action accents → blue/cyan
- All amber warnings → zinc
- Google gradient updated to blue/cyan

**Settings - Workspace** (`src/components/layout/AppsManagerModal.jsx`):
- Finance/Raise app color: emerald → blue
- Create app color: pink → cyan
- Removed unused pink/emerald COLOR_CLASSES, added blue

**Integration Components** (`src/components/integrations/IntegrationCard.jsx`):
- Purple Connect buttons → cyan
- Green connected indicators → cyan

**Action Components** (`src/components/actions/*.jsx`):
- All orange/amber action accents → cyan
- Green success indicators → cyan
- Files: `IntegrationCard.jsx`, `ActionQueueCard.jsx`, `ActionHistoryList.jsx`, `ConnectIntegrationModal.jsx`, `CreateActionModal.jsx`, `ExecuteActionModal.jsx`

**Global UI**:
- `GlassCard.jsx`: Removed all hover glow/shadow effects, border-only highlights
- Hover effects: Only border color changes on hover, no `box-shadow` glow

### Settings Embedded Pages

Settings tabs render page components inline using an `embedded` prop pattern:

```jsx
// In Settings.jsx
{activeTab === 'teams' && <TeamManagement embedded />}
{activeTab === 'integrations' && <Integrations embedded />}
{activeTab === 'workspace' && <AppsManagerModal embedded />}
```

When `embedded=true`, components skip their outer layout (min-h-screen, PageHeader, backgrounds) and render only their content.

### SYNC Avatar

The SYNC avatar in the sidebar (`src/components/icons/SyncAvatarMini.jsx`) uses 10 colored ring segments representing AI agents. The gap between segments was increased from 2% to 4% of the circle for better visibility at small sizes.

### Key Commits
- `e57c864` - fix: unify ProductCard shared component to cyan/blue palette
- `1ccfcc9` - fix: unify ProductDetail and ActivityTimeline to cyan/blue palette
- `eef1287` - fix: migrate all 19 product components to cyan/blue palette
- `d894e2d` - fix: migrate Integrations and Workspace pages to cyan/blue palette

---

## SENTINEL - EU AI Act Compliance Module (Jan 31, 2026)

<!-- LAST_UPDATED -->Last updated: 2026-01-31 (Branch: main)<!-- /LAST_UPDATED -->

### Overview

**SENTINEL** is an EU AI Act Compliance Management tool that helps organizations track AI systems, assess risks, and generate compliance documentation.

### Tech Stack

| Property | Value |
|----------|-------|
| **Framework** | React 18 + Vite |
| **Database** | Supabase (`sfxpmzicgpaxfntqleig`) |
| **Routing** | React Router DOM v7 |
| **Animations** | Framer Motion (in progress), animated.js |
| **Design** | Dark theme, Mint green (#86EFAC), Glass morphism |

### File Structure

#### Pages (`/src/pages/`)

| File | Route | Purpose |
|------|-------|---------|
| `Sentinel.jsx` | `/sentinel` | Entry/landing page |
| `SentinelDashboard.jsx` | `/sentineldashboard` | Main compliance dashboard with gauge, stats, workflow stepper |
| `AISystemInventory.jsx` | `/aisysteminventory` | Browse, filter, register AI systems (paginated, 12/page) |
| `ComplianceRoadmap.jsx` | `/complianceroadmap` | Timeline & obligation tracker with AI Action Plan generator |
| `DocumentGenerator.jsx` | `/documentgenerator` | Generate Annex IV tech docs & Article 47 conformity declarations |

#### Components (`/src/components/sentinel/`)

| Component | Purpose |
|-----------|---------|
| `AISystemModal.jsx` | Registration modal with optional CIDE AI research pre-fill |
| `RiskAssessmentWizard.jsx` | Multi-step EU AI Act classification (5 steps) |
| `EnhancedSystemCard.jsx` | AI system display card |
| `QuickActions.jsx` | Dashboard quick action cards |
| `WorkflowStepper.jsx` | 4-step compliance workflow |
| `RiskClassificationBadge.jsx` | Color-coded risk level badges |
| `TechnicalDocTemplate.jsx` | Annex IV technical documentation template |
| `DeclarationOfConformity.jsx` | Article 47 conformity declaration template |

#### Data Layer (`/src/api/`)

| File | Exports |
|------|---------|
| `entities.js` | `AISystem`, `Obligation`, `ComplianceRequirement`, `RegulatoryDocument` |
| `supabaseClient.js` | Supabase instance |

#### Utilities

| File | Purpose |
|------|---------|
| `/src/utils/index.ts` | `createPageUrl()` routing helper |
| `/src/lib/agents/agents/compliance.ts` | LLM compliance agent (demo artifact, not wired into frontend) |

### Architecture Patterns

1. **No state management library** — local React state + `useMemo` for derived data
2. **No custom hooks** — data fetching done inline with `db.entities.*` calls
3. **No caching or realtime subscriptions** — fresh fetch on mount/action
4. **Classification logic priority**: prohibited → high-risk → GPAI → limited-risk → minimal-risk
5. **CIDE integration** in AISystemModal calls `analyzeAISystem` edge function to auto-fill registration + assessment answers
6. **Design system**: sage/mint green (#86EFAC) on black, glass morphism cards, Framer Motion animations

### Data Flow

```
Component → db.entities.AISystem.list/create/update
  → Supabase Client → REST API → PostgreSQL (with RLS)
  → Response → State → Re-render
```

### Database Tables

| Table | Purpose |
|-------|---------|
| `ai_systems` | Main AI systems inventory |
| `users` | User profiles |
| `user_app_configs` | Per-user app settings |
| `companies` | Company data |
| `team_members` | Team membership |
| `teams` | Team structure |
| `organizations` | Organization hierarchy |
| `user_notifications` | Notifications |

### RPC Functions
- `get_user_effective_apps`
- `get_user_roles`
- `get_user_permissions`

### Design Tokens

```css
/* Current Sentinel Theme */
--theme-primary: #86EFAC;        /* Mint green */
--theme-primary-tint-10: rgba(134, 239, 172, 0.1);
--theme-primary-tint-20: rgba(134, 239, 172, 0.2);
--bg-page: #000000;              /* Black */
--bg-surface: rgba(39, 39, 42, 0.5);   /* zinc-900/50 */
--bg-elevated: rgba(39, 39, 42, 0.6);  /* zinc-900/60 */
--border-default: rgba(63, 63, 70, 0.6); /* zinc-800/60 */
--text-primary: #FFFFFF;
--text-muted: #9CA3AF;
```

### Known Technical Debt

- [ ] No test files detected
- [ ] No TypeScript on page/component files (only utilities)
- [ ] No error boundaries or granular error handling
- [ ] No custom hooks to deduplicate repeated fetch logic
- [ ] No caching strategy

### Rebuild Plan (Design System Alignment)

#### Phase 1: Foundation
1. Create design tokens (`/src/tokens/sentinel.ts`)
2. Define SENTINEL Blue as primary color (per design system)
3. Update border radius to 20px for cards

#### Phase 2: Components
1. Migrate StatCard, ActionCard to design system specs
2. Update RiskBadge with standardized colors
3. Implement Framer Motion animations
4. Standardize buttons to pill style (9999px radius)

#### Phase 3: Data Layer
1. Create custom hooks (`useAISystems`, `useCompliance`)
2. Add React Query for caching
3. Implement error boundaries

#### Phase 4: Testing
1. Add component tests
2. Add integration tests
3. Add E2E tests for critical flows

### Claude Code Prompts for Sentinel

#### Get Database Schema
```
Show the full Supabase schema for ai_systems table including columns, types, constraints, and RLS policies.
```

#### Analyze Component
```
Read /src/components/sentinel/[ComponentName].jsx and explain:
- Props interface
- State usage
- Data fetching pattern
- Animation usage
```

#### Find Animation Usage
```
Search for all framer-motion and animated.js usage in /src/components/sentinel/ and /src/pages/ related to Sentinel
```

---

<!-- SENTINEL_ANALYSIS_END -->

## Client Candidate Exclusion System (Feb 2, 2026)

### Overview

Prevents recruiters from contacting candidates who work for their clients. Candidates from excluded client companies are separated into a "Ruled Out" section — never enriched, never matched, never outreached.

### Database Schema

```sql
-- Added to prospects (clients) table
ALTER TABLE prospects ADD COLUMN exclude_candidates BOOLEAN DEFAULT false;
ALTER TABLE prospects ADD COLUMN company_aliases TEXT[] DEFAULT '{}';

-- Added to candidates table
ALTER TABLE candidates ADD COLUMN excluded_reason TEXT;
ALTER TABLE candidates ADD COLUMN excluded_client_id UUID REFERENCES prospects(id);
ALTER TABLE candidates ADD COLUMN excluded_at TIMESTAMPTZ;
```

### Smart Company Matching Functions

| Function | Purpose |
|----------|---------|
| `normalize_company_name(TEXT)` | Lowercase, strip suffixes (inc, llc, b.v., gmbh, etc.) |
| `match_excluded_client(p_company_name, p_organization_id)` | 4-tier matching: exact → alias → fuzzy (trigram >0.4) → fuzzy_alias. Returns `client_id, client_company, match_type` |
| `exclude_candidates_for_client(p_client_id, p_organization_id)` | Bulk retroactive exclusion — marks all matching candidates |

Requires `pg_trgm` extension for trigram similarity.

### Client UI (`src/pages/TalentClients.jsx`)

- **Toggle:** "Exclude candidates from this company" (`exclude_candidates` boolean)
- **Aliases:** Tag-style input for `company_aliases` (e.g. "Google Inc.", "Alphabet")
- **Retroactive:** Toggling ON calls `exclude_candidates_for_client` RPC to mark existing candidates
- **Recovery:** Toggling OFF clears `excluded_*` fields on all affected candidates

### Nest Purchase Flow (`src/pages/TalentNestDetail.jsx`)

- **Pre-purchase preview:** Shows which clients' candidates will be ruled out and count
- **During copy:** Excluded candidates get `excluded_reason = 'client_company_match'`, `excluded_client_id`, `excluded_at` set
- **Excluded candidates NOT queued** for intel processing (saves credits)
- **"Ruled Out" section:** Collapsible post-purchase section with per-candidate and bulk "Recover" buttons

### Guards (Exclusion Filters)

| Location | Filter |
|----------|--------|
| `TalentCandidates.jsx` fetch | `.is("excluded_reason", null)` |
| `analyzeCampaignProject/index.ts` | `.is("excluded_reason", null)` on candidate query |
| `process-sync-intel-queue/index.ts` | Skip candidates with `excluded_reason` during processing |

### Key Files

| File | Purpose |
|------|---------|
| `supabase/migrations/20260202170000_client_candidate_exclusion.sql` | Schema + matching functions |
| `src/pages/TalentClients.jsx` | Exclusion toggle + aliases UI |
| `src/pages/TalentNestDetail.jsx` | Purchase preview + ruled-out section |
| `src/pages/TalentCandidates.jsx` | Filter excluded from main list |
| `supabase/functions/analyzeCampaignProject/index.ts` | Exclude from matching |
| `supabase/functions/process-sync-intel-queue/index.ts` | Skip excluded in queue |

---

## Explorium Enrichment Cache System (Feb 2, 2026)

### Overview

Global caching layer that stores Explorium API responses to avoid duplicate API calls. Shared across ALL organizations — when Org A enriches "Google", Org B gets cached data automatically.

### Architecture

```
Frontend → explorium-enrich edge fn → [CHECK CACHE] → hit? return cached
                                                    → miss? call Explorium → save to cache → return
```

Cache operates entirely server-side in edge functions. No frontend changes needed. Credits charged same as fresh enrichment.

### Database Tables

```sql
-- Prospect/LinkedIn cache (90-day freshness)
enrichment_cache_prospects (
  id UUID PRIMARY KEY,
  linkedin_url TEXT,               -- unique partial index
  email TEXT,                      -- unique partial index
  enrichment_data JSONB NOT NULL,  -- full normalized response from fullEnrich()
  explorium_prospect_id TEXT,
  explorium_business_id TEXT,
  created_at, updated_at, expires_at TIMESTAMPTZ,
  hit_count INTEGER DEFAULT 1,
  last_hit_at TIMESTAMPTZ
)

-- Company intelligence cache (180-day freshness)
enrichment_cache_companies (
  id UUID PRIMARY KEY,
  normalized_name TEXT,            -- unique partial index
  domain TEXT,                     -- unique partial index
  intelligence_data JSONB NOT NULL, -- full response from generateCompanyIntelligence()
  explorium_business_id TEXT,
  created_at, updated_at, expires_at TIMESTAMPTZ,
  hit_count INTEGER DEFAULT 1,
  last_hit_at TIMESTAMPTZ
)
```

No RLS — tables accessed only by edge functions via service_role.

### Cache Logic

**`explorium-enrich/index.ts`** — caches `full_enrich` action:
1. Normalize key (linkedin_url or email, lowercased/trimmed)
2. Query `enrichment_cache_prospects` where key matches AND `expires_at > NOW()`
3. **Hit:** increment `hit_count`, return `cached.enrichment_data`
4. **Miss:** call Explorium `fullEnrich()`, upsert result with 90-day expiry

**`generateCompanyIntelligence/index.ts`** — caches full company intelligence:
1. Normalize company name (lowercase, strip inc/llc/b.v./etc.)
2. Query `enrichment_cache_companies` by name or domain where `expires_at > NOW()`
3. **Hit:** increment counter, still save to entity if `entityId` provided, return cached
4. **Miss:** make 9 parallel Explorium API calls, upsert with 180-day expiry

### Freshness Rules

| Data Type | TTL | Rationale |
|-----------|-----|-----------|
| Prospect/LinkedIn | 90 days | People change jobs ~quarterly |
| Company intelligence | 180 days | Company data changes slowly |

### Cache Stats Query

```sql
-- Prospect cache stats
SELECT COUNT(*) as entries, SUM(hit_count) as total_hits,
  SUM(hit_count) - COUNT(*) as api_calls_saved
FROM enrichment_cache_prospects;

-- Company cache stats
SELECT COUNT(*) as entries, SUM(hit_count) as total_hits,
  SUM(hit_count) - COUNT(*) as api_calls_saved
FROM enrichment_cache_companies;
```

### Key Files

| File | Purpose |
|------|---------|
| `supabase/migrations/20260202180000_enrichment_cache.sql` | Cache tables + indexes |
| `supabase/functions/explorium-enrich/index.ts` | Prospect cache check/save around `full_enrich` |
| `supabase/functions/generateCompanyIntelligence/index.ts` | Company cache check/save |

### Design Decisions

- **Full JSONB blobs** — no individual columns, flexible if Explorium adds fields
- **Edge function level** — single insertion point, all callers benefit automatically
- **Expired entries kept** — filtered by `gt('expires_at', now)`, available for future stale-while-revalidate
- **Upsert on key** — re-enrichment refreshes cache instead of duplicating
- **No cleanup cron** — expired rows ignored; can add periodic cleanup later if table grows

---

## Blueprint Build Progress (Feb 2026)

**Plan document**: `BLUEPRINT_BUILD_PLAN.md`
**Detailed build log**: `BUILD_LOG.md`

### Key Architecture Decisions
- **Tenant scoping**: ALL new Blueprint tables use `company_id` via `get_user_company_id()`. Do NOT use `organization_id` (that's talent domain only).
- **Sales channels**: Use `product_sales_channels` **junction table** (not a column on products) — one product can be on multiple channels simultaneously.
- **bol.com tokens**: Persisted in DB (`bolcom_credentials.access_token` + `token_expires_at`), pg_cron pre-refresh every 4 min. Edge Functions have cold starts — never cache tokens in-memory.
- **Composio triggers**: Gmail = `GMAIL_NEW_GMAIL_MESSAGE` (poll-based, ~60s). Outlook = `OUTLOOK_MESSAGE_TRIGGER` (webhook-based, near-realtime).
- **Existing columns to reuse**: `shipping_tasks.total_weight` and `shipping_tasks.dimensions` JSONB already exist — just expose in UI.

### Phase Status
| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Database Foundation & Infrastructure | **Complete** |
| 1 | Purchasing Overhaul | **Complete** (P1-1 through P1-8 all done) |
| 2 | Receiving Enhancements | **Complete** (P2-1 through P2-7 all done) |
| 3 | Pallet Management (3a/3b/3c) | **Complete** (P3-1 through P3-14 all done) |
| 4 | bol.com Retailer API | **Complete** (P4-1 through P4-21 all done) |
| 5 | Returns Workflow | Not Started |
| EP | Email Pool Auto-Sync | Not Started |
| SH | Shopify Admin API | **Complete** (SH-1 through SH-21 done, SH-16/18 deferred, SH-22 through SH-25 = testing) |

---

## Production Health Audit (Feb 27, 2026)

Two comprehensive audits were completed — frontend (`173db6a`) and backend (`a417afe`) — covering the full stack before production delivery.

### Frontend Audit (commit `173db6a`)

**What was fixed:**
- Duplicate toast notifications (multiple ToastProvider instances)
- Code-splitting improvements for bundle size
- Build warnings cleaned up
- Profile avatar section layout fixes

### Backend Audit (commit `a417afe`)

**33 files changed, 497 insertions, 87 deletions.**

#### Security Hardening (Critical)
- **Hardcoded service role key removed** from 4 SQL migration files. New migration `20260226200000_fix_hardcoded_service_keys.sql` redefines `trigger_sync_intel_processor()`, `auto_link_user_to_company()`, and the `product-feed-auto-sync` cron job to use `current_setting('supabase.service_role_key')` instead of a literal JWT
- **Credentials stripped from CLAUDE.md** — all Supabase keys, PAT, and secrets replaced with env var references
- **Composio webhook verification implemented** — `verifyWebhookSignature()` now does real HMAC-SHA256 instead of returning `true`. Uses `COMPOSIO_WEBHOOK_SECRET`
- **Stripe webhook fails closed** — returns 500 if `STRIPE_WEBHOOK_SECRET` is unset (was falling through to unsigned processing)
- **Twilio signature validation added** — both `sms-webhook` and `voice-webhook` now validate `X-Twilio-Signature` via HMAC-SHA1. Uses `TWILIO_AUTH_TOKEN`
- **Default encryption keys removed** — `bolcom-api`, `shopify-api`, `sync-studio-publish-bol` no longer fall back to `"...-default-key-change-me"`. They throw on startup if `BOLCOM_ENCRYPTION_KEY` / `SHOPIFY_ENCRYPTION_KEY` are missing

#### Data Integrity
- **18 duplicate migration timestamps fixed** — 12 collision groups resolved via `git mv` (e.g., `20260226120000` had 2 files, `20260225100000` had 3)
- **GrowthNest entity wrappers added** — `GrowthNest` and `GrowthNestPurchase` in `supabaseClient.js` (were exported by `entities.js` but never created)
- **`getLowStockItems` fixed** — removed broken RPC filter that passed a Promise to `.lt()`, made client-side filtering the only path

#### Config & Code Quality
- **13 missing functions added to `config.toml`** — `agents`, `auto-enrich-company`, `generate-acknowledgments`, `getTeamMembers`, `invokeGrok`, `process-order-email`, `scrape-job-url`, `send-invitation-email`, `send-invoice-email`, `send-license-email`, `send-proposal-email`, `smart-import-invoice`, `tracking-cycle`
- **Stub functions return 501** — `reach-generate-ad-video`, `reach-fetch-metrics`, `reach-publish-post` now return HTTP 501 (Not Implemented) instead of 200

#### Secrets Deployed
| Secret | Status |
|--------|--------|
| `COMPOSIO_WEBHOOK_SECRET` | Set |
| `TWILIO_AUTH_TOKEN` | Set |
| `SHOPIFY_ENCRYPTION_KEY` | Generated and set |
| `BOLCOM_ENCRYPTION_KEY` | Already existed |
| Supabase PAT | Rotated (old `sbp_957c...` revoked) |

#### Verification Results
- All 4 RLS wrapper functions intact (STABLE SECURITY DEFINER)
- RLS enabled on all 8 core tables
- Zero functions contain hardcoded JWT (`eyJhbG`)
- Cron job uses `current_setting()` — confirmed via `pg_proc`
- All 10 redeployed edge functions responding correctly (webhooks reject unsigned, stubs return 501)
- Frontend loads at `app.isyncso.com` — 200 OK

#### Still Outstanding (tracked, not blocking delivery)
- **H-4**: 6 RPCs exist in production but have no migration file (`get_user_roles`, `get_user_permissions`, `check_candidate_current_exclusion`, `get_product_purchase_stats`, `get_reorder_point`, `get_store_dashboard_stats`)
- **M-4**: CORS is `*` on all functions — should be tightened to `app.isyncso.com`
- **M-5**: Deno std library version split (90 functions on `0.168.0`, 17 on `0.177.0`)
- **L-1 to L-6**: ~60 orphaned entity wrappers, ~30 orphaned function wrappers, auth.me() swallowing errors, no enrichment cache cleanup, email queue stub, credit refund gap

---
