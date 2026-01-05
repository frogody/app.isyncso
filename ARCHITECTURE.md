# System Architecture

## Overview

iSyncSO (app.isyncso.com) is a recruiting and candidate management platform that helps organizations manage their talent pipeline, conduct outreach campaigns, and leverage AI for candidate intelligence and communication.

## Tech Stack

- **Frontend**: React 18 + Vite 6
- **Routing**: React Router DOM 7
- **Styling**: Tailwind CSS 3 + shadcn/ui components
- **State Management**: React hooks (useState, useEffect, useContext)
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Authentication**: Supabase Auth (Google OAuth)
- **AI Integration**:
  - Groq (Llama 3.1 for fast/cheap tasks)
  - Anthropic Claude (for quality/complex tasks)
- **Legacy Backend**: Base44 SDK (being migrated to Supabase)

## Directory Structure

```
src/
├── api/                    # Backend API clients
│   ├── base44Client.js     # Legacy Base44 SDK client
│   ├── entities.js         # Entity exports with feature flag switching
│   ├── functions.js        # Cloud function wrappers
│   ├── integrations.js     # Third-party integrations
│   ├── llmRouter.js        # AI model routing (Groq/Anthropic)
│   └── supabaseClient.js   # Supabase client with Base44-compatible interface
├── components/
│   ├── campaigns/          # Campaign management components
│   ├── candidates/         # Candidate display and management
│   ├── chat/              # AI chat interface
│   ├── organization/      # Organization settings
│   ├── outreach/          # Outreach management
│   ├── profile/           # User profile components
│   ├── projects/          # Project management
│   ├── ui/                # shadcn/ui base components
│   └── utils/             # Utility components (AI config, events, locks)
├── hooks/                 # Custom React hooks
├── lib/                   # Shared utilities
├── pages/                 # Page components (routes)
└── utils/                 # Helper utilities
```

## Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   React UI   │────▶│  API Layer   │────▶│   Supabase   │
│   (Pages)    │     │  (entities)  │     │  (Database)  │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │
       │                    ▼
       │             ┌──────────────┐
       │             │ Edge Funcs   │
       │             │ (AI/Logic)   │
       │             └──────────────┘
       │                    │
       ▼                    ▼
┌──────────────┐     ┌──────────────┐
│  LLM Router  │────▶│  Groq/Claude │
│              │     │     APIs     │
└──────────────┘     └──────────────┘
```

## Key Entities

### Candidate
- `id`, `first_name`, `last_name`, `email`
- `linkedin_url`, `profile_picture_url`
- `status`, `owner_id`, `organization_id`
- `intelligence` (AI-generated analysis)
- `created_date`, `updated_date`

### Campaign
- `id`, `name`, `description`, `status`
- `project_id`, `organization_id`
- `auto_match_enabled`
- Linked to candidates for outreach

### Project
- `id`, `title`, `description`, `status`
- `organization_id`, `owner_id`
- Contains roles/positions

### Organization
- `id`, `name`, `domain`
- Contains users, teams, settings

### OutreachTask
- `id`, `candidate_id`, `campaign_id`
- `status`, `message`, `due_date`
- Tracks outreach activities

### ChatConversation
- `id`, `candidate_ids`, `organization_id`
- `messages` (JSON array)
- AI chat interactions

## API Routes / Edge Functions

### Authentication
- `POST /auth/callback` - OAuth callback handler

### Candidates
- `generateCandidateIntelligence` - AI analysis of candidate
- `bulkGenerateIntelligence` - Batch intelligence generation
- `assignCandidateRoundRobin` - Auto-assign to team members

### Campaigns
- `analyzeCampaignProject` - AI project analysis
- `dailyCampaignMatching` - Auto-match candidates
- `generateCampaignOutreach` - Generate outreach messages

### Outreach
- `generateOutreachMessage` - AI outreach generation
- `generateFollowUpMessage` - Follow-up generation
- `createOutreachTask` - Create outreach task

### Organization
- `inviteUser` - Send user invitation
- `acceptInvitation` - Accept invitation
- `syncDomainUsers` - Sync users by domain

### External Integrations
- `googleSheetsAuth` - Google Sheets OAuth
- `syncGoogleSheet` - Import from sheets
- `fetchLinkedInProfilePicture` - LinkedIn image fetch

## AI/LLM Integration

The `llmRouter.js` provides intelligent routing between providers:

### Cheap Tier (Groq - Llama 3.1)
- Skill extraction
- Text classification
- Summarization
- Entity extraction
- Sentiment analysis

### Quality Tier (Anthropic - Claude 3.5)
- Candidate intelligence analysis
- Personalized outreach messages
- Campaign matching
- Complex reasoning tasks
- Creative writing

## Feature Flags

- `VITE_USE_SUPABASE` - Toggle between Base44 and Supabase backends
- Used in `entities.js` and `functions.js` for gradual migration

## Authentication Flow

1. User clicks login
2. Redirect to Supabase Auth (Google OAuth)
3. Callback to `/auth/callback`
4. Session established, user data fetched from `users` table
5. Redirect to dashboard

## Real-time Features

- Supabase Realtime for:
  - Candidate updates
  - Chat messages
  - Task status changes

## External Services

- **Supabase**: Database, Auth, Edge Functions, Storage
- **Groq**: Fast LLM inference
- **Anthropic**: High-quality LLM inference
- **Google APIs**: Sheets integration, OAuth
- **LinkedIn/BrightData**: Profile picture extraction
