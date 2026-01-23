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

// Status badge colors
const STATUS_COLORS = {
  draft: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  pending_review: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  published: 'bg-green-500/20 text-green-400 border-green-500/30',
  archived: 'bg-red-500/20 text-red-400 border-red-500/30',
};

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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Data Marketplace</h1>
          <p className="text-gray-400 mt-1">Manage data products and categories</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => { fetchStats(); fetchProducts(); fetchCategories(); }}
            className="border-white/10 bg-white/5 hover:bg-white/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={handleCreateProduct}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-400">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#1a1a2e]/50 border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Products</p>
                <p className="text-2xl font-semibold text-white mt-1">
                  {stats?.total_products || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.published_products || 0} published
                </p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Package className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a2e]/50 border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Revenue</p>
                <p className="text-2xl font-semibold text-white mt-1">
                  {formatCurrency(stats?.total_revenue || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.total_purchases || 0} purchases
                </p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a2e]/50 border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Downloads</p>
                <p className="text-2xl font-semibold text-white mt-1">
                  {stats?.total_downloads?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Across all products
                </p>
              </div>
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Download className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a2e]/50 border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Featured Products</p>
                <p className="text-2xl font-semibold text-white mt-1">
                  {stats?.featured_products || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.draft_products || 0} drafts
                </p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <Star className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="products" className="space-y-4">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="products" className="data-[state=active]:bg-white/10">
            <Package className="w-4 h-4 mr-2" />
            Products
          </TabsTrigger>
          <TabsTrigger value="categories" className="data-[state=active]:bg-white/10">
            <Tag className="w-4 h-4 mr-2" />
            Categories
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          {/* Filters */}
          <Card className="bg-[#1a1a2e]/50 border-white/10">
            <CardContent className="p-4">
              <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white/5 border-white/10"
                    />
                  </div>
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px] bg-white/5 border-white/10">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px] bg-white/5 border-white/10">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending_review">Pending Review</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="submit" variant="outline" className="border-white/10 bg-white/5">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Products Table */}
          <Card className="bg-[#1a1a2e]/50 border-white/10">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                </div>
              ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <Package className="w-12 h-12 mb-4 opacity-50" />
                  <p>No products found</p>
                  <Button
                    variant="link"
                    onClick={handleCreateProduct}
                    className="text-blue-400 mt-2"
                  >
                    Create your first product
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-gray-400">Product</TableHead>
                      <TableHead className="text-gray-400">Category</TableHead>
                      <TableHead className="text-gray-400">Price</TableHead>
                      <TableHead className="text-gray-400">Status</TableHead>
                      <TableHead className="text-gray-400 text-center">Stats</TableHead>
                      <TableHead className="text-gray-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => {
                      const CategoryIcon = CATEGORY_ICONS[product.category_icon] || Package;
                      return (
                        <TableRow key={product.id} className="border-white/10 hover:bg-white/5">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden">
                                {product.preview_image_url ? (
                                  <img
                                    src={product.preview_image_url}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Database className="w-5 h-5 text-gray-400" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-white">{product.name}</p>
                                  {product.is_featured && (
                                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                  )}
                                </div>
                                <p className="text-sm text-gray-400 truncate max-w-[300px]">
                                  {product.description || 'No description'}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {product.category_name ? (
                              <div className="flex items-center gap-2">
                                <CategoryIcon className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-300">{product.category_name}</span>
                              </div>
                            ) : (
                              <span className="text-gray-500">Uncategorized</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-white font-medium">
                                {product.price_type === 'free' ? 'Free' : formatCurrency(product.price, product.currency)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {PRICE_TYPE_LABELS[product.price_type] || product.price_type}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${STATUS_COLORS[product.status]} border`}>
                              {STATUS_LABELS[product.status] || product.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-4 text-sm">
                              <span className="flex items-center gap-1 text-gray-400">
                                <ShoppingCart className="w-3 h-3" />
                                {product.purchase_count || 0}
                              </span>
                              <span className="flex items-center gap-1 text-gray-400">
                                <Download className="w-3 h-3" />
                                {product.download_count || 0}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="hover:bg-white/10">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-[#1a1a2e] border-white/10">
                                <DropdownMenuItem
                                  onClick={() => handleViewProduct(product)}
                                  className="text-gray-300 focus:bg-white/10 focus:text-white"
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleEditProduct(product)}
                                  className="text-gray-300 focus:bg-white/10 focus:text-white"
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleToggleFeatured(product)}
                                  className="text-gray-300 focus:bg-white/10 focus:text-white"
                                >
                                  <Star className={`w-4 h-4 mr-2 ${product.is_featured ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                                  {product.is_featured ? 'Remove Featured' : 'Make Featured'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/10" />
                                {product.status !== 'published' && (
                                  <DropdownMenuItem
                                    onClick={() => handleUpdateStatus(product, 'published')}
                                    className="text-green-400 focus:bg-green-500/10 focus:text-green-400"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Publish
                                  </DropdownMenuItem>
                                )}
                                {product.status !== 'archived' && (
                                  <DropdownMenuItem
                                    onClick={() => handleUpdateStatus(product, 'archived')}
                                    className="text-orange-400 focus:bg-orange-500/10 focus:text-orange-400"
                                  >
                                    <Archive className="w-4 h-4 mr-2" />
                                    Archive
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setShowDeleteConfirm(true);
                                  }}
                                  className="text-red-400 focus:bg-red-500/10 focus:text-red-400"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
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
                <div className="flex items-center justify-between p-4 border-t border-white/10">
                  <p className="text-sm text-gray-400">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} products
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page <= 1}
                      className="border-white/10 bg-white/5"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page >= pagination.total_pages}
                      className="border-white/10 bg-white/5"
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
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={handleCreateCategory} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </div>

          <Card className="bg-[#1a1a2e]/50 border-white/10">
            <CardContent className="p-0">
              {categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <Tag className="w-12 h-12 mb-4 opacity-50" />
                  <p>No categories found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-gray-400">Category</TableHead>
                      <TableHead className="text-gray-400">Description</TableHead>
                      <TableHead className="text-gray-400 text-center">Products</TableHead>
                      <TableHead className="text-gray-400 text-center">Status</TableHead>
                      <TableHead className="text-gray-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => {
                      const IconComponent = CATEGORY_ICONS[category.icon] || Package;
                      return (
                        <TableRow key={category.id} className="border-white/10 hover:bg-white/5">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-white/10 rounded-lg">
                                <IconComponent className="w-5 h-5 text-blue-400" />
                              </div>
                              <div>
                                <p className="font-medium text-white">{category.name}</p>
                                <p className="text-xs text-gray-500">{category.slug}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-gray-300 truncate max-w-[300px]">
                              {category.description || '-'}
                            </p>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="bg-white/10">
                              {category.product_count || 0}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={category.is_active
                              ? 'bg-green-500/20 text-green-400 border-green-500/30'
                              : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                            }>
                              {category.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditCategory(category)}
                              className="hover:bg-white/10"
                            >
                              <Edit className="w-4 h-4" />
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#1a1a2e] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">
              {isEditing ? 'Edit Product' : 'Create New Product'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            {/* Basic Info */}
            <div className="col-span-2">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Basic Information</h3>
            </div>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={productForm.name}
                onChange={(e) => handleNameChange(e.target.value, setProductForm)}
                placeholder="Product name"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug *</Label>
              <Input
                value={productForm.slug}
                onChange={(e) => setProductForm(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="product-slug"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Short Description</Label>
              <Textarea
                value={productForm.description}
                onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description"
                rows={2}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Full Description</Label>
              <Textarea
                value={productForm.long_description}
                onChange={(e) => setProductForm(prev => ({ ...prev, long_description: e.target.value }))}
                placeholder="Detailed description"
                rows={4}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={productForm.category_id}
                onValueChange={(v) => setProductForm(prev => ({ ...prev, category_id: v }))}
              >
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <Input
                value={productForm.tags}
                onChange={(e) => setProductForm(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="tag1, tag2, tag3"
                className="bg-white/5 border-white/10"
              />
            </div>

            {/* Pricing */}
            <div className="col-span-2 pt-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Pricing</h3>
            </div>
            <div className="space-y-2">
              <Label>Price Type</Label>
              <Select
                value={productForm.price_type}
                onValueChange={(v) => setProductForm(prev => ({ ...prev, price_type: v }))}
              >
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="one_time">One-time</SelectItem>
                  <SelectItem value="subscription">Subscription</SelectItem>
                  <SelectItem value="usage_based">Usage Based</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Price</Label>
                <Input
                  type="number"
                  value={productForm.price}
                  onChange={(e) => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="0.00"
                  className="bg-white/5 border-white/10"
                  disabled={productForm.price_type === 'free'}
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={productForm.currency}
                  onValueChange={(v) => setProductForm(prev => ({ ...prev, currency: v }))}
                >
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Data Info */}
            <div className="col-span-2 pt-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Data Information</h3>
            </div>
            <div className="space-y-2">
              <Label>Data Format</Label>
              <Input
                value={productForm.data_format}
                onChange={(e) => setProductForm(prev => ({ ...prev, data_format: e.target.value }))}
                placeholder="CSV, JSON, API, etc."
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>Data Source</Label>
              <Input
                value={productForm.data_source}
                onChange={(e) => setProductForm(prev => ({ ...prev, data_source: e.target.value }))}
                placeholder="Where the data comes from"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>Record Count</Label>
              <Input
                type="number"
                value={productForm.record_count}
                onChange={(e) => setProductForm(prev => ({ ...prev, record_count: e.target.value }))}
                placeholder="Number of records"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>Update Frequency</Label>
              <Select
                value={productForm.update_frequency}
                onValueChange={(v) => setProductForm(prev => ({ ...prev, update_frequency: v }))}
              >
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="real_time">Real-time</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="one_time">One-time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Files */}
            <div className="col-span-2 pt-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Files & Media</h3>
            </div>
            <div className="space-y-2">
              <Label>Preview Image URL</Label>
              <Input
                value={productForm.preview_image_url}
                onChange={(e) => setProductForm(prev => ({ ...prev, preview_image_url: e.target.value }))}
                placeholder="https://..."
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>Sample File URL</Label>
              <Input
                value={productForm.sample_file_url}
                onChange={(e) => setProductForm(prev => ({ ...prev, sample_file_url: e.target.value }))}
                placeholder="https://..."
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Full Data File URL</Label>
              <Input
                value={productForm.full_file_url}
                onChange={(e) => setProductForm(prev => ({ ...prev, full_file_url: e.target.value }))}
                placeholder="https://..."
                className="bg-white/5 border-white/10"
              />
            </div>

            {/* Status & Featured */}
            <div className="col-span-2 pt-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Publishing</h3>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={productForm.status}
                onValueChange={(v) => setProductForm(prev => ({ ...prev, status: v }))}
              >
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending_review">Pending Review</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch
                checked={productForm.is_featured}
                onCheckedChange={(checked) => setProductForm(prev => ({ ...prev, is_featured: checked }))}
              />
              <Label className="cursor-pointer">Featured Product</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowProductModal(false)}
              className="border-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveProduct}
              disabled={isSaving || !productForm.name || !productForm.slug}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1a1a2e] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              {selectedProduct?.name}
              {selectedProduct?.is_featured && <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />}
            </DialogTitle>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-6 py-4">
              {/* Status Badge */}
              <div className="flex items-center gap-3">
                <Badge className={`${STATUS_COLORS[selectedProduct.status]} border`}>
                  {STATUS_LABELS[selectedProduct.status]}
                </Badge>
                {selectedProduct.category_name && (
                  <Badge variant="secondary" className="bg-white/10">
                    {selectedProduct.category_name}
                  </Badge>
                )}
              </div>

              {/* Description */}
              {selectedProduct.description && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Description</h4>
                  <p className="text-gray-300">{selectedProduct.description}</p>
                </div>
              )}

              {/* Pricing & Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-400">Price</p>
                    <p className="text-xl font-semibold text-white mt-1">
                      {selectedProduct.price_type === 'free' ? 'Free' : formatCurrency(selectedProduct.price, selectedProduct.currency)}
                    </p>
                    <p className="text-xs text-gray-500">{PRICE_TYPE_LABELS[selectedProduct.price_type]}</p>
                  </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-400">Stats</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1 text-white">
                        <ShoppingCart className="w-4 h-4 text-gray-400" />
                        {selectedProduct.purchase_count || 0}
                      </span>
                      <span className="flex items-center gap-1 text-white">
                        <Download className="w-4 h-4 text-gray-400" />
                        {selectedProduct.total_downloads || 0}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Data Info */}
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-3">Data Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedProduct.data_format && (
                    <div>
                      <p className="text-gray-500">Format</p>
                      <p className="text-white">{selectedProduct.data_format}</p>
                    </div>
                  )}
                  {selectedProduct.record_count && (
                    <div>
                      <p className="text-gray-500">Records</p>
                      <p className="text-white">{selectedProduct.record_count.toLocaleString()}</p>
                    </div>
                  )}
                  {selectedProduct.update_frequency && (
                    <div>
                      <p className="text-gray-500">Update Frequency</p>
                      <p className="text-white capitalize">{selectedProduct.update_frequency.replace('_', ' ')}</p>
                    </div>
                  )}
                  {selectedProduct.data_source && (
                    <div>
                      <p className="text-gray-500">Data Source</p>
                      <p className="text-white">{selectedProduct.data_source}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Purchases */}
              {selectedProduct.recent_purchases?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Recent Purchases</h4>
                  <div className="space-y-2">
                    {selectedProduct.recent_purchases.map((purchase) => (
                      <div key={purchase.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div>
                          <p className="text-white text-sm">{purchase.user_name || purchase.user_email}</p>
                          {purchase.company_name && (
                            <p className="text-xs text-gray-400">{purchase.company_name}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-white text-sm">{formatCurrency(purchase.amount, purchase.currency)}</p>
                          <p className="text-xs text-gray-400">{formatDate(purchase.purchased_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="pt-4 border-t border-white/10 text-sm text-gray-500">
                <p>Created: {formatDate(selectedProduct.created_at)}</p>
                {selectedProduct.created_by_info && (
                  <p>By: {selectedProduct.created_by_info.name || selectedProduct.created_by_info.email}</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDetailModal(false)}
              className="border-white/10"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setShowDetailModal(false);
                handleEditProduct(selectedProduct);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Modal */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent className="max-w-md bg-[#1a1a2e] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedCategory ? 'Edit Category' : 'Create Category'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) => handleNameChange(e.target.value, setCategoryForm)}
                placeholder="Category name"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug *</Label>
              <Input
                value={categoryForm.slug}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="category-slug"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={categoryForm.description}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Category description"
                rows={3}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <Select
                value={categoryForm.icon}
                onValueChange={(v) => setCategoryForm(prev => ({ ...prev, icon: v }))}
              >
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(CATEGORY_ICONS).map((icon) => {
                    const IconComp = CATEGORY_ICONS[icon];
                    return (
                      <SelectItem key={icon} value={icon}>
                        <div className="flex items-center gap-2">
                          <IconComp className="w-4 h-4" />
                          {icon}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={categoryForm.sort_order}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={categoryForm.is_active}
                onCheckedChange={(checked) => setCategoryForm(prev => ({ ...prev, is_active: checked }))}
              />
              <Label className="cursor-pointer">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCategoryModal(false)}
              className="border-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCategory}
              disabled={isSaving || !categoryForm.name || !categoryForm.slug}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedCategory ? 'Save Changes' : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md bg-[#1a1a2e] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Product</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-gray-300">
              Are you sure you want to delete <span className="font-semibold text-white">{selectedProduct?.name}</span>?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This action cannot be undone. All purchases and downloads associated with this product will also be deleted.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              className="border-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteProduct}
              disabled={isSaving}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
