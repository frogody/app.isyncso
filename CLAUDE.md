# iSyncSO Development Guidelines

This file contains critical development rules and patterns that must be followed when building features for the iSyncSO application.

## RBAC (Role-Based Access Control) - MANDATORY

Every feature in iSyncSO must implement proper permission checks. The RBAC system is the foundation of security and access control.

### Role Hierarchy
| Role | Level | Access |
|------|-------|--------|
| super_admin | 100 | Full system access |
| admin | 80 | Company-wide management |
| manager | 60 | Team/department management |
| user | 40 | Standard features |
| learner | 30 | Learning features only |
| viewer | 20 | Read-only access |

### Permission Format
Permissions follow the pattern: `{resource}.{action}`

Resources: `users`, `teams`, `departments`, `companies`, `courses`, `workflows`, `projects`, `finance`, `inbox`, `analytics`, `settings`, `integrations`, `admin`

Actions: `view`, `create`, `edit`, `delete`, `manage`, `export`

Examples:
- `finance.view` - Can view finance data
- `users.edit` - Can edit user profiles
- `admin.access` - Can access admin panel

### Implementation Checklist

When creating any new page or feature:

1. **Import guards and hooks**:
```jsx
import { PermissionGuard } from '@/components/guards';
import { usePermissions } from '@/components/context/PermissionContext';
```

2. **Check permissions for page access**:
```jsx
const { hasPermission, isLoading } = usePermissions();

// Early return if no permission
if (!hasPermission('feature.view')) {
  return <AccessDenied />;
}
```

3. **Wrap sensitive UI elements**:
```jsx
// Hide button if no create permission
{hasPermission('feature.create') && (
  <Button onClick={handleCreate}>Create New</Button>
)}

// Or use PermissionGuard component
<PermissionGuard permission="feature.delete">
  <DeleteButton />
</PermissionGuard>
```

4. **Add permission to navigation** (in Layout.jsx):
```jsx
{
  title: "Feature Name",
  url: createPageUrl("FeaturePage"),
  icon: FeatureIcon,
  permission: "feature.view", // Required permission
}
```

### Guard Components

| Component | Use Case |
|-----------|----------|
| `PermissionGuard` | Check specific permission |
| `RoleGuard` | Check role or minimum level |
| `AdminGuard` | Admin-only content |
| `ManagerGuard` | Manager and above |

### Database RLS

All database queries should be protected by Row Level Security (RLS) policies. The RBAC helper functions are available:

- `user_has_permission(user_id, permission_name)` - Check permission
- `user_has_role(user_id, role_name)` - Check role
- `is_admin(user_id)` - Admin check (level >= 80)
- `is_super_admin(user_id)` - Super admin check (level >= 100)
- `is_manager(user_id)` - Manager check (level >= 60)

## File Organization

```
src/
├── components/
│   ├── context/
│   │   ├── UserContext.jsx      # User state
│   │   └── PermissionContext.jsx # RBAC state
│   ├── guards/
│   │   ├── index.js             # Export all guards
│   │   └── PermissionGuard.jsx  # Guard components
│   └── ...
├── pages/
│   └── [PageName].jsx           # Page components
└── api/
    └── supabaseClient.js        # Supabase client
```

## Testing RBAC

When testing features:
1. Test as super_admin - should see everything
2. Test as user - should only see permitted features
3. Test as viewer - should only see read-only content
4. Test without roles - should show access denied

## Adding New Permissions

1. Add to SQL migration:
```sql
INSERT INTO public.rbac_permissions (name, resource, action, description)
VALUES ('newfeature.view', 'newfeature', 'view', 'View new feature');
```

2. Assign to appropriate roles using `assign_permission_to_role` pattern

3. Run migration in Supabase SQL Editor

## Security Rules

- NEVER expose admin functionality without `AdminGuard`
- NEVER skip permission checks on sensitive operations
- ALWAYS use RLS policies for database access
- ALWAYS check permissions client-side AND server-side
- NEVER trust client-side permission checks alone

## Quick Reference

```jsx
// Check single permission
const canView = hasPermission('resource.view');

// Check multiple permissions (any)
const canEdit = hasPermission('resource.edit') || hasPermission('resource.manage');

// Check role level
const isAtLeastManager = hierarchyLevel >= 60;

// Use guard component
<PermissionGuard permission="resource.action" showMessage>
  <ProtectedContent />
</PermissionGuard>
```

---

**Remember**: Every feature interaction should answer: "Does this user have permission to do this?"
