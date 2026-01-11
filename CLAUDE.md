# iSyncSO Development Guidelines

This file contains critical development rules and patterns that must be followed when building features for the iSyncSO application.

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
| Anon Public Key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDY0NjIsImV4cCI6MjA4MjE4MjQ2Mn0.337ohi8A4zu_6Hl1LpcPaWP8UkI5E4Om7ZgeU9_A8t4` |
| Service Role Key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjYwNjQ2MiwiZXhwIjoyMDgyMTgyNDYyfQ.8SeBs34zEK3WVAgGVHmS9h9PStGCJAjPqiynMzx1xsU` |
| Publishable Key | `sb_publishable_CFe3Zkw-Fji8LNc3aR2EFQ_El0Xwq8k` |
| Secret Key | `sb_secret_Ove4Djf-0eV9L7gnVDgizQ_fiXjMO4I` |
| Personal Access Token (PAT) | `sbp_b998952de7493074e84b50702e83f1db14be1479` |

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
SUPABASE_ACCESS_TOKEN="sbp_b998952de7493074e84b50702e83f1db14be1479" npx supabase db push
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
        "Authorization": "Bearer sbp_b998952de7493074e84b50702e83f1db14be1479"
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
  -H "Authorization: Bearer sbp_b998952de7493074e84b50702e83f1db14be1479" \
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
SUPABASE_ACCESS_TOKEN="sbp_b998952de7493074e84b50702e83f1db14be1479" npx supabase functions deploy <function-name> --project-ref sfxpmzicgpaxfntqleig --no-verify-jwt
```

### Edge Function Secrets

```bash
# List secrets
SUPABASE_ACCESS_TOKEN="sbp_b998952de7493074e84b50702e83f1db14be1479" npx supabase secrets list --project-ref sfxpmzicgpaxfntqleig

# Set secret
SUPABASE_ACCESS_TOKEN="sbp_b998952de7493074e84b50702e83f1db14be1479" npx supabase secrets set KEY="value" --project-ref sfxpmzicgpaxfntqleig
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
SUPABASE_ACCESS_TOKEN="sbp_b998952de7493074e84b50702e83f1db14be1479" \
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
