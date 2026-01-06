/**
 * RBAC Guard Components
 *
 * These components protect UI elements based on user permissions and roles.
 *
 * Available guards:
 * - PermissionGuard: Check specific permission (e.g., 'finance.view')
 * - RoleGuard: Check role or minimum hierarchy level
 * - AdminGuard: Shortcut for admin-only content
 * - ManagerGuard: Shortcut for manager and above
 *
 * Usage examples:
 *
 * // Hide button if no permission
 * <PermissionGuard permission="users.delete">
 *   <DeleteButton />
 * </PermissionGuard>
 *
 * // Redirect to dashboard if not admin
 * <AdminGuard redirectTo="Dashboard">
 *   <AdminPage />
 * </AdminGuard>
 *
 * // Show message if access denied
 * <RoleGuard minLevel={60} showMessage>
 *   <ManagerContent />
 * </RoleGuard>
 */

export {
  PermissionGuard,
  RoleGuard,
  AdminGuard,
  ManagerGuard,
} from './PermissionGuard';
