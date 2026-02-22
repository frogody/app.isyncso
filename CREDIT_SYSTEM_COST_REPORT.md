# iSyncSO Platform - API Cost Analysis & Credit System Blueprint

> Generated: 2026-02-22 | ~100 Edge Functions analyzed across 17 modules

---

## Executive Summary

iSyncSO has **~100 Supabase Edge Functions** calling **12+ paid external APIs**. Current state: every user action that triggers AI, enrichment, image generation, voice, or messaging costs YOU money with zero revenue per action. This report maps every cost-generating action, estimates per-invocation costs, and proposes credit tiers for a sustainable credit wallet system.

---

## PART 1: External API Providers & Their Pricing

| Provider | Used For | Pricing Model | API Key Env Var |
|----------|----------|--------------|-----------------|
| **Together.ai** | LLM (Kimi-K2), Embeddings (BAAI/bge), Image Gen (FLUX), TTS (Orpheus) | Per-token / per-megapixel | `TOGETHER_API_KEY` |
| **Groq** | Fast LLM (Llama 3.3 70B) | Per-token (cheapest LLM) | `GROQ_API_KEY` |
| **Anthropic Claude** | Premium LLM (Claude Sonnet 4) | Per-token (most expensive) | `ANTHROPIC_API_KEY` |
| **xAI / Grok** | Alt LLM (invoked via Together) | Per-token | `XAI_API_KEY` |
| **Google Gemini / Veo** | Image Gen (Nano Banana), Video Gen (Veo) | Per-image / per-second video | `GOOGLE_API_KEY` |
| **fal.ai** | Video Gen (Kling, Luma, Wan), Fashion (FASHN, Face Swap) | Per-request / per-second | `FAL_KEY` |
| **Explorium** | B2B people & company data enrichment | Per-API-call (expensive) | `EXPLORIUM_API_KEY` |
| **Tavily** | Web search for research | Per-search credit | `TAVILY_API_KEY` |
| **Twilio** | SMS + Voice calls + VoIP | Per-SMS / per-minute | `TWILIO_*` keys |
| **Resend** | Transactional email | Per-email (free tier: 100/day) | `RESEND_API_KEY` |
| **Composio** | 30+ OAuth integrations (Gmail, Slack, HubSpot...) | Per-action (tiered) | `COMPOSIO_API_KEY` |
| **Stripe** | Payments & billing | 2.9% + $0.30 per txn | `STRIPE_SECRET_KEY` |
| **Firecrawl** | Web scraping/crawling | Per-crawl credit | `FIRECRAWL_API_KEY` |
| **Shotstack** | Video composition/rendering | Per-render | `SHOTSTACK_API_KEY` |
| **Runway** | Video generation (stub, not live) | Per-second video | `RUNWAY_API_KEY` |

---

## PART 2: Complete Action-to-Cost Mapping

### TIER 1: HIGH COST ($0.50 - $5.00+ per action)

| # | User Action | Edge Function(s) | APIs Called | Est. Cost/Call | Suggested Credits |
|---|-------------|-------------------|-----------|---------------|-------------------|
| 1 | **Generate AI Video** | `generate-video` | Google Veo | ~$3.50/10s video | 50 credits |
| 2 | **Generate Fashion Video** | `generate-fashion-video` | Google Veo 3.1/3/2 | $0.90-$2.40/6s video | 30 credits |
| 3 | **Generate Video Shot** | `generate-shot` | fal.ai (Kling/MiniMax/Luma/Wan) | $0.16-$0.65/shot | 8 credits |
| 4 | **Assemble Full Video** | `assemble-video` + `generate-storyboard` + N x `generate-shot` | fal.ai + Together.ai + Shotstack | $1.50-$5.00/video | 50 credits |
| 5 | **Generate Podcast** | `generate-podcast` | Together.ai (Kimi-K2 LLM + Orpheus TTS) | $0.07-$0.20/podcast | 5 credits |
| 6 | **Execute Full Photoshoot** (batch) | `sync-studio-execute-photoshoot` | Together.ai FLUX / Google Gemini | ~$0.04/image x N (~$2.00 for 50 images) | 3 credits/image |
| 7 | **Company Intelligence** (full) | `generateCompanyIntelligence` | 9x parallel Explorium API calls + LLM | $0.50-$2.00/company (cached 180 days) | 15 credits |
| 8 | **Fashion Booth Pipeline** | `generate-image` (fashion mode) | Google Gemini + fal.ai (FASHN + FaceSwap + CodeFormer) | ~$0.05-$0.10/outfit | 5 credits |

### TIER 2: MEDIUM COST ($0.02 - $0.50 per action)

| # | User Action | Edge Function(s) | APIs Called | Est. Cost/Call | Suggested Credits |
|---|-------------|-------------------|-----------|---------------|-------------------|
| 9 | **Generate Product Image** | `generate-image` | Together.ai FLUX Pro/Kontext Pro | ~$0.04/image | 3 credits |
| 10 | **Generate Quick Draft Image** | `generate-image` (schnell) | Together.ai FLUX Schnell | ~$0.003/image | 1 credit |
| 11 | **Generate Ad Image** | `reach-generate-ad-image` | Google Gemini / Together.ai FLUX | ~$0.04/image | 3 credits |
| 12 | **SYNC Agent Chat Message** | `sync` | Together.ai (Kimi-K2) + embeddings | ~$0.002-$0.01/msg | 1 credit |
| 13 | **SYNC Voice Mode** (per minute) | `sync-voice` + `voice-webhook` | Together.ai (Kimi-K2 LLM + Orpheus TTS) + Twilio | ~$0.05-$0.10/min | 3 credits/min |
| 14 | **Commander Chat** | `commander-chat` | Together.ai (Kimi-K2) | ~$0.005/msg | 1 credit |
| 15 | **Smart Compose Reply** | `smart-compose` | Together.ai / Groq | ~$0.002-$0.01/msg | 1 credit |
| 16 | **Generate Listing Copy** | `generate-listing-copy` | Together.ai / Groq | ~$0.01-$0.03 per listing (5 fields) | 2 credits |
| 17 | **Generate Social Post** | `generate-social-post` | Together.ai (Kimi-K2) | ~$0.005/post | 1 credit |
| 18 | **Candidate Intelligence** | `generateCandidateIntelligence` | Groq LLM (Llama 3.3 70B) | ~$0.01-$0.02/candidate | 1 credit |
| 19 | **Smart AI Matching** | `analyzeCampaignProject` | Groq LLM (batch 5 candidates per call) | ~$0.02-$0.05/batch | 2 credits |
| 20 | **Generate Outreach Message** | `generateCampaignOutreach` | Groq / Together.ai LLM | ~$0.01-$0.02/msg | 1 credit |
| 21 | **Prospect/Contact Enrichment** | `explorium-enrich` | Explorium API (cached 90 days) | ~$0.10-$0.30/enrich (cache saves repeats) | 5 credits |
| 22 | **Auto Enrich Company** | `auto-enrich-company` | Explorium + LLM | ~$0.05-$0.15/company | 3 credits |
| 23 | **Raise/Growth AI Chat** | `raise-chat` | Together.ai / Groq LLM | ~$0.005-$0.02/msg | 1 credit |
| 24 | **Growth AI Execute** | `growth-ai-execute` | Together.ai LLM | ~$0.01-$0.03/action | 1 credit |
| 25 | **Brand Voice Analysis** | `reach-analyze-brand-voice` | Anthropic Claude Sonnet 4 | ~$0.02-$0.05 | 3 credits |
| 26 | **Ad Copy Generation** | `reach-generate-ad-copy` | Anthropic Claude Sonnet 4 | ~$0.02-$0.04 | 2 credits |
| 27 | **Marketing Copy Generation** | `reach-generate-copy` | Anthropic Claude | ~$0.02-$0.04 | 2 credits |
| 28 | **Marketing Insights** | `reach-generate-insights` | Anthropic / Together.ai | ~$0.01-$0.03 | 1 credit |
| 29 | **SEO Scan** | `reach-seo-scan` | Web scraping + LLM | ~$0.02-$0.05 | 2 credits |
| 30 | **AI Invoice Processing** | `process-invoice` / `smart-import-invoice` | Groq LLM (Llama 3.3 70B) | ~$0.01-$0.02 | 1 credit |
| 31 | **Enhance Prompt** | `enhance-prompt` | Together.ai LLM | ~$0.002-$0.005 | 1 credit |
| 32 | **Audit Product Listing** | `audit-listing` | Together.ai / Groq LLM | ~$0.01-$0.03 | 1 credit |
| 33 | **Plan Listing Fix** | `plan-listing-fix` | Together.ai / Groq LLM | ~$0.01-$0.02 | 1 credit |
| 34 | **Store Builder AI** | `store-builder-ai` | Together.ai LLM | ~$0.01-$0.03/action | 1 credit |
| 35 | **Meeting Wrap-up** | `sync-meeting-wrapup` | Together.ai LLM | ~$0.01-$0.02 | 1 credit |
| 36 | **Channel Digest** | `digest-channel` | Groq / Together.ai LLM | ~$0.005-$0.01 | 1 credit |
| 37 | **Daily Journal** | `generate-daily-journal` | Together.ai LLM | ~$0.005-$0.01 | 1 credit |
| 38 | **Personalize Course** | `personalizeCourse` | Together.ai LLM | ~$0.01-$0.02 | 1 credit |
| 39 | **Transcribe Audio** | `transcribe-audio` | Groq Whisper | ~$0.006/min | 1 credit/min |
| 40 | **Product Research** | `research-product` | Tavily search + Together.ai LLM | ~$0.02-$0.05 | 2 credits |
| 41 | **Supplier Research** | `research-supplier` | Tavily + Together.ai LLM | ~$0.02-$0.05 | 2 credits |
| 42 | **Demo Prospect Research** | `research-demo-prospect` | Tavily + Together.ai + Explorium | ~$0.05-$0.15 | 3 credits |
| 43 | **Scrape & Embed URL** | `scrape-embed` | Firecrawl + Together.ai embeddings | ~$0.01-$0.05 | 2 credits |
| 44 | **Embed Document** | `embed-document` | Together.ai (BAAI/bge embeddings) | ~$0.001-$0.01 | 1 credit |
| 45 | **Scrape Product URL** | `scrape-product-url` | Firecrawl / direct fetch | ~$0.01-$0.03 | 1 credit |
| 46 | **Execute AI Flow Node** | `execute-ai-node` | Together.ai / Groq LLM | ~$0.005-$0.02 | 1 credit |

### TIER 3: LOW COST - COMMUNICATION ($0.005 - $0.05 per action)

| # | User Action | Edge Function(s) | APIs Called | Est. Cost/Call | Suggested Credits |
|---|-------------|-------------------|-----------|---------------|-------------------|
| 47 | **Send SMS** | `sms-send` | Twilio | ~$0.0079/segment | 1 credit |
| 48 | **AI SMS Auto-Respond** | `sms-ai-respond` | Twilio + LLM | ~$0.02/response | 1 credit |
| 49 | **Make/Receive Voice Call** (per min) | `twilio-token` + `voice-webhook` | Twilio VoIP | ~$0.014/min | 1 credit/min |
| 50 | **Schedule Meeting via AI Call** | `scheduling-orchestrator` + `voice-webhook` | Together.ai + Twilio + Composio | ~$0.10-$0.30/call | 5 credits |
| 51 | **Send Transactional Email** | `send-invitation-email` / `send-invoice-email` / etc. | Resend | ~$0.001/email | 0 credits (free tier) |
| 52 | **Publish Social Post** | `reach-publish-post` | Composio (platform APIs) | ~$0.01 | 1 credit |

### TIER 4: FREE / DB-ONLY (no external API cost)

| # | User Action | Edge Function(s) | Why Free |
|---|-------------|-------------------|----------|
| 53 | View admin dashboard | `admin-api` | DB queries only |
| 54 | Approve studio plan | `sync-studio-approve-plan` | DB update only |
| 55 | Update studio plan | `sync-studio-update-plan` | DB update only |
| 56 | Export studio ZIP | `sync-studio-export-zip` | JSZip (no API) |
| 57 | Import studio catalog | `sync-studio-import-catalog` | DB copy only |
| 58 | Poll job progress | `sync-studio-job-progress` | DB query only |
| 59 | Publish to bol.com | `sync-studio-publish-bol` | bol.com API (free for retailers) |
| 60 | Generate shoot plans | `sync-studio-generate-plans` | Rule-based (no LLM) |
| 61 | Bol.com sync | `bolcom-api` / `bolcom-webhooks` | bol.com API (free) |
| 62 | Shopify sync | `shopify-api` / `shopify-webhooks` | Shopify API (free) |
| 63 | Stripe checkout/portal | `create-checkout` / `create-billing-portal` | Stripe (fees on txn, not API call) |
| 64 | Composio connect (OAuth) | `composio-connect` (auth only) | OAuth flow (free) |
| 65 | Webhook handlers | `stripe-webhook`, `bolcom-webhooks`, `shopify-webhooks`, `composio-webhooks`, `b2b-order-webhook` | Inbound only |
| 66 | Health/diagnostics | `health-runner`, `api-diagnostics` | Internal checks |
| 67 | Gamification/XP | `updateGamification` | DB update only |
| 68 | Leaderboard | `getLeaderboard` | DB query only |
| 69 | Team data | `getTeamMembers` | DB query only |
| 70 | Map columns (lightweight) | `map-import-columns`, `map-contact-columns` | Together.ai (tiny prompt ~$0.001) |
| 71 | Render video (queue trigger) | `render-video` | Queue only, no API |

---

## PART 3: Cost by Module (Monthly Estimate per Active User)

| Module | Key Actions | Est. Monthly Cost/User | Credit Allocation |
|--------|------------|----------------------|-------------------|
| **SYNC Agent** | ~100 chat msgs + 5 voice mins | $1.00-$3.00 | 100-150 credits |
| **Create (Image)** | ~20 images generated | $0.60-$1.60 | 40-60 credits |
| **Create (Video)** | ~2 videos generated | $2.00-$10.00 | 50-100 credits |
| **Talent Recruitment** | 50 enrichments + 20 intel + 5 campaigns | $5.00-$15.00 | 100-200 credits |
| **Growth CRM** | 30 enrichments + 20 AI actions | $3.00-$10.00 | 80-150 credits |
| **Reach Marketing** | 10 ad creatives + 20 copy + 5 insights | $1.00-$3.00 | 50-80 credits |
| **Sync Studio** | 1 photoshoot (50 images) | $2.00-$4.00 | 50-100 credits |
| **Finance** | 10 invoices processed | $0.10-$0.20 | 10 credits |
| **Inbox/Comms** | 50 SMS + 10 voice min | $0.50-$1.50 | 30-50 credits |
| **Learn** | 5 course personalizations | $0.05-$0.10 | 5 credits |
| **Sentinel** | 2 AI system analyses | $0.05-$0.10 | 5 credits |
| **TOTAL** | | **$15-$50/user/month** | **500-1000 credits** |

---

## PART 4: Suggested Credit Pricing

### Credit Value: 1 credit = ~$0.02-$0.03 of API cost

| Plan | Credits/Month | Price | Avg API Cost Covered | Your Margin |
|------|--------------|-------|---------------------|-------------|
| **Starter** | 200 credits | $9.99/mo | ~$4-$6 | ~40-60% |
| **Professional** | 750 credits | $29.99/mo | ~$15-$22 | ~25-50% |
| **Business** | 2,000 credits | $79.99/mo | ~$40-$60 | ~25-50% |
| **Enterprise** | 5,000 credits | $199.99/mo | ~$100-$150 | ~25-50% |

### Credit Packs (One-Time Purchase)

| Pack | Credits | Price | Per-Credit |
|------|---------|-------|-----------|
| Small | 100 | $4.99 | $0.050 |
| Medium | 500 | $19.99 | $0.040 |
| Large | 1,500 | $49.99 | $0.033 |
| Mega | 5,000 | $129.99 | $0.026 |

---

## PART 5: Implementation Architecture

### Credit Deduction Flow

```
User Action
  -> Frontend calls edge function
  -> Edge function checks credit balance (BEFORE calling external API)
  -> If sufficient credits:
      -> Deduct credits from wallet
      -> Call external API
      -> Log usage to ai_usage_logs
      -> Return result
  -> If insufficient credits:
      -> Return 402 Payment Required
      -> Frontend shows "Buy Credits" modal
```

### Database Tables Needed

```sql
-- Credit wallet per organization
credit_wallets (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  balance INTEGER NOT NULL DEFAULT 0,
  lifetime_purchased INTEGER DEFAULT 0,
  lifetime_used INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
)

-- Credit transaction log
credit_transactions (
  id UUID PRIMARY KEY,
  organization_id UUID,
  user_id UUID,
  amount INTEGER NOT NULL,          -- positive = add, negative = deduct
  balance_after INTEGER NOT NULL,
  type TEXT NOT NULL,                -- 'purchase', 'subscription', 'usage', 'refund', 'bonus'
  description TEXT,
  edge_function TEXT,                -- which function consumed credits
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
)

-- Credit pricing per action (admin-configurable)
credit_action_costs (
  id UUID PRIMARY KEY,
  action_key TEXT UNIQUE NOT NULL,   -- e.g. 'generate-image', 'sync-chat', 'explorium-enrich'
  credits_required INTEGER NOT NULL,
  description TEXT,
  category TEXT,                     -- 'ai', 'image', 'video', 'enrichment', 'communication'
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
)
```

### Existing Infrastructure to Leverage

You already have:
- `ai_usage_logs` table - tracks all AI API usage with costs
- `_shared/ai-usage.ts` - calculates costs and logs usage
- `_shared/api-client.ts` - wraps all external API calls
- Stripe integration for payments (`create-checkout`, `stripe-webhook`)

The credit system should wrap around the existing `logAIUsage()` / `logLLMUsage()` / `logImageUsage()` functions in `_shared/ai-usage.ts`.

---

## PART 6: Top 10 Biggest Cost Drivers (Prioritize These First)

| Rank | Action | Why It's Expensive | Monthly Risk/User |
|------|--------|-------------------|-------------------|
| 1 | **Video Generation** (Veo/fal.ai) | $0.15-$0.40 per SECOND of video | $10-$50 |
| 2 | **Company Intelligence** (Explorium) | 9 parallel API calls per company | $5-$20 |
| 3 | **Contact/Prospect Enrichment** (Explorium) | Per-lookup cost, users do bulk enrichments | $5-$15 |
| 4 | **Photoshoot Batch** (FLUX/Gemini) | $0.04/image x 50-200 images per shoot | $2-$8 |
| 5 | **SYNC Voice Mode** (TTS + STT + LLM) | Multi-API per minute of conversation | $2-$5 |
| 6 | **Fashion Booth** (multi-model pipeline) | FASHN + FaceSwap + CodeFormer chain | $1-$3 |
| 7 | **SYNC Agent Chat** (high volume) | Every message = LLM call | $1-$3 |
| 8 | **Ad Image Generation** (FLUX/Gemini) | Per creative generated | $1-$2 |
| 9 | **Campaign Matching** (AI analysis) | Groq LLM for batch candidate analysis | $0.50-$2 |
| 10 | **SMS Outreach** (Twilio) | Per-segment cost at scale | $0.50-$2 |

---

## PART 7: Quick Reference - Action Key to Credits

This is the complete mapping you need for `credit_action_costs`:

```
# AI Chat & Assistants
sync-chat                    = 1 credit
sync-voice-minute            = 3 credits
commander-chat               = 1 credit
smart-compose                = 1 credit
raise-chat                   = 1 credit
growth-ai-execute            = 1 credit
enhance-prompt               = 1 credit
store-builder-ai             = 1 credit

# Image Generation
generate-image-schnell       = 1 credit
generate-image-pro           = 3 credits
generate-image-kontext       = 3 credits
generate-image-kontext-max   = 5 credits
fashion-booth                = 5 credits
outfit-extractor             = 3 credits
reach-generate-ad-image      = 3 credits

# Video Generation
generate-video               = 50 credits
generate-fashion-video       = 30 credits
generate-shot                = 8 credits
generate-storyboard          = 1 credit
assemble-video               = 5 credits
generate-podcast             = 5 credits

# Studio
studio-photoshoot-per-image  = 3 credits
studio-regenerate-shot       = 3 credits

# Content Generation
generate-listing-copy        = 2 credits
generate-social-post         = 1 credit
generate-daily-journal       = 1 credit
reach-generate-copy          = 2 credits
reach-generate-ad-copy       = 2 credits
reach-generate-insights      = 1 credit
reach-seo-scan               = 2 credits
reach-analyze-brand-voice    = 3 credits

# Enrichment & Intelligence
explorium-enrich             = 5 credits
company-intelligence         = 15 credits
candidate-intelligence       = 1 credit
auto-enrich-company          = 3 credits

# Research
research-product             = 2 credits
research-supplier            = 2 credits
research-demo-prospect       = 3 credits

# Talent & Recruitment
analyze-campaign-match       = 2 credits
generate-outreach-message    = 1 credit
execute-talent-outreach      = 1 credit

# Knowledge & Documents
embed-document               = 1 credit
scrape-embed                 = 2 credits
search-knowledge             = 0 credits (read-only)
scrape-product-url           = 1 credit

# Communication
sms-send                     = 1 credit
sms-ai-respond               = 1 credit
voice-call-minute            = 1 credit
scheduling-call              = 5 credits
transcribe-audio-minute      = 1 credit

# Invoice & Finance
process-invoice              = 1 credit
smart-import-invoice         = 1 credit

# Compliance & Learning
analyze-ai-system            = 2 credits
personalize-course           = 1 credit

# Data Import
map-import-columns           = 1 credit
map-contact-columns          = 1 credit

# Workflow Automation
execute-ai-node              = 1 credit
execute-flow-node            = 0 credits (routing only)

# FREE (no credits needed)
admin-api                    = 0 credits
health-runner                = 0 credits
bolcom-api                   = 0 credits
shopify-api                  = 0 credits
studio-approve-plan          = 0 credits
studio-update-plan           = 0 credits
studio-export-zip            = 0 credits
studio-import-catalog        = 0 credits
studio-job-progress          = 0 credits
studio-publish-bol           = 0 credits
studio-generate-plans        = 0 credits
create-checkout              = 0 credits
create-billing-portal        = 0 credits
all-webhooks                 = 0 credits
send-email                   = 0 credits (free tier)
composio-connect-auth        = 0 credits
render-video                 = 0 credits (queue only)
```

---

## PART 8: Existing Cost Tracking Infrastructure

You already have a solid foundation for the credit system:

### `_shared/ai-usage.ts` (already deployed)
- `logLLMUsage()` - logs every LLM call with token counts + cost
- `logImageUsage()` - logs every image generation with megapixel cost
- `calculateModelCost()` - looks up model pricing automatically
- `MODEL_PRICING` constant - has all model costs per 1K tokens
- `IMAGE_MODEL_PRICING` constant - has all image model costs per megapixel
- Logs to `ai_usage_logs` table with user_id, org_id, model, tokens, cost

### What's Missing
1. **Credit wallet table** - doesn't exist yet
2. **Pre-check before API call** - currently functions call APIs then log, need to check credits FIRST
3. **Credit deduction** - no deduction mechanism
4. **Frontend credit display** - no wallet UI
5. **Admin credit pricing config** - no way to adjust credit costs per action
6. **Subscription credit grants** - Stripe webhook doesn't grant monthly credits

---

*This report covers all ~100 edge functions and their cost implications. Use Part 7 as the seed data for your `credit_action_costs` table.*
