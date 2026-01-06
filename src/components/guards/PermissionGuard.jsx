import React from 'react';
import { usePermissions } from '../context/PermissionContext';
import { Navigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Loader2, ShieldX } from 'lucide-react';

/**
 * PermissionGuard - Protect content based on specific permission
 *
 * @param {string} permission - Required permission (e.g., 'finance.view')
 * @param {string} resource - Alternative: resource name (requires action)
 * @param {string} action - Alternative: action name (requires resource)
 * @param {React.ReactNode} children - Content to render if permitted
 * @param {React.ReactNode} fallback - Optional: Content to render if not permitted
 * @param {string} redirectTo - Optional: Page to redirect to if not permitted
 * @param {boolean} showMessage - Show "access denied" message instead of hiding
 *
 * Usage:
 * <PermissionGuard permission="finance.edit">
 *   <FinanceEditButton />
 * </PermissionGuard>
 *
 * <PermissionGuard resource="users" action="delete" redirectTo="Dashboard">
 *   <UserDeletePage />
 * </PermissionGuard>
 */
export function PermissionGuard({
  permission,
  resource,
  action,
  children,
  fallback = null,
  redirectTo,
  showMessage = false,
}) {
  const { hasPermission, canPerform, isLoading } = usePermissions();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  // Check permission
  let isAllowed = false;

  if (permission) {
    isAllowed = hasPermission(permission);
  } else if (resource && action) {
    isAllowed = canPerform(resource, action);
  }

  // Allowed - render children
  if (isAllowed) {
    return <>{children}</>;
  }

  // Not allowed - handle fallback
  if (redirectTo) {
    return <Navigate to={createPageUrl(redirectTo)} replace />;
  }

  if (showMessage) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <ShieldX className="h-12 w-12 text-red-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Access Denied
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          You don't have permission to access this content.
        </p>
      </div>
    );
  }

  return fallback;
}

/**
 * RoleGuard - Protect content based on role
 *
 * @param {string} role - Required role name (e.g., 'admin', 'manager')
 * @param {number} minLevel - Alternative: minimum hierarchy level
 * @param {React.ReactNode} children - Content to render if permitted
 * @param {React.ReactNode} fallback - Optional: Content to render if not permitted
 * @param {string} redirectTo - Optional: Page to redirect to if not permitted
 *
 * Usage:
 * <RoleGuard role="admin">
 *   <AdminPanel />
 * </RoleGuard>
 *
 * <RoleGuard minLevel={60} redirectTo="Dashboard">
 *   <ManagerDashboard />
 * </RoleGuard>
 */
export function RoleGuard({
  role,
  minLevel,
  children,
  fallback = null,
  redirectTo,
  showMessage = false,
}) {
  const { hasRole, hasMinLevel, isLoading } = usePermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  let isAllowed = false;

  if (role) {
    isAllowed = hasRole(role);
  } else if (minLevel !== undefined) {
    isAllowed = hasMinLevel(minLevel);
  }

  if (isAllowed) {
    return <>{children}</>;
  }

  if (redirectTo) {
    return <Navigate to={createPageUrl(redirectTo)} replace />;
  }

  if (showMessage) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <ShieldX className="h-12 w-12 text-red-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Access Denied
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          You don't have the required role to access this content.
        </p>
      </div>
    );
  }

  return fallback;
}

/**
 * AdminGuard - Shortcut for admin-only content
 *
 * @param {React.ReactNode} children - Content to render if admin
 * @param {React.ReactNode} fallback - Optional: Content to render if not admin
 * @param {string} redirectTo - Optional: Page to redirect to if not admin
 * @param {boolean} requireSuperAdmin - Require super admin level
 *
 * Usage:
 * <AdminGuard>
 *   <AdminOnlySettings />
 * </AdminGuard>
 *
 * <AdminGuard requireSuperAdmin redirectTo="Dashboard">
 *   <SystemSettings />
 * </AdminGuard>
 */
export function AdminGuard({
  children,
  fallback = null,
  redirectTo,
  requireSuperAdmin = false,
  showMessage = false,
}) {
  const { isAdmin, isSuperAdmin, isLoading } = usePermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  const isAllowed = requireSuperAdmin ? isSuperAdmin : isAdmin;

  if (isAllowed) {
    return <>{children}</>;
  }

  if (redirectTo) {
    return <Navigate to={createPageUrl(redirectTo)} replace />;
  }

  if (showMessage) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <ShieldX className="h-12 w-12 text-red-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Admin Access Required
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          This area requires administrator privileges.
        </p>
      </div>
    );
  }

  return fallback;
}

/**
 * ManagerGuard - Shortcut for manager and above content
 *
 * Usage:
 * <ManagerGuard>
 *   <TeamManagementPanel />
 * </ManagerGuard>
 */
export function ManagerGuard({
  children,
  fallback = null,
  redirectTo,
  showMessage = false,
}) {
  const { isManager, isLoading } = usePermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (isManager) {
    return <>{children}</>;
  }

  if (redirectTo) {
    return <Navigate to={createPageUrl(redirectTo)} replace />;
  }

  if (showMessage) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <ShieldX className="h-12 w-12 text-red-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Manager Access Required
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          This area requires manager privileges.
        </p>
      </div>
    );
  }

  return fallback;
}

export default PermissionGuard;
