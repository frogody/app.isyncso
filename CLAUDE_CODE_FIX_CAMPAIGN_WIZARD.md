# Fix New Campaign Wizard - Supabase Query Error

## Issue
The "New Campaign" wizard on `/talentcampaigns` fails to load existing projects. The API returns a **400 Bad Request** error.

## Error Details
```
Console: Failed to fetch projects: Object

API Request (400 Error):
GET /rest/v1/projects?select=*,client:client_id(name)&organization_id=eq.{uuid}&order=created_at.desc
```

## File to Fix
`src/components/talent/CampaignWizard.jsx` - fetchProjects function (lines ~98-116)

## Current Broken Code
```javascript
const { data, error } = await supabase
  .from("projects")
  .select("*, client:client_id(name)")  // <-- 400 ERROR HERE
  .eq("organization_id", user.organization_id)
  .order("created_at", { ascending: false });
```

---

## Prompt for Claude Code

```
The New Campaign wizard is broken. When clicking "New Campaign" on /talentcampaigns, projects fail to load with a 400 error.

**Problem:** In src/components/talent/CampaignWizard.jsx, the fetchProjects function uses this Supabase query:
.select("*, client:client_id(name)")

This foreign key relation is failing with 400 Bad Request.

**Tasks:**

1. Use the Supabase Management API to check the projects table schema:
   - Run: supabase db dump --schema public -t projects (or check via dashboard/API)
   - Verify if client_id column exists
   - Check if there's a foreign key constraint and what it's named

2. Check if there's a "clients" table and its structure:
   - The FK might reference "clients" (plural) not "client"
   - The relationship name in PostgREST might be different

3. Compare with working queries in TalentProjects.jsx:
   - See how that file fetches projects successfully
   - Match the same pattern

4. Fix CampaignWizard.jsx fetchProjects function:

   Option A - If no FK exists or client data not needed:
   .select("*")

   Option B - If FK exists but wrong name:
   .select("*, clients(name)")  // Use actual table name

   Option C - If the column reference is wrong:
   .select("*, clients!client_id(name)")  // Explicit FK hint

5. Test the fix by:
   - Opening /talentcampaigns
   - Clicking "New Campaign"
   - Verifying projects load in step 1 of the wizard

**Supabase Project:**
- URL: https://sfxpmzicgpaxfntqleig.supabase.co
- Check the projects and clients tables in the schema

**Expected Result:**
The wizard should show existing projects (there are 11 projects) so users can select one when creating a campaign.
```

---

## Alternative Shorter Prompt

```
Fix src/components/talent/CampaignWizard.jsx - the fetchProjects function fails with 400 error.

The query `.select("*, client:client_id(name)")` is broken - the FK relation "client:client_id" doesn't work.

1. Use Supabase Management API to check the projects table schema and verify the correct FK relationship name to the clients table
2. Look at how TalentProjects.jsx queries projects successfully
3. Fix the select statement to either remove the client join or use the correct relationship syntax
4. Test that projects load in the New Campaign wizard on /talentcampaigns
```
