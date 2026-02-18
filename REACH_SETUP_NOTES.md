# Reach Marketing Hub - Setup Notes

This document lists all manual configuration steps required to fully enable the Reach marketing hub module.

---

## Required API Keys

### 1. ANTHROPIC_API_KEY (AI Features)
- **Used by**: Brand Voice Trainer, Copy Studio, Ad Copy Generation, Insights Generation
- **Status**: Likely already configured (used by other iSyncSO modules)
- **Setup**: https://console.anthropic.com/settings/keys

### 2. NANOBANANA_API_KEY (Image Generation)
- **Used by**: `reach-generate-ad-image` edge function
- **Status**: NOT CONFIGURED - stub implementation returns placeholder
- **Setup**: Provision API key from NanoBanana, then:
```bash
SUPABASE_ACCESS_TOKEN="sbp_957c6cb906e299f2863a50a1ef08f7dd5a0b2d33" \
npx supabase secrets set NANOBANANA_API_KEY="your_key_here" \
--project-ref sfxpmzicgpaxfntqleig
```

### 3. RUNWAY_API_KEY (Video Generation)
- **Used by**: `reach-generate-ad-video` edge function
- **Status**: NOT CONFIGURED - stub implementation returns placeholder
- **Setup**: Provision API key from Runway ML, then:
```bash
SUPABASE_ACCESS_TOKEN="sbp_957c6cb906e299f2863a50a1ef08f7dd5a0b2d33" \
npx supabase secrets set RUNWAY_API_KEY="your_key_here" \
--project-ref sfxpmzicgpaxfntqleig
```

### 4. GOOGLE_ANALYTICS_API_KEY (Analytics)
- **Used by**: `reach-fetch-metrics` edge function (Google Analytics data)
- **Status**: NOT CONFIGURED
- **Setup**: Create Google Cloud service account with Analytics Data API access, download JSON key, then set as secret

---

## Social Platform OAuth Apps

Each social platform requires an OAuth app to enable publishing and metrics fetching.

### 5. Meta (Facebook / Instagram)
- **Create at**: https://developers.facebook.com
- **Required permissions**: pages_manage_posts, instagram_basic, instagram_content_publish, read_insights
- **Configure redirect URI**: `https://app.isyncso.com/ReachSettings` (or your domain)
- **Set secrets**:
```bash
SUPABASE_ACCESS_TOKEN="sbp_957c6cb906e299f2863a50a1ef08f7dd5a0b2d33" \
npx supabase secrets set META_APP_ID="your_app_id" META_APP_SECRET="your_app_secret" \
--project-ref sfxpmzicgpaxfntqleig
```

### 6. LinkedIn
- **Create at**: https://www.linkedin.com/developers
- **Required scopes**: w_member_social, r_organization_social, rw_organization_admin
- **Configure redirect URI**: `https://app.isyncso.com/ReachSettings`
- **Set secrets**:
```bash
SUPABASE_ACCESS_TOKEN="sbp_957c6cb906e299f2863a50a1ef08f7dd5a0b2d33" \
npx supabase secrets set LINKEDIN_CLIENT_ID="your_id" LINKEDIN_CLIENT_SECRET="your_secret" \
--project-ref sfxpmzicgpaxfntqleig
```

### 7. X / Twitter
- **Create at**: https://developer.twitter.com
- **Required scopes**: tweet.write, tweet.read, users.read, offline.access
- **Use OAuth 2.0 with PKCE**
- **Configure redirect URI**: `https://app.isyncso.com/ReachSettings`
- **Set secrets**:
```bash
SUPABASE_ACCESS_TOKEN="sbp_957c6cb906e299f2863a50a1ef08f7dd5a0b2d33" \
npx supabase secrets set TWITTER_CLIENT_ID="your_id" TWITTER_CLIENT_SECRET="your_secret" \
--project-ref sfxpmzicgpaxfntqleig
```

### 8. TikTok
- **Create at**: https://developers.tiktok.com
- **Required scopes**: video.upload, video.list, user.info.basic
- **Configure redirect URI**: `https://app.isyncso.com/ReachSettings`
- **Set secrets**:
```bash
SUPABASE_ACCESS_TOKEN="sbp_957c6cb906e299f2863a50a1ef08f7dd5a0b2d33" \
npx supabase secrets set TIKTOK_CLIENT_KEY="your_key" TIKTOK_CLIENT_SECRET="your_secret" \
--project-ref sfxpmzicgpaxfntqleig
```

---

## Edge Function Deployment

Deploy all 9 Reach edge functions after configuration:

```bash
export SUPABASE_ACCESS_TOKEN="sbp_957c6cb906e299f2863a50a1ef08f7dd5a0b2d33"
export PROJECT_REF="sfxpmzicgpaxfntqleig"

npx supabase functions deploy reach-analyze-brand-voice --project-ref $PROJECT_REF --no-verify-jwt
npx supabase functions deploy reach-generate-copy --project-ref $PROJECT_REF --no-verify-jwt
npx supabase functions deploy reach-generate-ad-copy --project-ref $PROJECT_REF --no-verify-jwt
npx supabase functions deploy reach-generate-ad-image --project-ref $PROJECT_REF --no-verify-jwt
npx supabase functions deploy reach-generate-ad-video --project-ref $PROJECT_REF --no-verify-jwt
npx supabase functions deploy reach-seo-scan --project-ref $PROJECT_REF --no-verify-jwt
npx supabase functions deploy reach-publish-post --project-ref $PROJECT_REF --no-verify-jwt
npx supabase functions deploy reach-fetch-metrics --project-ref $PROJECT_REF --no-verify-jwt
npx supabase functions deploy reach-generate-insights --project-ref $PROJECT_REF --no-verify-jwt
```

**Important**: After updating any secret, you MUST redeploy the affected function for it to pick up the new value.

---

## Database Migration

The migration file `supabase/migrations/20260218120000_reach_tables.sql` creates all 9 tables with RLS policies. It will auto-apply when pushed to the `main` branch (GitHub integration is configured).

To apply manually:
```bash
SUPABASE_ACCESS_TOKEN="sbp_957c6cb906e299f2863a50a1ef08f7dd5a0b2d33" \
npx supabase db push --project-ref sfxpmzicgpaxfntqleig
```

---

## Feature Availability Summary

| Feature | Works Now | Needs Configuration |
|---------|-----------|-------------------|
| Brand Voice Trainer | Yes (with ANTHROPIC_API_KEY) | - |
| Copy Studio | Yes (with ANTHROPIC_API_KEY) | - |
| Ad Copy Generation | Yes (with ANTHROPIC_API_KEY) | - |
| Ad Image Generation | No | NANOBANANA_API_KEY |
| Ad Video Generation | No | RUNWAY_API_KEY |
| SEO Scanner | Yes (server-side fetch) | - |
| Content Calendar | Yes (scheduling UI) | - |
| Social Publishing | No | Platform OAuth apps |
| Metrics Fetching | No | Platform OAuth apps + GOOGLE_ANALYTICS_API_KEY |
| AI Insights | Yes (with ANTHROPIC_API_KEY) | Metrics data needed |
