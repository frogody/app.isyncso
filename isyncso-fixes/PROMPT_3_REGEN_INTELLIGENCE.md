# Claude Code Prompt — Regenerate Intelligence for Verification

## Context
Three issues (ISS-004, ISS-007, ISS-015) have code fixes deployed to the `generateCandidateIntelligence` edge function but cannot be verified until intelligence is regenerated for test candidates. The UI has no "regenerate intelligence" button — the SYNC Intel toggle only enables/disables auto-sync. We need to invoke the edge function directly via API.

## Task

### Step 1: Get the Supabase project URL and anon key
Check the project's environment config:

```bash
# Check .env or .env.local for SUPABASE_URL and SUPABASE_ANON_KEY
cat .env.local 2>/dev/null || cat .env 2>/dev/null
# Or check supabase config
cat supabase/config.toml 2>/dev/null
```

Also check the frontend code for the Supabase client initialization:

```bash
grep -r "SUPABASE_URL\|supabaseUrl\|createClient" src/ --include="*.js" --include="*.ts" --include="*.jsx" -l
```

### Step 2: Get candidate IDs for test subjects
Query these specific candidates from the "Senior Accountant - Netherlands Auto-Match Test" campaign:

```sql
-- Priority candidates for ISS-004/007/015 verification
SELECT c.id, c.full_name, c.satisfaction_level
FROM candidates c
JOIN campaign_matches cm ON cm.candidate_id = c.id
JOIN campaigns camp ON camp.id = cm.campaign_id
WHERE camp.title ILIKE '%Senior Accountant%Netherlands%Auto-Match%'
AND c.full_name IN (
  'Charlotte Lacroix',
  'Robert Boemen',
  'Dennis Huiskes',
  'Jeffrey Ruitenbeek',
  'Rene Offenberg',
  'Coen van den Mosselaar',
  'drs. Mark Lensen RA'
)
ORDER BY c.full_name;
```

### Step 3: Invoke intelligence regeneration for each candidate
For each candidate ID from Step 2, call the edge function:

```bash
SUPABASE_URL="<your-supabase-url>"
ANON_KEY="<your-anon-key>"

# Replace CANDIDATE_ID with actual IDs from Step 2
# Run this for each of the 7 candidates

curl -X POST "${SUPABASE_URL}/functions/v1/generateCandidateIntelligence" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "candidateId": "CANDIDATE_ID",
    "forceRegenerate": true
  }'
```

Run all 7 in sequence, waiting for each to complete before starting the next (the LLM calls take 10-30 seconds each).

### Step 4: Report results
For each candidate, report:
- Whether the call succeeded or failed
- The generated approach recommendation
- The switching likelihood
- Whether lateral opportunities appear personalized
- Any hallucination indicators (claims not grounded in candidate data)

### What to verify after regeneration

**ISS-004 (AI Hallucinations)**:
- Check that intelligence text only references information present in the candidate's actual profile data
- No invented certifications, degrees, or company names
- No impossible claims (e.g., "20 years experience" for someone who graduated 5 years ago)

**ISS-007 (Switching Likelihood Contradiction)**:
- "Not Looking" satisfaction → switching likelihood should be "low" or "very low", never "high"
- "Open to Opportunities" → switching likelihood should be "medium" or "high"
- "Actively Looking" → switching likelihood should be "high" or "very high"

**ISS-015 (Generic Lateral Opportunities)**:
- Lateral opportunities should name specific companies relevant to the candidate's industry and role
- For accountants at Big 4 firms → should suggest other Big 4 or mid-tier firms
- Should NOT be generic like "consider other companies in the sector"
