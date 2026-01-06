import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useUser } from './UserContext';

/**
 * PermissionContext - Role-Based Access Control (RBAC) management
 *
 * Provides:
 * - roles: User's assigned roles with hierarchy levels
 * - permissions: User's computed permissions
 * - isAdmin: Whether user has admin privileges (hierarchy >= 80)
 * - isSuperAdmin: Whether user has super admin privileges (hierarchy >= 100)
 * - isManager: Whether user has manager privileges (hierarchy >= 60)
 * - hasPermission: Check if user has a specific permission
 * - hasRole: Check if user has a specific role
 * - hierarchyLevel: User's highest hierarchy level
 * - isLoading: Loading state for permission data
 *
 * Usage:
 * - const { hasPermission } = usePermissions();
 * - if (hasPermission('finance.view')) { ... }
 * - <PermissionGuard permission="finance.edit">...</PermissionGuard>
 */

const PermissionContext = createContext(null);

export function PermissionProvider({ children }) {
  const { user, isLoading: userLoading } = useUser();
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [hierarchyLevel, setHierarchyLevel] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user's roles and permissions
  const loadPermissions = useCallback(async () => {
    if (!user?.id) {
      setRoles([]);
      setPermissions([]);
      setHierarchyLevel(0);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Load user's roles using the database function
      const { data: userRoles, error: rolesError } = await supabase.rpc(
        'get_user_roles',
        { p_user_id: user.id }
      );

      if (rolesError) {
        // If function doesn't exist yet, fall back to direct query
        console.warn('get_user_roles function not found, using direct query');
        const { data: directRoles, error: directError } = await supabase
          .from('rbac_user_roles')
          .select(`
            scope_type,
            scope_id,
            rbac_roles (
              name,
              hierarchy_level,
              description
            )
          `)
          .eq('user_id', user.id);

        if (directError) throw directError;

        const mappedRoles = (directRoles || []).map((ur) => ({
          role_name: ur.rbac_roles?.name,
          hierarchy_level: ur.rbac_roles?.hierarchy_level || 0,
          scope_type: ur.scope_type,
          scope_id: ur.scope_id,
        }));

        setRoles(mappedRoles);

        // Calculate max hierarchy level
        const maxLevel = Math.max(...mappedRoles.map((r) => r.hierarchy_level), 0);
        setHierarchyLevel(maxLevel);
      } else {
        setRoles(userRoles || []);
        const maxLevel = Math.max(...(userRoles || []).map((r) => r.hierarchy_level), 0);
        setHierarchyLevel(maxLevel);
      }

      // Load user's permissions using the database function
      const { data: userPermissions, error: permsError } = await supabase.rpc(
        'get_user_permissions',
        { p_user_id: user.id }
      );

      if (permsError) {
        // Fall back to direct query
        console.warn('get_user_permissions function not found, using direct query');
        const { data: directPerms, error: directPermError } = await supabase
          .from('rbac_user_roles')
          .select(`
            rbac_roles!inner (
              rbac_role_permissions!inner (
                rbac_permissions!inner (
                  name,
                  resource,
                  action
                )
              )
            )
          `)
          .eq('user_id', user.id);

        if (directPermError) throw directPermError;

        // Flatten permissions from nested structure
        const flatPerms = [];
        (directPerms || []).forEach((ur) => {
          ur.rbac_roles?.rbac_role_permissions?.forEach((rp) => {
            if (rp.rbac_permissions) {
              flatPerms.push({
                permission_name: rp.rbac_permissions.name,
                resource: rp.rbac_permissions.resource,
                action: rp.rbac_permissions.action,
              });
            }
          });
        });

        // Remove duplicates
        const uniquePerms = Array.from(
          new Map(flatPerms.map((p) => [p.permission_name, p])).values()
        );
        setPermissions(uniquePerms);
      } else {
        setPermissions(userPermissions || []);
      }
    } catch (err) {
      console.error('PermissionContext: Failed to load permissions', err);
      setError(err);
      // Set defaults so app can still function
      setRoles([]);
      setPermissions([]);
      setHierarchyLevel(0);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Reload permissions when user changes
  useEffect(() => {
    if (!userLoading) {
      loadPermissions();
    }
  }, [userLoading, loadPermissions]);

  // Check if user has a specific permission
  const hasPermission = useCallback(
    (permissionName) => {
      // Super admins have all permissions
      if (hierarchyLevel >= 100) return true;

      return permissions.some((p) => p.permission_name === permissionName);
    },
    [permissions, hierarchyLevel]
  );

  // Check if user has a specific role
  const hasRole = useCallback(
    (roleName) => {
      return roles.some((r) => r.role_name === roleName);
    },
    [roles]
  );

  // Check if user has permission for a resource action
  const canPerform = useCallback(
    (resource, action) => {
      // Super admins can do anything
      if (hierarchyLevel >= 100) return true;

      const permName = `${resource}.${action}`;
      return permissions.some(
        (p) => p.permission_name === permName || p.permission_name === `${resource}.manage`
      );
    },
    [permissions, hierarchyLevel]
  );

  // Check if user has minimum hierarchy level
  const hasMinLevel = useCallback(
    (minLevel) => {
      return hierarchyLevel >= minLevel;
    },
    [hierarchyLevel]
  );

  // Assign a role to a user (admin function)
  const assignRole = useCallback(
    async (targetUserId, roleName, scopeType = 'global', scopeId = null) => {
      if (hierarchyLevel < 60) {
        throw new Error('Insufficient permissions to assign roles');
      }

      // Get the role ID
      const { data: roleData, error: roleError } = await supabase
        .from('rbac_roles')
        .select('id, hierarchy_level')
        .eq('name', roleName)
        .single();

      if (roleError) throw roleError;

      // Can't assign a role higher than your own
      if (roleData.hierarchy_level > hierarchyLevel) {
        throw new Error('Cannot assign a role with higher privileges than your own');
      }

      // Insert the user role assignment
      const { error: assignError } = await supabase.from('rbac_user_roles').insert({
        user_id: targetUserId,
        role_id: roleData.id,
        scope_type: scopeType,
        scope_id: scopeId,
        assigned_by: user.id,
      });

      if (assignError) throw assignError;
    },
    [hierarchyLevel, user?.id]
  );

  // Remove a role from a user (admin function)
  const removeRole = useCallback(
    async (targetUserId, roleName, scopeType = 'global', scopeId = null) => {
      if (hierarchyLevel < 60) {
        throw new Error('Insufficient permissions to remove roles');
      }

      // Get the role ID
      const { data: roleData, error: roleError } = await supabase
        .from('rbac_roles')
        .select('id')
        .eq('name', roleName)
        .single();

      if (roleError) throw roleError;

      // Build query
      let query = supabase
        .from('rbac_user_roles')
        .delete()
        .eq('user_id', targetUserId)
        .eq('role_id', roleData.id)
        .eq('scope_type', scopeType);

      if (scopeId) {
        query = query.eq('scope_id', scopeId);
      } else {
        query = query.is('scope_id', null);
      }

      const { error: removeError } = await query;
      if (removeError) throw removeError;
    },
    [hierarchyLevel]
  );

  // Refresh permissions
  const refreshPermissions = useCallback(async () => {
    await loadPermissions();
  }, [loadPermissions]);

  // Memoize context value
  const value = useMemo(
    () => ({
      // Data
      roles,
      permissions,
      hierarchyLevel,
      isLoading: isLoading || userLoading,
      error,

      // Computed booleans
      isAuthenticated: !!user,
      isSuperAdmin: hierarchyLevel >= 100,
      isAdmin: hierarchyLevel >= 80,
      isManager: hierarchyLevel >= 60,
      isUser: hierarchyLevel >= 40,
      isViewer: hierarchyLevel >= 20,

      // Functions
      hasPermission,
      hasRole,
      canPerform,
      hasMinLevel,
      assignRole,
      removeRole,
      refreshPermissions,
    }),
    [
      roles,
      permissions,
      hierarchyLevel,
      isLoading,
      userLoading,
      error,
      user,
      hasPermission,
      hasRole,
      canPerform,
      hasMinLevel,
      assignRole,
      removeRole,
      refreshPermissions,
    ]
  );

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

/**
 * Hook to access all permission context
 */
export function usePermissions() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within PermissionProvider');
  }
  return context;
}

/**
 * Hook to check a single permission
 * @param {string} permission - Permission name like 'finance.view'
 * @returns {boolean} Whether user has the permission
 */
export function useHasPermission(permission) {
  const { hasPermission, isLoading } = usePermissions();
  return useMemo(
    () => ({
      allowed: hasPermission(permission),
      isLoading,
    }),
    [hasPermission, permission, isLoading]
  );
}

/**
 * Hook to check if user has a specific role
 * @param {string} roleName - Role name like 'admin'
 * @returns {boolean} Whether user has the role
 */
export function useHasRole(roleName) {
  const { hasRole, isLoading } = usePermissions();
  return useMemo(
    () => ({
      hasRole: hasRole(roleName),
      isLoading,
    }),
    [hasRole, roleName, isLoading]
  );
}

/**
 * Hook to check admin status
 */
export function useIsAdmin() {
  const { isAdmin, isSuperAdmin, isLoading } = usePermissions();
  return useMemo(
    () => ({
      isAdmin,
      isSuperAdmin,
      isLoading,
    }),
    [isAdmin, isSuperAdmin, isLoading]
  );
}

export default PermissionContext;
