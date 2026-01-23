/**
 * AdminLayout Component
 * Main layout wrapper for admin pages
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { AdminProvider, AdminGuard } from './AdminGuard';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout() {
  return (
    <AdminProvider>
      <AdminGuard>
        <div className="flex h-screen bg-black">
          <AdminSidebar />
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </AdminGuard>
    </AdminProvider>
  );
}
