# Roadmap Mode Protocol

> When the user says **"roadmap mode"**, Claude Code enters this workflow.

---

## Overview

The `roadmap_items` table in Supabase is a two-way async communication channel between the user (via `/admin/roadmap` UI) and Claude Code sessions. The user adds feature requests; Claude Code picks them up, builds them, and reports progress via comments.

## Table: `roadmap_items`

**Connection:** Supabase project `sfxpmzicgpaxfntqleig`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Primary key |
| `title` | TEXT | Feature title |
| `description` | TEXT | Full description (markdown) |
| `status` | TEXT | `requested`, `planned`, `in_progress`, `review`, `done`, `cancelled` |
| `priority` | TEXT | `low`, `medium`, `high`, `critical` |
| `category` | TEXT | Module category (talent, crm, sync-agent, etc.) |
| `assignee` | TEXT | Agent ID (S1-S6) or null |
| `effort` | TEXT | T-shirt sizing (xs, s, m, l, xl) |
| `target_date` | DATE | When this should be done |
| `subtasks` | JSONB | `[{text, done, added_by, completed_at}]` |
| `files_affected` | TEXT[] | Which files this will touch |
| `depends_on` | UUID[] | IDs of items that must complete first |
| `blocks` | UUID[] | IDs of items blocked by this |
| `comments` | JSONB | `[{content, author, created_at}]` — the conversation |
| `tags` | JSONB | `["bug", "frontend", ...]` |
| `history` | JSONB | `[{action, actor, at}]` — activity log |
| `orchestra_task_id` | TEXT | Link to .orchestra/ task (e.g., "T015") |
| `created_by` | TEXT | `user` or `claude` |
| `created_at` | TIMESTAMPTZ | When created |
| `updated_at` | TIMESTAMPTZ | Auto-updated on change |

## Workflow

### 1. Scan for Work

```sql
SELECT * FROM roadmap_items
WHERE status IN ('requested', 'planned')
AND (assignee IS NULL OR assignee = '<current_agent_id>')
ORDER BY
  CASE priority
    WHEN 'critical' THEN 0
    WHEN 'high' THEN 1
    WHEN 'medium' THEN 2
    WHEN 'low' THEN 3
  END,
  created_at ASC;
```

### 2. Check for Replies

Before picking up new work, check if any items have unread user replies:

```sql
SELECT * FROM roadmap_items
WHERE status IN ('in_progress', 'review', 'planned')
AND comments != '[]'::jsonb
ORDER BY updated_at DESC;
```

Look at the last comment — if `author = 'user'`, the user has replied. Read the reply and respond.

### 3. Claim an Item

```sql
UPDATE roadmap_items SET
  status = 'in_progress',
  assignee = '<agent_id>',
  history = history || '[{"action": "Claimed by Claude", "actor": "claude", "at": "<now>"}]'::jsonb
WHERE id = '<item_id>';
```

### 4. Leave Progress Comments

As you build, leave comments to keep the user informed:

```sql
UPDATE roadmap_items SET
  comments = comments || '[{"content": "Started working on this. The approach is...", "author": "claude", "created_at": "<now>"}]'::jsonb
WHERE id = '<item_id>';
```

When you're unsure about something, leave a question as a comment:

```sql
UPDATE roadmap_items SET
  comments = comments || '[{"content": "**Question:** Should the export include subtask details or just summary counts?", "author": "claude", "created_at": "<now>"}]'::jsonb
WHERE id = '<item_id>';
```

Then move to the next item. When you come back, check if the user replied.

### 5. Update Subtasks

Mark subtasks as done as you complete them:

```sql
-- Read current subtasks, toggle the done flag, write back
UPDATE roadmap_items SET
  subtasks = '<updated_subtasks_json>'
WHERE id = '<item_id>';
```

### 6. Complete an Item

When done building:

```sql
UPDATE roadmap_items SET
  status = 'review',
  comments = comments || '[{"content": "**Done!** Here is what I built:\n\n- Feature X in `src/components/foo.jsx`\n- Migration applied\n- Deployed to production\n\nPlease review and let me know if anything needs changes.", "author": "claude", "created_at": "<now>"}]'::jsonb,
  history = history || '[{"action": "Completed, moved to review", "actor": "claude", "at": "<now>"}]'::jsonb
WHERE id = '<item_id>';
```

### 7. Move to Next

Repeat from step 1. Always prioritize:
1. Items with unread user replies (conversations in progress)
2. `critical` priority items
3. `high` priority items
4. Items with fewer dependencies
5. Oldest `requested` items

## Rules

- **Always leave a comment** when you start, finish, or have a question
- **Never skip `review`** — always move to `review` before `done`, let the user confirm
- **Respect scope** — only claim items in your agent's scope (check `category` and `assignee`)
- **Update `files_affected`** as you discover which files you'll touch
- **Link to orchestra** — set `orchestra_task_id` if you create a corresponding task in `.orchestra/tasks.md`
- **Markdown in comments** — use bold, code blocks, and lists for clarity
- **One at a time** — don't claim multiple items simultaneously unless they're related

## Notifications

When Claude adds a comment, the frontend automatically creates a notification in `user_notifications`:
```json
{
  "type": "roadmap_reply",
  "title": "Claude replied on \"Feature Title\"",
  "message": "First 200 chars of comment...",
  "action_url": "/admin/roadmap",
  "metadata": { "roadmap_item_id": "uuid" }
}
```

## Realtime

The frontend subscribes to Supabase Realtime on `roadmap_items`. Any changes Claude makes are reflected instantly in the admin UI without page refresh.

## Quick Reference

```bash
# Read all items via Management API
curl -s -X POST 'https://api.supabase.com/v1/projects/sfxpmzicgpaxfntqleig/database/query' \
  -H 'Authorization: Bearer <PAT>' \
  -H 'Content-Type: application/json' \
  -d '{"query": "SELECT id, title, status, priority, category, assignee FROM roadmap_items ORDER BY priority, created_at;"}'
```
