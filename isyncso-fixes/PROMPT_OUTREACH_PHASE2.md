# Claude Code Prompt — Phase 2: LinkedIn Message Generation Enhancement

## Context

Phase 1 created the `outreach_preferences` table with message type configurations, data point priorities, and custom instructions. Phase 2 updates the `generateCampaignOutreach` edge function to use these preferences for LinkedIn-specific message generation with character limits.

The existing edge function is at `supabase/functions/generateCampaignOutreach/index.ts`. It currently:
- Accepts campaign_id, candidate_id, organization_id, candidate intelligence data, role_context, stage, campaign_type
- Uses Together.ai API (Llama 3.3 70B) for message generation
- Has stage configs: initial (150 words), follow_up_1 (100 words), follow_up_2 (60 words)
- Returns subject, content, stage, intelligence_used, personalization_score

## Task

### Step 1: Read the current edge function

Read `supabase/functions/generateCampaignOutreach/index.ts` to understand the current implementation, prompt structure, and AI integration pattern.

### Step 2: Add new input parameters

Add these new parameters to the request body parsing:

```typescript
// New parameters from outreach_preferences
const message_type = body.message_type || 'email'; // 'linkedin_connection' | 'linkedin_inmail' | 'linkedin_message' | 'email'
const char_limit = body.char_limit || null; // Character limit from preferences
const data_point_priorities = body.data_point_priorities || {}; // Priority weights 0-100
const custom_instructions = body.custom_instructions || ''; // Free-form instructions
const tone = body.tone || 'professional'; // Tone setting
const language = body.language || 'en'; // Language for message
const formality = body.formality || 'formal'; // Formality level
```

### Step 3: Create LinkedIn-specific prompt templates

Add message-type-specific prompt configurations. The key differences:

**linkedin_connection** (max 300 chars typically):
- NO subject line
- Must be extremely concise — often just 2-3 sentences
- Focus on ONE hook/data point
- Always ends with a soft CTA (question or value proposition)
- Character limit is HARD (LinkedIn rejects over-limit)

**linkedin_inmail** (max 1900 chars):
- HAS a subject line (max 200 chars)
- Can be more detailed than connection request
- Include 2-3 personalization hooks
- Professional format with clear CTA

**linkedin_message** (max 8000 chars, post-connection):
- NO subject line
- Can be conversational since connection already exists
- Reference the connection context
- More detailed, can include more data points

Create a `getMessageTypeConfig(message_type, stage, char_limit, tone, formality, language)` function that returns:
```typescript
{
  hasSubject: boolean,
  maxChars: number,
  maxWords: number,
  toneInstruction: string,
  formatInstruction: string,
  hookCount: number, // How many data points to reference
  languageInstruction: string,
  systemPromptAdditions: string
}
```

### Step 4: Implement data point priority-based prompt construction

Create a function `buildDataPointContext(candidate_data, priorities)` that:

1. Collects ALL available data points from the candidate intelligence:
   - `timing_signals` → timing_signals priority
   - `company_pain_points` → company_instability, layoffs, ma_activity priorities
   - `outreach_hooks` → various priorities
   - `best_outreach_angle` → highest priority match
   - `key_insights` → career_trajectory, work_history priorities
   - `lateral_opportunities` → lateral_opportunities priority
   - `match_reasons` → skill_match priority
   - `intelligence_factors` → multiple priorities

2. Scores each data point by its priority weight (from data_point_priorities)

3. Sorts by priority score (highest first)

4. Returns the top N data points (based on hookCount from message type config)

5. Formats them as prompt context:
```
AVAILABLE PERSONALIZATION DATA (use in order of priority):
1. [PRIORITY: 100] LAYOFFS: Recent restructuring at candidate's company - 3 rounds of layoffs in 2025
2. [PRIORITY: 80] M&A ACTIVITY: Company acquired by private equity firm in Q3 2025
3. [PRIORITY: 60] SKILL MATCH: Candidate has 8/10 required skills for the role
...
```

### Step 5: Build the enhanced prompt

Construct the AI prompt with these sections:

```
ROLE: You are a professional recruiter writing a {message_type_label} for LinkedIn.

CANDIDATE: {candidate_name}, {candidate_title} at {candidate_company}
ROLE OFFERED: {role_title} at {company_name}

MESSAGE TYPE: {message_type_label}
FORMAT CONSTRAINTS:
- Maximum {maxChars} characters (STRICT - LinkedIn will reject if over limit)
- {hasSubject ? 'Include a subject line (max 200 chars)' : 'NO subject line'}
- Tone: {toneInstruction}
- Language: {languageInstruction}
- Formality: {formality}

{dataPointContext}

STAGE: {stage} ({stageDescription})

{custom_instructions ? `ADDITIONAL INSTRUCTIONS FROM RECRUITER:\n${custom_instructions}` : ''}

CRITICAL RULES:
1. Stay UNDER {maxChars} characters — count every character
2. Reference the TOP {hookCount} data point(s) from the priority list above
3. Be specific — use actual names, companies, and data from the candidate profile
4. {message_type === 'linkedin_connection' ? 'Keep it to 2-3 sentences max. No fluff.' : ''}
5. End with a clear but soft call to action
6. Do NOT use generic phrases like "I came across your profile"
7. Write in {language === 'nl' ? 'Dutch' : language === 'de' ? 'German' : language === 'fr' ? 'French' : 'English'}

OUTPUT FORMAT (JSON):
{
  "subject": "{hasSubject ? 'Subject line here' : null}",
  "content": "Your message here",
  "data_points_used": ["layoffs", "skill_match"],
  "personalization_score": 85
}
```

### Step 6: Post-generation validation

After receiving the AI response:

1. **Character count check**: If content exceeds char_limit:
   - Try to truncate at last sentence boundary before the limit
   - If single sentence exceeds limit, truncate at last word boundary and add "..."
   - Log a warning

2. **Subject line validation**: 
   - If message_type doesn't have subject, ensure subject is null
   - If subject exceeds 200 chars, truncate at word boundary

3. **Language check**: Basic validation that the output language matches the requested language (check for common words)

4. **Return enhanced response**:
```json
{
  "subject": "Subject or null",
  "content": "The message",
  "message_type": "linkedin_connection",
  "char_count": 287,
  "char_limit": 300,
  "stage": "initial",
  "data_points_used": ["layoffs", "skill_match"],
  "personalization_score": 85,
  "language": "en",
  "intelligence_used": ["timing_signals", "company_pain_points", "match_reasons"],
  "generated_at": "2026-02-09T..."
}
```

### Step 7: Deploy

```bash
cd supabase/functions/generateCampaignOutreach
npx supabase functions deploy generateCampaignOutreach --no-verify-jwt
```

### Step 8: Test

Test with a curl command using a real candidate from the "Senior Accountant - Netherlands Auto-Match Test" campaign:

```bash
SUPABASE_URL="https://sfxpmzicgpaxfntqleig.supabase.co"
ANON_KEY="<get from .env.local>"

# Test LinkedIn connection request (300 char limit)
curl -X POST "${SUPABASE_URL}/functions/v1/generateCampaignOutreach" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_id": "c1fcc9a1-16ab-40c2-a85d-7901e8e0f152",
    "candidate_id": "<mark-lensen-id>",
    "organization_id": "a4ed7122-51a9-4810-8fc0-731c6d77e29f",
    "candidate_name": "drs. Mark Lensen RA",
    "candidate_title": "Senior Accountant",
    "candidate_company": "Flynth",
    "message_type": "linkedin_connection",
    "char_limit": 300,
    "tone": "professional",
    "language": "nl",
    "formality": "formal",
    "data_point_priorities": {
      "skill_match": 100,
      "work_history": 80,
      "lateral_opportunities": 60
    },
    "custom_instructions": "Mention our Amsterdam office",
    "stage": "initial",
    "campaign_type": "linkedin"
  }'
```

Verify:
- Response has no subject (null)
- Content is under 300 characters
- Content is in Dutch
- Content references skill match or work history (top priorities)
- personalization_score is reasonable

Also test with linkedin_inmail (should have subject) and linkedin_message (longer, more conversational).
