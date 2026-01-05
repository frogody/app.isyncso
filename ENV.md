# Environment Variables

## Required Variables

| Variable | Description | Where Used |
|----------|-------------|------------|
| `VITE_SUPABASE_URL` | Supabase project URL | `src/api/supabaseClient.js` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key | `src/api/supabaseClient.js` |

## Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_USE_SUPABASE` | Use Supabase instead of Base44 | `false` |
| `VITE_GROQ_API_KEY` | Groq API key for fast LLM | None (falls back gracefully) |
| `VITE_ANTHROPIC_API_KEY` | Anthropic API key for quality LLM | None (falls back to Groq) |
| `VITE_ENVIRONMENT` | Environment (`development`/`production`) | None |
| `VITE_BASE44_API_KEY` | Base44 API key (legacy) | None |

## AI/LLM Configuration

### Groq (Cheap/Fast Tier)
```env
VITE_GROQ_API_KEY=gsk_xxxxxxxxxxxxx
```

Used for:
- Skill extraction
- Text classification
- Summarization
- Simple Q&A

### Anthropic (Quality Tier)
```env
VITE_ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
```

Used for:
- Candidate intelligence generation
- Personalized outreach messages
- Complex analysis
- Creative writing

## Migration Configuration

The app supports gradual migration from Base44 to Supabase:

```env
# Set to 'true' to use Supabase backend
VITE_USE_SUPABASE=true
```

When `VITE_USE_SUPABASE=true`:
- Entities use Supabase tables
- Functions call Supabase Edge Functions
- Auth uses Supabase Auth

When `VITE_USE_SUPABASE=false` or not set:
- Entities use Base44 SDK
- Functions call Base44 Cloud Functions
- Auth uses Base44 Auth

## Example .env.local

```env
# Supabase (Required)
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Feature Flags
VITE_USE_SUPABASE=true

# AI APIs (Optional but recommended)
VITE_GROQ_API_KEY=gsk_xxxxxxxxxxxx
VITE_ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx

# Environment
VITE_ENVIRONMENT=development
```

## Vercel Environment Variables

In Vercel project settings, add:

1. **Production**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_USE_SUPABASE=true`
   - `VITE_GROQ_API_KEY` (optional)
   - `VITE_ANTHROPIC_API_KEY` (optional)

2. **Preview**:
   - Same as production, or use staging Supabase project

## Validation

Environment variables are accessed in:
- `src/api/supabaseClient.js` - Supabase config
- `src/api/llmRouter.js` - AI API keys
- `src/api/entities.js` - Feature flag
- `src/api/functions.js` - Feature flag

Warning is logged if Supabase credentials are missing:
```
Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

## Security Notes

- Never commit `.env` or `.env.local` files
- Use Vercel/hosting provider's environment variable management
- `VITE_` prefix exposes variables to the client (public)
- Keep service role keys server-side only (Edge Functions)
