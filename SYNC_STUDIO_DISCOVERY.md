# Sync Studio — Codebase Discovery (Phase 0)

Generated: 2026-02-12

---

## 1. Create Engine Interface

**Edge Function:** `supabase/functions/generate-image/index.ts`

**Input (POST body):**
```json
{
  "model_key": "flux-kontext-pro",        // or auto via use_case
  "use_case": "product_scene",            // routes to model automatically
  "reference_image_url": "https://...",   // for Kontext models (product preservation)
  "product_images": ["url1", "url2"],     // first used as reference if no ref URL
  "prompt": "Professional product photo...",
  "original_prompt": "...",
  "style": "photorealistic",
  "width": 1024,
  "height": 1024,
  "brand_context": { "colors": {...}, "visual_style": {...} },
  "product_context": { "name": "...", "description": "...", "type": "physical" },
  "is_physical_product": true,
  "company_id": "uuid",
  "user_id": "uuid"
}
```

**Output:**
```json
{
  "url": "https://sfxpmzicgpaxfntqleig.supabase.co/storage/v1/object/public/generated-content/generated-xxx.png",
  "model": "flux-kontext-pro",
  "model_id": "black-forest-labs/FLUX.1-Kontext-pro",
  "cost_usd": 0.04,
  "prompt": "enhanced prompt...",
  "original_prompt": "...",
  "dimensions": { "width": 1024, "height": 1024 },
  "product_preserved": true,
  "use_case": "product_scene"
}
```

**Key decisions:**
- For Sync Studio shots: use `use_case: "product_scene"` (routes to `flux-kontext-pro` for product preservation)
- When product has existing images, pass first as `reference_image_url`
- When no product images exist, use `use_case: "marketing_creative"` (routes to `flux-pro`, text-to-image)
- Images stored in `generated-content` bucket (public)
- Billing tracked via `ai_usage_logs` table

---

## 2. Bol.com Integration

**Edge Function:** `supabase/functions/bolcom-api/index.ts`

**Auth:** Client Credentials OAuth2 (tokens cached in `bolcom_credentials` table, auto-refreshed)
- `getBolToken(supabase, companyId)` handles token refresh automatically
- Encrypted credentials in DB

**API Base:** `https://api.bol.com/retailer` (v10)

**Existing actions relevant to Sync Studio:**
- `getInventory` — paginated inventory with EANs + stock
- `listOffers` — async export (POST /offers/export → processStatusId → poll)
- `getOffer` — single offer by offerId
- `updateOffer` — update offer (including images)

**Product data fetching strategy (DECISION):**
The bol.com Retailer API v10 does NOT have a `/products` endpoint for bulk catalog fetch.
Instead, inventory + offers provide EANs. For full product data (title, description, images, category),
we need to use the bol.com Catalog API via `/products/{ean}` endpoint.

**Decision:** The `sync-studio-import-catalog` edge function will:
1. Paginate through `/inventory` to get all EANs
2. For each EAN, call bol.com Catalog/Content API to get product details
3. Store in `sync_studio_products`

---

## 3. Database Schema

**ORM Pattern:** Direct Supabase client (`supabase.from('table').select/insert/update/delete`)
- Entity wrapper in `src/api/supabaseClient.js` provides `db.entities.Entity.list/create/update/delete`
- Direct queries via `db.from('table_name')` or `supabase.from('table_name')`
- For new Sync Studio tables: use `supabase.from()` directly (no need to add entity wrappers for internal use)

**Naming conventions:**
- Tables: `snake_case` (e.g., `bolcom_credentials`, `generated_content`)
- Columns: `snake_case`
- UUIDs via `gen_random_uuid()`
- Timestamps: `TIMESTAMPTZ DEFAULT NOW()`
- Tenant scoping: `company_id` via `get_user_company_id()` or `auth_uid()` for user-level

**Existing products table:** Yes — `products` table exists but it's the app's internal product catalog.
**Decision:** Create `sync_studio_products` as standalone (Bol.com catalog mirror), per playbook spec.

**RLS pattern:** Use `auth_uid()` and `auth_company_id()` wrapper functions (optimized, STABLE).

---

## 4. Long-Running Tasks / Background Jobs

**No dedicated queue system.** The app uses:
- Edge functions with chunked processing (e.g., `bolcom-api` paginates inventory)
- `bolcom_pending_process_statuses` table for async process polling
- Frontend polling via `setInterval` / `useEffect` (2-3s intervals)
- Edge function timeout: ~60s (Supabase default)

**Decision for batch generation:**
- Edge function processes N items per invocation (chunk size ~10-20)
- Progress tracked in `sync_studio_jobs` table (images_completed, images_failed)
- Frontend polls `sync-studio-job-progress` every 2-3s
- Job orchestrator: frontend triggers chunks sequentially, or edge fn uses recursive invocation

---

## 5. File Storage

**Generated images:** `generated-content` bucket (public, unlimited size)
- URL pattern: `https://sfxpmzicgpaxfntqleig.supabase.co/storage/v1/object/public/generated-content/{filename}`
- Product images: `product-images` bucket (public, 10MB limit)

**Decision:** Sync Studio generated images will use `generated-content` bucket (same as Create engine).
Path convention: `sync-studio/{job_id}/{ean}_{shot_number}.png`

---

## 6. Frontend Stack

| Property | Value |
|----------|-------|
| Framework | React 18 + Vite |
| Routing | React Router DOM v7, PascalCase paths (e.g., `/SyncStudio`) |
| Styling | Tailwind CSS 3.4, dark theme (black bg, zinc surfaces, cyan accents) |
| Components | Radix UI primitives + shadcn/ui (`src/components/ui/`) |
| State | React useState/useEffect + Zustand for global, React Query for server state |
| Animations | Framer Motion |
| Icons | Lucide React |
| Toasts | Sonner |
| Forms | react-hook-form + Zod validation |

**Page convention:**
- Files in `src/pages/` as PascalCase `.jsx`
- Import + register in `src/pages/index.jsx` (PAGES map + Route)
- Layout wraps all main pages with sidebar navigation
- Navigation in `src/pages/Layout.jsx`

**Navigation pattern:** Items in Layout.jsx with `{ title, url: createPageUrl("PageName"), icon, permission }`

---

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Products table | Standalone `sync_studio_products` | Keeps Bol.com catalog separate from internal products |
| Queue system | Chunked edge functions + DB polling | No existing queue; matches existing patterns |
| Batch gen chunk size | 5 images per edge function call | Stay under 60s timeout with ~8-10s per image |
| Image storage | `generated-content` bucket | Same as existing Create engine |
| Planning engine | Server-side in edge function | Too compute-heavy for client; consistent plans |
| Frontend routing | `/SyncStudio`, `/SyncStudioDashboard`, etc. | Matches existing PascalCase convention |
| Create engine call | Direct fetch to `generate-image` edge fn | Same pattern as SYNC agent's `create.ts` |
| User scoping | `user_id` from auth (not company_id) | Sync Studio is per-user (retailer account) |
