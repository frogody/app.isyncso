import {
  Monitor,
  Box,
  DollarSign,
  Star,
  Users,
  Repeat,
  Zap,
  Truck,
  Package,
  Warehouse,
  AlertTriangle,
  ArrowUpRight,
  MapPin,
  CheckCircle2,
  XCircle,
  Search,
  ChevronRight,
  ArrowDownToLine,
} from 'lucide-react';

// ─── 1. DemoProductsDigital ─────────────────────────────────────────────────────

const digitalStats = [
  { label: 'Active Products', value: '18', icon: Monitor, change: '+2 this month', up: true },
  { label: 'Total Revenue', value: '$124K', icon: DollarSign, change: '+18.3%', up: true },
  { label: 'Avg Rating', value: '4.6', icon: Star, change: '+0.2', up: true },
  { label: 'Active Subscriptions', value: '342', icon: Users, change: '+28', up: true },
];

const pricingBadgeStyles = {
  Subscription: 'bg-cyan-500/15 text-cyan-400',
  'Per-seat': 'bg-blue-500/15 text-blue-400',
  'Usage-based': 'bg-violet-500/15 text-violet-400',
  'One-time': 'bg-zinc-700/50 text-zinc-300',
};

const digitalProducts = [
  { name: 'Platform Pro License', type: 'SaaS', pricing: 'Subscription', mrr: '$4,200', users: 86, status: 'Active', gradient: 'from-cyan-600 to-blue-800' },
  { name: 'API Access Tier', type: 'SaaS', pricing: 'Usage-based', mrr: '$2,800', users: 142, status: 'Active', gradient: 'from-violet-600 to-purple-900' },
  { name: 'Data Export Add-on', type: 'License', pricing: 'Per-seat', mrr: '$890', users: 34, status: 'Active', gradient: 'from-emerald-600 to-teal-800' },
  { name: 'Premium Support', type: 'SaaS', pricing: 'Subscription', mrr: '$1,600', users: 28, status: 'Active', gradient: 'from-amber-600 to-orange-800' },
  { name: 'White-label Module', type: 'License', pricing: 'One-time', mrr: '$12,000', users: 5, status: 'Active', gradient: 'from-rose-600 to-pink-900' },
  { name: 'Training Portal', type: 'Download', pricing: 'Per-seat', mrr: '$1,450', users: 47, status: 'Active', gradient: 'from-indigo-600 to-blue-900' },
];

export function DemoProductsDigital({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div data-demo="digital-products" className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/20 rounded-xl">
            <Monitor className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Digital Products</h1>
            <p className="text-zinc-400 mt-0.5">Manage {companyName} digital products and subscriptions.</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {digitalStats.map((stat) => (
          <div key={stat.label} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-400 text-sm">{stat.label}</span>
              <div className="p-2 bg-cyan-500/15 rounded-lg">
                <stat.icon className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-white">{stat.value}</span>
              <span className="flex items-center gap-1 text-xs text-cyan-400">
                <ArrowUpRight className="w-3 h-3" />
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-3 gap-4">
        {digitalProducts.map((product) => (
          <div key={product.name} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden cursor-default">
            <div className={`h-28 bg-gradient-to-br ${product.gradient} flex items-center justify-center relative`}>
              <Monitor className="w-8 h-8 text-white/20" />
              <div className="absolute top-3 right-3">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 font-medium">
                  {product.status}
                </span>
              </div>
              <div className="absolute top-3 left-3">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/40 text-white/80 backdrop-blur-sm">
                  {product.type}
                </span>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white">{product.name}</h3>
              <div className="flex items-center justify-between">
                <span className="text-cyan-400 font-semibold text-sm">{product.mrr}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${pricingBadgeStyles[product.pricing]}`}>
                  {product.pricing === 'Subscription' && <Repeat className="w-2.5 h-2.5 inline mr-1" />}
                  {product.pricing === 'Per-seat' && <Users className="w-2.5 h-2.5 inline mr-1" />}
                  {product.pricing === 'Usage-based' && <Zap className="w-2.5 h-2.5 inline mr-1" />}
                  {product.pricing}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50">
                <span className="text-xs text-zinc-500">{product.users} active users</span>
                <ChevronRight className="w-4 h-4 text-zinc-700" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 2. DemoProductsPhysical ────────────────────────────────────────────────────

const physicalStats = [
  { label: 'SKUs', value: '47', icon: Box },
  { label: 'In Stock', value: '42', icon: CheckCircle2, color: 'cyan' },
  { label: 'Low Stock', value: '3', icon: AlertTriangle, color: 'amber' },
  { label: 'Out of Stock', value: '2', icon: XCircle, color: 'red' },
];

const physicalStatColor = {
  cyan: 'bg-cyan-500/15 text-cyan-400',
  amber: 'bg-amber-500/15 text-amber-400',
  red: 'bg-red-500/15 text-red-400',
};

const stockStyles = {
  high: { dot: 'bg-cyan-400', text: 'text-cyan-400' },
  low: { dot: 'bg-amber-400', text: 'text-amber-400' },
  out: { dot: 'bg-red-400', text: 'text-red-400' },
};

const categoryTabs = ['All', 'Electronics', 'Merchandise', 'Equipment', 'Supplies'];

const physicalProducts = [
  { name: 'USB-C Hub Pro', sku: 'ELC-001', category: 'Electronics', price: '$79.99', stock: 142, level: 'high', warehouse: 'Amsterdam-A1' },
  { name: 'Branded Hoodie', sku: 'MRC-012', category: 'Merchandise', price: '$45.00', stock: 8, level: 'low', warehouse: 'Rotterdam-B3' },
  { name: 'Standing Desk Frame', sku: 'EQP-007', category: 'Equipment', price: '$349.00', stock: 34, level: 'high', warehouse: 'Amsterdam-A2' },
  { name: 'Wireless Mouse', sku: 'ELC-003', category: 'Electronics', price: '$29.99', stock: 0, level: 'out', warehouse: 'Amsterdam-A1' },
  { name: 'Company Notebook', sku: 'SUP-020', category: 'Supplies', price: '$12.50', stock: 256, level: 'high', warehouse: 'Rotterdam-B3' },
  { name: 'Ergonomic Chair', sku: 'EQP-002', category: 'Equipment', price: '$599.00', stock: 5, level: 'low', warehouse: 'Amsterdam-A2' },
];

export function DemoProductsPhysical({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div data-demo="physical-products" className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/20 rounded-xl">
            <Box className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Physical Products</h1>
            <p className="text-zinc-400 mt-0.5">{companyName} physical inventory and SKU management.</p>
          </div>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            readOnly
            placeholder="Search SKUs..."
            className="bg-zinc-900/80 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-400 placeholder-zinc-600 w-56 cursor-default focus:outline-none"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {physicalStats.map((stat) => (
          <div key={stat.label} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-400 text-sm">{stat.label}</span>
              <div className={`p-2 rounded-lg ${stat.color ? physicalStatColor[stat.color] : 'bg-cyan-500/15 text-cyan-400'}`}>
                <stat.icon className="w-4 h-4" />
              </div>
            </div>
            <span className="text-2xl font-bold text-white">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2">
        {categoryTabs.map((tab, i) => (
          <div
            key={tab}
            className={`px-4 py-2 rounded-xl text-sm cursor-default transition-colors ${
              i === 0
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                : 'bg-zinc-900/50 text-zinc-400 border border-zinc-800'
            }`}
          >
            {tab}
          </div>
        ))}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-3 gap-4">
        {physicalProducts.map((product) => (
          <div key={product.sku} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 cursor-default space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">{product.name}</h3>
                <span className="text-[11px] text-zinc-500 font-mono">{product.sku}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{product.category}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-cyan-400 font-semibold">{product.price}</span>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${stockStyles[product.level].dot}`} />
                <span className={`text-xs ${stockStyles[product.level].text}`}>
                  {product.level === 'out' ? 'Out of stock' : `${product.stock} units`}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 pt-2 border-t border-zinc-800/50">
              <MapPin className="w-3 h-3" />
              {product.warehouse}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 3. DemoProductsShipping ────────────────────────────────────────────────────

const shippingStats = [
  { label: 'Orders to Ship', value: '8', icon: Package },
  { label: 'Shipped Today', value: '12', icon: Truck },
  { label: 'In Transit', value: '23', icon: Truck },
  { label: 'Delivered This Week', value: '45', icon: CheckCircle2 },
];

const shipmentStatusStyles = {
  Preparing: 'bg-zinc-700/50 text-zinc-300',
  Shipped: 'bg-cyan-500/15 text-cyan-400',
  'In Transit': 'bg-blue-500/15 text-blue-400',
  Delivered: 'bg-emerald-500/15 text-emerald-400',
  Delayed: 'bg-red-500/15 text-red-400',
};

const shipments = [
  { order: 'ORD-4821', customer: 'TechFlow BV', items: 3, carrier: 'DHL', tracking: 'DHL-9284712', status: 'In Transit', eta: 'Feb 10' },
  { order: 'ORD-4820', customer: 'DataVault Inc', items: 1, carrier: 'UPS', tracking: 'UPS-3847291', status: 'Delivered', eta: 'Feb 7' },
  { order: 'ORD-4819', customer: 'NordSys AG', items: 5, carrier: 'FedEx', tracking: 'FDX-5738291', status: 'Shipped', eta: 'Feb 9' },
  { order: 'ORD-4818', customer: 'Bloom Digital', items: 2, carrier: 'PostNL', tracking: 'PNL-1928374', status: 'Preparing', eta: 'Feb 11' },
  { order: 'ORD-4817', customer: 'CloudPeak Ltd', items: 4, carrier: 'DHL', tracking: 'DHL-8374629', status: 'Delayed', eta: 'Feb 12' },
  { order: 'ORD-4816', customer: 'Synapse AI', items: 1, carrier: 'DHL', tracking: 'DHL-7463821', status: 'In Transit', eta: 'Feb 8' },
];

const carrierBreakdown = [
  { name: 'DHL', percent: 40, color: 'bg-yellow-500' },
  { name: 'UPS', percent: 30, color: 'bg-amber-500' },
  { name: 'FedEx', percent: 20, color: 'bg-violet-500' },
  { name: 'PostNL', percent: 10, color: 'bg-orange-500' },
];

export function DemoProductsShipping({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div data-demo="shipping-table" className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/20 rounded-xl">
            <Truck className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Shipping</h1>
            <p className="text-zinc-400 mt-0.5">{companyName} order fulfillment and tracking.</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {shippingStats.map((stat) => (
          <div key={stat.label} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-400 text-sm">{stat.label}</span>
              <div className="p-2 bg-cyan-500/15 rounded-lg">
                <stat.icon className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <span className="text-2xl font-bold text-white">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Shipment Table */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800">
          <h2 className="text-white font-semibold">Shipments</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800/50">
              <th className="text-left text-xs text-zinc-500 font-medium px-6 py-3">Order #</th>
              <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Customer</th>
              <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Items</th>
              <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Carrier</th>
              <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Tracking #</th>
              <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Status</th>
              <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">ETA</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map((s) => (
              <tr key={s.order} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 cursor-default">
                <td className="px-6 py-3.5 text-sm text-cyan-400 font-mono">{s.order}</td>
                <td className="px-4 py-3.5 text-sm text-white">{s.customer}</td>
                <td className="px-4 py-3.5 text-sm text-zinc-400">{s.items}</td>
                <td className="px-4 py-3.5 text-sm text-zinc-400">{s.carrier}</td>
                <td className="px-4 py-3.5 text-xs text-zinc-500 font-mono">{s.tracking}</td>
                <td className="px-4 py-3.5">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${shipmentStatusStyles[s.status]}`}>
                    {s.status}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-sm text-zinc-500">{s.eta}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Carrier Breakdown */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-4">Carrier Breakdown</h2>
        <div className="flex items-center gap-1 h-4 rounded-full overflow-hidden mb-3">
          {carrierBreakdown.map((c) => (
            <div key={c.name} className={`h-full ${c.color}`} style={{ width: `${c.percent}%` }} />
          ))}
        </div>
        <div className="flex items-center gap-6">
          {carrierBreakdown.map((c) => (
            <div key={c.name} className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${c.color}`} />
              <span className="text-xs text-zinc-400">{c.name}</span>
              <span className="text-xs text-zinc-600">{c.percent}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 4. DemoProductsReceiving ───────────────────────────────────────────────────

const receivingStats = [
  { label: 'Received This Month', value: '34' },
  { label: 'Pending', value: '5' },
  { label: 'Rejected', value: '2' },
];

const pendingReceipts = [
  { po: 'PO-7821', supplier: 'TechParts BV', expected: 'Feb 10, 2026', items: 12, status: 'On Track' },
  { po: 'PO-7820', supplier: 'Nordic Components', expected: 'Feb 11, 2026', items: 8, status: 'On Track' },
  { po: 'PO-7819', supplier: 'ShenzhenDirect', expected: 'Feb 13, 2026', items: 45, status: 'Delayed' },
  { po: 'PO-7818', supplier: 'EuroSupply GmbH', expected: 'Feb 15, 2026', items: 6, status: 'On Track' },
  { po: 'PO-7817', supplier: 'PackRight Co', expected: 'Feb 18, 2026', items: 20, status: 'Pending' },
];

const pendingStatusStyles = {
  'On Track': 'bg-cyan-500/15 text-cyan-400',
  Delayed: 'bg-red-500/15 text-red-400',
  Pending: 'bg-zinc-700/50 text-zinc-300',
};

const receivingLogStatusStyles = {
  Received: 'bg-cyan-500/15 text-cyan-400',
  Inspecting: 'bg-blue-500/15 text-blue-400',
  Approved: 'bg-emerald-500/15 text-emerald-400',
  Rejected: 'bg-red-500/15 text-red-400',
};

const receivingLog = [
  { date: 'Feb 7, 2026', po: 'PO-7816', supplier: 'TechParts BV', items: 10, quality: 'Pass', status: 'Approved' },
  { date: 'Feb 6, 2026', po: 'PO-7815', supplier: 'Nordic Components', items: 5, quality: 'In Review', status: 'Inspecting' },
  { date: 'Feb 5, 2026', po: 'PO-7814', supplier: 'PackRight Co', items: 18, quality: 'Pass', status: 'Received' },
  { date: 'Feb 4, 2026', po: 'PO-7813', supplier: 'ShenzhenDirect', items: 30, quality: 'Fail', status: 'Rejected' },
  { date: 'Feb 3, 2026', po: 'PO-7812', supplier: 'EuroSupply GmbH', items: 7, quality: 'Pass', status: 'Approved' },
  { date: 'Feb 2, 2026', po: 'PO-7811', supplier: 'TechParts BV', items: 15, quality: 'Pass', status: 'Approved' },
];

export function DemoProductsReceiving({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div data-demo="receiving-log" className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/20 rounded-xl">
            <ArrowDownToLine className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Receiving</h1>
            <p className="text-zinc-400 mt-0.5">Inbound shipment intake for {companyName}.</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        {receivingStats.map((stat) => (
          <div key={stat.label} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
            <span className="text-zinc-400 text-sm">{stat.label}</span>
            <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Pending Receipts */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800">
          <h2 className="text-white font-semibold">Pending Receipts</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800/50">
              <th className="text-left text-xs text-zinc-500 font-medium px-6 py-3">PO #</th>
              <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Supplier</th>
              <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Expected Date</th>
              <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Items</th>
              <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {pendingReceipts.map((r) => (
              <tr key={r.po} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 cursor-default">
                <td className="px-6 py-3.5 text-sm text-cyan-400 font-mono">{r.po}</td>
                <td className="px-4 py-3.5 text-sm text-white">{r.supplier}</td>
                <td className="px-4 py-3.5 text-sm text-zinc-400">{r.expected}</td>
                <td className="px-4 py-3.5 text-sm text-zinc-400">{r.items}</td>
                <td className="px-4 py-3.5">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${pendingStatusStyles[r.status]}`}>
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Receiving Log */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800">
          <h2 className="text-white font-semibold">Receiving Log</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800/50">
              <th className="text-left text-xs text-zinc-500 font-medium px-6 py-3">Date</th>
              <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">PO #</th>
              <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Supplier</th>
              <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Items Received</th>
              <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Quality Check</th>
              <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {receivingLog.map((r) => (
              <tr key={r.po} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 cursor-default">
                <td className="px-6 py-3.5 text-sm text-zinc-400">{r.date}</td>
                <td className="px-4 py-3.5 text-sm text-cyan-400 font-mono">{r.po}</td>
                <td className="px-4 py-3.5 text-sm text-white">{r.supplier}</td>
                <td className="px-4 py-3.5 text-sm text-zinc-400">{r.items}</td>
                <td className="px-4 py-3.5">
                  <span className={`text-xs ${
                    r.quality === 'Pass' ? 'text-emerald-400' : r.quality === 'Fail' ? 'text-red-400' : 'text-zinc-400'
                  }`}>
                    {r.quality}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${receivingLogStatusStyles[r.status]}`}>
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 5. DemoProductsInventory ───────────────────────────────────────────────────

const stockOverview = [
  { label: 'In Stock', count: 38, color: 'bg-cyan-500', percent: 81 },
  { label: 'Low Stock', count: 5, color: 'bg-amber-500', percent: 11 },
  { label: 'Critical', count: 2, color: 'bg-red-500', percent: 4 },
  { label: 'Out of Stock', count: 2, color: 'bg-zinc-600', percent: 4 },
];

const inventoryStatusStyles = {
  'In Stock': 'bg-cyan-500/15 text-cyan-400',
  'Low Stock': 'bg-amber-500/15 text-amber-400',
  Critical: 'bg-red-500/15 text-red-400',
  'Out of Stock': 'bg-zinc-700/50 text-zinc-300',
};

const inventoryItems = [
  { product: 'USB-C Hub Pro', sku: 'ELC-001', location: 'Amsterdam-A1', qty: 142, reorder: 50, status: 'In Stock', lastCounted: 'Feb 5, 2026' },
  { product: 'Wireless Mouse', sku: 'ELC-003', location: 'Amsterdam-A1', qty: 0, reorder: 30, status: 'Out of Stock', lastCounted: 'Feb 6, 2026' },
  { product: 'Branded Hoodie', sku: 'MRC-012', location: 'Rotterdam-B3', qty: 8, reorder: 25, status: 'Critical', lastCounted: 'Feb 4, 2026' },
  { product: 'Standing Desk Frame', sku: 'EQP-007', location: 'Amsterdam-A2', qty: 34, reorder: 15, status: 'In Stock', lastCounted: 'Feb 3, 2026' },
  { product: 'Company Notebook', sku: 'SUP-020', location: 'Rotterdam-B3', qty: 256, reorder: 100, status: 'In Stock', lastCounted: 'Feb 6, 2026' },
  { product: 'Ergonomic Chair', sku: 'EQP-002', location: 'Amsterdam-A2', qty: 5, reorder: 10, status: 'Low Stock', lastCounted: 'Feb 2, 2026' },
  { product: '4K Webcam', sku: 'ELC-008', location: 'Amsterdam-A1', qty: 19, reorder: 25, status: 'Low Stock', lastCounted: 'Feb 1, 2026' },
  { product: 'Cable Management Kit', sku: 'SUP-015', location: 'Rotterdam-B3', qty: 0, reorder: 20, status: 'Out of Stock', lastCounted: 'Jan 30, 2026' },
];

const reorderAlerts = [
  { product: 'Branded Hoodie', qty: 8, reorder: 25 },
  { product: 'Ergonomic Chair', qty: 5, reorder: 10 },
  { product: '4K Webcam', qty: 19, reorder: 25 },
];

export function DemoProductsInventory({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div data-demo="inventory-table" className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/20 rounded-xl">
            <Warehouse className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Inventory</h1>
            <p className="text-zinc-400 mt-0.5">{companyName} stock levels and management.</p>
          </div>
        </div>
      </div>

      {/* Stock Level Overview */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-4">Stock Level Overview</h2>
        <div className="flex items-center gap-1 h-5 rounded-full overflow-hidden mb-3">
          {stockOverview.map((s) => (
            <div key={s.label} className={`h-full ${s.color}`} style={{ width: `${s.percent}%` }} />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-4 mt-4">
          {stockOverview.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${s.color}`} />
              <div>
                <span className="text-sm text-white font-medium">{s.count}</span>
                <span className="text-xs text-zinc-500 ml-1.5">{s.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Value Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <span className="text-zinc-400 text-sm">Total Inventory Value</span>
          <p className="text-2xl font-bold text-white mt-1">$342K</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <span className="text-zinc-400 text-sm">Cost of Goods</span>
          <p className="text-2xl font-bold text-white mt-1">$198K</p>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800">
          <h2 className="text-white font-semibold">Inventory Items</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800/50">
              <th className="text-left text-xs text-zinc-500 font-medium px-6 py-3">Product</th>
              <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">SKU</th>
              <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Location</th>
              <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Quantity</th>
              <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Reorder Point</th>
              <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Status</th>
              <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Last Counted</th>
            </tr>
          </thead>
          <tbody>
            {inventoryItems.map((item) => (
              <tr key={item.sku} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 cursor-default">
                <td className="px-6 py-3.5 text-sm text-white font-medium">{item.product}</td>
                <td className="px-4 py-3.5 text-xs text-zinc-500 font-mono">{item.sku}</td>
                <td className="px-4 py-3.5 text-sm text-zinc-400">{item.location}</td>
                <td className="px-4 py-3.5 text-sm text-white">{item.qty}</td>
                <td className="px-4 py-3.5 text-sm text-zinc-500">{item.reorder}</td>
                <td className="px-4 py-3.5">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${inventoryStatusStyles[item.status]}`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-sm text-zinc-500">{item.lastCounted}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reorder Alerts */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h2 className="text-white font-semibold">Reorder Alerts</h2>
          <span className="text-xs text-zinc-500 ml-auto">{reorderAlerts.length} items below reorder point</span>
        </div>
        <div className="space-y-3">
          {reorderAlerts.map((alert) => (
            <div key={alert.product} className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-800/30 border border-zinc-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Box className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-white font-medium">{alert.product}</p>
                  <p className="text-xs text-zinc-500">
                    Current: <span className="text-red-400">{alert.qty}</span>
                    <span className="mx-1.5 text-zinc-700">|</span>
                    Reorder at: <span className="text-zinc-300">{alert.reorder}</span>
                  </p>
                </div>
              </div>
              <button className="text-xs px-3 py-1.5 bg-cyan-500/15 text-cyan-400 rounded-lg border border-cyan-500/30">
                Reorder
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
