import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Package, Cloud, Box, Plus, ArrowRight,
  Search, Tag, Eye, Edit2, Settings,
} from 'lucide-react';

// ─── Mock Data ──────────────────────────────────────────────────────────────────

const MOCK_PRODUCTS = [
  {
    id: '1',
    name: 'Enterprise Platform',
    tagline: 'Full-featured SaaS platform with SSO and audit logs',
    type: 'digital',
    status: 'published',
    category: 'Software',
    featured_image: null,
  },
  {
    id: '2',
    name: 'API Access Pro',
    tagline: 'High-throughput API with 100K requests/day and webhooks',
    type: 'digital',
    status: 'published',
    category: 'Software',
    featured_image: null,
  },
  {
    id: '3',
    name: 'Starter Hardware Kit',
    tagline: '5 pre-configured workstations for team onboarding',
    type: 'physical',
    status: 'published',
    category: 'Hardware',
    featured_image: null,
  },
  {
    id: '4',
    name: 'Custom Integration',
    tagline: 'Bespoke integration service for your existing tech stack',
    type: 'digital',
    status: 'draft',
    category: 'Services',
    featured_image: null,
  },
  {
    id: '5',
    name: 'Training Bundle',
    tagline: 'Complete training program with certifications for up to 25 users',
    type: 'physical',
    status: 'published',
    category: 'Services',
    featured_image: null,
  },
  {
    id: '6',
    name: 'Support Plan Premium',
    tagline: '24/7 dedicated support with 15-min response SLA',
    type: 'digital',
    status: 'draft',
    category: 'Services',
    featured_image: null,
  },
];

const STATUS_COLORS = {
  published: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  draft: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30' },
};

const TYPE_ICONS = {
  digital: Cloud,
  physical: Box,
};

// ─── Derived Stats ──────────────────────────────────────────────────────────────

function getStats(products) {
  const digital = products.filter(p => p.type === 'digital');
  const physical = products.filter(p => p.type === 'physical');
  const published = products.filter(p => p.status === 'published');
  const draft = products.filter(p => p.status === 'draft');
  return {
    total: products.length,
    digital: digital.length,
    physical: physical.length,
    published: published.length,
    draft: draft.length,
    categories: [...new Set(products.map(p => p.category))].length,
  };
}

// ─── Product Card ───────────────────────────────────────────────────────────────

function ProductCard({ product }) {
  const Icon = TYPE_ICONS[product.type] || Package;
  const status = STATUS_COLORS[product.status] || STATUS_COLORS.draft;

  return (
    <div className="group p-4 rounded-xl border transition-all cursor-default bg-zinc-900/50 border-zinc-800/60 hover:border-cyan-500/30">
      <div className="flex items-start gap-4">
        {/* Product Image or Icon */}
        <div className="w-16 h-16 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
          <Icon className="w-7 h-7 text-cyan-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-medium truncate group-hover:text-cyan-400 transition-colors text-white">
                {product.name}
              </h3>
              <p className="text-sm mt-0.5 line-clamp-1 text-zinc-500">
                {product.tagline || 'No description'}
              </p>
            </div>
            <span className={`${status.bg} ${status.text} border ${status.border} text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap`}>
              {product.status}
            </span>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <span className="inline-flex items-center gap-1 text-xs text-cyan-400">
              <Icon className="w-3 h-3" />
              {product.type}
            </span>
            {product.category && (
              <span className="text-xs text-zinc-500">
                {product.category}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function DemoProducts({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const [searchQuery, setSearchQuery] = useState('');

  const stats = getStats(MOCK_PRODUCTS);

  const filteredProducts = searchQuery.trim()
    ? MOCK_PRODUCTS.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tagline?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : MOCK_PRODUCTS;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-black"
    >
      <div className="max-w-full mx-auto px-4 lg:px-6 py-4 space-y-4">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-lg font-bold text-white">Products</h1>
            <p className="text-xs text-zinc-400">{stats.total} total products</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Settings Button */}
            <button className="cursor-default inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-zinc-700 bg-zinc-800/50 text-zinc-300 rounded-md hover:bg-zinc-700 transition-colors">
              <Settings className="w-4 h-4" /> Settings
            </button>

            {/* Add Product Button */}
            <button className="cursor-default inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-cyan-600/80 hover:bg-cyan-600 text-white rounded-md transition-colors">
              <Plus className="w-4 h-4" /> Add Product
            </button>
          </div>
        </div>

        {/* Stat Cards - 6 columns */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {[
            { icon: Package, label: 'Total Products', value: stats.total },
            { icon: Cloud, label: 'Digital', value: stats.digital },
            { icon: Box, label: 'Physical', value: stats.physical },
            { icon: Eye, label: 'Published', value: stats.published },
            { icon: Edit2, label: 'Drafts', value: stats.draft },
            { icon: Tag, label: 'Categories', value: stats.categories },
          ].map((stat) => {
            const StatIcon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 }}
                className="border rounded-xl p-3 bg-zinc-900/50 border-zinc-800/60"
              >
                <div className="flex items-center justify-between mb-2">
                  <StatIcon className="w-4 h-4 text-cyan-400/70" />
                </div>
                <div className="text-lg font-bold text-white">{stat.value}</div>
                <div className="text-[10px] text-zinc-500">{stat.label}</div>
              </motion.div>
            );
          })}
        </div>

        {/* Quick Navigation Cards - 2 columns */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {/* Digital Products */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="group p-4 border rounded-xl hover:border-cyan-500/30 transition-all cursor-default bg-zinc-900/50 border-zinc-800/60"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                <Cloud className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold group-hover:text-cyan-400 transition-colors text-white">
                  Digital Products
                </h3>
                <p className="text-xs mt-1 text-zinc-400">
                  Software, SaaS, courses, subscriptions, and downloadable content
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-lg font-bold text-cyan-400">{stats.digital}</span>
                  <span className="text-xs text-zinc-500">products</span>
                  <ArrowRight className="w-4 h-4 ml-auto group-hover:text-cyan-400 transition-colors text-zinc-500" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Physical Products */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="group p-4 border rounded-xl hover:border-cyan-500/30 transition-all cursor-default bg-zinc-900/50 border-zinc-800/60"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                <Box className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold group-hover:text-cyan-400 transition-colors text-white">
                  Physical Products
                </h3>
                <p className="text-xs mt-1 text-zinc-400">
                  Hardware, merchandise, equipment, and tangible goods
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-lg font-bold text-cyan-400">{stats.physical}</span>
                  <span className="text-xs text-zinc-500">products</span>
                  <ArrowRight className="w-4 h-4 ml-auto group-hover:text-cyan-400 transition-colors text-zinc-500" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-md border bg-zinc-900/50 border-zinc-800/60 text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/40 transition-colors"
          />
        </div>

        {/* Products Grid - 2 columns */}
        {filteredProducts.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-zinc-800/50">
              <Package className="w-7 h-7 text-zinc-600" />
            </div>
            <p className="font-medium text-white">No products found</p>
            <p className="text-sm mt-1 max-w-xs mx-auto text-zinc-500">
              No products match your search
            </p>
          </div>
        )}

        {/* View All Products Button */}
        {filteredProducts.length > 0 && (
          <div className="flex justify-center">
            <button className="cursor-default inline-flex items-center gap-2 px-4 py-2 text-sm border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors">
              View All Products <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
