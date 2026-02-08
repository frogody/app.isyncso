import {
  Package,
  ShoppingCart,
  Monitor,
  Box,
  DollarSign,
  Search,
  Plus,
  Star,
  Upload,
  Download,
  Settings,
  BarChart3,
  AlertTriangle,
  ArrowUpRight,
  Tag,
  Repeat,
  Users,
  ChevronRight,
} from 'lucide-react';

const productStats = [
  { label: 'Products', value: '47', change: '+3 this month', up: true, icon: Package, color: 'cyan' },
  { label: 'Digital', value: '12', change: '25.5%', up: true, icon: Monitor, color: 'blue' },
  { label: 'Physical', value: '35', change: '74.5%', up: false, icon: Box, color: 'zinc' },
  { label: 'Total Revenue', value: '$234K', change: '+12.4%', up: true, icon: DollarSign, color: 'cyan' },
];

const iconBgMap = {
  cyan: 'bg-cyan-500/15 text-cyan-400',
  blue: 'bg-blue-500/15 text-blue-400',
  zinc: 'bg-zinc-700/30 text-zinc-400',
};

const categoryTabs = ['All', 'Software', 'Hardware', 'Services', 'Bundles'];

const pricingModelStyles = {
  'One-time': 'bg-zinc-700/50 text-zinc-300',
  'Subscription': 'bg-cyan-500/15 text-cyan-400',
  'Per-seat': 'bg-blue-500/15 text-blue-400',
};

const statusStyles = {
  Published: 'bg-cyan-500/15 text-cyan-400',
  Draft: 'bg-zinc-700/50 text-zinc-400',
};

const stockDotColor = {
  high: 'bg-cyan-400',
  low: 'bg-amber-400',
  unlimited: 'bg-blue-400',
};

const products = [
  {
    name: 'Enterprise License',
    description: 'Full platform access with SSO, audit logs, and priority support.',
    price: '$2,400/yr',
    model: 'Subscription',
    stock: 'Unlimited',
    stockLevel: 'unlimited',
    status: 'Published',
    category: 'Software',
    rating: 4.8,
    gradient: 'from-cyan-600 to-blue-800',
    icon: Monitor,
  },
  {
    name: 'API Access Pro',
    description: 'High-throughput API with 100K requests/day and webhook support.',
    price: '$199/mo',
    model: 'Subscription',
    stock: 'Unlimited',
    stockLevel: 'unlimited',
    status: 'Published',
    category: 'Software',
    rating: 4.6,
    gradient: 'from-violet-600 to-purple-900',
    icon: Settings,
  },
  {
    name: 'Team Starter Pack',
    description: 'Hardware bundle with 5 workstations pre-configured for onboarding.',
    price: '$499',
    model: 'One-time',
    stock: '142 units',
    stockLevel: 'high',
    status: 'Published',
    category: 'Hardware',
    rating: 4.3,
    gradient: 'from-emerald-600 to-teal-800',
    icon: Box,
  },
  {
    name: 'Custom Integration',
    description: 'Bespoke integration service tailored to your existing tech stack.',
    price: '$5,000',
    model: 'One-time',
    stock: 'On demand',
    stockLevel: 'unlimited',
    status: 'Draft',
    category: 'Services',
    rating: 4.9,
    gradient: 'from-amber-600 to-orange-800',
    icon: Settings,
  },
  {
    name: 'Training Bundle',
    description: 'Complete training program with certifications for up to 25 users.',
    price: '$129/seat',
    model: 'Per-seat',
    stock: '56 seats',
    stockLevel: 'high',
    status: 'Published',
    category: 'Services',
    rating: 4.5,
    gradient: 'from-rose-600 to-pink-900',
    icon: Users,
  },
  {
    name: 'Support Plan',
    description: '24/7 dedicated support with 15-min response SLA and account manager.',
    price: '$149/mo',
    model: 'Subscription',
    stock: 'Unlimited',
    stockLevel: 'unlimited',
    status: 'Draft',
    category: 'Services',
    rating: 4.2,
    gradient: 'from-indigo-600 to-blue-900',
    icon: ShoppingCart,
  },
];

const quickActions = [
  { label: 'Bulk Import', icon: Upload, description: 'CSV or JSON' },
  { label: 'Export Catalog', icon: Download, description: 'PDF or Excel' },
  { label: 'Price Manager', icon: Tag, description: 'Bulk pricing' },
  { label: 'Inventory Report', icon: BarChart3, description: 'Stock levels' },
];

const inventoryAlerts = [
  {
    product: 'USB-C Hub Pro',
    current: 8,
    reorder: 25,
    urgency: 'Critical',
    urgencyStyle: 'bg-red-500/15 text-red-400',
  },
  {
    product: 'Wireless Keyboard',
    current: 14,
    reorder: 20,
    urgency: 'Warning',
    urgencyStyle: 'bg-amber-500/15 text-amber-400',
  },
  {
    product: '4K Webcam',
    current: 19,
    reorder: 25,
    urgency: 'Low',
    urgencyStyle: 'bg-yellow-500/15 text-yellow-400',
  },
];

function StarRating({ rating }) {
  const full = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.3;
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-3 h-3 ${
              i < full
                ? 'text-yellow-400 fill-yellow-400'
                : i === full && hasHalf
                ? 'text-yellow-400 fill-yellow-400/50'
                : 'text-zinc-700'
            }`}
          />
        ))}
      </div>
      <span className="text-[10px] text-zinc-500 ml-0.5">{rating}</span>
    </div>
  );
}

export default function DemoProducts({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Page Header */}
      <div data-demo="header" className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/20 rounded-xl">
            <Package className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Products</h1>
            <p className="text-zinc-400 mt-0.5">
              Manage the {companyName} product catalog.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search products..."
              readOnly
              className="bg-zinc-900/80 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-400 placeholder-zinc-600 w-64 cursor-default focus:outline-none"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-medium text-sm rounded-xl transition-colors">
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div data-demo="product-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {productStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-sm font-medium">{stat.label}</span>
              <div className={`p-2 rounded-lg ${iconBgMap[stat.color]}`}>
                <stat.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-white">{stat.value}</span>
              <span
                className={`flex items-center gap-1 text-xs font-medium ${
                  stat.up ? 'text-cyan-400' : 'text-zinc-500'
                }`}
              >
                {stat.up && <ArrowUpRight className="w-3 h-3" />}
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Category Tabs */}
      <div data-demo="category-tabs" className="flex items-center gap-2">
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
      <div data-demo="products" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <div
            key={product.name}
            className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden group cursor-default"
          >
            {/* Gradient thumbnail */}
            <div className={`h-32 bg-gradient-to-br ${product.gradient} flex items-center justify-center relative`}>
              <product.icon className="w-8 h-8 text-white/20" />
              <div className="absolute top-3 right-3">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusStyles[product.status]}`}>
                  {product.status}
                </span>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {/* Name + Category */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-white">{product.name}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 whitespace-nowrap">
                    {product.category}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{product.description}</p>
              </div>

              {/* Price + Pricing Model */}
              <div className="flex items-center justify-between">
                <span className="text-cyan-400 font-semibold text-sm">{product.price}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${pricingModelStyles[product.model]}`}>
                  {product.model === 'Subscription' && <Repeat className="w-2.5 h-2.5 inline mr-1" />}
                  {product.model === 'Per-seat' && <Users className="w-2.5 h-2.5 inline mr-1" />}
                  {product.model}
                </span>
              </div>

              {/* Rating + Stock */}
              <div className="flex items-center justify-between pt-1 border-t border-zinc-800/50">
                <StarRating rating={product.rating} />
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <div className={`w-1.5 h-1.5 rounded-full ${stockDotColor[product.stockLevel]}`} />
                  {product.stock}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions Bar */}
      <div data-demo="quick-actions" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {quickActions.map((action) => (
          <div
            key={action.label}
            className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 cursor-default hover:border-zinc-700 transition-colors"
          >
            <div className="p-2 bg-cyan-500/10 rounded-lg">
              <action.icon className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm text-white font-medium">{action.label}</p>
              <p className="text-[11px] text-zinc-500">{action.description}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-700 ml-auto" />
          </div>
        ))}
      </div>

      {/* Inventory Alerts */}
      <div data-demo="inventory-alerts" className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h2 className="text-white font-semibold">Inventory Alerts</h2>
          <span className="text-xs text-zinc-500 ml-auto">{inventoryAlerts.length} items need attention</span>
        </div>
        <div className="space-y-3">
          {inventoryAlerts.map((alert) => (
            <div
              key={alert.product}
              className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-800/30 border border-zinc-800/50"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Box className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-white font-medium">{alert.product}</p>
                  <p className="text-xs text-zinc-500">
                    Current: <span className="text-zinc-300">{alert.current}</span>
                    <span className="mx-1.5 text-zinc-700">|</span>
                    Reorder level: <span className="text-zinc-300">{alert.reorder}</span>
                  </p>
                </div>
              </div>
              <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${alert.urgencyStyle}`}>
                {alert.urgency}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
