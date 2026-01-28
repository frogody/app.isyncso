# Claude Code Fix Prompt - New Campaign Wizard 400 Error

## Problem Summary
The "New Campaign" button on `/talentcampaigns` opens a wizard but fails to load existing projects. The console shows **"Failed to fetch projects"** and the API returns a **400 Bad Request** error.

## Error Details

**Console Error:**
```
Failed to fetch projects: Object
```

**Failed API Request:**
```
GET https://sfxpmzicgpaxfntqleig.supabase.co/rest/v1/projects?select=*%2Cclient%3Aclient_id%28name%29&organization_id=eq.a4ed7122-51a9-4810-8fc0-731c6d77e29f&order=created_at.desc
Status: 400 Bad Request
```

**Decoded Query:**
- `select=*,client:client_id(name)` - Joining with client table
- `organization_id=eq.{uuid}` - Filter by org
- `order=created_at.desc` - Sort order

## Root Cause
The Supabase query in `CampaignWizard.jsx` is trying to do a foreign key relation select (`client:client_id(name)`) that is failing. This could be due to:
1. Missing or incorrect foreign key relationship in Supabase schema
2. RLS policies blocking the nested select
3. The relationship name doesn't match the schema

## File to Fix
**`/src/components/talent/CampaignWizard.jsx`** - Lines 98-116

**Current Code:**
```javascript
const fetchProjects = useCallback(async () => {
  if (!user?.company_id) return;
  setLoading(true);
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("*, client:client_id(name)")  // <-- THIS LINE IS CAUSING THE 400 ERROR
      .eq("organization_id", user.organization_id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    setProjects(data || []);
  } catch (err) {
    console.error("Failed to fetch projects:", err);
    toast.error("Failed to load projects");
  } finally {
    setLoading(false);
  }
}, [user?.company_id]);
```

## Suggested Fix Options

### Option 1: Remove the client relation (Quick Fix)
Change the select to just fetch projects without the client join:
```javascript
const { data, error } = await supabase
  .from("projects")
  .select("*")  // Remove the client relation
  .eq("organization_id", user.organization_id)
  .order("created_at", { ascending: false });
```

### Option 2: Fix the foreign key reference name
Check the Supabase schema and use the correct relationship name. It might be:
```javascript
.select("*, clients(name)")  // If the FK constraint is named 'clients'
// or
.select("*, client:clients(name)")  // If the table is 'clients' not 'client'
```

### Option 3: Check if projects table uses 'clients' table reference
Look at how TalentProjects.jsx fetches projects successfully and match that pattern.

## Additional Context

**Other files that fetch projects (for reference):**
- `/src/pages/TalentProjects.jsx` - Check how it queries projects
- `/src/pages/TalentDashboard.jsx` - Check dashboard project queries

**The wizard is rendered from:**
- `/src/pages/TalentCampaigns.jsx` (Line ~833)

## Steps to Debug

1. First, check Supabase dashboard for the `projects` table schema:
   - Does `client_id` column exist?
   - Is there a foreign key relationship to a `clients` table?
   - What is the FK constraint named?

2. Check RLS policies on both `projects` and `clients` tables

3. Test the query directly in Supabase SQL Editor:
   ```sql
   SELECT p.*, c.name as client_name
   FROM projects p
   LEFT JOIN clients c ON p.client_id = c.id
   WHERE p.organization_id = 'a4ed7122-51a9-4810-8fc0-731c6d77e29f'
   ORDER BY p.created_at DESC;
   ```

4. Compare with working queries in TalentProjects.jsx

## Copy-Paste Prompt for Claude Code

```
Fix the "New Campaign" wizard in the Talent platform. When clicking "New Campaign" on /talentcampaigns, the wizard opens but fails to load existing projects.

The error is in src/components/talent/CampaignWizard.jsx around line 98-116. The Supabase query is returning a 400 error:

.select("*, client:client_id(name)")

This foreign key relation select is failing. Please:

1. Check how TalentProjects.jsx fetches projects successfully
2. Fix the fetchProjects function in CampaignWizard.jsx to match the working pattern
3. If needed, check the Supabase schema to verify the correct table/relationship names

The projects should load in the wizard so users can select an existing project when creating a new campaign.
```
