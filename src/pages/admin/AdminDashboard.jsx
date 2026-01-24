/**
 * AdminDashboard Page
 * Main dashboard for platform administrators
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/api/supabaseClient';
import { useAdmin } from '@/components/admin/AdminGuard';
import {
  Users,
  Building2,
  DollarSign,
  Activity,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Clock,
  Shield,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getIconColor, getStatusColor, getRoleColor } from '@/lib/adminTheme';

const ADMIN_API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api`;

function StatCard({ title, value, change, changeType, icon: Icon, color }) {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-400 mb-1">{title}</p>
            <h3 className="text-3xl font-bold text-white">{value}</h3>
            {change && (
              <div className="flex items-center gap-1 mt-2">
                {changeType === 'increase' ? (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
                <span
                  className={cn(
                    'text-sm',
                    changeType === 'increase' ? 'text-green-400' : 'text-red-400'
                  )}
                >
                  {change}
                </span>
                <span className="text-sm text-zinc-500">vs last month</span>
              </div>
            )}
          </div>
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center border',
              getIconColor(color)
            )}
          >
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentActivity({ activities, isLoading }) {
  const getActivityIcon = (action) => {
    if (action.includes('create') || action.includes('insert')) {
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    }
    if (action.includes('delete') || action.includes('remove')) {
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    }
    if (action.includes('update') || action.includes('edit')) {
      return <RefreshCw className="w-4 h-4 text-blue-400" />;
    }
    return <Activity className="w-4 h-4 text-zinc-400" />;
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="border-b border-zinc-800">
        <CardTitle className="text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-red-400" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 text-center">
            <RefreshCw className="w-6 h-6 text-zinc-400 animate-spin mx-auto" />
          </div>
        ) : activities.length === 0 ? (
          <div className="p-6 text-center text-zinc-500">No recent activity</div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {activities.map((activity, index) => (
              <motion.div
                key={activity.id || index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 hover:bg-zinc-800/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getActivityIcon(activity.action)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">
                      <span className="font-medium">{activity.admin_email || 'Admin'}</span>{' '}
                      <span className="text-zinc-400">{activity.action}</span>
                    </p>
                    {activity.details && (
                      <p className="text-xs text-zinc-500 mt-1 truncate">
                        {typeof activity.details === 'object'
                          ? JSON.stringify(activity.details)
                          : activity.details}
                      </p>
                    )}
                    <p className="text-xs text-zinc-600 mt-1">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuickActions() {
  const actions = [
    { label: 'View All Users', href: '/admin/users', icon: Users },
    { label: 'Manage Organizations', href: '/admin/organizations', icon: Building2 },
    { label: 'Feature Flags', href: '/admin/feature-flags', icon: Shield },
    { label: 'System Settings', href: '/admin/settings', icon: Activity },
  ];

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="border-b border-zinc-800">
        <CardTitle className="text-white">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <a key={action.href} href={action.href}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-red-500/30 transition-all"
              >
                <action.icon className="w-5 h-5 text-red-400" />
                <span className="text-sm text-white">{action.label}</span>
                <ArrowUpRight className="w-4 h-4 text-zinc-500 ml-auto" />
              </motion.div>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { adminRole, adminData } = useAdmin();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrganizations: 0,
    monthlyRevenue: 0,
    activeUsers: 0,
  });
  const [changes, setChanges] = useState({
    users: '+0%',
    activeUsers: '+0%',
    organizations: '+0%',
    revenue: '+0%',
  });
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Get fresh session for auth
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        console.error('[AdminDashboard] No session available');
        setIsLoading(false);
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      };

      // Fetch dashboard stats and activities in parallel
      const [statsResponse, activitiesResult] = await Promise.all([
        fetch(`${ADMIN_API_URL}/dashboard/stats`, { headers }),
        supabase
          .from('admin_audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats({
          totalUsers: statsData.totalUsers || 0,
          totalOrganizations: statsData.totalOrganizations || 0,
          monthlyRevenue: statsData.monthlyRevenue || 0,
          activeUsers: statsData.activeUsers || 0,
        });
        setChanges(statsData.changes || {
          users: '+0%',
          activeUsers: '+0%',
          organizations: '+0%',
          revenue: '+0%',
        });
      } else {
        console.error('[AdminDashboard] Failed to fetch stats:', await statsResponse.text());
      }

      setActivities(activitiesResult.data || []);
    } catch (error) {
      console.error('[AdminDashboard] Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to determine if change is positive or negative
  const getChangeType = (changeStr) => {
    if (!changeStr) return 'increase';
    return changeStr.startsWith('-') ? 'decrease' : 'increase';
  };

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-zinc-400 mt-1">
              Welcome back. Here's what's happening on the platform.
            </p>
          </div>
          <Button
            onClick={fetchDashboardData}
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Users"
          value={stats.totalUsers.toLocaleString()}
          change={changes.users}
          changeType={getChangeType(changes.users)}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Organizations"
          value={stats.totalOrganizations.toLocaleString()}
          change={changes.organizations}
          changeType={getChangeType(changes.organizations)}
          icon={Building2}
          color="purple"
        />
        <StatCard
          title="Active Users"
          value={stats.activeUsers.toLocaleString()}
          change={changes.activeUsers}
          changeType={getChangeType(changes.activeUsers)}
          icon={Activity}
          color="green"
        />
        <StatCard
          title="Monthly Revenue"
          value={`$${stats.monthlyRevenue.toLocaleString()}`}
          change={changes.revenue}
          changeType={getChangeType(changes.revenue)}
          icon={DollarSign}
          color="orange"
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity - Takes 2 columns */}
        <div className="lg:col-span-2">
          <RecentActivity activities={activities} isLoading={isLoading} />
        </div>

        {/* Quick Actions */}
        <div>
          <QuickActions />

          {/* Admin Info Card */}
          <Card className="bg-zinc-900/50 border-zinc-800 mt-6">
            <CardHeader className="border-b border-zinc-800">
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-400" />
                Your Admin Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Role</span>
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                  {adminRole?.replace('_', ' ')}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Status</span>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  Active
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Last Login</span>
                <span className="text-sm text-white">
                  {adminData?.last_login
                    ? new Date(adminData.last_login).toLocaleDateString()
                    : 'Today'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
