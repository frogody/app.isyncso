# AdminDashboard Production Fix Plan

## Overview

This document outlines the phased implementation plan to replace mock/hardcoded data in AdminDashboard.jsx with real data from the database and APIs.

---

## Phase 1: Create Dashboard Stats API Endpoint

**Priority:** HIGH
**Effort:** 2-3 hours
**Dependencies:** None

### Task 1.1: Create new admin-api endpoint for dashboard stats

Create a new endpoint `/admin-api/dashboard/stats` that returns all dashboard statistics:

```javascript
// Expected Response Structure
{
  "totalUsers": 21,
  "activeUsers": 15,           // Users with activity in last 30 days
  "totalOrganizations": 5,
  "monthlyRevenue": 2500.00,   // From billing system
  "changes": {
    "users": 12.5,             // % change vs last month
    "organizations": 8.3,       // % change vs last month
    "activeUsers": 5.2,        // % change vs last month
    "revenue": 18.7            // % change vs last month
  }
}
```

### Task 1.2: Backend Implementation

Add to `supabase/functions/admin-api/index.ts`:

```typescript
// Handle /dashboard/stats
if (pathname === '/dashboard/stats' && req.method === 'GET') {
  // Get current period stats
  const { count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  // Active users (logged in within 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { count: activeUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .gte('last_login', thirtyDaysAgo.toISOString());

  // Organizations
  const { count: totalOrganizations } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true });

  // Monthly revenue from billing
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: revenueData } = await supabase
    .from('payments')
    .select('amount')
    .gte('created_at', startOfMonth.toISOString())
    .eq('status', 'completed');

  const monthlyRevenue = revenueData?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

  // Calculate percentage changes (compare to previous month)
  // ... similar queries for previous period

  return new Response(JSON.stringify({
    totalUsers,
    activeUsers,
    totalOrganizations,
    monthlyRevenue,
    changes: { /* calculated percentages */ }
  }));
}
```

---

## Phase 2: Update AdminDashboard Frontend

**Priority:** HIGH
**Effort:** 1-2 hours
**Dependencies:** Phase 1

### Task 2.1: Replace fetchDashboardData function

**Current (Line ~194-221):**
```javascript
const fetchDashboardData = async () => {
  setIsLoading(true);
  try {
    const [usersResult, orgsResult, activitiesResult] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('companies').select('id', { count: 'exact', head: true }),
      supabase.from('admin_audit_logs')...
    ]);

    setStats({
      totalUsers: usersResult.count || 0,
      totalOrganizations: orgsResult.count || 0,
      monthlyRevenue: 0, // Would come from billing system  <-- MOCK
      activeUsers: Math.floor((usersResult.count || 0) * 0.7), // <-- MOCK
    });
  }
};
```

**Replace with:**
```javascript
const fetchDashboardData = async () => {
  setIsLoading(true);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Authentication required');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    };

    // Fetch dashboard stats from API
    const [statsRes, activitiesResult] = await Promise.all([
      fetch(`${ADMIN_API_URL}/dashboard/stats`, { headers }),
      supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    if (statsRes.ok) {
      const dashboardStats = await statsRes.json();
      setStats({
        totalUsers: dashboardStats.totalUsers,
        totalOrganizations: dashboardStats.totalOrganizations,
        monthlyRevenue: dashboardStats.monthlyRevenue,
        activeUsers: dashboardStats.activeUsers,
      });
      setChanges(dashboardStats.changes); // NEW: Store percentage changes
    }

    setActivities(activitiesResult.data || []);
  } catch (error) {
    console.error('[AdminDashboard] Error fetching data:', error);
    toast.error('Failed to load dashboard data');
  } finally {
    setIsLoading(false);
  }
};
```

### Task 2.2: Add state for percentage changes

**Add new state variable:**
```javascript
const [changes, setChanges] = useState({
  users: null,
  organizations: null,
  activeUsers: null,
  revenue: null,
});
```

### Task 2.3: Update StatCard usage

**Current (hardcoded):**
```javascript
<StatCard
  title="Total Users"
  value={stats.totalUsers.toLocaleString()}
  change="+12%"  // <-- HARDCODED
  changeType="increase"
  icon={Users}
  color="blue"
/>
```

**Replace with:**
```javascript
<StatCard
  title="Total Users"
  value={stats.totalUsers.toLocaleString()}
  change={changes.users !== null ? `${changes.users > 0 ? '+' : ''}${changes.users.toFixed(1)}%` : null}
  changeType={changes.users >= 0 ? 'increase' : 'decrease'}
  icon={Users}
  color="blue"
/>
```

**Repeat for all 4 StatCards:**
- Total Users → `changes.users`
- Organizations → `changes.organizations`
- Active Users → `changes.activeUsers`
- Monthly Revenue → `changes.revenue`

---

## Phase 3: Database Schema Check

**Priority:** MEDIUM
**Effort:** 30 minutes
**Dependencies:** None (can run in parallel)

### Task 3.1: Verify required columns exist

Check that these columns exist for proper calculations:

```sql
-- Users table needs last_login column
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'last_login';

-- If missing, add it:
ALTER TABLE users ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;

-- Payments table for revenue
SELECT column_name FROM information_schema.columns
WHERE table_name = 'payments';
```

### Task 3.2: Create indexes for performance

```sql
-- Index for active users query
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

-- Index for monthly revenue query
CREATE INDEX IF NOT EXISTS idx_payments_created_status ON payments(created_at, status);
```

---

## Phase 4: Testing & Verification

**Priority:** HIGH
**Effort:** 1 hour
**Dependencies:** Phases 1-2

### Task 4.1: Unit test the API endpoint

Test `/admin-api/dashboard/stats` returns expected structure:
- All numeric values are numbers (not strings)
- Changes are calculated correctly
- Handles empty data gracefully

### Task 4.2: Browser testing

1. Open /admin dashboard
2. Check Network tab for API call to `/dashboard/stats`
3. Verify response contains real data
4. Confirm UI displays calculated percentages
5. Test refresh functionality
6. Test with different time periods

### Task 4.3: Edge case testing

- New platform with no data
- Single user, single org
- No revenue yet
- Negative percentage changes (decreases)

---

## Implementation Prompts for Claude Code

### Prompt 1: Create Dashboard Stats API Endpoint

```
Create a new admin-api endpoint for dashboard statistics.

FILE: supabase/functions/admin-api/index.ts

Add a new route handler for GET /dashboard/stats that returns:
{
  "totalUsers": number,
  "activeUsers": number (users with last_login in past 30 days),
  "totalOrganizations": number,
  "monthlyRevenue": number (sum of completed payments this month),
  "changes": {
    "users": number (% change vs previous month),
    "organizations": number (% change vs previous month),
    "activeUsers": number (% change vs previous month),
    "revenue": number (% change vs previous month)
  }
}

Follow the existing patterns in the file for:
- Authentication check
- Error handling
- Response format

Calculate percentage changes by comparing current month stats to previous month.
```

### Prompt 2: Update AdminDashboard Frontend

```
Update AdminDashboard.jsx to use real data from the new API endpoint.

FILE: src/pages/admin/AdminDashboard.jsx

Changes needed:

1. Add ADMIN_API_URL constant (same as other admin pages):
   const ADMIN_API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api`;

2. Add new state for percentage changes:
   const [changes, setChanges] = useState({ users: null, organizations: null, activeUsers: null, revenue: null });

3. Update fetchDashboardData() to:
   - Call /dashboard/stats API endpoint with auth headers
   - Store the changes in the new state
   - Remove the placeholder calculation Math.floor((usersResult.count || 0) * 0.7)
   - Remove the hardcoded monthlyRevenue: 0

4. Update the 4 StatCard components to use dynamic change values:
   - Replace change="+12%" with calculated value from changes state
   - Use changeType based on whether the value is positive or negative

Follow the same API call pattern used in AdminApps.jsx or AdminBilling.jsx for authentication.
```

---

## Rollout Plan

| Day | Phase | Tasks | Owner |
|-----|-------|-------|-------|
| 1 | Phase 1 | Create API endpoint | Backend |
| 1 | Phase 3 | Verify DB schema | Backend |
| 2 | Phase 2 | Update frontend | Frontend |
| 2 | Phase 4 | Testing | QA |
| 3 | Deploy | Production release | DevOps |

---

## Success Criteria

After implementation:
- [ ] Dashboard shows real user counts from database
- [ ] Active users is calculated from last_login timestamps
- [ ] Monthly revenue comes from payments table
- [ ] All percentage changes are calculated (not hardcoded)
- [ ] Negative changes show red/decrease indicators
- [ ] Dashboard loads within 2 seconds
- [ ] No console errors
- [ ] Works with fresh database (no data)

---

## Fallback Plan

If API endpoint fails or data is unavailable:
- Show "—" or "N/A" instead of fake percentages
- Display warning toast "Some statistics unavailable"
- Log error for debugging
- Don't show obviously fake data like "+12%"
