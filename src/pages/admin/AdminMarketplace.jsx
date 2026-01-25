/**
 * Admin Marketplace Management Page
 * Allows platform admins to manage data products (Nests/Datasets)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Star,
  Download,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Database,
  Tag,
  FileText,
  ExternalLink,
  ChevronDown,
  X,
  Save,
  AlertCircle,
  CheckCircle,
  Clock,
  Archive,
  Users,
  Building,
  Cpu,
  Target,
  Heart,
  Leaf,
  Truck,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { createClient } from '@supabase/supabase-js';
import { getStatusColor, BUTTON_STYLES } from '@/lib/adminTheme';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Category icons mapping
const CATEGORY_ICONS = {
  TrendingUp: TrendingUp,
  Users: Users,
  Cpu: Cpu,
  Target: Target,
  Heart: Heart,
  Building: Building,
  Leaf: Leaf,
  Truck: Truck,
  Database: Database,
  Package: Package,
};

// Status labels for display
const STATUS_LABELS = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  published: 'Published',
  archived: 'Archived',
};

// Price type labels
const PRICE_TYPE_LABELS = {
  free: 'Free',
  one_time: 'One-time',
  subscription: 'Subscription',
  usage_based: 'Usage Based',
};

// Helper function to make authenticated API calls
async function adminApi(endpoint, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated. Please log in again.');
  }

  const url = `${SUPABASE_URL}/functions/v1/admin-api${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      ...options.headers,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }
  return data;
}

// Format currency
function formatCurrency(amount, currency = 'EUR') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Format date
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Generate slug from name
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function AdminMarketplace() {
  // State
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modal state
  const [showProductModal, setShowProductModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Product form state
  const [productForm, setProductForm] = useState({
    name: '',
    slug: '',
    description: '',
    long_description: '',
    category_id: '',
    price_type: 'one_time',
    price: 0,
    currency: 'EUR',
    data_format: '',
    data_source: '',
    record_count: '',
    update_frequency: '',
    sample_file_url: '',
    full_file_url: '',
    preview_image_url: '',
    tags: '',
    status: 'draft',
    is_featured: false,
  });

  // Category form state
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    description: '',
    icon: 'Package',
    sort_order: 0,
    is_active: true,
  });

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const data = await adminApi('/marketplace/stats');
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const data = await adminApi('/marketplace/categories');
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, []);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      if (searchQuery) params.append('search', searchQuery);
      if (categoryFilter && categoryFilter !== 'all') params.append('category', categoryFilter);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);

      const data = await adminApi(`/marketplace/products?${params}`);
      setProducts(data.products || []);
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total || 0,
        total_pages: data.pagination?.total_pages || 1,
      }));
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchQuery, categoryFilter, statusFilter, sortBy, sortOrder]);

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchCategories();
  }, [fetchStats, fetchCategories]);

  // Fetch products when filters change
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchProducts();
  };

  // Open product modal for create
  const handleCreateProduct = () => {
    setProductForm({
      name: '',
      slug: '',
      description: '',
      long_description: '',
      category_id: '',
      price_type: 'one_time',
      price: 0,
      currency: 'EUR',
      data_format: '',
      data_source: '',
      record_count: '',
      update_frequency: '',
      sample_file_url: '',
      full_file_url: '',
      preview_image_url: '',
      tags: '',
      status: 'draft',
      is_featured: false,
    });
    setIsEditing(false);
    setShowProductModal(true);
  };

  // Open product modal for edit
  const handleEditProduct = (product) => {
    setProductForm({
      name: product.name || '',
      slug: product.slug || '',
      description: product.description || '',
      long_description: product.long_description || '',
      category_id: product.category_id || '',
      price_type: product.price_type || 'one_time',
      price: product.price || 0,
      currency: product.currency || 'EUR',
      data_format: product.data_format || '',
      data_source: product.data_source || '',
      record_count: product.record_count?.toString() || '',
      update_frequency: product.update_frequency || '',
      sample_file_url: product.sample_file_url || '',
      full_file_url: product.full_file_url || '',
      preview_image_url: product.preview_image_url || '',
      tags: (product.tags || []).join(', '),
      status: product.status || 'draft',
      is_featured: product.is_featured || false,
    });
    setSelectedProduct(product);
    setIsEditing(true);
    setShowProductModal(true);
  };

  // View product details
  const handleViewProduct = async (product) => {
    try {
      const data = await adminApi(`/marketplace/products/${product.id}`);
      setSelectedProduct(data.product);
      setShowDetailModal(true);
    } catch (err) {
      console.error('Failed to fetch product details:', err);
    }
  };

  // Save product
  const handleSaveProduct = async () => {
    setIsSaving(true);
    try {
      const payload = {
        ...productForm,
        price: parseFloat(productForm.price) || 0,
        record_count: productForm.record_count ? parseInt(productForm.record_count) : null,
        tags: productForm.tags ? productForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      };

      if (isEditing && selectedProduct) {
        await adminApi(`/marketplace/products/${selectedProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await adminApi('/marketplace/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setShowProductModal(false);
      fetchProducts();
      fetchStats();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle featured
  const handleToggleFeatured = async (product) => {
    try {
      await adminApi(`/marketplace/products/${product.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_featured: !product.is_featured }),
      });
      fetchProducts();
      fetchStats();
    } catch (err) {
      console.error('Failed to toggle featured:', err);
    }
  };

  // Update product status
  const handleUpdateStatus = async (product, newStatus) => {
    try {
      await adminApi(`/marketplace/products/${product.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      fetchProducts();
      fetchStats();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Delete product
  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;
    setIsSaving(true);
    try {
      await adminApi(`/marketplace/products/${selectedProduct.id}`, {
        method: 'DELETE',
      });
      setShowDeleteConfirm(false);
      setSelectedProduct(null);
      fetchProducts();
      fetchStats();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Open category modal for create
  const handleCreateCategory = () => {
    setCategoryForm({
      name: '',
      slug: '',
      description: '',
      icon: 'Package',
      sort_order: categories.length + 1,
      is_active: true,
    });
    setSelectedCategory(null);
    setShowCategoryModal(true);
  };

  // Open category modal for edit
  const handleEditCategory = (category) => {
    setCategoryForm({
      name: category.name || '',
      slug: category.slug || '',
      description: category.description || '',
      icon: category.icon || 'Package',
      sort_order: category.sort_order || 0,
      is_active: category.is_active !== false,
    });
    setSelectedCategory(category);
    setShowCategoryModal(true);
  };

  // Save category
  const handleSaveCategory = async () => {
    setIsSaving(true);
    try {
      if (selectedCategory) {
        await adminApi(`/marketplace/categories/${selectedCategory.id}`, {
          method: 'PUT',
          body: JSON.stringify(categoryForm),
        });
      } else {
        await adminApi('/marketplace/categories', {
          method: 'POST',
          body: JSON.stringify(categoryForm),
        });
      }
      setShowCategoryModal(false);
      fetchCategories();
      fetchStats();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-generate slug when name changes
  const handleNameChange = (name, formSetter) => {
    formSetter(prev => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }));
  };

  return (
    <div className="min-h-screen bg-black p-4 space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Data Marketplace</h1>
          <p className="text-zinc-400 text-xs">Manage data products and categories</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { fetchStats(); fetchProducts(); fetchCategories(); }}
            className="border-zinc-700 h-7 text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1.5" />
            Refresh
          </Button>
          <Button
            onClick={handleCreateProduct}
            size="sm"
            className="bg-red-500 hover:bg-red-600 text-white h-7 text-xs"
          >
            <Plus className="w-3 h-3 mr-1.5" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-red-400 text-xs">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
            <X className="w-3 h-3" />
          </button>
        </motion.div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-[10px]">Total Products</p>
                <p className="text-lg font-semibold text-white">
                  {stats?.total_products || 0}
                </p>
                <p className="text-[10px] text-zinc-500">
                  {stats?.published_products || 0} published
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                <Package className="w-4 h-4 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-[10px]">Total Revenue</p>
                <p className="text-lg font-semibold text-white">
                  {formatCurrency(stats?.total_revenue || 0)}
                </p>
                <p className="text-[10px] text-zinc-500">
                  {stats?.total_purchases || 0} purchases
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-[10px]">Total Downloads</p>
                <p className="text-lg font-semibold text-white">
                  {stats?.total_downloads?.toLocaleString() || 0}
                </p>
                <p className="text-[10px] text-zinc-500">
                  Across all products
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                <Download className="w-4 h-4 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-[10px]">Featured Products</p>
                <p className="text-lg font-semibold text-white">
                  {stats?.featured_products || 0}
                </p>
                <p className="text-[10px] text-zinc-500">
                  {stats?.draft_products || 0} drafts
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
                <Star className="w-4 h-4 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="products" className="space-y-3">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="products" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400 text-xs">
            <Package className="w-3 h-3 mr-1.5" />
            Products
          </TabsTrigger>
          <TabsTrigger value="categories" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400 text-xs">
            <Tag className="w-3 h-3 mr-1.5" />
            Categories
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-3">
          {/* Filters */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-3">
              <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400" />
                    <Input
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 bg-zinc-800 border-zinc-700 h-7 text-xs"
                    />
                  </div>
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[150px] bg-zinc-800 border-zinc-700 h-7 text-xs">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="all" className="text-xs">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id} className="text-xs">{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px] bg-zinc-800 border-zinc-700 h-7 text-xs">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="all" className="text-xs">All Status</SelectItem>
                    <SelectItem value="draft" className="text-xs">Draft</SelectItem>
                    <SelectItem value="pending_review" className="text-xs">Pending Review</SelectItem>
                    <SelectItem value="published" className="text-xs">Published</SelectItem>
                    <SelectItem value="archived" className="text-xs">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="submit" variant="outline" size="sm" className="border-zinc-700 h-7 text-xs">
                  <Filter className="w-3 h-3 mr-1.5" />
                  Filter
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Products Table */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 text-red-400 animate-spin" />
                </div>
              ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                  <Package className="w-8 h-8 mb-3 opacity-50" />
                  <p className="text-xs">No products found</p>
                  <Button
                    variant="link"
                    onClick={handleCreateProduct}
                    className="text-red-400 text-xs mt-1"
                  >
                    Create your first product
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="text-zinc-400 text-[10px] uppercase py-2 px-3">Product</TableHead>
                      <TableHead className="text-zinc-400 text-[10px] uppercase py-2 px-3">Category</TableHead>
                      <TableHead className="text-zinc-400 text-[10px] uppercase py-2 px-3">Price</TableHead>
                      <TableHead className="text-zinc-400 text-[10px] uppercase py-2 px-3">Status</TableHead>
                      <TableHead className="text-zinc-400 text-[10px] uppercase py-2 px-3 text-center">Stats</TableHead>
                      <TableHead className="text-zinc-400 text-[10px] uppercase py-2 px-3 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => {
                      const CategoryIcon = CATEGORY_ICONS[product.category_icon] || Package;
                      return (
                        <TableRow key={product.id} className="border-zinc-800 hover:bg-zinc-800/30 h-9">
                          <TableCell className="py-1.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {product.preview_image_url ? (
                                  <img
                                    src={product.preview_image_url}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Database className="w-3 h-3 text-zinc-400" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-medium text-white truncate">{product.name}</p>
                                  {product.is_featured && (
                                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                                  )}
                                </div>
                                <p className="text-[10px] text-zinc-500 truncate max-w-[200px]">
                                  {product.description || 'No description'}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-1.5 px-3">
                            {product.category_name ? (
                              <div className="flex items-center gap-1.5">
                                <CategoryIcon className="w-3 h-3 text-zinc-400" />
                                <span className="text-xs text-zinc-300">{product.category_name}</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-zinc-500">Uncategorized</span>
                            )}
                          </TableCell>
                          <TableCell className="py-1.5 px-3">
                            <div>
                              <p className="text-xs text-white font-medium">
                                {product.price_type === 'free' ? 'Free' : formatCurrency(product.price, product.currency)}
                              </p>
                              <p className="text-[10px] text-zinc-500">
                                {PRICE_TYPE_LABELS[product.price_type] || product.price_type}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="py-1.5 px-3">
                            <Badge className={`${getStatusColor(product.status)} text-[10px] px-1.5 py-px`}>
                              {STATUS_LABELS[product.status] || product.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-1.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-3 text-[10px]">
                              <span className="flex items-center gap-1 text-zinc-400">
                                <ShoppingCart className="w-3 h-3" />
                                {product.purchase_count || 0}
                              </span>
                              <span className="flex items-center gap-1 text-zinc-400">
                                <Download className="w-3 h-3" />
                                {product.download_count || 0}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-1.5 px-3 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="hover:bg-zinc-800 h-6 w-6 p-0">
                                  <MoreVertical className="w-3 h-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                                <DropdownMenuItem
                                  onClick={() => handleViewProduct(product)}
                                  className="text-zinc-300 focus:bg-zinc-800 focus:text-white text-xs"
                                >
                                  <Eye className="w-3 h-3 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleEditProduct(product)}
                                  className="text-zinc-300 focus:bg-zinc-800 focus:text-white text-xs"
                                >
                                  <Edit className="w-3 h-3 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleToggleFeatured(product)}
                                  className="text-zinc-300 focus:bg-zinc-800 focus:text-white text-xs"
                                >
                                  <Star className={`w-3 h-3 mr-2 ${product.is_featured ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                                  {product.is_featured ? 'Remove Featured' : 'Make Featured'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-zinc-800" />
                                {product.status !== 'published' && (
                                  <DropdownMenuItem
                                    onClick={() => handleUpdateStatus(product, 'published')}
                                    className="text-green-400 focus:bg-green-500/10 focus:text-green-400 text-xs"
                                  >
                                    <CheckCircle className="w-3 h-3 mr-2" />
                                    Publish
                                  </DropdownMenuItem>
                                )}
                                {product.status !== 'archived' && (
                                  <DropdownMenuItem
                                    onClick={() => handleUpdateStatus(product, 'archived')}
                                    className="text-orange-400 focus:bg-orange-500/10 focus:text-orange-400 text-xs"
                                  >
                                    <Archive className="w-3 h-3 mr-2" />
                                    Archive
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator className="bg-zinc-800" />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setShowDeleteConfirm(true);
                                  }}
                                  className="text-red-400 focus:bg-red-500/10 focus:text-red-400 text-xs"
                                >
                                  <Trash2 className="w-3 h-3 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}

              {/* Pagination */}
              {products.length > 0 && (
                <div className="flex items-center justify-between p-3 border-t border-zinc-800">
                  <p className="text-[10px] text-zinc-400">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} products
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page <= 1}
                      className="border-zinc-700 h-6 text-[10px] px-2"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page >= pagination.total_pages}
                      className="border-zinc-700 h-6 text-[10px] px-2"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={handleCreateCategory} size="sm" className="bg-red-500 hover:bg-red-600 text-white h-7 text-xs">
              <Plus className="w-3 h-3 mr-1.5" />
              Add Category
            </Button>
          </div>

          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-0">
              {categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                  <Tag className="w-8 h-8 mb-3 opacity-50" />
                  <p className="text-xs">No categories found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="text-zinc-400 text-[10px] uppercase py-2 px-3">Category</TableHead>
                      <TableHead className="text-zinc-400 text-[10px] uppercase py-2 px-3">Description</TableHead>
                      <TableHead className="text-zinc-400 text-[10px] uppercase py-2 px-3 text-center">Products</TableHead>
                      <TableHead className="text-zinc-400 text-[10px] uppercase py-2 px-3 text-center">Status</TableHead>
                      <TableHead className="text-zinc-400 text-[10px] uppercase py-2 px-3 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => {
                      const IconComponent = CATEGORY_ICONS[category.icon] || Package;
                      return (
                        <TableRow key={category.id} className="border-zinc-800 hover:bg-zinc-800/30 h-9">
                          <TableCell className="py-1.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center">
                                <IconComponent className="w-3 h-3 text-blue-400" />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-white">{category.name}</p>
                                <p className="text-[10px] text-zinc-500">{category.slug}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-1.5 px-3">
                            <p className="text-xs text-zinc-300 truncate max-w-[200px]">
                              {category.description || '-'}
                            </p>
                          </TableCell>
                          <TableCell className="py-1.5 px-3 text-center">
                            <Badge variant="secondary" className="bg-zinc-800 text-[10px] px-1.5 py-px">
                              {category.product_count || 0}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-1.5 px-3 text-center">
                            <Badge className={`text-[10px] px-1.5 py-px ${category.is_active
                              ? 'bg-green-500/20 text-green-400 border-green-500/30'
                              : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                            }`}>
                              {category.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-1.5 px-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditCategory(category)}
                              className="hover:bg-zinc-800 h-6 w-6 p-0"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Product Create/Edit Modal */}
      <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800 p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-white text-sm">
              {isEditing ? 'Edit Product' : 'Create New Product'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-2">
            {/* Basic Info */}
            <div className="col-span-2">
              <h3 className="text-xs font-medium text-zinc-400 mb-2">Basic Information</h3>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Name *</Label>
              <Input
                value={productForm.name}
                onChange={(e) => handleNameChange(e.target.value, setProductForm)}
                placeholder="Product name"
                className="bg-zinc-800 border-zinc-700 h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Slug *</Label>
              <Input
                value={productForm.slug}
                onChange={(e) => setProductForm(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="product-slug"
                className="bg-zinc-800 border-zinc-700 h-7 text-xs"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Short Description</Label>
              <Textarea
                value={productForm.description}
                onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description"
                rows={2}
                className="bg-zinc-800 border-zinc-700 text-xs"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Full Description</Label>
              <Textarea
                value={productForm.long_description}
                onChange={(e) => setProductForm(prev => ({ ...prev, long_description: e.target.value }))}
                placeholder="Detailed description"
                rows={3}
                className="bg-zinc-800 border-zinc-700 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select
                value={productForm.category_id}
                onValueChange={(v) => setProductForm(prev => ({ ...prev, category_id: v }))}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 h-7 text-xs">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} className="text-xs">{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tags</Label>
              <Input
                value={productForm.tags}
                onChange={(e) => setProductForm(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="tag1, tag2, tag3"
                className="bg-zinc-800 border-zinc-700 h-7 text-xs"
              />
            </div>

            {/* Pricing */}
            <div className="col-span-2 pt-3">
              <h3 className="text-xs font-medium text-zinc-400 mb-2">Pricing</h3>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Price Type</Label>
              <Select
                value={productForm.price_type}
                onValueChange={(v) => setProductForm(prev => ({ ...prev, price_type: v }))}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="free" className="text-xs">Free</SelectItem>
                  <SelectItem value="one_time" className="text-xs">One-time</SelectItem>
                  <SelectItem value="subscription" className="text-xs">Subscription</SelectItem>
                  <SelectItem value="usage_based" className="text-xs">Usage Based</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Price</Label>
                <Input
                  type="number"
                  value={productForm.price}
                  onChange={(e) => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="0.00"
                  className="bg-zinc-800 border-zinc-700 h-7 text-xs"
                  disabled={productForm.price_type === 'free'}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Currency</Label>
                <Select
                  value={productForm.currency}
                  onValueChange={(v) => setProductForm(prev => ({ ...prev, currency: v }))}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="EUR" className="text-xs">EUR</SelectItem>
                    <SelectItem value="USD" className="text-xs">USD</SelectItem>
                    <SelectItem value="GBP" className="text-xs">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Data Info */}
            <div className="col-span-2 pt-3">
              <h3 className="text-xs font-medium text-zinc-400 mb-2">Data Information</h3>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data Format</Label>
              <Input
                value={productForm.data_format}
                onChange={(e) => setProductForm(prev => ({ ...prev, data_format: e.target.value }))}
                placeholder="CSV, JSON, API, etc."
                className="bg-zinc-800 border-zinc-700 h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data Source</Label>
              <Input
                value={productForm.data_source}
                onChange={(e) => setProductForm(prev => ({ ...prev, data_source: e.target.value }))}
                placeholder="Where the data comes from"
                className="bg-zinc-800 border-zinc-700 h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Record Count</Label>
              <Input
                type="number"
                value={productForm.record_count}
                onChange={(e) => setProductForm(prev => ({ ...prev, record_count: e.target.value }))}
                placeholder="Number of records"
                className="bg-zinc-800 border-zinc-700 h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Update Frequency</Label>
              <Select
                value={productForm.update_frequency}
                onValueChange={(v) => setProductForm(prev => ({ ...prev, update_frequency: v }))}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 h-7 text-xs">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="real_time" className="text-xs">Real-time</SelectItem>
                  <SelectItem value="hourly" className="text-xs">Hourly</SelectItem>
                  <SelectItem value="daily" className="text-xs">Daily</SelectItem>
                  <SelectItem value="weekly" className="text-xs">Weekly</SelectItem>
                  <SelectItem value="monthly" className="text-xs">Monthly</SelectItem>
                  <SelectItem value="quarterly" className="text-xs">Quarterly</SelectItem>
                  <SelectItem value="one_time" className="text-xs">One-time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Files */}
            <div className="col-span-2 pt-3">
              <h3 className="text-xs font-medium text-zinc-400 mb-2">Files & Media</h3>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Preview Image URL</Label>
              <Input
                value={productForm.preview_image_url}
                onChange={(e) => setProductForm(prev => ({ ...prev, preview_image_url: e.target.value }))}
                placeholder="https://..."
                className="bg-zinc-800 border-zinc-700 h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Sample File URL</Label>
              <Input
                value={productForm.sample_file_url}
                onChange={(e) => setProductForm(prev => ({ ...prev, sample_file_url: e.target.value }))}
                placeholder="https://..."
                className="bg-zinc-800 border-zinc-700 h-7 text-xs"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Full Data File URL</Label>
              <Input
                value={productForm.full_file_url}
                onChange={(e) => setProductForm(prev => ({ ...prev, full_file_url: e.target.value }))}
                placeholder="https://..."
                className="bg-zinc-800 border-zinc-700 h-7 text-xs"
              />
            </div>

            {/* Status & Featured */}
            <div className="col-span-2 pt-3">
              <h3 className="text-xs font-medium text-zinc-400 mb-2">Publishing</h3>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select
                value={productForm.status}
                onValueChange={(v) => setProductForm(prev => ({ ...prev, status: v }))}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="draft" className="text-xs">Draft</SelectItem>
                  <SelectItem value="pending_review" className="text-xs">Pending Review</SelectItem>
                  <SelectItem value="published" className="text-xs">Published</SelectItem>
                  <SelectItem value="archived" className="text-xs">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <Switch
                checked={productForm.is_featured}
                onCheckedChange={(checked) => setProductForm(prev => ({ ...prev, is_featured: checked }))}
              />
              <Label className="cursor-pointer text-xs">Featured Product</Label>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setShowProductModal(false)}
              className="border-zinc-700 h-7 text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveProduct}
              disabled={isSaving || !productForm.name || !productForm.slug}
              className="bg-red-500 hover:bg-red-600 text-white h-7 text-xs"
            >
              {isSaving && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800 p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-white flex items-center gap-2 text-sm">
              {selectedProduct?.name}
              {selectedProduct?.is_featured && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
            </DialogTitle>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-4 py-2">
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <Badge className={`${getStatusColor(selectedProduct.status)} text-[10px] px-1.5 py-px`}>
                  {STATUS_LABELS[selectedProduct.status]}
                </Badge>
                {selectedProduct.category_name && (
                  <Badge variant="secondary" className="bg-zinc-800 text-[10px] px-1.5 py-px">
                    {selectedProduct.category_name}
                  </Badge>
                )}
              </div>

              {/* Description */}
              {selectedProduct.description && (
                <div>
                  <h4 className="text-xs font-medium text-zinc-400 mb-1.5">Description</h4>
                  <p className="text-xs text-zinc-300">{selectedProduct.description}</p>
                </div>
              )}

              {/* Pricing & Stats */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-zinc-800/50 border-zinc-700">
                  <CardContent className="p-3">
                    <p className="text-[10px] text-zinc-400">Price</p>
                    <p className="text-lg font-semibold text-white">
                      {selectedProduct.price_type === 'free' ? 'Free' : formatCurrency(selectedProduct.price, selectedProduct.currency)}
                    </p>
                    <p className="text-[10px] text-zinc-500">{PRICE_TYPE_LABELS[selectedProduct.price_type]}</p>
                  </CardContent>
                </Card>
                <Card className="bg-zinc-800/50 border-zinc-700">
                  <CardContent className="p-3">
                    <p className="text-[10px] text-zinc-400">Stats</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-xs text-white">
                        <ShoppingCart className="w-3 h-3 text-zinc-400" />
                        {selectedProduct.purchase_count || 0}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-white">
                        <Download className="w-3 h-3 text-zinc-400" />
                        {selectedProduct.total_downloads || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Data Info */}
              <div>
                <h4 className="text-xs font-medium text-zinc-400 mb-2">Data Information</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {selectedProduct.data_format && (
                    <div>
                      <p className="text-[10px] text-zinc-500">Format</p>
                      <p className="text-white">{selectedProduct.data_format}</p>
                    </div>
                  )}
                  {selectedProduct.record_count && (
                    <div>
                      <p className="text-[10px] text-zinc-500">Records</p>
                      <p className="text-white">{selectedProduct.record_count.toLocaleString()}</p>
                    </div>
                  )}
                  {selectedProduct.update_frequency && (
                    <div>
                      <p className="text-[10px] text-zinc-500">Update Frequency</p>
                      <p className="text-white capitalize">{selectedProduct.update_frequency.replace('_', ' ')}</p>
                    </div>
                  )}
                  {selectedProduct.data_source && (
                    <div>
                      <p className="text-[10px] text-zinc-500">Data Source</p>
                      <p className="text-white">{selectedProduct.data_source}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Purchases */}
              {selectedProduct.recent_purchases?.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-zinc-400 mb-2">Recent Purchases</h4>
                  <div className="space-y-1.5">
                    {selectedProduct.recent_purchases.map((purchase) => (
                      <div key={purchase.id} className="flex items-center justify-between p-2 bg-zinc-800/50 rounded-lg">
                        <div>
                          <p className="text-xs text-white">{purchase.user_name || purchase.user_email}</p>
                          {purchase.company_name && (
                            <p className="text-[10px] text-zinc-400">{purchase.company_name}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-white">{formatCurrency(purchase.amount, purchase.currency)}</p>
                          <p className="text-[10px] text-zinc-400">{formatDate(purchase.purchased_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="pt-3 border-t border-zinc-800 text-[10px] text-zinc-500">
                <p>Created: {formatDate(selectedProduct.created_at)}</p>
                {selectedProduct.created_by_info && (
                  <p>By: {selectedProduct.created_by_info.name || selectedProduct.created_by_info.email}</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setShowDetailModal(false)}
              className="border-zinc-700 h-7 text-xs"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setShowDetailModal(false);
                handleEditProduct(selectedProduct);
              }}
              className="bg-red-500 hover:bg-red-600 text-white h-7 text-xs"
            >
              <Edit className="w-3 h-3 mr-1.5" />
              Edit Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Modal */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent className="max-w-sm bg-zinc-900 border-zinc-800 p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-white text-sm">
              {selectedCategory ? 'Edit Category' : 'Create Category'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Name *</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) => handleNameChange(e.target.value, setCategoryForm)}
                placeholder="Category name"
                className="bg-zinc-800 border-zinc-700 h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Slug *</Label>
              <Input
                value={categoryForm.slug}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="category-slug"
                className="bg-zinc-800 border-zinc-700 h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea
                value={categoryForm.description}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Category description"
                rows={2}
                className="bg-zinc-800 border-zinc-700 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Icon</Label>
              <Select
                value={categoryForm.icon}
                onValueChange={(v) => setCategoryForm(prev => ({ ...prev, icon: v }))}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {Object.keys(CATEGORY_ICONS).map((icon) => {
                    const IconComp = CATEGORY_ICONS[icon];
                    return (
                      <SelectItem key={icon} value={icon} className="text-xs">
                        <div className="flex items-center gap-2">
                          <IconComp className="w-3 h-3" />
                          {icon}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Sort Order</Label>
              <Input
                type="number"
                value={categoryForm.sort_order}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                className="bg-zinc-800 border-zinc-700 h-7 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={categoryForm.is_active}
                onCheckedChange={(checked) => setCategoryForm(prev => ({ ...prev, is_active: checked }))}
              />
              <Label className="cursor-pointer text-xs">Active</Label>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setShowCategoryModal(false)}
              className="border-zinc-700 h-7 text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCategory}
              disabled={isSaving || !categoryForm.name || !categoryForm.slug}
              className="bg-red-500 hover:bg-red-600 text-white h-7 text-xs"
            >
              {isSaving && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
              {selectedCategory ? 'Save Changes' : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm bg-zinc-900 border-zinc-800 p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-white text-sm">Delete Product</DialogTitle>
          </DialogHeader>

          <div className="py-2">
            <p className="text-xs text-zinc-300">
              Are you sure you want to delete <span className="font-semibold text-white">{selectedProduct?.name}</span>?
            </p>
            <p className="text-[10px] text-zinc-500 mt-1.5">
              This action cannot be undone. All purchases and downloads associated with this product will also be deleted.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              className="border-zinc-700 h-7 text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteProduct}
              disabled={isSaving}
              className="bg-red-500 hover:bg-red-600 text-white h-7 text-xs"
            >
              {isSaving && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
              Delete Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
