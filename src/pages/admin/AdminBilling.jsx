import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  FileText,
  Tag,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Search,
  Star,
  Percent,
  Calendar,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const ADMIN_API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api`;

function StatusBadge({ status }) {
  const styles = {
    active: 'bg-green-500/20 text-green-400',
    trialing: 'bg-blue-500/20 text-blue-400',
    canceled: 'bg-zinc-500/20 text-zinc-400',
    past_due: 'bg-red-500/20 text-red-400',
    paused: 'bg-yellow-500/20 text-yellow-400',
    expired: 'bg-zinc-500/20 text-zinc-400',
    paid: 'bg-green-500/20 text-green-400',
    pending: 'bg-yellow-500/20 text-yellow-400',
    overdue: 'bg-red-500/20 text-red-400',
    draft: 'bg-zinc-500/20 text-zinc-400',
    refunded: 'bg-purple-500/20 text-purple-400',
    succeeded: 'bg-green-500/20 text-green-400',
    failed: 'bg-red-500/20 text-red-400',
    processing: 'bg-blue-500/20 text-blue-400',
  };

  const icons = {
    active: CheckCircle2,
    trialing: Clock,
    canceled: XCircle,
    past_due: AlertTriangle,
    paused: Clock,
    paid: CheckCircle2,
    pending: Clock,
    overdue: AlertTriangle,
    succeeded: CheckCircle2,
    failed: XCircle,
  };

  const Icon = icons[status] || Clock;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-zinc-500/20 text-zinc-400'}`}>
      <Icon className="w-3 h-3" />
      {status?.replace('_', ' ')}
    </span>
  );
}

function StatCard({ title, value, icon: Icon, color = 'blue', subtitle, trend }) {
  const colors = {
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    red: 'bg-red-500/20 text-red-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
    purple: 'bg-purple-500/20 text-purple-400',
  };

  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-zinc-400">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
            <TrendingUp className={`w-4 h-4 ${trend < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
    </div>
  );
}

function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount || 0);
}

function PlanModal({ plan, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: plan?.name || '',
    slug: plan?.slug || '',
    description: plan?.description || '',
    price_monthly: plan?.price_monthly || 0,
    price_yearly: plan?.price_yearly || 0,
    features: plan?.features ? JSON.stringify(plan.features, null, 2) : '[]',
    limits: plan?.limits ? JSON.stringify(plan.limits, null, 2) : '{}',
    is_active: plan?.is_active ?? true,
    is_featured: plan?.is_featured ?? false,
    sort_order: plan?.sort_order || 0,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      let features, limits;
      try {
        features = JSON.parse(formData.features);
        limits = JSON.parse(formData.limits);
      } catch {
        toast.error('Invalid JSON in features or limits');
        setSaving(false);
        return;
      }

      const payload = {
        ...formData,
        features,
        limits,
        price_monthly: parseFloat(formData.price_monthly),
        price_yearly: parseFloat(formData.price_yearly),
        sort_order: parseInt(formData.sort_order),
        ...(plan?.id ? { id: plan.id } : {}),
      };

      await onSave(payload);
      onClose();
    } catch (error) {
      toast.error('Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-zinc-800">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-xl font-semibold text-white">
            {plan ? 'Edit Plan' : 'Add Subscription Plan'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Slug *</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={!!plan}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Monthly Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.price_monthly}
                onChange={(e) => setFormData({ ...formData, price_monthly: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Yearly Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.price_yearly}
                onChange={(e) => setFormData({ ...formData, price_yearly: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Sort Order</label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Features (JSON array)</label>
            <textarea
              value={formData.features}
              onChange={(e) => setFormData({ ...formData, features: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              rows={4}
              placeholder='["Feature 1", "Feature 2"]'
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Limits (JSON object)</label>
            <textarea
              value={formData.limits}
              onChange={(e) => setFormData({ ...formData, limits: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              rows={3}
              placeholder='{"users": 10, "storage_gb": 50}'
            />
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-zinc-700 bg-zinc-800"
              />
              <span className="text-sm text-zinc-300">Active</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_featured}
                onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                className="rounded border-zinc-700 bg-zinc-800"
              />
              <span className="text-sm text-zinc-300">Featured</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : plan ? 'Update Plan' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CouponModal({ coupon, onClose, onSave }) {
  const [formData, setFormData] = useState({
    code: coupon?.code || '',
    name: coupon?.name || '',
    description: coupon?.description || '',
    discount_type: coupon?.discount_type || 'percentage',
    discount_value: coupon?.discount_value || 0,
    valid_until: coupon?.valid_until ? new Date(coupon.valid_until).toISOString().split('T')[0] : '',
    max_uses: coupon?.max_uses || '',
    is_active: coupon?.is_active ?? true,
    first_subscription_only: coupon?.first_subscription_only ?? false,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...formData,
        discount_value: parseFloat(formData.discount_value),
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        valid_until: formData.valid_until || null,
        ...(coupon?.id ? { id: coupon.id } : {}),
      };

      await onSave(payload);
      onClose();
    } catch (error) {
      toast.error('Failed to save coupon');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-zinc-800">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-xl font-semibold text-white">
            {coupon ? 'Edit Coupon' : 'Add Coupon'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Code *</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={!!coupon}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Discount Type *</label>
              <select
                value={formData.discount_type}
                onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed_amount">Fixed Amount ($)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Discount Value ({formData.discount_type === 'percentage' ? '%' : '$'}) *
              </label>
              <input
                type="number"
                step={formData.discount_type === 'percentage' ? '1' : '0.01'}
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Valid Until</label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Max Uses</label>
              <input
                type="number"
                value={formData.max_uses}
                onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Unlimited"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-zinc-700 bg-zinc-800"
              />
              <span className="text-sm text-zinc-300">Active</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.first_subscription_only}
                onChange={(e) => setFormData({ ...formData, first_subscription_only: e.target.checked })}
                className="rounded border-zinc-700 bg-zinc-800"
              />
              <span className="text-sm text-zinc-300">First subscription only</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : coupon ? 'Update Coupon' : 'Create Coupon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminBilling() {
  const [isLoading, setIsLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [revenueChart, setRevenueChart] = useState([]);
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [activeTab, setActiveTab] = useState('plans');

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

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

  async function fetchData() {
    setIsLoading(true);
    try {
      const headers = await getAuthHeaders();

      const [overviewRes, chartRes, plansRes, subsRes, invoicesRes, paymentsRes, couponsRes] = await Promise.all([
        fetch(`${ADMIN_API_URL}/billing/overview`, { headers }),
        fetch(`${ADMIN_API_URL}/billing/revenue-chart?days=30`, { headers }),
        fetch(`${ADMIN_API_URL}/billing/plans`, { headers }),
        fetch(`${ADMIN_API_URL}/billing/subscriptions`, { headers }),
        fetch(`${ADMIN_API_URL}/billing/invoices`, { headers }),
        fetch(`${ADMIN_API_URL}/billing/payments`, { headers }),
        fetch(`${ADMIN_API_URL}/billing/coupons`, { headers }),
      ]);

      const [overviewData, chartData, plansData, subsData, invoicesData, paymentsData, couponsData] = await Promise.all([
        overviewRes.json(),
        chartRes.json(),
        plansRes.json(),
        subsRes.json(),
        invoicesRes.json(),
        paymentsRes.json(),
        couponsRes.json(),
      ]);

      setOverview(overviewData);
      setRevenueChart(chartData || []);
      setPlans(plansData || []);
      setSubscriptions(subsData || []);
      setInvoices(invoicesData || []);
      setPayments(paymentsData || []);
      setCoupons(couponsData || []);
    } catch (error) {
      console.error('Error fetching billing data:', error);
      toast.error('Failed to load billing data');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSavePlan(data) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${ADMIN_API_URL}/billing/plans`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to save plan');
    }

    toast.success(data.id ? 'Plan updated' : 'Plan created');
    fetchData();
  }

  async function handleSaveCoupon(data) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${ADMIN_API_URL}/billing/coupons`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to save coupon');
    }

    toast.success(data.id ? 'Coupon updated' : 'Coupon created');
    fetchData();
  }

  async function handleDeleteCoupon(coupon) {
    if (!confirm(`Are you sure you want to deactivate ${coupon.code}?`)) return;

    try {
      const headers = await getAuthHeaders();
      await fetch(`${ADMIN_API_URL}/billing/coupons/${coupon.id}`, {
        method: 'DELETE',
        headers,
      });

      toast.success('Coupon deactivated');
      fetchData();
    } catch (error) {
      toast.error('Failed to deactivate coupon');
    }
  }

  const filteredSubscriptions = subscriptions.filter(s => {
    if (statusFilter && s.status !== statusFilter) return false;
    if (searchQuery && !s.company_name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const filteredInvoices = invoices.filter(i => {
    if (statusFilter && i.status !== statusFilter) return false;
    if (searchQuery && !i.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) && !i.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const filteredPayments = payments.filter(p => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (searchQuery && !p.company_name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Billing & Revenue</h1>
          <p className="text-zinc-400 mt-1">Manage subscriptions, invoices, and revenue</p>
        </div>
        <button
          onClick={() => fetchData()}
          className="flex items-center gap-2 px-4 py-2 text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="MRR"
          value={formatCurrency(overview?.mrr)}
          icon={DollarSign}
          color="green"
          subtitle="Monthly Recurring Revenue"
        />
        <StatCard
          title="ARR"
          value={formatCurrency(overview?.arr)}
          icon={TrendingUp}
          color="blue"
          subtitle="Annual Recurring Revenue"
        />
        <StatCard
          title="Active Subscriptions"
          value={overview?.active_subscriptions || 0}
          icon={Users}
          color="purple"
          subtitle={`${overview?.trialing || 0} trialing`}
        />
        <StatCard
          title="Pending Invoices"
          value={overview?.pending_invoices || 0}
          icon={FileText}
          color="yellow"
          subtitle={formatCurrency(overview?.pending_amount)}
        />
      </div>

      {/* Revenue Chart */}
      <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Revenue (Last 30 Days)</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `$${value}`} />
              <Tooltip
                formatter={(value) => formatCurrency(value)}
                labelFormatter={(label) => new Date(label).toLocaleDateString()}
              />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} dot={false} name="Revenue" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-zinc-900/50 rounded-xl border border-zinc-800">
        <div className="border-b border-zinc-800">
          <nav className="flex gap-4 px-6" aria-label="Tabs">
            {[
              { id: 'plans', label: 'Plans', icon: Star },
              { id: 'subscriptions', label: 'Subscriptions', icon: Users },
              { id: 'invoices', label: 'Invoices', icon: FileText },
              { id: 'payments', label: 'Payments', icon: CreditCard },
              { id: 'coupons', label: 'Coupons', icon: Tag },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setStatusFilter('');
                  setSearchQuery('');
                }}
                className={`flex items-center gap-2 py-4 px-2 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Filters */}
          {activeTab !== 'plans' && (
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {(activeTab === 'subscriptions' || activeTab === 'invoices' || activeTab === 'payments') && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Status</option>
                  {activeTab === 'subscriptions' && (
                    <>
                      <option value="active">Active</option>
                      <option value="trialing">Trialing</option>
                      <option value="canceled">Canceled</option>
                      <option value="past_due">Past Due</option>
                    </>
                  )}
                  {activeTab === 'invoices' && (
                    <>
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                      <option value="overdue">Overdue</option>
                      <option value="draft">Draft</option>
                    </>
                  )}
                  {activeTab === 'payments' && (
                    <>
                      <option value="succeeded">Succeeded</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                      <option value="refunded">Refunded</option>
                    </>
                  )}
                </select>
              )}
            </div>
          )}

          {/* Plans Tab */}
          {activeTab === 'plans' && (
            <>
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => {
                    setEditingPlan(null);
                    setShowPlanModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Plan
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`border rounded-xl p-5 bg-zinc-800/50 ${plan.is_featured ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-zinc-700'}`}
                  >
                    {plan.is_featured && (
                      <div className="flex justify-center mb-2">
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full">
                          Most Popular
                        </span>
                      </div>
                    )}
                    <h3 className="text-lg font-semibold text-center text-white">{plan.name}</h3>
                    <div className="text-center mt-2">
                      <span className="text-3xl font-bold text-white">${plan.price_monthly}</span>
                      <span className="text-zinc-400">/mo</span>
                    </div>
                    <p className="text-sm text-zinc-400 text-center mt-1">
                      or ${plan.price_yearly}/year
                    </p>
                    <p className="text-sm text-zinc-400 text-center mt-3">{plan.description}</p>
                    <ul className="mt-4 space-y-2">
                      {plan.features?.slice(0, 4).map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                      {plan.features?.length > 4 && (
                        <li className="text-sm text-zinc-500">+{plan.features.length - 4} more</li>
                      )}
                    </ul>
                    <div className="mt-4 pt-4 border-t border-zinc-700 flex items-center justify-between">
                      <span className="text-sm text-zinc-400">
                        {plan.active_subscribers || 0} subscribers
                      </span>
                      <button
                        onClick={() => {
                          setEditingPlan(plan);
                          setShowPlanModal(true);
                        }}
                        className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/20 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Subscriptions Tab */}
          {activeTab === 'subscriptions' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400 uppercase">Company</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400 uppercase">Plan</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400 uppercase">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400 uppercase">Billing</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400 uppercase">Period End</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400 uppercase">Started</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filteredSubscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-zinc-800/50">
                      <td className="py-3 px-4 font-medium text-white">{sub.company_name}</td>
                      <td className="py-3 px-4 text-sm text-zinc-400">{sub.plan_name}</td>
                      <td className="py-3 px-4"><StatusBadge status={sub.status} /></td>
                      <td className="py-3 px-4 text-sm text-zinc-400 capitalize">{sub.billing_cycle}</td>
                      <td className="py-3 px-4 text-sm text-zinc-500">
                        {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-zinc-500">
                        {new Date(sub.started_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {filteredSubscriptions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-500">No subscriptions found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Invoices Tab */}
          {activeTab === 'invoices' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400 uppercase">Invoice #</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400 uppercase">Company</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400 uppercase">Amount</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400 uppercase">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400 uppercase">Due Date</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400 uppercase">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-zinc-800/50">
                      <td className="py-3 px-4 font-medium text-white">{invoice.invoice_number}</td>
                      <td className="py-3 px-4 text-sm text-zinc-400">{invoice.company_name}</td>
                      <td className="py-3 px-4 text-sm font-medium text-white">{formatCurrency(invoice.total, invoice.currency)}</td>
                      <td className="py-3 px-4"><StatusBadge status={invoice.status} /></td>
                      <td className="py-3 px-4 text-sm text-zinc-500">
                        {invoice.due_at ? new Date(invoice.due_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-zinc-500">
                        {new Date(invoice.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-500">No invoices found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400 uppercase">Company</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400 uppercase">Invoice</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400 uppercase">Amount</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400 uppercase">Method</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400 uppercase">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-zinc-800/50">
                      <td className="py-3 px-4 font-medium text-white">{payment.company_name}</td>
                      <td className="py-3 px-4 text-sm text-zinc-400">{payment.invoice_number || '-'}</td>
                      <td className="py-3 px-4 text-sm font-medium text-white">{formatCurrency(payment.amount, payment.currency)}</td>
                      <td className="py-3 px-4 text-sm text-zinc-400">
                        {payment.card_brand && payment.card_last4 ? (
                          <span className="capitalize">{payment.card_brand} ****{payment.card_last4}</span>
                        ) : (
                          payment.payment_method || '-'
                        )}
                      </td>
                      <td className="py-3 px-4"><StatusBadge status={payment.status} /></td>
                      <td className="py-3 px-4 text-sm text-zinc-500">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {filteredPayments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-500">No payments found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Coupons Tab */}
          {activeTab === 'coupons' && (
            <>
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => {
                    setEditingCoupon(null);
                    setShowCouponModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Coupon
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400 uppercase">Code</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400 uppercase">Name</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400 uppercase">Discount</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400 uppercase">Usage</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400 uppercase">Valid Until</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-zinc-400 uppercase">Status</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-zinc-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {coupons.map((coupon) => (
                      <tr key={coupon.id} className="hover:bg-zinc-800/50">
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-zinc-800 rounded font-mono text-sm text-white">{coupon.code}</span>
                        </td>
                        <td className="py-3 px-4 text-sm text-white">{coupon.name}</td>
                        <td className="py-3 px-4 text-sm font-medium text-green-400">
                          {coupon.discount_type === 'percentage' ? (
                            <span className="flex items-center gap-1">
                              <Percent className="w-3 h-3" />
                              {coupon.discount_value}%
                            </span>
                          ) : (
                            formatCurrency(coupon.discount_value)
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-400">
                          {coupon.current_uses || 0}{coupon.max_uses ? ` / ${coupon.max_uses}` : ''}
                        </td>
                        <td className="py-3 px-4 text-sm text-zinc-500">
                          {coupon.valid_until ? new Date(coupon.valid_until).toLocaleDateString() : 'No expiry'}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={coupon.is_active ? 'active' : 'expired'} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setEditingCoupon(coupon);
                                setShowCouponModal(true);
                              }}
                              className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/20 rounded"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCoupon(coupon)}
                              className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/20 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {coupons.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-zinc-500">No coupons found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {showPlanModal && (
        <PlanModal
          plan={editingPlan}
          onClose={() => {
            setShowPlanModal(false);
            setEditingPlan(null);
          }}
          onSave={handleSavePlan}
        />
      )}

      {showCouponModal && (
        <CouponModal
          coupon={editingCoupon}
          onClose={() => {
            setShowCouponModal(false);
            setEditingCoupon(null);
          }}
          onSave={handleSaveCoupon}
        />
      )}
    </div>
  );
}
