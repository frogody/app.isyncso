# Claude Code Prompts for AdminDashboard Fix

## Overview
The AdminDashboard.jsx has 3 issues with mock/placeholder data:
1. Active users calculated as 70% of total (placeholder)
2. Monthly revenue hardcoded to 0
3. Change percentages hardcoded (+12%, +8%, +5%, +18%)

We'll fix this in 4 phases.

---

## PHASE 1: Create Backend Endpoint

### Prompt 1.1 - Create Dashboard Stats Endpoint

Copy and paste this into Claude Code:

```
Create a new endpoint `/admin-api/dashboard/stats` in the admin API that returns real dashboard statistics.

Location: Look at how other admin endpoints are structured (check `/admin-api/users/stats` or similar patterns in the codebase)

The endpoint should return:
{
  "totalUsers": number,        // Count from profiles table
  "activeUsers": number,       // Users with last_seen within 30 days
  "totalOrganizations": number, // Count from organizations table
  "monthlyRevenue": number,    // Sum from billing/subscriptions (or 0 if no billing table)
  "changes": {
    "users": string,           // e.g. "+12%" - calculate vs last month
    "activeUsers": string,     // e.g. "+8%" - calculate vs last month
    "organizations": string,   // e.g. "+5%" - calculate vs last month
    "revenue": string          // e.g. "+18%" - calculate vs last month
  }
}

For the percentage changes:
- Query current month count vs previous month count
- Calculate: ((current - previous) / previous * 100)
- Format as "+X%" or "-X%" string
- If no previous data, return "+0%"

Use the existing admin API authentication pattern (Bearer token).
Handle errors gracefully and return appropriate status codes.
```

---

## PHASE 2: Update Frontend

### Prompt 2.1 - Update AdminDashboard to Use Real Stats

Copy and paste this into Claude Code:

```
Update src/pages/admin/AdminDashboard.jsx to fetch real statistics from the new endpoint.

Current issues to fix:
1. Line ~212: `activeUsers: Math.floor((usersResult.count || 0) * 0.7)` - replace with real data
2. Line ~211: `monthlyRevenue: 0` - replace with real data
3. Lines ~250, 258, 266, 274: Hardcoded "+12%", "+8%", "+5%", "+18%" - replace with real data

Changes needed:

1. Add a new fetch call to `/admin-api/dashboard/stats` in the useEffect or create a separate useEffect for dashboard stats

2. Update the stats state to use the response:
   - totalUsers from API
   - activeUsers from API (not calculated)
   - totalOrganizations from API
   - monthlyRevenue from API

3. Store the changes object from the API response and use it in the StatCard components instead of hardcoded strings

4. Add loading state handling for the new endpoint

5. Add error handling - if the endpoint fails, fall back to current behavior but log the error

Keep the existing UI structure, just update the data source.
```

---

## PHASE 3: Database Verification

### Prompt 3.1 - Verify Database Schema

Copy and paste this into Claude Code:

```
Check the database schema to verify we have the necessary columns for the dashboard stats:

1. Check profiles table for:
   - A way to count total users
   - A `last_seen` or `last_activity` column for active users (within 30 days)
   - A `created_at` column for calculating month-over-month changes

2. Check organizations table for:
   - A way to count total organizations
   - A `created_at` column for month-over-month changes

3. Check if there's a billing/subscriptions/payments table for:
   - Monthly revenue calculation
   - If no billing table exists, document this and the endpoint should return 0 for revenue

Report what exists and what might need to be added. If `last_seen` doesn't exist on profiles, we may need to either:
- Add it and update it on user activity
- Or use a different metric for "active users" (like users who logged in recently based on auth logs)
```

---

## PHASE 4: Testing

### Prompt 4.1 - Test the Implementation

Copy and paste this into Claude Code:

```
Test the AdminDashboard implementation:

1. Check that the `/admin-api/dashboard/stats` endpoint:
   - Returns 200 with valid JSON
   - Has all required fields (totalUsers, activeUsers, totalOrganizations, monthlyRevenue, changes)
   - Changes object has users, activeUsers, organizations, revenue strings

2. Check AdminDashboard.jsx:
   - Properly calls the new endpoint
   - Handles loading state
   - Handles error state gracefully
   - Displays real data in the StatCards

3. Verify no console errors or warnings

4. If any issues found, fix them.

Run the tests and report the results.
```

---

## Workflow

1. **Start with Phase 1** - Come back to me with Claude Code's response
2. **Then Phase 2** - Come back with the response
3. **Phase 3** - This verifies we have the right database structure
4. **Phase 4** - Final testing

After each phase, paste Claude Code's response here and I'll review before we proceed to the next phase.

---

## Quick Reference

| Phase | What it does | Estimated time |
|-------|--------------|----------------|
| 1 | Create backend endpoint | 15-30 min |
| 2 | Update frontend | 10-20 min |
| 3 | Verify database | 5-10 min |
| 4 | Test everything | 10-15 min |

**Total estimated time: 40-75 minutes**
