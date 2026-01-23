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
    active: 'bg-green-100 text-green-800',
    trialing: 'bg-blue-100 text-blue-800',
    canceled: 'bg-gray-100 text-gray-800',
    past_due: 'bg-red-100 text-red-800',
    paused: 'bg-yellow-100 text-yellow-800',
    expired: 'bg-gray-100 text-gray-800',
    paid: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    overdue: 'bg-red-100 text-red-800',
    draft: 'bg-gray-100 text-gray-800',
    refunded: 'bg-purple-100 text-purple-800',
    succeeded: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    processing: 'bg-blue-100 text-blue-800',
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
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      <Icon className="w-3 h-3" />
      {status?.replace('_', ' ')}
    </span>
  );
}

function StatCard({ title, value, icon: Icon, color = 'blue', subtitle, trend }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
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
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">
            {plan ? 'Edit Plan' : 'Add Subscription Plan'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={!!plan}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.price_monthly}
                onChange={(e) => setFormData({ ...formData, price_monthly: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Yearly Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.price_yearly}
                onChange={(e) => setFormData({ ...formData, price_yearly: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Features (JSON array)</label>
            <textarea
              value={formData.features}
              onChange={(e) => setFormData({ ...formData, features: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              rows={4}
              placeholder='["Feature 1", "Feature 2"]'
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Limits (JSON object)</label>
            <textarea
              value={formData.limits}
              onChange={(e) => setFormData({ ...formData, limits: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
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
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_featured}
                onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Featured</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
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
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">
            {coupon ? 'Edit Coupon' : 'Add Coupon'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={!!coupon}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type *</label>
              <select
                value={formData.discount_type}
                onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed_amount">Fixed Amount ($)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount Value ({formData.discount_type === 'percentage' ? '%' : '$'}) *
              </label>
              <input
                type="number"
                step={formData.discount_type === 'percentage' ? '1' : '0.01'}
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses</label>
              <input
                type="number"
                value={formData.max_uses}
                onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.first_subscription_only}
                onChange={(e) => setFormData({ ...formData, first_subscription_only: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">First subscription only</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
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
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Revenue</h1>
          <p className="text-gray-500 mt-1">Manage subscriptions, invoices, and revenue</p>
        </div>
        <button
          onClick={() => fetchData()}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
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
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue (Last 30 Days)</h2>
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
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200">
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
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {(activeTab === 'subscriptions' || activeTab === 'invoices' || activeTab === 'payments') && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className={`border rounded-xl p-5 ${plan.is_featured ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'}`}
                  >
                    {plan.is_featured && (
                      <div className="flex justify-center mb-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          Most Popular
                        </span>
                      </div>
                    )}
                    <h3 className="text-lg font-semibold text-center">{plan.name}</h3>
                    <div className="text-center mt-2">
                      <span className="text-3xl font-bold">${plan.price_monthly}</span>
                      <span className="text-gray-500">/mo</span>
                    </div>
                    <p className="text-sm text-gray-500 text-center mt-1">
                      or ${plan.price_yearly}/year
                    </p>
                    <p className="text-sm text-gray-600 text-center mt-3">{plan.description}</p>
                    <ul className="mt-4 space-y-2">
                      {plan.features?.slice(0, 4).map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                      {plan.features?.length > 4 && (
                        <li className="text-sm text-gray-400">+{plan.features.length - 4} more</li>
                      )}
                    </ul>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        {plan.active_subscribers || 0} subscribers
                      </span>
                      <button
                        onClick={() => {
                          setEditingPlan(plan);
                          setShowPlanModal(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
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
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Company</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Plan</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Billing</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Period End</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Started</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSubscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{sub.company_name}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{sub.plan_name}</td>
                      <td className="py-3 px-4"><StatusBadge status={sub.status} /></td>
                      <td className="py-3 px-4 text-sm text-gray-600 capitalize">{sub.billing_cycle}</td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {new Date(sub.started_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {filteredSubscriptions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-500">No subscriptions found</td>
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
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Company</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Due Date</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{invoice.invoice_number}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{invoice.company_name}</td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">{formatCurrency(invoice.total, invoice.currency)}</td>
                      <td className="py-3 px-4"><StatusBadge status={invoice.status} /></td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {invoice.due_at ? new Date(invoice.due_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {new Date(invoice.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-500">No invoices found</td>
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
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Company</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Invoice</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Method</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{payment.company_name}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{payment.invoice_number || '-'}</td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">{formatCurrency(payment.amount, payment.currency)}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {payment.card_brand && payment.card_last4 ? (
                          <span className="capitalize">{payment.card_brand} ****{payment.card_last4}</span>
                        ) : (
                          payment.payment_method || '-'
                        )}
                      </td>
                      <td className="py-3 px-4"><StatusBadge status={payment.status} /></td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {filteredPayments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-500">No payments found</td>
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
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Code</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Discount</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Usage</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Valid Until</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {coupons.map((coupon) => (
                      <tr key={coupon.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-gray-100 rounded font-mono text-sm">{coupon.code}</span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">{coupon.name}</td>
                        <td className="py-3 px-4 text-sm font-medium text-green-600">
                          {coupon.discount_type === 'percentage' ? (
                            <span className="flex items-center gap-1">
                              <Percent className="w-3 h-3" />
                              {coupon.discount_value}%
                            </span>
                          ) : (
                            formatCurrency(coupon.discount_value)
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {coupon.current_uses || 0}{coupon.max_uses ? ` / ${coupon.max_uses}` : ''}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
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
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCoupon(coupon)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {coupons.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-gray-500">No coupons found</td>
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
