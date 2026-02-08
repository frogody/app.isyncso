import {
  Package,
  ShoppingCart,
  Monitor,
  Box,
  DollarSign,
} from 'lucide-react';

const productStats = [
  { label: 'Products', value: '47', icon: Package, color: 'cyan' },
  { label: 'Digital', value: '12', icon: Monitor, color: 'violet' },
  { label: 'Physical', value: '35', icon: Box, color: 'emerald' },
  { label: 'Revenue', value: '$234K', icon: DollarSign, color: 'amber' },
];

const iconBgMap = {
  cyan: 'bg-cyan-500/15 text-cyan-400',
  violet: 'bg-violet-500/15 text-violet-400',
  emerald: 'bg-emerald-500/15 text-emerald-400',
  amber: 'bg-amber-500/15 text-amber-400',
};

const statusStyles = {
  Published: 'bg-cyan-500/15 text-cyan-400',
  Draft: 'bg-zinc-700/50 text-zinc-400',
};

const products = [
  { name: 'Enterprise License', price: '$2,400/yr', stock: 'Unlimited', status: 'Published', gradient: 'from-cyan-600 to-blue-800' },
  { name: 'API Access Pro', price: '$199/mo', stock: 'Unlimited', status: 'Published', gradient: 'from-violet-600 to-purple-900' },
  { name: 'Team Starter Pack', price: '$499', stock: '142 units', status: 'Published', gradient: 'from-emerald-600 to-teal-800' },
  { name: 'Custom Integration', price: '$5,000', stock: 'On demand', status: 'Draft', gradient: 'from-amber-600 to-orange-800' },
  { name: 'Training Bundle', price: '$799', stock: '56 units', status: 'Published', gradient: 'from-rose-600 to-pink-900' },
  { name: 'Support Plan', price: '$149/mo', stock: 'Unlimited', status: 'Draft', gradient: 'from-indigo-600 to-blue-900' },
];

export default function DemoProducts({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-cyan-500/15 rounded-xl">
          <Package className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white">Products</h1>
          <p className="text-zinc-400 mt-0.5">
            Manage the {companyName} product catalog.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div data-demo="product-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {productStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4"
          >
            <div className={`p-2.5 rounded-xl ${iconBgMap[stat.color]}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-zinc-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Product Grid */}
      <div data-demo="products" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <div
            key={product.name}
            className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden"
          >
            {/* Gradient thumbnail */}
            <div className={`h-28 bg-gradient-to-br ${product.gradient} flex items-center justify-center`}>
              <ShoppingCart className="w-8 h-8 text-white/25" />
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <h3 className="text-sm font-semibold text-white">{product.name}</h3>
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full ${statusStyles[product.status]}`}>
                  {product.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-cyan-400 font-medium">{product.price}</span>
                <span className="text-zinc-500 text-xs">{product.stock}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
