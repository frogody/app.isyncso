# Claude Code Prompt — Fix ISS-005 Pending Candidate Filter

## Context
The ISS-005 fix in `supabase/functions/analyzeCampaignProject/index.ts` (lines 1119-1128) filters candidates by checking `enrichment_status === 'pending' || enrichment_status === 'Pending'`. However, UI verification shows 4 pending candidates still appear in match results (Thomas Puttenstein, Ard Feitsma, Egbert Boom, André van 't Hof — all score 35). The actual DB values for `enrichment_status` don't match these string checks.

## Task

### Step 1: Query DB for actual values
Run this Supabase query to find what `enrichment_status` values exist:

```sql
SELECT enrichment_status, COUNT(*) as cnt
FROM candidates
GROUP BY enrichment_status
ORDER BY cnt DESC;
```

Also specifically check the 4 pending candidates:

```sql
SELECT id, full_name, enrichment_status
FROM candidates
WHERE full_name ILIKE '%Puttenstein%'
   OR full_name ILIKE '%Feitsma%'
   OR full_name ILIKE '%Egbert Boom%'
   OR full_name ILIKE '%van ''t Hof%';
```

### Step 2: Fix the filter
In `supabase/functions/analyzeCampaignProject/index.ts`, find lines 1119-1128:

```typescript
// ISS-005 FIX: Filter out candidates with pending enrichment status
const pendingCandidates = eligibleCandidates.filter(c =>
  c.enrichment_status === 'pending' || c.enrichment_status === 'Pending'
);
if (pendingCandidates.length > 0) {
  console.log(`Excluding ${pendingCandidates.length} candidates with pending enrichment`);
  eligibleCandidates = eligibleCandidates.filter(c =>
    c.enrichment_status !== 'pending' && c.enrichment_status !== 'Pending'
  );
}
```

Replace with a broader filter that catches ALL non-enriched candidates. Based on the DB query results, update the filter. The safest approach is to use an allowlist — only keep candidates whose enrichment_status is explicitly 'done' or 'completed' (whatever the actual "done" value is):

```typescript
// ISS-005 FIX: Filter out candidates without completed enrichment
// Only include candidates whose enrichment is confirmed done
const ENRICHED_STATUSES = ['done', 'Done', 'completed', 'Completed', 'enriched', 'Enriched'];
const pendingCandidates = eligibleCandidates.filter(c =>
  !c.enrichment_status || !ENRICHED_STATUSES.includes(c.enrichment_status)
);
if (pendingCandidates.length > 0) {
  console.log(`Excluding ${pendingCandidates.length} candidates without completed enrichment (statuses: ${[...new Set(pendingCandidates.map(c => c.enrichment_status ?? 'null'))].join(', ')})`);
  eligibleCandidates = eligibleCandidates.filter(c =>
    c.enrichment_status && ENRICHED_STATUSES.includes(c.enrichment_status)
  );
}
```

**IMPORTANT**: Adjust `ENRICHED_STATUSES` based on the actual values found in Step 1. The goal is: only candidates with confirmed enrichment data should enter the matching pipeline.

### Step 3: Deploy
```bash
cd supabase/functions/analyzeCampaignProject
npx supabase functions deploy analyzeCampaignProject --no-verify-jwt
```

### Step 4: Verify
After deployment, re-run matching on the "Senior Accountant - Netherlands Auto-Match Test" campaign and confirm that Thomas Puttenstein, Ard Feitsma, Egbert Boom, and André van 't Hof no longer appear in results.
