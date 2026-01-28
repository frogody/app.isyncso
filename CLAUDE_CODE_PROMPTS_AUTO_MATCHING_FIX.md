# Claude Code Prompts: Fix Auto-Matching Feature

## Overview

This document contains a phased approach with specific Claude Code prompts to fix the auto-matching functionality in iSyncSO. The "Run Matching" button currently returns a **HTTP 500 error** from the `analyzeCampaignProject` Edge Function.

**Current Issue:** When clicking "Run Matching" on a campaign, the Edge Function at `/functions/v1/analyzeCampaignProject` returns a 500 Internal Server Error.

---

## PHASE 1: Diagnose the Root Cause

### Prompt 1.1: Check Supabase Edge Function Logs

```
Check the Supabase Edge Function logs for the analyzeCampaignProject function.

Run: supabase functions logs analyzeCampaignProject --project-ref sfxpmzicgpaxfntqleig

If you don't have access to supabase CLI, add detailed error logging to the edge function at /supabase/functions/analyzeCampaignProject/index.ts.

Add console.log statements at the start of the try block to log the incoming request body, and wrap ALL database queries in individual try-catch blocks with specific error messages.
```

### Prompt 1.2: Add Comprehensive Error Logging

```
Add comprehensive error logging to /supabase/functions/analyzeCampaignProject/index.ts

1. At the start of the serve handler (after line 504), add:
   console.log("=== analyzeCampaignProject started ===");
   console.log("Request received at:", new Date().toISOString());

2. After parsing the request body (around line 523), add:
   console.log("Request body:", JSON.stringify({
     campaign_id,
     organization_id,
     project_id,
     role_id,
     nest_id,
     candidate_ids: candidate_ids?.length || 0,
     min_score,
     limit
   }));

3. Wrap EACH database query in its own try-catch:
   - Campaign query (line 538)
   - Roles query (lines 559-578)
   - Candidates query (line 632)

4. Before returning the final response, add:
   console.log("=== analyzeCampaignProject completed successfully ===");

5. In the catch block (line 832), enhance the error logging:
   console.error("=== analyzeCampaignProject FAILED ===");
   console.error("Error type:", error.constructor.name);
   console.error("Error message:", error.message);
   console.error("Error stack:", error.stack);

Deploy the function after these changes and test again.
```

### Prompt 1.3: Verify Environment Variables

```
Check if all required environment variables are set for the analyzeCampaignProject Edge Function.

Required environment variables:
1. SUPABASE_URL - Should be set automatically
2. SUPABASE_SERVICE_ROLE_KEY - Should be set automatically
3. GROQ_API_KEY - Required for AI analysis (may be missing!)

Create a test endpoint or add a check at the start of the function:

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const groqApiKey = Deno.env.get("GROQ_API_KEY");

console.log("Environment check:", {
  hasSupabaseUrl: !!supabaseUrl,
  hasServiceKey: !!supabaseServiceKey,
  hasGroqApiKey: !!groqApiKey,
  groqKeyLength: groqApiKey?.length || 0
});

if (!supabaseUrl || !supabaseServiceKey) {
  return new Response(
    JSON.stringify({ error: "Missing required Supabase environment variables" }),
    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

---

## PHASE 2: Fix Database Query Issues

### Prompt 2.1: Fix Role Context Type Handling

```
In /supabase/functions/analyzeCampaignProject/index.ts, the role_context field is stored as JSONB but the TypeScript interface expects arrays for must_haves and deal_breakers.

The Campaign Wizard saves must_haves and nice_to_haves as STRINGS (multiline text), not arrays!

Look at the console log from when we created the campaign:
"must_haves": "- Based in the Netherlands...\n- 3+ years experience..."

Fix the preFilterCandidate function (starting around line 118) to handle both string and array formats:

1. In preFilterCandidate(), around line 159:
   Replace:
   if (roleContext?.must_haves && roleContext.must_haves.length > 0) {

   With:
   // Handle must_haves as either string or array
   let mustHavesList: string[] = [];
   if (roleContext?.must_haves) {
     if (Array.isArray(roleContext.must_haves)) {
       mustHavesList = roleContext.must_haves;
     } else if (typeof roleContext.must_haves === 'string') {
       // Parse multiline string into array
       mustHavesList = roleContext.must_haves
         .split('\n')
         .map(line => line.replace(/^[-•*]\s*/, '').trim())
         .filter(line => line.length > 0);
     }
   }
   if (mustHavesList.length > 0) {

2. Do the same for deal_breakers around line 129-136

3. Update the RoleContext interface to allow string | string[]:
   interface RoleContext {
     perfect_fit_criteria?: string;
     selling_points?: string;
     must_haves?: string | string[];
     deal_breakers?: string | string[];
     nice_to_haves?: string | string[];
     target_companies?: string[];
     // ... rest
   }
```

### Prompt 2.2: Fix Candidate Query Stage Filter

```
In /supabase/functions/analyzeCampaignProject/index.ts around line 619, the candidates query filters out hired/rejected candidates:

.not("stage", "in", '("hired","rejected")')

This PostgreSQL syntax may be incorrect. Fix it:

Replace line 619:
.not("stage", "in", '("hired","rejected")')

With:
.not("stage", "eq", "hired")
.not("stage", "eq", "rejected")

Or use the correct array syntax:
.not("stage", "in", "(hired,rejected)")

Actually, the safest approach is:
.or("stage.is.null,stage.not.in.(hired,rejected)")
```

### Prompt 2.3: Handle Missing Roles Gracefully

```
In /supabase/functions/analyzeCampaignProject/index.ts, when no role_id or project_id is provided but role_context exists, the function creates a synthetic role.

However, if role_context is provided but has no useful data, the function may fail.

Add validation around line 587-599 after creating synthetic role:

// Validate we have something to match against
if (roles.length === 0 || !roles[0].title) {
  console.warn("No valid role to match against. Role context:", effectiveRoleContext);
  return new Response(
    JSON.stringify({
      success: true,
      matched_candidates: [],
      message: "No role criteria defined. Please add role context with perfect_fit_criteria or must_haves."
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Log the role we're using for matching
console.log("Using role for matching:", {
  id: roles[0].id,
  title: roles[0].title,
  hasRequirements: !!roles[0].requirements,
  hasResponsibilities: !!roles[0].responsibilities
});
```

---

## PHASE 3: Fix AI Analysis Issues

### Prompt 3.1: Make GROQ API Optional with Better Fallback

```
In /supabase/functions/analyzeCampaignProject/index.ts, the AI analysis using GROQ should be truly optional. Currently it may be failing silently.

Around line 669-687, improve the AI fallback logic:

// STAGE 2: Deep AI Analysis on top candidates (if API available)
const shouldUseAI = use_ai && deep_analysis && groqApiKey && groqApiKey.length > 10 && topCandidatesForAI.length > 0;

console.log("AI Analysis decision:", {
  use_ai_param: use_ai,
  deep_analysis_param: deep_analysis,
  has_groq_key: !!groqApiKey,
  groq_key_length: groqApiKey?.length || 0,
  candidates_for_analysis: topCandidatesForAI.length,
  will_use_ai: shouldUseAI
});

let aiResults: Map<string, { score: number; reasons: string[]; analysis: string; factors: MatchFactors }>;

if (shouldUseAI) {
  console.log(`Running deep AI analysis on ${topCandidatesForAI.length} top candidates`);
  try {
    aiResults = await deepAIAnalysis(
      topCandidatesForAI.map(r => r.candidate),
      primaryRole,
      effectiveRoleContext,
      groqApiKey
    );
    console.log("AI analysis completed successfully");
  } catch (aiError) {
    console.error("AI analysis failed, falling back to rule-based:", aiError.message);
    // Fall back to rule-based
    aiResults = new Map();
    for (const { candidate } of topCandidatesForAI) {
      aiResults.set(candidate.id, fallbackDeepAnalysis(candidate, primaryRole, effectiveRoleContext));
    }
  }
} else {
  console.log("Using rule-based analysis (AI not available or disabled)");
  // Fallback to rule-based deep analysis
  aiResults = new Map();
  for (const { candidate } of topCandidatesForAI) {
    aiResults.set(candidate.id, fallbackDeepAnalysis(candidate, primaryRole, effectiveRoleContext));
  }
}
```

### Prompt 3.2: Fix GROQ API Error Handling

```
In the deepAIAnalysis function around line 299-328, improve error handling:

try {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${groqApiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are an elite executive recruiter. Respond ONLY with valid JSON array. No markdown, no explanation outside JSON. Be critical and discriminating in your analysis.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 2000,
    }),
  });

  // Log response status
  console.log("Groq API response status:", response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Groq API error:", {
      status: response.status,
      statusText: response.statusText,
      body: errorText.substring(0, 500) // Truncate for logging
    });

    // Check for specific error types
    if (response.status === 401) {
      console.error("GROQ_API_KEY is invalid or expired");
    } else if (response.status === 429) {
      console.error("Groq API rate limit exceeded");
    }

    // Fall back to rule-based for this batch
    for (const c of batch) {
      const fallback = fallbackDeepAnalysis(c, role, roleContext);
      results.set(c.id, fallback);
    }
    continue;
  }

  const data = await response.json();
  // ... rest of processing
```

---

## PHASE 4: Fix Frontend Error Handling

### Prompt 4.1: Improve Error Display in UI

```
In /src/pages/TalentCampaignDetail.jsx, improve the runAutoMatching function error handling around line 2224:

const result = await response.json();

// Check for HTTP errors
if (!response.ok) {
  console.error("Matching API error:", {
    status: response.status,
    result
  });

  const errorMessage = result.error || result.message || `Server error (${response.status})`;
  toast.error(`Matching failed: ${errorMessage}`);
  return;
}

// Check for logical errors in response
if (!result.success) {
  console.warn("Matching returned failure:", result);
  toast.warning(result.message || "Matching did not find results");
  return;
}

// Log successful results
console.log("Matching results:", {
  total_candidates: result.candidates_total,
  pre_filtered: result.candidates_pre_filtered,
  ai_analyzed: result.candidates_ai_analyzed,
  matched: result.matched_candidates?.length || 0,
  method: result.analysis_method
});

if (result.matched_candidates?.length > 0) {
  // ... existing success handling
} else {
  toast.info(result.message || "No matching candidates found. Try adjusting your role context criteria.");
}
```

### Prompt 4.2: Add Loading State and Progress

```
In /src/pages/TalentCampaignDetail.jsx, add better loading feedback:

1. Add a state for matching progress:
const [matchingProgress, setMatchingProgress] = useState('');

2. Update the runAutoMatching function:
setIsMatching(true);
setMatchingProgress('Initializing...');

try {
  setMatchingProgress('Analyzing candidates...');

  const response = await fetch(...);

  setMatchingProgress('Processing results...');
  const result = await response.json();

  // ... rest of function
} finally {
  setIsMatching(false);
  setMatchingProgress('');
}

3. Update the button to show progress:
<Button onClick={onRunMatching} disabled={isMatching}>
  {isMatching ? (
    <>
      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      {matchingProgress || 'Matching...'}
    </>
  ) : (
    <>
      <Sparkles className="w-4 h-4 mr-2" />
      Run Matching
    </>
  )}
</Button>
```

---

## PHASE 5: Add Integration Tests

### Prompt 5.1: Create Test Script for Edge Function

```
Create a test script at /supabase/functions/analyzeCampaignProject/test.ts:

// Test script for analyzeCampaignProject
// Run with: deno run --allow-net --allow-env test.ts

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://sfxpmzicgpaxfntqleig.supabase.co";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "YOUR_ANON_KEY";

async function testMatching() {
  console.log("Testing analyzeCampaignProject...");

  const testCases = [
    {
      name: "Test with campaign_id only",
      payload: {
        organization_id: "a4ed7122-51a9-4810-8fc0-731c6d77e29f",
        campaign_id: "c1fcc9a1-16ab-40c2-a85d-7901e8e0f152",
        min_score: 30,
        limit: 10
      }
    },
    {
      name: "Test with role_context only",
      payload: {
        organization_id: "a4ed7122-51a9-4810-8fc0-731c6d77e29f",
        role_context: {
          perfect_fit_criteria: "Accountant in Netherlands",
          must_haves: "Accounting experience"
        },
        min_score: 20,
        limit: 10,
        use_ai: false // Test rule-based only
      }
    }
  ];

  for (const test of testCases) {
    console.log(`\n=== ${test.name} ===`);

    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/analyzeCampaignProject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${ANON_KEY}`
          },
          body: JSON.stringify(test.payload)
        }
      );

      console.log("Status:", response.status);
      const result = await response.json();

      if (response.ok) {
        console.log("Success:", {
          matched: result.matched_candidates?.length || 0,
          method: result.analysis_method,
          ai_powered: result.ai_powered
        });
      } else {
        console.error("Error:", result);
      }
    } catch (error) {
      console.error("Request failed:", error.message);
    }
  }
}

testMatching();
```

### Prompt 5.2: Add Cypress E2E Test

```
Create a Cypress test at /cypress/e2e/campaign-matching.cy.ts:

describe('Campaign Auto-Matching', () => {
  beforeEach(() => {
    cy.login(); // Assumes you have a login command
    cy.visit('/TalentCampaigns');
  });

  it('should create campaign and run matching', () => {
    // Click New Campaign
    cy.contains('New Campaign').click();

    // Step 1: Select Project
    cy.contains('Cowork Test Project').click();
    cy.contains('Continue').click();

    // Step 2: Select/Create Role
    cy.contains('Create New Role').click();
    cy.get('input[name="role_title"]').type('Test Accountant Role');
    cy.contains('Continue').click();

    // Step 3: Define Role Context
    cy.get('textarea[name="perfect_fit_criteria"]').type('Accountant with 3+ years experience');
    cy.get('textarea[name="must_haves"]').type('- Accounting degree\n- CPA certification');
    cy.contains('Continue').click();

    // Step 4: Create Campaign
    cy.contains('Create Campaign & Find Matches').click();

    // Should navigate to campaign detail
    cy.url().should('include', '/TalentCampaignDetail');

    // Click Run Matching
    cy.contains('Run Matching').click();

    // Should show loading state
    cy.contains('Matching...').should('be.visible');

    // Should complete (success or no matches)
    cy.contains('Run Matching', { timeout: 30000 }).should('be.visible');

    // Check for results or message
    cy.get('body').then(($body) => {
      if ($body.text().includes('Matched Candidates')) {
        cy.log('Matching found candidates');
      } else {
        cy.log('No candidates matched');
      }
    });
  });
});
```

---

## PHASE 6: Deploy and Verify

### Prompt 6.1: Deploy Updated Edge Function

```
Deploy the updated analyzeCampaignProject Edge Function:

1. If using Supabase CLI:
   supabase functions deploy analyzeCampaignProject --project-ref sfxpmzicgpaxfntqleig

2. If deploying via Git:
   - Commit all changes to /supabase/functions/analyzeCampaignProject/index.ts
   - Push to main branch
   - Supabase will auto-deploy

3. Verify deployment:
   - Check Supabase Dashboard > Edge Functions
   - Look for recent deployment timestamp
   - Check function logs for startup messages

4. Set GROQ_API_KEY if not set:
   supabase secrets set GROQ_API_KEY=your_groq_api_key --project-ref sfxpmzicgpaxfntqleig
```

### Prompt 6.2: Full End-to-End Test

```
Perform a full end-to-end test of the auto-matching feature:

1. Navigate to https://app.isyncso.com/TalentCampaigns

2. Open the existing test campaign:
   "Senior Accountant - Netherlands Auto-Match Test"
   URL: /TalentCampaignDetail?id=c1fcc9a1-16ab-40c2-a85d-7901e8e0f152

3. Open browser DevTools (F12) and go to Network tab

4. Click "Run Matching" button

5. Monitor the network request to analyzeCampaignProject:
   - Should return 200 OK (not 500)
   - Response should contain matched_candidates array
   - Check Console for any logged errors

6. Verify results:
   - Matched candidates should appear in the UI
   - Each candidate should have:
     - match_score (0-100)
     - match_reasons array
     - intelligence_score
     - recommended_approach

7. If still failing, check:
   - Supabase Edge Function logs
   - Browser console for frontend errors
   - Network response body for error details
```

---

## Quick Reference: Files to Modify

| File | Purpose |
|------|---------|
| `/supabase/functions/analyzeCampaignProject/index.ts` | Main Edge Function - add logging, fix type handling |
| `/src/pages/TalentCampaignDetail.jsx` | Frontend - improve error handling |
| `/supabase/.env` | Add GROQ_API_KEY if missing |

## Environment Variables Needed

```bash
# Required (auto-set by Supabase)
SUPABASE_URL=https://sfxpmzicgpaxfntqleig.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<auto-set>

# Required for AI analysis (may be missing!)
GROQ_API_KEY=gsk_xxxxxxxxxxxx
```

## Expected Outcome

After completing all phases, the "Run Matching" button should:
1. Call the Edge Function successfully (HTTP 200)
2. Return matched candidates with scores
3. Display results in the UI
4. Show appropriate messages for edge cases (no candidates, no matches, etc.)

If AI is not configured, it should gracefully fall back to rule-based matching.
