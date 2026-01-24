/**
 * AdminAnalytics Page
 * Platform analytics and insights dashboard for administrators
 */

import React, { useState, useEffect, useMemo } from 'react';
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
  Calendar,
  Download,
  RefreshCw,
  Package,
  BarChart3,
  LineChart,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { getIconColor } from '@/lib/adminTheme';
import { toast } from 'sonner';
import {
  LineChart as RechartsLineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const ADMIN_API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api`;

// Date range presets
const DATE_RANGES = {
  '7d': { label: 'Last 7 Days', days: 7 },
  '30d': { label: 'Last 30 Days', days: 30 },
  '90d': { label: 'Last 90 Days', days: 90 },
  'ytd': { label: 'Year to Date', days: null },
  '1y': { label: 'Last Year', days: 365 },
};

// Format date for API
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Calculate date range
function getDateRange(preset) {
  const end = new Date();
  let start;

  if (preset === 'ytd') {
    start = new Date(end.getFullYear(), 0, 1);
  } else {
    const days = DATE_RANGES[preset]?.days || 30;
    start = new Date();
    start.setDate(start.getDate() - days);
  }

  return { start: formatDate(start), end: formatDate(end) };
}

// Calculate percentage change
function calcChange(current, previous) {
  if (!previous || previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous * 100).toFixed(1);
}

// Stat Card Component
function StatCard({ title, value, change, changeType, icon: Icon, color, subtitle }) {
  const isPositive = changeType === 'increase';

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-400 mb-1">{title}</p>
            <h3 className="text-3xl font-bold text-white">{value}</h3>
            {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
            {change !== undefined && change !== null && (
              <div className="flex items-center gap-1 mt-2">
                {isPositive ? (
                  <ArrowUpRight className="w-4 h-4 text-green-400" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-400" />
                )}
                <span className={cn('text-sm', isPositive ? 'text-green-400' : 'text-red-400')}>
                  {Math.abs(change)}%
                </span>
                <span className="text-sm text-zinc-500">vs prev period</span>
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

// Custom Tooltip for Charts
function CustomTooltip({ active, payload, label, valueFormatter }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl">
      <p className="text-zinc-400 text-sm mb-2">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {valueFormatter ? valueFormatter(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
}

// User Growth Chart
function UserGrowthChart({ data }) {
  if (!data?.length) {
    return (
      <div className="h-[300px] flex items-center justify-center text-zinc-500">
        No user growth data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsLineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="date"
          stroke="#71717a"
          fontSize={12}
          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        />
        <YAxis stroke="#71717a" fontSize={12} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Line
          type="monotone"
          dataKey="new_users"
          name="New Users"
          stroke="#ef4444"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="cumulative_users"
          name="Total Users"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}

// DAU Chart
function DAUChart({ data }) {
  if (!data?.length) {
    return (
      <div className="h-[300px] flex items-center justify-center text-zinc-500">
        No DAU data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="date"
          stroke="#71717a"
          fontSize={12}
          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        />
        <YAxis stroke="#71717a" fontSize={12} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="dau"
          name="Daily Active Users"
          stroke="#10b981"
          fill="#10b981"
          fillOpacity={0.2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Revenue Chart
function RevenueChart({ data }) {
  if (!data?.length) {
    return (
      <div className="h-[300px] flex items-center justify-center text-zinc-500">
        No revenue data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="date"
          stroke="#71717a"
          fontSize={12}
          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        />
        <YAxis stroke="#71717a" fontSize={12} tickFormatter={(value) => `$${value}`} />
        <Tooltip content={<CustomTooltip valueFormatter={(v) => `$${v.toLocaleString()}`} />} />
        <Legend />
        <Bar dataKey="data_revenue" name="Data Products" fill="#8b5cf6" stackId="revenue" />
        <Bar dataKey="license_revenue" name="App Licenses" fill="#f59e0b" stackId="revenue" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// App Usage Chart
function AppUsageChart({ data }) {
  if (!data?.length) {
    return (
      <div className="h-[300px] flex items-center justify-center text-zinc-500">
        No app usage data available
      </div>
    );
  }

  const chartData = data.slice(0, 10).map(app => ({
    name: app.name,
    licenses: app.total_licenses || 0,
    revenue: app.total_revenue || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis type="number" stroke="#71717a" fontSize={12} />
        <YAxis dataKey="name" type="category" stroke="#71717a" fontSize={12} width={120} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar dataKey="licenses" name="Active Licenses" fill="#ef4444" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Top Users Table
function TopUsersTable({ users }) {
  if (!users?.length) {
    return <div className="p-6 text-center text-zinc-500">No user data available</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left p-4 text-zinc-400 font-medium">User</th>
            <th className="text-left p-4 text-zinc-400 font-medium">Organization</th>
            <th className="text-left p-4 text-zinc-400 font-medium">Role</th>
            <th className="text-left p-4 text-zinc-400 font-medium">Last Login</th>
            <th className="text-left p-4 text-zinc-400 font-medium">Activity</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {users.map((user) => (
            <motion.tr
              key={user.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="hover:bg-zinc-800/50"
            >
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-5 h-5 text-zinc-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium">{user.name || 'Unknown'}</p>
                    <p className="text-sm text-zinc-500">{user.email}</p>
                  </div>
                </div>
              </td>
              <td className="p-4 text-zinc-300">{user.company_name || '-'}</td>
              <td className="p-4">
                <Badge className="bg-zinc-700/50 text-zinc-300">{user.role || 'user'}</Badge>
              </td>
              <td className="p-4 text-zinc-400">
                {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
              </td>
              <td className="p-4">
                <div className="flex items-center gap-2 text-zinc-300">
                  <Activity className="w-4 h-4 text-green-400" />
                  {user.event_count || 0} events
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Organizations Table
function OrganizationsTable({ organizations }) {
  if (!organizations?.length) {
    return <div className="p-6 text-center text-zinc-500">No organization data available</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left p-4 text-zinc-400 font-medium">Organization</th>
            <th className="text-left p-4 text-zinc-400 font-medium">Industry</th>
            <th className="text-left p-4 text-zinc-400 font-medium">Users</th>
            <th className="text-left p-4 text-zinc-400 font-medium">Active</th>
            <th className="text-left p-4 text-zinc-400 font-medium">Apps</th>
            <th className="text-left p-4 text-zinc-400 font-medium">Monthly Spend</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {organizations.map((org) => (
            <motion.tr
              key={org.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="hover:bg-zinc-800/50"
            >
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-purple-400" />
                  <span className="text-white font-medium">{org.name}</span>
                </div>
              </td>
              <td className="p-4 text-zinc-300">{org.industry || '-'}</td>
              <td className="p-4 text-zinc-300">{org.user_count || 0}</td>
              <td className="p-4">
                <span className="text-green-400">{org.active_users || 0}</span>
                <span className="text-zinc-500"> / {org.user_count || 0}</span>
              </td>
              <td className="p-4 text-zinc-300">{org.app_licenses || 0}</td>
              <td className="p-4 text-green-400">${(org.monthly_spend || 0).toLocaleString()}</td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// App Performance Table
function AppPerformanceTable({ apps }) {
  if (!apps?.length) {
    return <div className="p-6 text-center text-zinc-500">No app data available</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left p-4 text-zinc-400 font-medium">App</th>
            <th className="text-left p-4 text-zinc-400 font-medium">Category</th>
            <th className="text-left p-4 text-zinc-400 font-medium">Pricing</th>
            <th className="text-left p-4 text-zinc-400 font-medium">Licenses</th>
            <th className="text-left p-4 text-zinc-400 font-medium">Companies</th>
            <th className="text-left p-4 text-zinc-400 font-medium">Revenue</th>
            <th className="text-left p-4 text-zinc-400 font-medium">Usage</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {apps.map((app) => (
            <motion.tr
              key={app.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="hover:bg-zinc-800/50"
            >
              <td className="p-4">
                <div>
                  <p className="text-white font-medium">{app.name}</p>
                  <p className="text-sm text-zinc-500">{app.slug}</p>
                </div>
              </td>
              <td className="p-4">
                <Badge className="bg-zinc-700/50 text-zinc-300">{app.category || 'other'}</Badge>
              </td>
              <td className="p-4">
                <Badge className={cn(
                  'text-xs',
                  app.pricing_type === 'free' && 'bg-green-500/20 text-green-400',
                  app.pricing_type === 'freemium' && 'bg-blue-500/20 text-blue-400',
                  app.pricing_type === 'paid' && 'bg-purple-500/20 text-purple-400',
                  app.pricing_type === 'enterprise' && 'bg-orange-500/20 text-orange-400'
                )}>
                  {app.pricing_type || 'free'}
                </Badge>
              </td>
              <td className="p-4 text-zinc-300">{app.total_licenses || 0}</td>
              <td className="p-4 text-zinc-300">{app.licensed_companies || 0}</td>
              <td className="p-4 text-green-400">${(app.total_revenue || 0).toLocaleString()}</td>
              <td className="p-4">
                <div className="flex items-center gap-2 text-zinc-300">
                  <Eye className="w-4 h-4 text-blue-400" />
                  {app.usage_count || 0}
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Export to CSV function
function exportToCSV(data, filename) {
  if (!data?.length) {
    toast.error('No data to export');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  toast.success('Export completed');
}

export default function AdminAnalytics() {
  // useAdmin hook provides admin guard protection
  useAdmin();

  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');
  const [granularity, setGranularity] = useState('day');

  // Data state
  const [overview, setOverview] = useState(null);
  const [userGrowth, setUserGrowth] = useState([]);
  const [dauData, setDauData] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [appUsage, setAppUsage] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);

  // Helper to get fresh auth headers
  async function getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Authentication required');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    };
  }

  // Fetch all analytics data
  async function fetchData() {
    setIsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const { start, end } = getDateRange(dateRange);

      console.log('[AdminAnalytics] Fetching data for range:', { start, end, granularity });

      const [
        overviewRes,
        userGrowthRes,
        dauRes,
        revenueRes,
        appUsageRes,
        topUsersRes,
        orgsRes,
      ] = await Promise.all([
        fetch(`${ADMIN_API_URL}/analytics/overview?start=${start}&end=${end}`, { headers }),
        fetch(`${ADMIN_API_URL}/analytics/user-growth?start=${start}&end=${end}&granularity=${granularity}`, { headers }),
        fetch(`${ADMIN_API_URL}/analytics/dau?start=${start}&end=${end}`, { headers }),
        fetch(`${ADMIN_API_URL}/analytics/revenue?start=${start}&end=${end}&granularity=${granularity}`, { headers }),
        fetch(`${ADMIN_API_URL}/analytics/app-usage?start=${start}&end=${end}`, { headers }),
        fetch(`${ADMIN_API_URL}/analytics/top-users?start=${start}&end=${end}&limit=10`, { headers }),
        fetch(`${ADMIN_API_URL}/analytics/organizations?start=${start}&end=${end}`, { headers }),
      ]);

      if (overviewRes.ok) setOverview(await overviewRes.json());
      if (userGrowthRes.ok) setUserGrowth(await userGrowthRes.json());
      if (dauRes.ok) setDauData(await dauRes.json());
      if (revenueRes.ok) setRevenueData(await revenueRes.json());
      if (appUsageRes.ok) setAppUsage(await appUsageRes.json());
      if (topUsersRes.ok) setTopUsers(await topUsersRes.json());
      if (orgsRes.ok) setOrganizations(await orgsRes.json());

    } catch (error) {
      console.error('[AdminAnalytics] Error fetching data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [dateRange, granularity]);

  // Calculate stats from overview
  const stats = useMemo(() => {
    if (!overview) return null;

    return {
      totalUsers: overview.total_users || 0,
      newUsers: overview.new_users || 0,
      newUsersChange: calcChange(overview.new_users, overview.new_users_prev),
      activeUsers: overview.active_users || 0,
      activeUsersChange: calcChange(overview.active_users, overview.active_users_prev),
      totalOrgs: overview.total_organizations || 0,
      newOrgs: overview.new_organizations || 0,
      newOrgsChange: calcChange(overview.new_organizations, overview.new_organizations_prev),
      revenue: overview.total_revenue || 0,
      revenueChange: calcChange(overview.total_revenue, overview.total_revenue_prev),
      appLicenses: overview.total_app_licenses || 0,
      newLicenses: overview.new_app_licenses || 0,
      dataProducts: overview.total_data_products || 0,
      dataPurchases: overview.total_data_purchases || 0,
    };
  }, [overview]);

  return (
    <div className="min-h-screen bg-black p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Analytics & Insights</h1>
            <p className="text-zinc-400 mt-1">
              Platform performance metrics and growth analytics
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Date Range Selector */}
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px] bg-zinc-900 border-zinc-700">
                <Calendar className="w-4 h-4 mr-2 text-zinc-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {Object.entries(DATE_RANGES).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Granularity Selector */}
            <Select value={granularity} onValueChange={setGranularity}>
              <SelectTrigger className="w-[120px] bg-zinc-900 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="day">Daily</SelectItem>
                <SelectItem value="week">Weekly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
              </SelectContent>
            </Select>

            {/* Refresh Button */}
            <Button
              onClick={fetchData}
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Users"
            value={stats.totalUsers.toLocaleString()}
            change={stats.newUsersChange}
            changeType={parseFloat(stats.newUsersChange) >= 0 ? 'increase' : 'decrease'}
            subtitle={`${stats.newUsers} new this period`}
            icon={Users}
            color="blue"
          />
          <StatCard
            title="Active Users"
            value={stats.activeUsers.toLocaleString()}
            change={stats.activeUsersChange}
            changeType={parseFloat(stats.activeUsersChange) >= 0 ? 'increase' : 'decrease'}
            subtitle="Users with activity"
            icon={Activity}
            color="green"
          />
          <StatCard
            title="Organizations"
            value={stats.totalOrgs.toLocaleString()}
            change={stats.newOrgsChange}
            changeType={parseFloat(stats.newOrgsChange) >= 0 ? 'increase' : 'decrease'}
            subtitle={`${stats.newOrgs} new this period`}
            icon={Building2}
            color="purple"
          />
          <StatCard
            title="Revenue"
            value={`$${stats.revenue.toLocaleString()}`}
            change={stats.revenueChange}
            changeType={parseFloat(stats.revenueChange) >= 0 ? 'increase' : 'decrease'}
            subtitle={`${stats.appLicenses} active licenses`}
            icon={DollarSign}
            color="orange"
          />
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* User Growth Chart */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <LineChart className="w-5 h-5 text-red-400" />
                  User Growth
                </CardTitle>
                <CardDescription className="text-zinc-500">
                  New and cumulative users over time
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => exportToCSV(userGrowth, 'user-growth')}
                className="text-zinc-400 hover:text-white"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-zinc-400 animate-spin" />
              </div>
            ) : (
              <UserGrowthChart data={userGrowth} />
            )}
          </CardContent>
        </Card>

        {/* DAU Chart */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-green-400" />
                  Daily Active Users
                </CardTitle>
                <CardDescription className="text-zinc-500">
                  Users active each day
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => exportToCSV(dauData, 'dau')}
                className="text-zinc-400 hover:text-white"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-zinc-400 animate-spin" />
              </div>
            ) : (
              <DAUChart data={dauData} />
            )}
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-orange-400" />
                  Revenue Breakdown
                </CardTitle>
                <CardDescription className="text-zinc-500">
                  Revenue from data products and app licenses
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => exportToCSV(revenueData, 'revenue')}
                className="text-zinc-400 hover:text-white"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-zinc-400 animate-spin" />
              </div>
            ) : (
              <RevenueChart data={revenueData} />
            )}
          </CardContent>
        </Card>

        {/* App Usage Chart */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-purple-400" />
                  App Performance
                </CardTitle>
                <CardDescription className="text-zinc-500">
                  Active licenses by app
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => exportToCSV(appUsage, 'app-usage')}
                className="text-zinc-400 hover:text-white"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-zinc-400 animate-spin" />
              </div>
            ) : (
              <AppUsageChart data={appUsage} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tables Section */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="users" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">
            Top Users
          </TabsTrigger>
          <TabsTrigger value="organizations" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
            Organizations
          </TabsTrigger>
          <TabsTrigger value="apps" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400">
            App Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Top Users by Recent Activity</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => exportToCSV(topUsers, 'top-users')}
                  className="text-zinc-400 hover:text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 flex justify-center">
                  <RefreshCw className="w-6 h-6 text-zinc-400 animate-spin" />
                </div>
              ) : (
                <TopUsersTable users={topUsers} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organizations">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Organization Breakdown</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => exportToCSV(organizations, 'organizations')}
                  className="text-zinc-400 hover:text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 flex justify-center">
                  <RefreshCw className="w-6 h-6 text-zinc-400 animate-spin" />
                </div>
              ) : (
                <OrganizationsTable organizations={organizations} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apps">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">App Performance Details</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => exportToCSV(appUsage, 'app-performance')}
                  className="text-zinc-400 hover:text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 flex justify-center">
                  <RefreshCw className="w-6 h-6 text-zinc-400 animate-spin" />
                </div>
              ) : (
                <AppPerformanceTable apps={appUsage} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
