# Claude Code Prompt: Verify Auto-Matching Fixes

## Context

The `analyzeCampaignProject` Edge Function at `/supabase/functions/analyzeCampaignProject/index.ts` has been modified to fix the HTTP 500 error when clicking "Run Matching" on campaigns.

## Verification Prompt

```
Verify that the following fixes have been properly applied to /supabase/functions/analyzeCampaignProject/index.ts:

1. **Environment Variable Logging** (around line 500-526)
   - Check that the function logs environment variable status at startup
   - Should log: hasSupabaseUrl, hasServiceKey, hasGroqApiKey, groqKeyLength
   - Should return 500 with clear error message if SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY are missing

2. **Request Body Parsing** (around line 530-540)
   - Check that request body parsing is wrapped in try-catch
   - Should return 400 with "Invalid JSON in request body" on parse failure

3. **normalizeToArray Helper Function** (around line 114-126)
   - Verify a helper function exists that converts string OR array to array
   - Should handle: undefined → [], array → array, string → split by newlines and clean bullet points

4. **RoleContext Interface** (around line 13-27)
   - Verify must_haves, nice_to_haves, deal_breakers allow both string | string[]
   - Verify role_title, project_name, outreach_channel fields exist

5. **preFilterCandidate Function Uses normalizeToArray**
   - Check deal_breakers handling uses normalizeToArray()
   - Check must_haves handling uses normalizeToArray()

6. **AI Prompt Template Uses normalizeToArray** (around line 244-245)
   - Check that roleContext.must_haves uses normalizeToArray().join(', ')
   - Check that roleContext.deal_breakers uses normalizeToArray().join(', ')

7. **Synthetic Role Creation Uses normalizeToArray** (around line 672, 690)
   - Check both synthetic role creation blocks use normalizeToArray() for requirements field

8. **candidatesToAnalyze Variable Defined** (around line 757-758)
   - Verify that `const candidatesToAnalyze = eligibleCandidates;` exists after the eligibleCandidates filter

9. **Database Queries Wrapped in Try-Catch**
   - Campaign query (around line 582-616)
   - Roles query (around line 625-663)
   - Candidates query (around line 729-742)

10. **Stage Filter Fixed** (around line 744-747)
    - Verify hired/rejected filtering is done in JavaScript, not in the query
    - Should use: `allCandidates.filter(c => !c.stage || !['hired', 'rejected'].includes(c.stage?.toLowerCase()))`

11. **Comprehensive Logging Throughout**
    - Check for console.log statements at key points:
      - "=== analyzeCampaignProject started ===" at start
      - Request params logging
      - Campaign/role/candidate query results
      - Pre-filter results count
      - "=== analyzeCampaignProject completed successfully ===" at end

12. **Error Response Includes Details** (around line 832-845)
    - Verify error response includes: error message, error_type, timestamp

For each item, report:
- ✅ VERIFIED - if the fix is correctly implemented
- ❌ MISSING - if the fix is not present
- ⚠️ PARTIAL - if partially implemented with details on what's missing

After verification, if any items are MISSING or PARTIAL, provide the specific code changes needed to fix them.
```

## Expected Output

All 12 items should show ✅ VERIFIED. If any show ❌ or ⚠️, Claude Code should fix them.

## Test After Verification

Once all fixes are verified, test the function:

```
After verifying all fixes are in place, deploy and test:

1. Deploy the Edge Function:
   supabase functions deploy analyzeCampaignProject --project-ref sfxpmzicgpaxfntqleig

2. Test by clicking "Run Matching" on campaign:
   https://app.isyncso.com/TalentCampaignDetail?id=c1fcc9a1-16ab-40c2-a85d-7901e8e0f152

3. Check browser Network tab for response:
   - Should return HTTP 200 (not 500)
   - Response should contain matched_candidates array
   - Response should show candidates_total, candidates_pre_filtered counts

4. Check Supabase Edge Function logs for detailed execution trace

Report the test results.
```
