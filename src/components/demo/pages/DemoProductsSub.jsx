import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Cloud, Plus, Search, Grid3X3, List, Eye, Edit2,
  Zap, Users, Star, ChevronDown, MoreHorizontal, Archive, Trash2, Copy,
  Box, Package, Truck, AlertTriangle, CheckCircle, XCircle,
  Scan, Check, Barcode, Boxes, Warehouse, MapPin, Minus,
  Clock, Send, ChevronRight, ExternalLink,
  Receipt, Upload, Sparkles, Euro, Calendar, FileText,
  ArrowLeft, ArrowRight, FileSpreadsheet, Download,
  Columns, Table2,
} from 'lucide-react';

// ============================================================================
// SHARED HELPERS
// ============================================================================

const pageAnim = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: 'easeOut' },
};

const staggerChildren = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

// ============================================================================
// 1. DemoProductsDigital  (replica of ProductsDigital)
// ============================================================================

const DIGITAL_PRICING_MODELS = {
  free: { label: 'Free', color: 'text-cyan-400' },
  one_time: { label: 'One-time', color: 'text-cyan-400' },
  subscription: { label: 'Subscription', color: 'text-blue-400' },
  usage_based: { label: 'Usage-based', color: 'text-cyan-300' },
  freemium: { label: 'Freemium', color: 'text-blue-300' },
};

const DIGITAL_STATUS = {
  published: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30', label: 'Published' },
  draft: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30', label: 'Draft' },
  archived: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30', label: 'Archived' },
};

const DIGITAL_PRODUCTS = [
  { id: 'd1', name: 'Platform Pro License', status: 'published', tagline: 'SaaS subscription', category: 'SaaS', pricing: 'subscription', price: 49.99, trial: true },
  { id: 'd2', name: 'API Access Tier', status: 'published', tagline: 'Usage-based access', category: 'API', pricing: 'usage_based', price: 0.02, trial: false },
  { id: 'd3', name: 'Data Export Add-on', status: 'published', tagline: 'Per-seat license', category: 'Add-on', pricing: 'one_time', price: 29.99, trial: true },
  { id: 'd4', name: 'Premium Support', status: 'draft', tagline: 'Priority support plan', category: 'Support', pricing: 'subscription', price: 19.99, trial: false },
  { id: 'd5', name: 'White-label Module', status: 'published', tagline: 'Enterprise license', category: 'License', pricing: 'one_time', price: 999, trial: false },
  { id: 'd6', name: 'Training Portal', status: 'published', tagline: 'Team learning access', category: 'Training', pricing: 'freemium', price: 0, trial: true },
  { id: 'd7', name: 'Analytics Dashboard', status: 'published', tagline: 'Real-time insights', category: 'SaaS', pricing: 'subscription', price: 39.99, trial: true },
  { id: 'd8', name: 'Starter Pack', status: 'archived', tagline: 'Introductory bundle', category: 'Bundle', pricing: 'free', price: 0, trial: false },
];

export function DemoProductsDigital({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pricingFilter, setPricingFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

  const filtered = DIGITAL_PRODUCTS.filter(p => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.tagline.toLowerCase().includes(q)) return false;
    }
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (pricingFilter !== 'all' && p.pricing !== pricingFilter) return false;
    return true;
  });

  const stats = {
    total: DIGITAL_PRODUCTS.length,
    published: DIGITAL_PRODUCTS.filter(p => p.status === 'published').length,
    withTrial: DIGITAL_PRODUCTS.filter(p => p.trial).length,
  };

  return (
    <motion.div {...pageAnim} className="min-h-screen bg-black">
      <div className="max-w-full mx-auto px-4 lg:px-6 py-4 space-y-4">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-lg font-bold text-white">Digital Products</h1>
            <p className="text-xs text-zinc-400">Manage your digital product catalog</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 cursor-default">
              <Plus className="w-4 h-4" /> New Digital Product
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <motion.div {...fadeUp} className="flex items-center gap-6 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/60">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white">{stats.total}</span>
            <span className="text-sm text-zinc-500">total</span>
          </div>
          <div className="w-px h-8 bg-zinc-800" />
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-cyan-400">{stats.published}</span>
            <span className="text-sm text-zinc-500">published</span>
          </div>
          <div className="w-px h-8 bg-zinc-800" />
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-cyan-400">{stats.withTrial}</span>
            <span className="text-sm text-zinc-500">with trial</span>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div {...fadeUp} className="rounded-xl p-3 bg-zinc-900/50 border border-zinc-800/60">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                placeholder="Search digital products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/60 text-white placeholder:text-zinc-500 text-sm focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-zinc-900/50 border border-zinc-800/60 text-white rounded-lg px-3 py-2 text-sm cursor-default focus:outline-none">
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>

            <select value={pricingFilter} onChange={e => setPricingFilter(e.target.value)} className="bg-zinc-900/50 border border-zinc-800/60 text-white rounded-lg px-3 py-2 text-sm cursor-default focus:outline-none">
              <option value="all">All Pricing</option>
              {Object.entries(DIGITAL_PRICING_MODELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>

            <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-800/50 border border-zinc-800/60">
              <button onClick={() => setViewMode('grid')} className={`h-8 px-3 rounded-md cursor-default ${viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-400' : 'text-zinc-400 hover:text-white'}`}>
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode('list')} className={`h-8 px-3 rounded-md cursor-default ${viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-400' : 'text-zinc-400 hover:text-white'}`}>
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Products Grid / List */}
        {filtered.length > 0 ? (
          viewMode === 'grid' ? (
            <motion.div variants={staggerChildren} initial="initial" animate="animate" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {filtered.map((product) => {
                const st = DIGITAL_STATUS[product.status] || DIGITAL_STATUS.draft;
                const pm = DIGITAL_PRICING_MODELS[product.pricing] || DIGITAL_PRICING_MODELS.free;
                return (
                  <motion.div key={product.id} variants={fadeUp} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden cursor-default group">
                    <div className="h-28 bg-gradient-to-br from-cyan-900/40 to-zinc-900 flex items-center justify-center relative">
                      <Cloud className="w-8 h-8 text-cyan-400/30" />
                      <div className="absolute top-2 right-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${st.bg} ${st.text} ${st.border}`}>{st.label}</span>
                      </div>
                    </div>
                    <div className="p-3 space-y-2">
                      <h3 className="text-sm font-semibold text-white truncate">{product.name}</h3>
                      <p className="text-xs text-zinc-500 truncate">{product.tagline}</p>
                      <div className="flex items-center justify-between pt-1">
                        <span className={`text-xs ${pm.color}`}>{pm.label}</span>
                        <span className="text-sm font-semibold text-cyan-400">
                          {product.price > 0 ? `$${product.price}` : 'Free'}
                        </span>
                      </div>
                      {product.trial && (
                        <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">Trial available</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div variants={staggerChildren} initial="initial" animate="animate" className="space-y-3">
              {filtered.map((product) => {
                const st = DIGITAL_STATUS[product.status] || DIGITAL_STATUS.draft;
                const pm = DIGITAL_PRICING_MODELS[product.pricing] || DIGITAL_PRICING_MODELS.free;
                return (
                  <motion.div key={product.id} variants={fadeUp} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3 flex items-center justify-between cursor-default">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                        <Cloud className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-white">{product.name}</h3>
                        <p className="text-xs text-zinc-500">{product.tagline}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-xs ${pm.color}`}>{pm.label}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${st.bg} ${st.text} ${st.border}`}>{st.label}</span>
                      <span className="text-sm font-semibold text-white">{product.price > 0 ? `$${product.price}` : 'Free'}</span>
                      <button className="text-zinc-500 hover:text-white cursor-default"><MoreHorizontal className="w-4 h-4" /></button>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )
        ) : (
          <div className="rounded-xl p-12 text-center bg-zinc-900/50 border border-zinc-800/60">
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
              <Cloud className="w-8 h-8 text-cyan-400" />
            </div>
            <h4 className="text-lg font-medium mb-2 text-white">No digital products found</h4>
            <p className="text-sm mb-4 text-zinc-500">Try adjusting your filters</p>
            <button className="bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 mx-auto cursor-default">
              <Plus className="w-4 h-4" /> Add Digital Product
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// 2. DemoProductsPhysical  (replica of ProductsPhysical)
// ============================================================================

const STOCK_STATUS_MAP = {
  in_stock: { label: 'In Stock', color: 'text-cyan-400', dotColor: 'bg-cyan-400' },
  low_stock: { label: 'Low Stock', color: 'text-cyan-400', dotColor: 'bg-cyan-400' },
  out_of_stock: { label: 'Out of Stock', color: 'text-red-400', dotColor: 'bg-red-400' },
};

const PHYSICAL_PRODUCTS = [
  { id: 'p1', name: 'USB-C Hub Pro', sku: 'ELC-001', ean: '8712345000011', status: 'published', category: 'Electronics', price: 79.99, stock: 142, stockStatus: 'in_stock', warehouse: 'Amsterdam-A1' },
  { id: 'p2', name: 'Branded Hoodie', sku: 'MRC-012', ean: '8712345000028', status: 'published', category: 'Merchandise', price: 45.00, stock: 8, stockStatus: 'low_stock', warehouse: 'Rotterdam-B3' },
  { id: 'p3', name: 'Standing Desk Frame', sku: 'EQP-007', ean: '8712345000035', status: 'published', category: 'Equipment', price: 349.00, stock: 34, stockStatus: 'in_stock', warehouse: 'Amsterdam-A2' },
  { id: 'p4', name: 'Wireless Mouse', sku: 'ELC-003', ean: '8712345000042', status: 'published', category: 'Electronics', price: 29.99, stock: 0, stockStatus: 'out_of_stock', warehouse: 'Amsterdam-A1' },
  { id: 'p5', name: 'Company Notebook', sku: 'SUP-020', ean: '8712345000059', status: 'published', category: 'Supplies', price: 12.50, stock: 256, stockStatus: 'in_stock', warehouse: 'Rotterdam-B3' },
  { id: 'p6', name: 'Ergonomic Chair', sku: 'EQP-002', ean: '8712345000066', status: 'draft', category: 'Equipment', price: 599.00, stock: 5, stockStatus: 'low_stock', warehouse: 'Amsterdam-A2' },
  { id: 'p7', name: '4K Webcam', sku: 'ELC-008', ean: '8712345000073', status: 'published', category: 'Electronics', price: 149.99, stock: 19, stockStatus: 'in_stock', warehouse: 'Amsterdam-A1' },
  { id: 'p8', name: 'Cable Management Kit', sku: 'SUP-015', ean: '8712345000080', status: 'published', category: 'Supplies', price: 24.99, stock: 0, stockStatus: 'out_of_stock', warehouse: 'Rotterdam-B3' },
];

export function DemoProductsPhysical({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

  const filtered = PHYSICAL_PRODUCTS.filter(p => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.ean.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) return false;
    }
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (stockFilter !== 'all' && p.stockStatus !== stockFilter) return false;
    return true;
  });

  const stats = {
    total: PHYSICAL_PRODUCTS.length,
    in_stock: PHYSICAL_PRODUCTS.filter(p => p.stockStatus === 'in_stock').length,
    low_stock: PHYSICAL_PRODUCTS.filter(p => p.stockStatus === 'low_stock').length,
    out_of_stock: PHYSICAL_PRODUCTS.filter(p => p.stockStatus === 'out_of_stock').length,
  };

  return (
    <motion.div {...pageAnim} className="min-h-screen bg-black">
      <div className="max-w-full mx-auto px-4 lg:px-6 py-4 space-y-4">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-lg font-bold text-white">Physical Products</h1>
            <p className="text-xs text-zinc-400">Manage your physical inventory</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 cursor-default">
              <Plus className="w-4 h-4" /> New Physical Product
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <motion.div {...fadeUp} className="flex items-center gap-6 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/60">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white">{stats.total}</span>
            <span className="text-sm text-zinc-500">total</span>
          </div>
          <div className="w-px h-8 bg-zinc-800" />
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-cyan-400">{stats.in_stock}</span>
            <span className="text-sm text-zinc-500">in stock</span>
          </div>
          <div className="w-px h-8 bg-zinc-800" />
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-cyan-400">{stats.low_stock}</span>
            <span className="text-sm text-zinc-500">low stock</span>
          </div>
          <div className="w-px h-8 bg-zinc-800" />
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-red-400">{stats.out_of_stock}</span>
            <span className="text-sm text-zinc-500">out of stock</span>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div {...fadeUp} className="rounded-xl p-3 bg-zinc-900/50 border border-zinc-800/60">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                placeholder="Search by name, EAN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/60 text-white placeholder:text-zinc-500 text-sm focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-zinc-900/50 border border-zinc-800/60 text-white rounded-lg px-3 py-2 text-sm cursor-default focus:outline-none">
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>

            <select value={stockFilter} onChange={e => setStockFilter(e.target.value)} className="bg-zinc-900/50 border border-zinc-800/60 text-white rounded-lg px-3 py-2 text-sm cursor-default focus:outline-none">
              <option value="all">All Stock</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>

            <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-800/50 border border-zinc-800/60">
              <button onClick={() => setViewMode('grid')} className={`h-8 px-3 rounded-md cursor-default ${viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-400' : 'text-zinc-400 hover:text-white'}`}>
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode('list')} className={`h-8 px-3 rounded-md cursor-default ${viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-400' : 'text-zinc-400 hover:text-white'}`}>
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Products */}
        {filtered.length > 0 ? (
          viewMode === 'grid' ? (
            <motion.div variants={staggerChildren} initial="initial" animate="animate" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {filtered.map(product => {
                const ss = STOCK_STATUS_MAP[product.stockStatus];
                const pst = DIGITAL_STATUS[product.status] || DIGITAL_STATUS.draft;
                return (
                  <motion.div key={product.id} variants={fadeUp} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4 cursor-default space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-white">{product.name}</h3>
                        <span className="text-[11px] text-zinc-500 font-mono">{product.sku}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${pst.bg} ${pst.text} ${pst.border}`}>{pst.label}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-cyan-400 font-semibold text-sm">${product.price.toFixed(2)}</span>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${ss.dotColor}`} />
                        <span className={`text-xs ${ss.color}`}>
                          {product.stockStatus === 'out_of_stock' ? 'Out of stock' : `${product.stock} units`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 pt-2 border-t border-zinc-800/50">
                      <MapPin className="w-3 h-3" />
                      {product.warehouse}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div variants={staggerChildren} initial="initial" animate="animate" className="space-y-3">
              {filtered.map(product => {
                const ss = STOCK_STATUS_MAP[product.stockStatus];
                const pst = DIGITAL_STATUS[product.status] || DIGITAL_STATUS.draft;
                return (
                  <motion.div key={product.id} variants={fadeUp} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3 flex items-center justify-between cursor-default">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                        <Box className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-white">{product.name}</h3>
                        <p className="text-xs text-zinc-500">{product.sku} | EAN: {product.ean}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${ss.dotColor}`} />
                        <span className={`text-xs ${ss.color}`}>{ss.label}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${pst.bg} ${pst.text} ${pst.border}`}>{pst.label}</span>
                      <span className="text-sm font-semibold text-white">${product.price.toFixed(2)}</span>
                      <button className="text-zinc-500 hover:text-white cursor-default"><MoreHorizontal className="w-4 h-4" /></button>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )
        ) : (
          <div className="rounded-xl p-12 text-center bg-zinc-900/50 border border-zinc-800/60">
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
              <Box className="w-8 h-8 text-cyan-400" />
            </div>
            <h4 className="text-lg font-medium mb-2 text-white">No physical products found</h4>
            <p className="text-sm mb-4 text-zinc-500">Try adjusting your filters</p>
            <button className="bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 mx-auto cursor-default">
              <Plus className="w-4 h-4" /> Add Physical Product
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// 3. DemoProductsReceiving  (replica of InventoryReceiving)
// ============================================================================

const RECEIVING_STATS = {
  pendingDeliveries: 5,
  receivedToday: 34,
  partialDeliveries: 2,
};

const EXPECTED_DELIVERIES = [
  { id: 'ed1', productName: 'USB-C Hub Pro', ean: '8712345000011', supplier: 'TechParts BV', qtyExpected: 50, qtyReceived: 20, status: 'partial', expectedDate: '2026-02-10' },
  { id: 'ed2', productName: 'Wireless Mouse', ean: '8712345000042', supplier: 'Nordic Components', qtyExpected: 100, qtyReceived: 0, status: 'pending', expectedDate: '2026-02-11' },
  { id: 'ed3', productName: 'Standing Desk Frame', ean: '8712345000035', supplier: 'ShenzhenDirect', qtyExpected: 15, qtyReceived: 0, status: 'pending', expectedDate: '2026-02-13' },
  { id: 'ed4', productName: 'Ergonomic Chair', ean: '8712345000066', supplier: 'EuroSupply GmbH', qtyExpected: 10, qtyReceived: 0, status: 'pending', expectedDate: '2026-02-15' },
  { id: 'ed5', productName: 'Cable Management Kit', ean: '8712345000080', supplier: 'PackRight Co', qtyExpected: 200, qtyReceived: 0, status: 'pending', expectedDate: '2026-02-18' },
];

const RECENT_RECEIVING = [
  { id: 'rr1', productName: '4K Webcam', qty: 25, condition: 'good', time: '14:32', location: 'A1-C3' },
  { id: 'rr2', productName: 'Company Notebook', qty: 100, condition: 'good', time: '13:15', location: 'B3-D1' },
  { id: 'rr3', productName: 'Branded Hoodie', qty: 5, condition: 'damaged', time: '11:48', location: 'B3-A2' },
  { id: 'rr4', productName: 'USB-C Hub Pro', qty: 20, condition: 'good', time: '09:30', location: 'A1-B2' },
];

export function DemoProductsReceiving({ companyName = 'Acme Corp', recipientName = 'there' }) {
  return (
    <motion.div {...pageAnim} className="min-h-screen bg-black">
      <div className="max-w-full mx-auto px-4 lg:px-6 py-4 space-y-4">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-lg font-bold text-white">Receiving</h1>
            <p className="text-xs text-zinc-400">Scan and receive incoming inventory</p>
          </div>
        </div>

        {/* Stats */}
        <motion.div variants={staggerChildren} initial="initial" animate="animate" className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <motion.div variants={fadeUp} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Boxes className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-zinc-500">Expected Deliveries</span>
            </div>
            <p className="text-lg font-bold text-white">{RECEIVING_STATS.pendingDeliveries}</p>
          </motion.div>
          <motion.div variants={fadeUp} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Check className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-zinc-500">Received Today</span>
            </div>
            <p className="text-lg font-bold text-white">{RECEIVING_STATS.receivedToday} <span className="text-xs font-normal text-zinc-500">items</span></p>
          </motion.div>
          <motion.div variants={fadeUp} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-zinc-500">Partial Deliveries</span>
            </div>
            <p className="text-lg font-bold text-white">{RECEIVING_STATS.partialDeliveries}</p>
          </motion.div>
        </motion.div>

        {/* Scanner + Recent */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Scanner */}
          <motion.div {...fadeUp} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3">
            <h2 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Scan className="w-5 h-5 text-cyan-400" />
              Barcode Scanner
            </h2>
            <div className="p-6 border-2 border-dashed border-cyan-500/30 rounded-xl bg-cyan-500/5 text-center">
              <Barcode className="w-12 h-12 mx-auto text-cyan-400 mb-3" />
              <p className="text-zinc-400 text-sm">Typ EAN-code of scan met een barcode scanner</p>
            </div>
            <div className="flex gap-2 mt-3">
              <input
                readOnly
                placeholder="EAN / Barcode..."
                className="flex-1 px-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/60 text-white placeholder:text-zinc-500 text-sm cursor-default focus:outline-none"
              />
              <button className="px-3 py-2 rounded-lg bg-zinc-800 text-white text-sm flex items-center gap-2 cursor-default">
                <Scan className="w-4 h-4" /> Scan
              </button>
            </div>
          </motion.div>

          {/* Recent Receiving */}
          <motion.div {...fadeUp} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3">
            <h2 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Warehouse className="w-5 h-5 text-cyan-400" />
              Recente ontvangsten
            </h2>
            <div className="space-y-2">
              {RECENT_RECEIVING.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/30">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-full ${item.condition === 'good' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                      {item.condition === 'good' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm text-white">{item.productName}</p>
                      <p className="text-xs text-zinc-500">{item.qty}x - {item.time}</p>
                    </div>
                  </div>
                  {item.location && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-zinc-700 text-zinc-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{item.location}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Expected Deliveries */}
        <motion.div {...fadeUp} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3">
          <h2 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <Package className="w-5 h-5 text-cyan-400" />
            Expected Deliveries ({EXPECTED_DELIVERIES.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-zinc-500 border-b border-zinc-800/60">
                  <th className="pb-3 font-medium">Product</th>
                  <th className="pb-3 font-medium">Supplier</th>
                  <th className="pb-3 font-medium">Expected</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Datum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/30">
                {EXPECTED_DELIVERIES.map(d => (
                  <tr key={d.id} className="text-sm cursor-default">
                    <td className="py-3 text-white">
                      {d.productName}
                      <span className="ml-2 text-xs text-zinc-500">({d.ean})</span>
                    </td>
                    <td className="py-3 text-zinc-400">{d.supplier}</td>
                    <td className="py-3 text-white">{d.qtyReceived} / {d.qtyExpected}</td>
                    <td className="py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                        d.status === 'partial'
                          ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                          : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                      }`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="py-3 text-zinc-400">{new Date(d.expectedDate).toLocaleDateString('nl-NL')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// 4. DemoProductsShipping  (replica of InventoryShipping)
// ============================================================================

const SHIPPING_STATUS_STYLES = {
  pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30', Icon: Clock },
  ready_to_ship: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30', Icon: Package },
  shipped: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', Icon: Truck },
  delivered: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30', Icon: Check },
  cancelled: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30', Icon: XCircle },
};

const SHIPPING_TASKS = [
  { id: 'st1', taskNumber: 'SHP-4821', orderNumber: 'ORD-4821', customer: 'TechFlow BV', status: 'shipped', priority: 'normal', packages: 3, carrier: 'DHL', trackTrace: '3SJVB123456789', shipByDate: '2026-02-08', shippedAt: '2026-02-08' },
  { id: 'st2', taskNumber: 'SHP-4820', orderNumber: 'ORD-4820', customer: 'DataVault Inc', status: 'delivered', priority: 'normal', packages: 1, carrier: 'UPS', trackTrace: '1Z999AA10123456784', shipByDate: '2026-02-06', shippedAt: '2026-02-06' },
  { id: 'st3', taskNumber: 'SHP-4819', orderNumber: 'ORD-4819', customer: 'NordSys AG', status: 'pending', priority: 'high', packages: 5, carrier: null, trackTrace: null, shipByDate: '2026-02-10', shippedAt: null },
  { id: 'st4', taskNumber: 'SHP-4818', orderNumber: 'ORD-4818', customer: 'Bloom Digital', status: 'ready_to_ship', priority: 'normal', packages: 2, carrier: 'PostNL', trackTrace: null, shipByDate: '2026-02-11', shippedAt: null },
  { id: 'st5', taskNumber: 'SHP-4817', orderNumber: 'ORD-4817', customer: 'CloudPeak Ltd', status: 'pending', priority: 'urgent', packages: 4, carrier: null, trackTrace: null, shipByDate: '2026-02-09', shippedAt: null },
  { id: 'st6', taskNumber: 'SHP-4816', orderNumber: 'ORD-4816', customer: 'Synapse AI', status: 'shipped', priority: 'normal', packages: 1, carrier: 'DHL', trackTrace: '3SJVB987654321', shipByDate: '2026-02-07', shippedAt: '2026-02-07' },
];

const PRIORITY_STYLES = {
  low: { bg: 'bg-zinc-500/10', text: 'text-zinc-400' },
  normal: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  high: { bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
  urgent: { bg: 'bg-red-500/10', text: 'text-red-400' },
};

export function DemoProductsShipping({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filteredTasks = SHIPPING_TASKS.filter(t => {
    if (filter !== 'all' && t.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.orderNumber.toLowerCase().includes(q) || t.customer.toLowerCase().includes(q) || (t.trackTrace && t.trackTrace.toLowerCase().includes(q));
    }
    return true;
  });

  const stats = {
    pending: SHIPPING_TASKS.filter(t => ['pending', 'ready_to_ship'].includes(t.status)).length,
    shipped: SHIPPING_TASKS.filter(t => t.status === 'shipped').length,
    delivered: SHIPPING_TASKS.filter(t => t.status === 'delivered').length,
    overdue: 1,
  };

  const filterTabs = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'To Ship' },
    { value: 'shipped', label: 'In Transit' },
    { value: 'delivered', label: 'Delivered' },
  ];

  return (
    <motion.div {...pageAnim} className="min-h-screen bg-black">
      <div className="max-w-full mx-auto px-4 lg:px-6 py-4 space-y-4">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-lg font-bold text-white">Shipping</h1>
            <p className="text-xs text-zinc-400">Manage outbound shipments</p>
          </div>
        </div>

        {/* Overdue Alert */}
        {stats.overdue > 0 && (
          <motion.div {...fadeUp} className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 cursor-default">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <div>
                  <h3 className="font-medium text-red-400 text-sm">{stats.overdue} levering te laat</h3>
                  <p className="text-xs text-red-400/70">Controleer de tracking status en neem actie</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-red-400" />
            </div>
          </motion.div>
        )}

        {/* Stats */}
        <motion.div variants={staggerChildren} initial="initial" animate="animate" className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <motion.div variants={fadeUp} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-zinc-500">To Ship</span>
            </div>
            <p className="text-lg font-bold text-white">{stats.pending}</p>
          </motion.div>
          <motion.div variants={fadeUp} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Truck className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-zinc-500">In Transit</span>
            </div>
            <p className="text-lg font-bold text-white">{stats.shipped}</p>
          </motion.div>
          <motion.div variants={fadeUp} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Check className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-zinc-500">Delivered</span>
            </div>
            <p className="text-lg font-bold text-white">{stats.delivered}</p>
          </motion.div>
          <motion.div variants={fadeUp} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-xs text-zinc-500">Overdue</span>
            </div>
            <p className="text-lg font-bold text-white">{stats.overdue}</p>
          </motion.div>
        </motion.div>

        {/* Filters */}
        <motion.div {...fadeUp} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                placeholder="Zoek op order, klant of T&T code..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/60 text-white placeholder:text-zinc-500 text-sm focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-900/50">
              {filterTabs.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setFilter(tab.value)}
                  className={`px-3 py-1.5 rounded-md text-sm cursor-default transition-colors ${filter === tab.value ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Task List */}
        {filteredTasks.length === 0 ? (
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-8 text-center">
            <Package className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
            <h3 className="text-base font-medium text-white mb-1">No shipping tasks found</h3>
            <p className="text-xs text-zinc-500">{search ? 'Try a different search' : 'There are currently no shipping tasks'}</p>
          </div>
        ) : (
          <motion.div variants={staggerChildren} initial="initial" animate="animate" className="space-y-3">
            {filteredTasks.map(task => {
              const st = SHIPPING_STATUS_STYLES[task.status] || SHIPPING_STATUS_STYLES.pending;
              const pr = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.normal;
              const StatusIcon = st.Icon;
              const isShippable = ['pending', 'ready_to_ship'].includes(task.status);

              return (
                <motion.div key={task.id} variants={fadeUp} className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/30 hover:border-cyan-500/30 transition-all cursor-default">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <div className={`p-2 rounded-lg ${st.bg} border ${st.border}`}>
                        <StatusIcon className={`w-4 h-4 ${st.text}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-white">{task.orderNumber}</h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${st.bg} ${st.text} ${st.border}`}>{task.status.replace('_', ' ')}</span>
                          {task.priority !== 'normal' && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${pr.bg} ${pr.text}`}>{task.priority}</span>
                          )}
                        </div>
                        <p className="text-sm text-zinc-400 mt-1">{task.customer}</p>
                      </div>
                    </div>

                    {isShippable && (
                      <button className="bg-cyan-600 hover:bg-cyan-700 text-white text-sm px-3 py-1.5 rounded-lg flex items-center gap-2 cursor-default">
                        <Send className="w-4 h-4" /> Verzenden
                      </button>
                    )}

                    {task.status === 'shipped' && task.trackTrace && (
                      <div className="text-right">
                        <div className="text-xs text-zinc-500">Track & Trace</div>
                        <div className="flex items-center gap-1 mt-1">
                          <code className="text-sm text-cyan-400">{task.trackTrace}</code>
                          <button className="text-zinc-500 hover:text-white cursor-default"><Copy className="w-3 h-3" /></button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-2 pt-2 border-t border-zinc-800/30 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-zinc-500">Pakjes</span>
                      <span className="ml-2 text-white">{task.packages}</span>
                    </div>
                    {task.carrier && (
                      <div>
                        <span className="text-zinc-500">Carrier</span>
                        <span className="ml-2 text-white">{task.carrier}</span>
                      </div>
                    )}
                    {task.shipByDate && (
                      <div>
                        <span className="text-zinc-500">Verzenden voor</span>
                        <span className="ml-2 text-white">{new Date(task.shipByDate).toLocaleDateString('nl-NL')}</span>
                      </div>
                    )}
                    {task.shippedAt && (
                      <div>
                        <span className="text-zinc-500">Verzonden</span>
                        <span className="ml-2 text-white">{new Date(task.shippedAt).toLocaleDateString('nl-NL')}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// 5. DemoProductsStockPurchases  (replica of StockPurchases)
// ============================================================================

const SP_STATUS_STYLES = {
  draft: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30' },
  pending_review: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  approved: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  processed: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
};

const STOCK_PURCHASES = [
  { id: 'sp1', number: 'INV-2026-0047', supplier: 'TechParts BV', status: 'pending_review', total: 2450.00, confidence: 0.92, needsReview: true, invoiceDate: '2026-02-05', items: 8 },
  { id: 'sp2', number: 'INV-2026-0046', supplier: 'Nordic Components', status: 'approved', total: 1200.00, confidence: 0.98, needsReview: false, invoiceDate: '2026-02-03', items: 3 },
  { id: 'sp3', number: 'INV-2026-0045', supplier: 'ShenzhenDirect', status: 'pending_review', total: 8900.00, confidence: 0.68, needsReview: true, invoiceDate: '2026-02-01', items: 15 },
  { id: 'sp4', number: 'INV-2026-0044', supplier: 'EuroSupply GmbH', status: 'approved', total: 3150.00, confidence: 0.95, needsReview: false, invoiceDate: '2026-01-28', items: 5 },
  { id: 'sp5', number: 'INV-2026-0043', supplier: 'PackRight Co', status: 'processed', total: 890.00, confidence: 0.99, needsReview: false, invoiceDate: '2026-01-25', items: 20 },
  { id: 'sp6', number: 'INV-2026-0042', supplier: 'TechParts BV', status: 'approved', total: 4600.00, confidence: 0.91, needsReview: false, invoiceDate: '2026-01-22', items: 12 },
];

export function DemoProductsStockPurchases({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filteredExpenses = STOCK_PURCHASES.filter(e => {
    if (filter === 'review' && !e.needsReview) return false;
    if (filter === 'approved' && e.status !== 'approved') return false;
    if (filter === 'pending' && e.status !== 'pending_review') return false;
    if (search) {
      const q = search.toLowerCase();
      return e.number.toLowerCase().includes(q) || e.supplier.toLowerCase().includes(q);
    }
    return true;
  });

  const totalAmount = STOCK_PURCHASES.reduce((sum, e) => sum + e.total, 0);
  const stats = {
    total: STOCK_PURCHASES.length,
    pendingReview: STOCK_PURCHASES.filter(e => e.needsReview).length,
    approved: STOCK_PURCHASES.filter(e => e.status === 'approved').length,
    totalAmount,
  };

  const filterTabs = [
    { value: 'all', label: 'All' },
    { value: 'review', label: 'To Review' },
    { value: 'approved', label: 'Approved' },
  ];

  return (
    <motion.div {...pageAnim} className="min-h-screen bg-black">
      <div className="max-w-full mx-auto px-4 lg:px-6 py-4 space-y-4">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-lg font-bold text-white">Stock Purchases</h1>
            <p className="text-xs text-zinc-400">Manage purchase orders and stock procurement</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 cursor-default">
              <Upload className="w-4 h-4" /> Upload Invoice
            </button>
          </div>
        </div>

        {/* Review Queue Banner */}
        {stats.pendingReview > 0 && (
          <motion.div {...fadeUp} className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 cursor-default">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                <div>
                  <h3 className="font-medium text-yellow-400 text-sm">
                    {stats.pendingReview} invoice{stats.pendingReview > 1 ? 's' : ''} awaiting review
                  </h3>
                  <p className="text-xs text-yellow-400/70">AI extraction had low confidence</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-yellow-400" />
            </div>
          </motion.div>
        )}

        {/* Stats */}
        <motion.div variants={staggerChildren} initial="initial" animate="animate" className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <motion.div variants={fadeUp} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Receipt className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-zinc-500">Total invoices</span>
            </div>
            <p className="text-lg font-bold text-white">{stats.total}</p>
          </motion.div>
          <motion.div variants={fadeUp} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-zinc-500">To Review</span>
            </div>
            <p className="text-lg font-bold text-white">{stats.pendingReview}</p>
          </motion.div>
          <motion.div variants={fadeUp} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Check className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-zinc-500">Approved</span>
            </div>
            <p className="text-lg font-bold text-white">{stats.approved}</p>
          </motion.div>
          <motion.div variants={fadeUp} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Euro className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-zinc-500">Total bedrag</span>
            </div>
            <p className="text-lg font-bold text-white">EUR {stats.totalAmount.toFixed(0)}</p>
          </motion.div>
        </motion.div>

        {/* Filters */}
        <motion.div {...fadeUp} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                placeholder="Search by invoice number or supplier..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/60 text-white placeholder:text-zinc-500 text-sm focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-900/50">
              {filterTabs.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setFilter(tab.value)}
                  className={`px-3 py-1.5 rounded-md text-sm cursor-default transition-colors ${filter === tab.value ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Expense List */}
        {filteredExpenses.length === 0 ? (
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-12 text-center">
            <Receipt className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No invoices found</h3>
            <p className="text-zinc-500">{search ? 'Try a different search' : 'Upload an invoice to get started'}</p>
          </div>
        ) : (
          <motion.div variants={staggerChildren} initial="initial" animate="animate" className="space-y-3">
            {filteredExpenses.map(expense => {
              const st = SP_STATUS_STYLES[expense.status] || SP_STATUS_STYLES.draft;
              const confPercent = Math.round(expense.confidence * 100);
              const confColor = expense.confidence >= 0.85 ? 'text-cyan-400' : expense.confidence >= 0.7 ? 'text-yellow-400' : 'text-red-400';
              const confBarColor = expense.confidence >= 0.85 ? 'bg-cyan-500' : expense.confidence >= 0.7 ? 'bg-yellow-500' : 'bg-red-500';

              return (
                <motion.div key={expense.id} variants={fadeUp} className={`p-3 rounded-lg bg-zinc-900/50 border transition-all cursor-default ${
                  expense.needsReview ? 'border-yellow-500/30 hover:border-yellow-500/50' : 'border-zinc-800/30 hover:border-cyan-500/30'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <div className={`p-2 rounded-lg ${st.bg} border ${st.border}`}>
                        <Receipt className={`w-4 h-4 ${st.text}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-white">{expense.number}</h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${st.bg} ${st.text} ${st.border}`}>{expense.status.replace('_', ' ')}</span>
                          {expense.needsReview && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Review Required
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-zinc-400 mt-1">{expense.supplier}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">EUR {expense.total.toFixed(2)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${confBarColor}`} style={{ width: `${confPercent}%` }} />
                        </div>
                        <span className={`text-xs font-medium ${confColor}`}>{confPercent}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-zinc-800/30 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      {expense.invoiceDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(expense.invoiceDate).toLocaleDateString('nl-NL')}
                        </span>
                      )}
                      <span>{expense.items} items</span>
                    </div>
                    {expense.needsReview ? (
                      <button className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm px-3 py-1.5 rounded-lg flex items-center gap-2 cursor-default">
                        <Eye className="w-4 h-4" /> Review
                      </button>
                    ) : (
                      <button className="text-zinc-400 hover:text-white text-sm px-3 py-1.5 rounded-lg flex items-center gap-2 cursor-default">
                        <Eye className="w-4 h-4" /> View
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// 6. DemoProductsImport  (replica of InventoryImport)
// ============================================================================

const IMPORT_STEPS = [
  { id: 'upload', title: 'Upload File', Icon: Upload, description: 'Upload your inventory spreadsheet' },
  { id: 'map', title: 'Map Columns', Icon: Columns, description: 'Match columns to product fields' },
  { id: 'validate', title: 'Review Data', Icon: CheckCircle, description: 'Review and validate data' },
  { id: 'import', title: 'Import', Icon: Download, description: 'Import products to inventory' },
  { id: 'enrich', title: 'Enrich', Icon: Sparkles, description: 'Auto-enrich with product data' },
];

const FIELD_MAPPING_PREVIEW = [
  { source: 'product_name', target: 'Name', matched: true },
  { source: 'sku_code', target: 'SKU', matched: true },
  { source: 'unit_price', target: 'Price', matched: true },
  { source: 'qty_on_hand', target: 'Stock Quantity', matched: true },
  { source: 'cat', target: 'Category', matched: false },
  { source: 'desc', target: 'Description', matched: false },
];

const SUPPORTED_FORMATS = [
  { name: 'CSV', ext: '.csv', Icon: Table2 },
  { name: 'Excel', ext: '.xlsx', Icon: FileSpreadsheet },
  { name: 'JSON', ext: '.json', Icon: FileText },
];

export function DemoProductsImport({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <motion.div {...pageAnim} className="min-h-screen bg-black">
      <div className="max-w-full mx-auto px-4 lg:px-6 py-4 space-y-4">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-lg font-bold text-white">Import Inventory</h1>
            <p className="text-xs text-zinc-400">Bulk import products from spreadsheets</p>
          </div>
        </div>

        {/* Progress Steps */}
        <motion.div {...fadeUp} className="flex items-center justify-between">
          {IMPORT_STEPS.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            const StepIcon = step.Icon;

            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                    isActive
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                      : isCompleted
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-500'
                  }`}>
                    {isCompleted ? <CheckCircle className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                  </div>
                  <span className={`text-[10px] font-medium ${
                    isActive ? 'text-cyan-400' : isCompleted ? 'text-cyan-400' : 'text-zinc-500'
                  }`}>{step.title}</span>
                </div>
                {index < IMPORT_STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-3 ${index < currentStep ? 'bg-cyan-500' : 'bg-zinc-800'}`} />
                )}
              </div>
            );
          })}
        </motion.div>

        {/* Step Content */}
        <motion.div {...fadeUp} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
          {/* Step 0: Upload */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-bold text-white">{IMPORT_STEPS[0].title}</h2>
                <p className="text-xs mt-1 text-zinc-500">{IMPORT_STEPS[0].description}</p>
              </div>
              <div className="border-2 border-dashed border-zinc-700 rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-default hover:border-cyan-500/40 transition-colors">
                <div className="p-4 bg-cyan-500/10 rounded-2xl mb-4">
                  <Upload className="w-8 h-8 text-cyan-400" />
                </div>
                <h3 className="text-white font-semibold mb-1 text-sm">Drop your file here or click to browse</h3>
                <p className="text-sm text-zinc-500 mb-4">Upload a CSV, Excel, or JSON file to import products</p>
                <div className="flex items-center gap-3">
                  {SUPPORTED_FORMATS.map(fmt => (
                    <div key={fmt.name} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/60 border border-zinc-700/50 rounded-lg">
                      <fmt.Icon className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-xs text-zinc-300">{fmt.name}</span>
                      <span className="text-[10px] text-zinc-600">{fmt.ext}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Map */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white">{IMPORT_STEPS[1].title}</h2>
                  <p className="text-xs mt-1 text-zinc-500">142 rows found in "products_q1_2026.csv"</p>
                </div>
              </div>
              <div className="overflow-hidden rounded-lg border border-zinc-800/60">
                <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center justify-between">
                  <h3 className="text-sm text-white font-medium">Field Mapping</h3>
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-[11px] text-zinc-500">Auto-mapped {FIELD_MAPPING_PREVIEW.filter(f => f.matched).length}/{FIELD_MAPPING_PREVIEW.length} fields</span>
                  </div>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800/50">
                      <th className="text-left text-xs text-zinc-500 font-medium px-4 py-2">Source Column</th>
                      <th className="text-left text-xs text-zinc-500 font-medium px-4 py-2" />
                      <th className="text-left text-xs text-zinc-500 font-medium px-4 py-2">Target Field</th>
                      <th className="text-left text-xs text-zinc-500 font-medium px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FIELD_MAPPING_PREVIEW.map(field => (
                      <tr key={field.source} className="border-b border-zinc-800/30 cursor-default">
                        <td className="px-4 py-2.5 text-sm text-zinc-300 font-mono">{field.source}</td>
                        <td className="px-4 py-2.5"><ArrowRight className="w-4 h-4 text-zinc-600" /></td>
                        <td className="px-4 py-2.5 text-sm text-white">{field.target}</td>
                        <td className="px-4 py-2.5">
                          {field.matched ? (
                            <span className="flex items-center gap-1.5 text-[11px] text-cyan-400">
                              <CheckCircle className="w-3.5 h-3.5" /> Matched
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-[11px] text-yellow-400">
                              <AlertTriangle className="w-3.5 h-3.5" /> Needs Review
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step 2: Validate */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-bold text-white">{IMPORT_STEPS[2].title}</h2>
                <p className="text-xs mt-1 text-zinc-500">{IMPORT_STEPS[2].description}</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-white">142</p>
                  <p className="text-xs text-zinc-500">Total rows</p>
                </div>
                <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-cyan-400">138</p>
                  <p className="text-xs text-zinc-500">Valid</p>
                </div>
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-red-400">4</p>
                  <p className="text-xs text-zinc-500">Errors</p>
                </div>
              </div>
              <p className="text-xs text-zinc-400">4 rows have missing required fields (name). These will be skipped during import.</p>
            </div>
          )}

          {/* Step 3: Import */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-bold text-white">{IMPORT_STEPS[3].title}</h2>
                <p className="text-xs mt-1 text-zinc-500">{IMPORT_STEPS[3].description}</p>
              </div>
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
                  <Download className="w-8 h-8 text-cyan-400" />
                </div>
                <p className="text-sm text-white">Ready to import 138 products</p>
                <p className="text-xs text-zinc-500 mt-1">4 rows will be skipped due to errors</p>
              </div>
            </div>
          )}

          {/* Step 4: Enrich */}
          {currentStep === 4 && (
            <div className="space-y-4 text-center py-8">
              <div className="w-16 h-16 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Import Complete!</h3>
              <p className="text-xs text-zinc-400">126 products created, 12 updated</p>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Sparkles className="w-3 h-3" />
                <span>98 products queued for AI enrichment</span>
              </div>
              <div className="flex items-center justify-center gap-3 mt-4">
                <button onClick={() => setCurrentStep(0)} className="px-3 py-2 rounded-lg border border-zinc-700 text-sm text-zinc-300 cursor-default">Import More Products</button>
                <button className="bg-cyan-500 hover:bg-cyan-600 text-white text-sm px-3 py-2 rounded-lg flex items-center gap-2 cursor-default">
                  <Package className="w-3 h-3" /> View Products
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Navigation Buttons */}
        {currentStep < 4 && (
          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 border border-zinc-700 cursor-default ${currentStep === 0 ? 'opacity-50' : 'text-zinc-300'}`}
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={() => setCurrentStep(Math.min(4, currentStep + 1))}
              className="px-3 py-2 rounded-lg text-sm flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white cursor-default"
            >
              {currentStep === 3 ? (
                <><Download className="w-4 h-4" /> Start Import</>
              ) : (
                <>Next <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// 7. DemoProductsInventory  (stock levels & reorder alerts overview)
// ============================================================================

const INVENTORY_ITEMS = [
  { id: 'inv1', name: 'Wireless Headphones Pro', sku: 'WHP-001', stock: 342, reorder: 100, location: 'Warehouse A', status: 'in_stock', category: 'Electronics', lastRestock: '2026-01-15' },
  { id: 'inv2', name: 'USB-C Hub Adapter', sku: 'UCH-044', stock: 18, reorder: 50, location: 'Warehouse A', status: 'low_stock', category: 'Accessories', lastRestock: '2025-12-20' },
  { id: 'inv3', name: 'Mechanical Keyboard', sku: 'MKB-112', stock: 0, reorder: 30, location: 'Warehouse B', status: 'out_of_stock', category: 'Peripherals', lastRestock: '2025-11-30' },
  { id: 'inv4', name: 'Ergonomic Mouse', sku: 'ERM-078', stock: 156, reorder: 40, location: 'Warehouse A', status: 'in_stock', category: 'Peripherals', lastRestock: '2026-01-08' },
  { id: 'inv5', name: '27" Monitor Stand', sku: 'MST-023', stock: 12, reorder: 25, location: 'Warehouse C', status: 'low_stock', category: 'Furniture', lastRestock: '2025-12-10' },
  { id: 'inv6', name: 'Laptop Sleeve 15"', sku: 'LSV-091', stock: 89, reorder: 30, location: 'Warehouse A', status: 'in_stock', category: 'Accessories', lastRestock: '2026-01-20' },
  { id: 'inv7', name: 'Webcam 4K', sku: 'WBC-055', stock: 0, reorder: 20, location: 'Warehouse B', status: 'out_of_stock', category: 'Electronics', lastRestock: '2025-10-15' },
  { id: 'inv8', name: 'Desk Lamp LED', sku: 'DLL-033', stock: 204, reorder: 50, location: 'Warehouse C', status: 'in_stock', category: 'Furniture', lastRestock: '2026-02-01' },
];

const STOCK_STATUS = {
  in_stock: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30', label: 'In Stock' },
  low_stock: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30', label: 'Low Stock' },
  out_of_stock: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', label: 'Out of Stock' },
};

export function DemoProductsInventory({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = INVENTORY_ITEMS.filter(item => {
    const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalStock = INVENTORY_ITEMS.reduce((sum, i) => sum + i.stock, 0);
  const lowStockCount = INVENTORY_ITEMS.filter(i => i.status === 'low_stock').length;
  const outOfStockCount = INVENTORY_ITEMS.filter(i => i.status === 'out_of_stock').length;

  return (
    <motion.div {...pageAnim} className="min-h-screen bg-black">
      <div className="max-w-full mx-auto px-4 lg:px-6 py-4 space-y-4">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-2">
          <div>
            <h1 className="text-lg font-bold text-white">Inventory Overview</h1>
            <p className="text-xs text-zinc-400">Stock levels and reorder alerts for {companyName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 rounded-lg border border-zinc-700 text-xs text-zinc-300 flex items-center gap-1.5 cursor-default">
              <Download className="w-3 h-3" /> Export
            </button>
            <button className="bg-cyan-500 hover:bg-cyan-600 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-default">
              <Plus className="w-3 h-3" /> Restock Order
            </button>
          </div>
        </div>

        {/* Stats */}
        <motion.div {...fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total SKUs', value: INVENTORY_ITEMS.length, Icon: Package, color: 'cyan' },
            { label: 'Total Units', value: totalStock.toLocaleString(), Icon: Boxes, color: 'cyan' },
            { label: 'Low Stock', value: lowStockCount, Icon: AlertTriangle, color: 'yellow' },
            { label: 'Out of Stock', value: outOfStockCount, Icon: XCircle, color: 'red' },
          ].map(stat => (
            <div key={stat.label} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-500">{stat.label}</span>
                <stat.Icon className={`w-4 h-4 ${stat.color === 'cyan' ? 'text-cyan-400' : stat.color === 'yellow' ? 'text-yellow-400' : 'text-red-400'}`} />
              </div>
              <p className="text-xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </motion.div>

        {/* Filters */}
        <motion.div {...fadeUp} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by name or SKU..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/60 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-cyan-500/40"
            />
          </div>
          <div className="flex items-center gap-2">
            {['all', 'in_stock', 'low_stock', 'out_of_stock'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs border cursor-default transition-all ${
                  statusFilter === s
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                    : 'bg-zinc-900/50 border-zinc-800/60 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                {s === 'all' ? 'All' : STOCK_STATUS[s]?.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Table */}
        <motion.div {...fadeUp} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800/60">
                  <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Product</th>
                  <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">SKU</th>
                  <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Stock</th>
                  <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Reorder Point</th>
                  <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Location</th>
                  <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Status</th>
                  <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Last Restock</th>
                  <th className="text-right text-xs text-zinc-500 font-medium px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const status = STOCK_STATUS[item.status];
                  return (
                    <tr key={item.id} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 cursor-default">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                            <Package className="w-4 h-4 text-cyan-400" />
                          </div>
                          <div>
                            <p className="text-sm text-white font-medium">{item.name}</p>
                            <p className="text-[11px] text-zinc-500">{item.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400 font-mono">{item.sku}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-semibold ${item.stock === 0 ? 'text-red-400' : item.stock <= item.reorder ? 'text-yellow-400' : 'text-white'}`}>
                          {item.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-500">{item.reorder}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Warehouse className="w-3 h-3 text-zinc-600" />
                          <span className="text-xs text-zinc-400">{item.location}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${status.bg} ${status.text} ${status.border}`}>
                          {item.status === 'in_stock' && <CheckCircle className="w-3 h-3" />}
                          {item.status === 'low_stock' && <AlertTriangle className="w-3 h-3" />}
                          {item.status === 'out_of_stock' && <XCircle className="w-3 h-3" />}
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{item.lastRestock}</td>
                      <td className="px-4 py-3 text-right">
                        <button className="p-1 rounded hover:bg-zinc-800 cursor-default">
                          <MoreHorizontal className="w-4 h-4 text-zinc-500" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Footer */}
          <div className="px-4 py-3 border-t border-zinc-800/60 flex items-center justify-between">
            <p className="text-xs text-zinc-500">Showing {filtered.length} of {INVENTORY_ITEMS.length} items</p>
            <div className="flex items-center gap-2">
              <button className="px-2 py-1 rounded text-xs text-zinc-500 border border-zinc-800 cursor-default">
                <ArrowLeft className="w-3 h-3" />
              </button>
              <span className="text-xs text-zinc-400">1 / 1</span>
              <button className="px-2 py-1 rounded text-xs text-zinc-500 border border-zinc-800 cursor-default">
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
