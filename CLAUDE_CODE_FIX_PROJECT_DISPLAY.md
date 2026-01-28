# Fix Project Display Bug - Shows "Internal" Instead of Project Names

## Issue
The New Campaign wizard on `/talentcampaigns` now loads projects successfully (API returns 200), but all 11 projects display as **"Internal"** instead of their actual names.

## Current State
- ✅ API call fixed (returns 200 OK with 11 projects)
- ❌ All projects show "Internal" instead of actual names like:
  - "Cowork Test Project - AA Accountant NL"
  - "Verisure - Junior accountmanager"
  - "test-project-1234"
  - etc.

## File to Fix
`src/components/talent/CampaignWizard.jsx` - Project list rendering section

## Root Cause
After fixing the fetchProjects query (removing the broken FK relation), the project list rendering is likely:
1. Using a fallback value "Internal" when `client.name` is missing
2. Or displaying the wrong field (not `project.name`)

---

## Prompt for Claude Code

```
Fix the project name display in the New Campaign wizard. Projects load correctly (11 total) but ALL show "Internal" instead of their actual names.

**File:** src/components/talent/CampaignWizard.jsx

**Problem:** The project list in Step 1 "Select Project" displays "Internal" for every project instead of the actual project name.

**Tasks:**

1. Find where projects are rendered in the wizard (likely a map() over the projects array)

2. Check what field is being displayed. It should be `project.name` but might be:
   - `project.client?.name` (which is now undefined since we removed the FK join)
   - A fallback like `project.type || "Internal"`
   - Something else

3. Fix the display to show `project.name` correctly:
   ```jsx
   // Should look something like:
   {projects.map((project) => (
     <div key={project.id}>
       <span>{project.name}</span>  {/* <-- Make sure this uses project.name */}
       {/* ... rest of project card */}
     </div>
   ))}
   ```

4. If there was a secondary display showing client name, either:
   - Remove it (since we don't have client data anymore)
   - Or fetch client data separately if needed

5. Verify by testing:
   - Open /talentcampaigns
   - Click "New Campaign"
   - Projects should show actual names like "Cowork Test Project", "Verisure - Junior accountmanager", etc.

**Context:**
The fetchProjects query was recently changed from:
`.select("*, client:client_id(name)")` → `.select("*")`

This removed the client name data, which may have broken the display if it was showing client name instead of project name.

**Expected Result:**
Each project in the wizard should display its actual name from the `name` field in the projects table.
```

---

## Alternative Shorter Prompt

```
Fix src/components/talent/CampaignWizard.jsx - all projects show "Internal" instead of actual names.

The fetchProjects query now uses `.select("*")` (no client join). Find where projects are rendered in the wizard and make sure it displays `project.name` not `project.client?.name` or a fallback value.

Test: Open New Campaign wizard on /talentcampaigns - projects should show their actual names.
```

---

## Quick Investigation Commands

```bash
# Find where projects are rendered in CampaignWizard
grep -n "Internal" src/components/talent/CampaignWizard.jsx
grep -n "project\." src/components/talent/CampaignWizard.jsx
grep -n "\.name" src/components/talent/CampaignWizard.jsx
```

---

## Likely Code Pattern to Fix

Current (broken):
```jsx
<span>{project.client?.name || "Internal"}</span>
// or
<span>{project.type || "Internal"}</span>
```

Should be:
```jsx
<span>{project.name}</span>
// or if you want a fallback:
<span>{project.name || "Unnamed Project"}</span>
```
