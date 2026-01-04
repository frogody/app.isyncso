# ISYNCSO Entity Dependency Graph

## Entity Relationships

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              ORGANIZATION                                     │
│  (Root Entity - Multi-tenant boundary)                                        │
└──────────────────────────┬───────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│     USER      │  │   PROJECT     │  │   CANDIDATE   │
│ (via auth)    │  │               │  │               │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        │                  │                  │
        │          ┌───────┼───────┐          │
        │          │       │       │          │
        │          ▼       │       ▼          │
        │   ┌──────────┐   │  ┌──────────┐    │
        │   │   ROLE   │   │  │ CAMPAIGN │    │
        │   └──────────┘   │  └────┬─────┘    │
        │                  │       │          │
        │                  │       ▼          │
        │                  │  ┌──────────────┐│
        │                  └──┤OUTREACH_TASK ├┘
        │                     └──────┬───────┘
        │                            │
        │                            ▼
        │                     ┌──────────────────┐
        │                     │ OUTREACH_MESSAGE │
        │                     └──────────────────┘
        │
        ├──────────────────────────────────────────┐
        │                                          │
        ▼                                          ▼
┌───────────────────┐                    ┌───────────────────┐
│       TASK        │                    │ CHAT_CONVERSATION │
│ (links to cand,   │                    │                   │
│  project, user)   │                    └───────────────────┘
└───────────────────┘
        │
        ▼
┌───────────────────┐                    ┌───────────────────┐
│  USER_INVITATION  │                    │  REGENERATION_JOB │
│ (pending users)   │                    │  (background job) │
└───────────────────┘                    └───────────────────┘
```

## Dependency Order (Migration Sequence)

### Level 0 (No Dependencies)
1. **organizations** - Root entity, all others depend on this
2. **users** - Auth users (via Supabase Auth)

### Level 1 (Depends on: organizations, users)
3. **projects** - org_id, created_by (user)
4. **candidates** - org_id, owner (user)
5. **chat_conversations** - org_id, user_id

### Level 2 (Depends on: Level 1)
6. **roles** - project_id, org_id
7. **campaigns** - project_id, org_id, created_by
8. **tasks** - candidate_id?, project_id?, assigned_to (user), org_id

### Level 3 (Depends on: Level 2)
9. **outreach_tasks** - candidate_id, campaign_id, org_id
10. **outreach_messages** - candidate_id, project_id?, sent_by (user), org_id

### Support Tables
11. **user_invitations** - org_id, invited_by (user)
12. **regeneration_jobs** - user_id, org_id

## Foreign Key Relationships

| Table | Column | References |
|-------|--------|------------|
| projects | organization_id | organizations.id |
| projects | created_by | auth.users.id |
| candidates | organization_id | organizations.id |
| candidates | owner_id | auth.users.id |
| roles | project_id | projects.id |
| roles | organization_id | organizations.id |
| campaigns | project_id | projects.id |
| campaigns | organization_id | organizations.id |
| campaigns | created_by | auth.users.id |
| tasks | candidate_id | candidates.id (nullable) |
| tasks | project_id | projects.id (nullable) |
| tasks | assigned_to | auth.users.id |
| tasks | organization_id | organizations.id |
| outreach_tasks | candidate_id | candidates.id |
| outreach_tasks | campaign_id | campaigns.id |
| outreach_tasks | organization_id | organizations.id |
| outreach_messages | candidate_id | candidates.id |
| outreach_messages | organization_id | organizations.id |
| outreach_messages | sent_by | auth.users.id |
| chat_conversations | user_id | auth.users.id |
| chat_conversations | organization_id | organizations.id |
| user_invitations | organization_id | organizations.id |
| user_invitations | invited_by | auth.users.id |
| regeneration_jobs | user_id | auth.users.id |
| regeneration_jobs | organization_id | organizations.id |

## Multi-Tenancy Pattern

All entities use `organization_id` as the tenant boundary. Row Level Security (RLS) policies should:
1. Filter all reads by user's organization
2. Prevent cross-organization data access
3. Use `auth.uid()` to get current user

## Entities to Skip (Unused)

Based on codebase analysis:
- **Team** - No active usage found
- **Client** - No active usage found
- **ChatProgress** - No active usage found
- **IntelligenceProgress** - No active usage found

## Core vs. Support Entities

**Core (High Priority):**
- organizations, candidates, campaigns, projects, tasks, outreach_tasks, outreach_messages

**Support (Medium Priority):**
- roles, chat_conversations, user_invitations, regeneration_jobs
