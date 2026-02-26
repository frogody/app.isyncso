/**
 * AdminGuard Component
 * Protects admin routes by verifying platform admin status
 */

import React, { useState, useEffect, createContext, useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { Loader2, ShieldAlert } from 'lucide-react';

// Admin Context for sharing admin state
const AdminContext = createContext({
  isAdmin: false,
  adminRole: null,
  adminData: null,
  isLoading: true,
  refreshAdmin: () => {},
});

export const useAdmin = () => useContext(AdminContext);

/**
 * AdminProvider - Wraps the app to provide admin context
 */
export function AdminProvider({ children }) {
  const { user, isLoading: userLoading } = useUser();
  const [adminState, setAdminState] = useState({
    isAdmin: false,
    adminRole: null,
    adminData: null,
    isLoading: true,
  });

  const checkAdminStatus = async () => {
    if (!user?.id) {
      setAdminState({ isAdmin: false, adminRole: null, adminData: null, isLoading: false });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('platform_admins')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        setAdminState({ isAdmin: false, adminRole: null, adminData: null, isLoading: false });
        return;
      }

      setAdminState({
        isAdmin: true,
        adminRole: data.role,
        adminData: data,
        isLoading: false,
      });
    } catch (err) {
      console.error('[AdminGuard] Error checking admin status:', err);
      setAdminState({ isAdmin: false, adminRole: null, adminData: null, isLoading: false });
    }
  };

  useEffect(() => {
    if (!userLoading) {
      checkAdminStatus();
    }
  }, [user, userLoading]);

  const refreshAdmin = () => {
    setAdminState(prev => ({ ...prev, isLoading: true }));
    checkAdminStatus();
  };

  return (
    <AdminContext.Provider value={{ ...adminState, refreshAdmin }}>
      {children}
    </AdminContext.Provider>
  );
}

/**
 * AdminGuard - Route protection component
 */
export function AdminGuard({ children, requiredRole = null }) {
  const { isAdmin, adminRole, isLoading } = useAdmin();
  const { user, isLoading: userLoading } = useUser();
  const location = useLocation();

  // Show loading state
  if (isLoading || userLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-cyan-500 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Redirect if not logged in
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect if not an admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-zinc-400 mb-6">
            You do not have permission to access the admin panel.
            This area is restricted to platform administrators.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 transition-colors"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Check for required role
  if (requiredRole) {
    const roleHierarchy = { 'super_admin': 4, 'admin': 3, 'support': 2, 'analyst': 1 };
    const userLevel = roleHierarchy[adminRole] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    if (userLevel < requiredLevel) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8 text-cyan-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Insufficient Permissions</h1>
            <p className="text-zinc-400 mb-6">
              This action requires {requiredRole.replace('_', ' ')} privileges.
              Your current role is {adminRole.replace('_', ' ')}.
            </p>
            <a
              href="/admin"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 transition-colors"
            >
              Return to Admin Dashboard
            </a>
          </div>
        </div>
      );
    }
  }

  return children;
}

export default AdminGuard;
