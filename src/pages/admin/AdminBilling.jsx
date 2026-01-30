import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';
import { getIconColor, getStatusColor, BUTTON_STYLES } from '@/lib/adminTheme';
import {
  Euro,
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
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(status)}`}>
      <Icon className="w-2.5 h-2.5" />
      {status?.replace('_', ' ')}
    </span>
  );
}

function StatCard({ title, value, icon: Icon, color = 'blue', subtitle, trend }) {
  return (
    <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-3">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg border ${getIconColor(color)}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] text-zinc-400">{title}</p>
          <p className="text-lg font-bold text-white">{value}</p>
          {subtitle && <p className="text-[10px] text-zinc-500">{subtitle}</p>}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
            <TrendingUp className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
    </div>
  );
}

function formatCurrency(amount, currency = 'EUR') {
  return new Intl.NumberFormat('nl-NL', {
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
      <div className="bg-zinc-900 rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-zinc-800">
        <div className="py-3 px-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-white">
            {plan ? 'Edit Plan' : 'Add Subscription Plan'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-2.5 py-1.5 h-7 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Slug *</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                className="w-full px-2.5 py-1.5 h-7 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={!!plan}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Monthly (€)</label>
              <input
                type="number"
                step="0.01"
                value={formData.price_monthly}
                onChange={(e) => setFormData({ ...formData, price_monthly: e.target.value })}
                className="w-full px-2.5 py-1.5 h-7 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Yearly (€)</label>
              <input
                type="number"
                step="0.01"
                value={formData.price_yearly}
                onChange={(e) => setFormData({ ...formData, price_yearly: e.target.value })}
                className="w-full px-2.5 py-1.5 h-7 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Sort Order</label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                className="w-full px-2.5 py-1.5 h-7 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Features (JSON)</label>
            <textarea
              value={formData.features}
              onChange={(e) => setFormData({ ...formData, features: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
              rows={3}
              placeholder='["Feature 1", "Feature 2"]'
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Limits (JSON)</label>
            <textarea
              value={formData.limits}
              onChange={(e) => setFormData({ ...formData, limits: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
              rows={2}
              placeholder='{"users": 10, "storage_gb": 50}'
            />
          </div>

          <div className="flex gap-3">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-zinc-700 bg-zinc-800 w-3.5 h-3.5"
              />
              <span className="text-xs text-zinc-300">Active</span>
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={formData.is_featured}
                onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                className="rounded border-zinc-700 bg-zinc-800 w-3.5 h-3.5"
              />
              <span className="text-xs text-zinc-300">Featured</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 h-7 text-xs text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`px-3 py-1.5 h-7 text-xs rounded-lg transition-colors disabled:opacity-50 ${BUTTON_STYLES.primary}`}
            >
              {saving ? 'Saving...' : plan ? 'Update' : 'Create'}
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
      <div className="bg-zinc-900 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-zinc-800">
        <div className="py-3 px-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-white">
            {coupon ? 'Edit Coupon' : 'Add Coupon'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Code *</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full px-2.5 py-1.5 h-7 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={!!coupon}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-2.5 py-1.5 h-7 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-2.5 py-1.5 h-7 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Type *</label>
              <select
                value={formData.discount_type}
                onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                className="w-full px-2.5 py-1.5 h-7 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed_amount">Fixed (€)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Value ({formData.discount_type === 'percentage' ? '%' : '€'}) *
              </label>
              <input
                type="number"
                step={formData.discount_type === 'percentage' ? '1' : '0.01'}
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                className="w-full px-2.5 py-1.5 h-7 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Valid Until</label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                className="w-full px-2.5 py-1.5 h-7 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Max Uses</label>
              <input
                type="number"
                value={formData.max_uses}
                onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                className="w-full px-2.5 py-1.5 h-7 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Unlimited"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-zinc-700 bg-zinc-800 w-3.5 h-3.5"
              />
              <span className="text-xs text-zinc-300">Active</span>
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={formData.first_subscription_only}
                onChange={(e) => setFormData({ ...formData, first_subscription_only: e.target.checked })}
                className="rounded border-zinc-700 bg-zinc-800 w-3.5 h-3.5"
              />
              <span className="text-xs text-zinc-300">First subscription only</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 h-7 text-xs text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`px-3 py-1.5 h-7 text-xs rounded-lg transition-colors disabled:opacity-50 ${BUTTON_STYLES.primary}`}
            >
              {saving ? 'Saving...' : coupon ? 'Update' : 'Create'}
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
        <RefreshCw className="w-5 h-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Billing & Revenue</h1>
          <p className="text-zinc-400 text-xs mt-0.5">Manage subscriptions, invoices, and revenue</p>
        </div>
        <button
          onClick={() => fetchData()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors text-xs"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="MRR"
          value={formatCurrency(overview?.mrr)}
          icon={Euro}
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
      <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4">
        <h2 className="text-sm font-semibold text-white mb-3">Revenue (Last 30 Days)</h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `€${value}`} />
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
          <nav className="flex gap-2 px-4" aria-label="Tabs">
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
                className={`flex items-center gap-1.5 py-2.5 px-2 border-b-2 transition-colors text-xs ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-300'
                }`}
              >
                <tab.icon className="w-3 h-3" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4">
          {/* Filters */}
          {activeTab !== 'plans' && (
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-xs placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {(activeTab === 'subscriptions' || activeTab === 'invoices' || activeTab === 'payments') && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <div className="flex justify-end mb-3">
                <button
                  onClick={() => {
                    setEditingPlan(null);
                    setShowPlanModal(true);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-xs ${BUTTON_STYLES.primary}`}
                >
                  <Plus className="w-3 h-3" />
                  Add Plan
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`border rounded-lg p-3 bg-zinc-800/50 ${plan.is_featured ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-zinc-700'}`}
                  >
                    {plan.is_featured && (
                      <div className="flex justify-center mb-1.5">
                        <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-medium rounded-full">
                          Most Popular
                        </span>
                      </div>
                    )}
                    <h3 className="text-sm font-semibold text-center text-white">{plan.name}</h3>
                    <div className="text-center mt-1">
                      <span className="text-xl font-bold text-white">€{plan.price_monthly}</span>
                      <span className="text-zinc-400 text-xs">/mo</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 text-center">
                      or €{plan.price_yearly}/year
                    </p>
                    <p className="text-[10px] text-zinc-400 text-center mt-2">{plan.description}</p>
                    <ul className="mt-2 space-y-1">
                      {plan.features?.slice(0, 4).map((feature, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-[10px] text-zinc-300">
                          <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                      {plan.features?.length > 4 && (
                        <li className="text-[10px] text-zinc-500">+{plan.features.length - 4} more</li>
                      )}
                    </ul>
                    <div className="mt-3 pt-2 border-t border-zinc-700 flex items-center justify-between">
                      <span className="text-[10px] text-zinc-400">
                        {plan.active_subscribers || 0} subscribers
                      </span>
                      <button
                        onClick={() => {
                          setEditingPlan(plan);
                          setShowPlanModal(true);
                        }}
                        className="p-1 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/20 rounded"
                      >
                        <Edit2 className="w-3 h-3" />
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
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-1.5 px-2 text-[10px] font-medium text-zinc-400 uppercase">Company</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-medium text-zinc-400 uppercase">Plan</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-medium text-zinc-400 uppercase">Status</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-medium text-zinc-400 uppercase">Billing</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-medium text-zinc-400 uppercase">Period End</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-medium text-zinc-400 uppercase">Started</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filteredSubscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-zinc-800/50 h-9">
                      <td className="py-1.5 px-2 font-medium text-white">{sub.company_name}</td>
                      <td className="py-1.5 px-2 text-zinc-400">{sub.plan_name}</td>
                      <td className="py-1.5 px-2"><StatusBadge status={sub.status} /></td>
                      <td className="py-1.5 px-2 text-zinc-400 capitalize">{sub.billing_cycle}</td>
                      <td className="py-1.5 px-2 text-zinc-500">
                        {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-1.5 px-2 text-zinc-500">
                        {new Date(sub.started_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {filteredSubscriptions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-500">No subscriptions found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Invoices Tab */}
          {activeTab === 'invoices' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-1.5 px-2 text-[10px] font-medium text-zinc-400 uppercase">Invoice #</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-medium text-zinc-400 uppercase">Company</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-medium text-zinc-400 uppercase">Amount</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-medium text-zinc-400 uppercase">Status</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-medium text-zinc-400 uppercase">Due Date</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-medium text-zinc-400 uppercase">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-zinc-800/50 h-9">
                      <td className="py-1.5 px-2 font-medium text-white">{invoice.invoice_number}</td>
                      <td className="py-1.5 px-2 text-zinc-400">{invoice.company_name}</td>
                      <td className="py-1.5 px-2 font-medium text-white">{formatCurrency(invoice.total, invoice.currency)}</td>
                      <td className="py-1.5 px-2"><StatusBadge status={invoice.status} /></td>
                      <td className="py-1.5 px-2 text-zinc-500">
                        {invoice.due_at ? new Date(invoice.due_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-1.5 px-2 text-zinc-500">
                        {new Date(invoice.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-500">No invoices found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-1.5 px-2 text-[10px] font-medium text-zinc-400 uppercase">Company</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-medium text-zinc-400 uppercase">Invoice</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-medium text-zinc-400 uppercase">Amount</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-medium text-zinc-400 uppercase">Method</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-medium text-zinc-400 uppercase">Status</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-medium text-zinc-400 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-zinc-800/50 h-9">
                      <td className="py-1.5 px-2 font-medium text-white">{payment.company_name}</td>
                      <td className="py-1.5 px-2 text-zinc-400">{payment.invoice_number || '-'}</td>
                      <td className="py-1.5 px-2 font-medium text-white">{formatCurrency(payment.amount, payment.currency)}</td>
                      <td className="py-1.5 px-2 text-zinc-400">
                        {payment.card_brand && payment.card_last4 ? (
                          <span className="capitalize">{payment.card_brand} ****{payment.card_last4}</span>
                        ) : (
                          payment.payment_method || '-'
                        )}
                      </td>
                      <td className="py-1.5 px-2"><StatusBadge status={payment.status} /></td>
                      <td className="py-1.5 px-2 text-zinc-500">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {filteredPayments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-500">No payments found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Coupons Tab */}
          {activeTab === 'coupons' && (
            <>
              <div className="flex justify-end mb-3">
                <button
                  onClick={() => {
                    setEditingCoupon(null);
                    setShowCouponModal(true);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-xs ${BUTTON_STYLES.primary}`}
                >
                  <Plus className="w-3 h-3" />
                  Add Coupon
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left py-1.5 px-2 text-[10px] font-medium text-zinc-400 uppercase">Code</th>
                      <th className="text-left py-1.5 px-2 text-[10px] font-medium text-zinc-400 uppercase">Name</th>
                      <th className="text-left py-1.5 px-2 text-[10px] font-medium text-zinc-400 uppercase">Discount</th>
                      <th className="text-left py-1.5 px-2 text-[10px] font-medium text-zinc-400 uppercase">Usage</th>
                      <th className="text-left py-1.5 px-2 text-[10px] font-medium text-zinc-400 uppercase">Valid Until</th>
                      <th className="text-left py-1.5 px-2 text-[10px] font-medium text-zinc-400 uppercase">Status</th>
                      <th className="text-right py-1.5 px-2 text-[10px] font-medium text-zinc-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {coupons.map((coupon) => (
                      <tr key={coupon.id} className="hover:bg-zinc-800/50 h-9">
                        <td className="py-1.5 px-2">
                          <span className="px-1.5 py-0.5 bg-zinc-800 rounded font-mono text-white">{coupon.code}</span>
                        </td>
                        <td className="py-1.5 px-2 text-white">{coupon.name}</td>
                        <td className="py-1.5 px-2 font-medium text-green-400">
                          {coupon.discount_type === 'percentage' ? (
                            <span className="flex items-center gap-1">
                              <Percent className="w-2.5 h-2.5" />
                              {coupon.discount_value}%
                            </span>
                          ) : (
                            formatCurrency(coupon.discount_value)
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-zinc-400">
                          {coupon.current_uses || 0}{coupon.max_uses ? ` / ${coupon.max_uses}` : ''}
                        </td>
                        <td className="py-1.5 px-2 text-zinc-500">
                          {coupon.valid_until ? new Date(coupon.valid_until).toLocaleDateString() : 'No expiry'}
                        </td>
                        <td className="py-1.5 px-2">
                          <StatusBadge status={coupon.is_active ? 'active' : 'expired'} />
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setEditingCoupon(coupon);
                                setShowCouponModal(true);
                              }}
                              className="p-1 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/20 rounded"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteCoupon(coupon)}
                              className="p-1 text-zinc-400 hover:text-red-400 hover:bg-red-500/20 rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {coupons.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-zinc-500">No coupons found</td>
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
