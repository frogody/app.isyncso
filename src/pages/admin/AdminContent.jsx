/**
 * AdminContent Component
 * Content Management for admin panel - Pages, Posts, Help Articles, Announcements, Email Templates
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAdmin } from '@/components/admin/AdminGuard';
import {
  FileText,
  Newspaper,
  HelpCircle,
  Megaphone,
  Mail,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  Tag,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Info,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ADMIN_API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api`;

export default function AdminContent() {
  const { session } = useAdmin();
  const [activeTab, setActiveTab] = useState('pages');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pages state
  const [pages, setPages] = useState([]);
  const [pagesTotal, setPagesTotal] = useState(0);
  const [pagesFilter, setPagesFilter] = useState({ status: 'all', search: '' });

  // Posts state
  const [posts, setPosts] = useState([]);
  const [postsTotal, setPostsTotal] = useState(0);
  const [postsFilter, setPostsFilter] = useState({ status: 'all', category: 'all', search: '' });

  // Help articles state
  const [articles, setArticles] = useState([]);
  const [articlesTotal, setArticlesTotal] = useState(0);
  const [articlesFilter, setArticlesFilter] = useState({ status: 'all', category: 'all', search: '' });

  // Announcements state
  const [announcements, setAnnouncements] = useState([]);

  // Email templates state
  const [templates, setTemplates] = useState([]);

  // Categories state
  const [categories, setCategories] = useState([]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchWithAuth = async (endpoint, options = {}) => {
    const response = await fetch(`${ADMIN_API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }
    return response.json();
  };

  const fetchStats = async () => {
    try {
      const data = await fetchWithAuth('/content/stats');
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchPages = async () => {
    try {
      const params = new URLSearchParams();
      if (pagesFilter.status !== 'all') params.append('status', pagesFilter.status);
      if (pagesFilter.search) params.append('search', pagesFilter.search);
      const data = await fetchWithAuth(`/content/pages?${params}`);
      setPages(data.items || []);
      setPagesTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch pages:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      const params = new URLSearchParams();
      if (postsFilter.status !== 'all') params.append('status', postsFilter.status);
      if (postsFilter.category !== 'all') params.append('category', postsFilter.category);
      if (postsFilter.search) params.append('search', postsFilter.search);
      const data = await fetchWithAuth(`/content/posts?${params}`);
      setPosts(data.items || []);
      setPostsTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    }
  };

  const fetchArticles = async () => {
    try {
      const params = new URLSearchParams();
      if (articlesFilter.status !== 'all') params.append('status', articlesFilter.status);
      if (articlesFilter.category !== 'all') params.append('category', articlesFilter.category);
      if (articlesFilter.search) params.append('search', articlesFilter.search);
      const data = await fetchWithAuth(`/content/help-articles?${params}`);
      setArticles(data.items || []);
      setArticlesTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch articles:', error);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const data = await fetchWithAuth('/content/announcements');
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const data = await fetchWithAuth('/content/email-templates');
      setTemplates(data || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await fetchWithAuth('/content/categories');
      setCategories(data || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      fetchStats(),
      fetchPages(),
      fetchPosts(),
      fetchArticles(),
      fetchAnnouncements(),
      fetchTemplates(),
      fetchCategories(),
    ]);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success('Content refreshed');
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    fetchPages();
  }, [pagesFilter]);

  useEffect(() => {
    fetchPosts();
  }, [postsFilter]);

  useEffect(() => {
    fetchArticles();
  }, [articlesFilter]);

  const openModal = (type, item = null) => {
    setModalType(type);
    setEditingItem(item);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType(null);
    setEditingItem(null);
  };

  const handleSave = async (formData) => {
    setSaving(true);
    try {
      let endpoint = '';
      let method = editingItem ? 'PUT' : 'POST';

      switch (modalType) {
        case 'page':
          endpoint = editingItem ? `/content/pages/${editingItem.id}` : '/content/pages';
          break;
        case 'post':
          endpoint = editingItem ? `/content/posts/${editingItem.id}` : '/content/posts';
          break;
        case 'article':
          endpoint = editingItem ? `/content/help-articles/${editingItem.id}` : '/content/help-articles';
          break;
        case 'announcement':
          endpoint = editingItem ? `/content/announcements/${editingItem.id}` : '/content/announcements';
          break;
        case 'template':
          endpoint = `/content/email-templates/${editingItem.id}`;
          method = 'PUT';
          break;
      }

      await fetchWithAuth(endpoint, { method, body: JSON.stringify(formData) });
      toast.success(editingItem ? 'Updated successfully' : 'Created successfully');
      closeModal();
      loadData();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (type, id) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      let endpoint = '';
      switch (type) {
        case 'page':
          endpoint = `/content/pages/${id}`;
          break;
        case 'post':
          endpoint = `/content/posts/${id}`;
          break;
        case 'article':
          endpoint = `/content/help-articles/${id}`;
          break;
      }

      await fetchWithAuth(endpoint, { method: 'DELETE' });
      toast.success('Deleted successfully');
      loadData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      published: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      draft: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      archived: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    };
    return <Badge className={cn('text-xs', styles[status])}>{status}</Badge>;
  };

  const getAnnouncementIcon = (type) => {
    const icons = {
      info: <Info className="w-4 h-4 text-blue-400" />,
      warning: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
      success: <CheckCircle className="w-4 h-4 text-emerald-400" />,
      error: <AlertCircle className="w-4 h-4 text-red-400" />,
    };
    return icons[type] || icons.info;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 text-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Content Management</h1>
          <p className="text-zinc-400">Manage pages, posts, help articles, and more</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="border-zinc-700"
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.total_pages || 0}</p>
                <p className="text-xs text-zinc-500">Total Pages</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Newspaper className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.published_posts || 0}</p>
                <p className="text-xs text-zinc-500">Published Posts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.total_help_articles || 0}</p>
                <p className="text-xs text-zinc-500">Help Articles</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.active_announcements || 0}</p>
                <p className="text-xs text-zinc-500">Active Announcements</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="pages" className="data-[state=active]:bg-zinc-800">
            <FileText className="w-4 h-4 mr-2" />
            Pages
          </TabsTrigger>
          <TabsTrigger value="posts" className="data-[state=active]:bg-zinc-800">
            <Newspaper className="w-4 h-4 mr-2" />
            Blog Posts
          </TabsTrigger>
          <TabsTrigger value="help" className="data-[state=active]:bg-zinc-800">
            <HelpCircle className="w-4 h-4 mr-2" />
            Help Center
          </TabsTrigger>
          <TabsTrigger value="announcements" className="data-[state=active]:bg-zinc-800">
            <Megaphone className="w-4 h-4 mr-2" />
            Announcements
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-zinc-800">
            <Mail className="w-4 h-4 mr-2" />
            Email Templates
          </TabsTrigger>
        </TabsList>

        {/* Pages Tab */}
        <TabsContent value="pages" className="mt-4">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Pages</CardTitle>
                <Button size="sm" className="bg-red-500 hover:bg-red-600" onClick={() => openModal('page')}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Page
                </Button>
              </div>
              <div className="flex gap-3 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    placeholder="Search pages..."
                    className="pl-10 bg-zinc-800 border-zinc-700"
                    value={pagesFilter.search}
                    onChange={(e) => setPagesFilter({ ...pagesFilter, search: e.target.value })}
                  />
                </div>
                <Select
                  value={pagesFilter.status}
                  onValueChange={(v) => setPagesFilter({ ...pagesFilter, status: v })}
                >
                  <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-zinc-800/50">
                  <tr>
                    <th className="text-left p-4 text-xs font-medium text-zinc-400">Title</th>
                    <th className="text-left p-4 text-xs font-medium text-zinc-400">Slug</th>
                    <th className="text-left p-4 text-xs font-medium text-zinc-400">Status</th>
                    <th className="text-left p-4 text-xs font-medium text-zinc-400">Author</th>
                    <th className="text-left p-4 text-xs font-medium text-zinc-400">Updated</th>
                    <th className="text-right p-4 text-xs font-medium text-zinc-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((page) => (
                    <tr key={page.id} className="border-t border-zinc-800 hover:bg-zinc-800/30">
                      <td className="p-4">
                        <p className="text-white font-medium">{page.title}</p>
                      </td>
                      <td className="p-4">
                        <code className="text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded">/{page.slug}</code>
                      </td>
                      <td className="p-4">{getStatusBadge(page.status)}</td>
                      <td className="p-4 text-sm text-zinc-400">{page.author_name || 'Unknown'}</td>
                      <td className="p-4 text-sm text-zinc-400">
                        {new Date(page.updated_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openModal('page', page)}>
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-400"
                              onClick={() => handleDelete('page', page.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                  {pages.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-500">
                        No pages found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Posts Tab */}
        <TabsContent value="posts" className="mt-4">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Blog Posts</CardTitle>
                <Button size="sm" className="bg-red-500 hover:bg-red-600" onClick={() => openModal('post')}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Post
                </Button>
              </div>
              <div className="flex gap-3 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    placeholder="Search posts..."
                    className="pl-10 bg-zinc-800 border-zinc-700"
                    value={postsFilter.search}
                    onChange={(e) => setPostsFilter({ ...postsFilter, search: e.target.value })}
                  />
                </div>
                <Select
                  value={postsFilter.status}
                  onValueChange={(v) => setPostsFilter({ ...postsFilter, status: v })}
                >
                  <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-zinc-800/50">
                  <tr>
                    <th className="text-left p-4 text-xs font-medium text-zinc-400">Title</th>
                    <th className="text-left p-4 text-xs font-medium text-zinc-400">Category</th>
                    <th className="text-left p-4 text-xs font-medium text-zinc-400">Status</th>
                    <th className="text-left p-4 text-xs font-medium text-zinc-400">Views</th>
                    <th className="text-left p-4 text-xs font-medium text-zinc-400">Published</th>
                    <th className="text-right p-4 text-xs font-medium text-zinc-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr key={post.id} className="border-t border-zinc-800 hover:bg-zinc-800/30">
                      <td className="p-4">
                        <p className="text-white font-medium">{post.title}</p>
                        {post.excerpt && (
                          <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{post.excerpt}</p>
                        )}
                      </td>
                      <td className="p-4">
                        {post.category && (
                          <Badge variant="outline" className="text-xs border-zinc-700">
                            {post.category}
                          </Badge>
                        )}
                      </td>
                      <td className="p-4">{getStatusBadge(post.status)}</td>
                      <td className="p-4 text-sm text-zinc-400">{post.views || 0}</td>
                      <td className="p-4 text-sm text-zinc-400">
                        {post.published_at ? new Date(post.published_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openModal('post', post)}>
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-400"
                              onClick={() => handleDelete('post', post.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                  {posts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-500">
                        No posts found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Help Articles Tab */}
        <TabsContent value="help" className="mt-4">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Help Articles</CardTitle>
                <Button size="sm" className="bg-red-500 hover:bg-red-600" onClick={() => openModal('article')}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Article
                </Button>
              </div>
              <div className="flex gap-3 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    placeholder="Search articles..."
                    className="pl-10 bg-zinc-800 border-zinc-700"
                    value={articlesFilter.search}
                    onChange={(e) => setArticlesFilter({ ...articlesFilter, search: e.target.value })}
                  />
                </div>
                <Select
                  value={articlesFilter.status}
                  onValueChange={(v) => setArticlesFilter({ ...articlesFilter, status: v })}
                >
                  <SelectTrigger className="w-40 bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-zinc-800/50">
                  <tr>
                    <th className="text-left p-4 text-xs font-medium text-zinc-400">Title</th>
                    <th className="text-left p-4 text-xs font-medium text-zinc-400">Category</th>
                    <th className="text-left p-4 text-xs font-medium text-zinc-400">Status</th>
                    <th className="text-left p-4 text-xs font-medium text-zinc-400">Views</th>
                    <th className="text-left p-4 text-xs font-medium text-zinc-400">Helpful</th>
                    <th className="text-right p-4 text-xs font-medium text-zinc-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {articles.map((article) => (
                    <tr key={article.id} className="border-t border-zinc-800 hover:bg-zinc-800/30">
                      <td className="p-4">
                        <p className="text-white font-medium">{article.title}</p>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-zinc-400">{article.category_name || '-'}</span>
                      </td>
                      <td className="p-4">{getStatusBadge(article.status)}</td>
                      <td className="p-4 text-sm text-zinc-400">{article.views || 0}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-emerald-400">{article.helpful_yes || 0}</span>
                          <span className="text-zinc-600">/</span>
                          <span className="text-red-400">{article.helpful_no || 0}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openModal('article', article)}>
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-400"
                              onClick={() => handleDelete('article', article.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                  {articles.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-500">
                        No help articles found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Announcements Tab */}
        <TabsContent value="announcements" className="mt-4">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Announcements</CardTitle>
                <Button size="sm" className="bg-red-500 hover:bg-red-600" onClick={() => openModal('announcement')}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Announcement
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-zinc-800/50">
                  <tr>
                    <th className="text-left p-4 text-xs font-medium text-zinc-400">Type</th>
                    <th className="text-left p-4 text-xs font-medium text-zinc-400">Title</th>
                    <th className="text-left p-4 text-xs font-medium text-zinc-400">Target</th>
                    <th className="text-left p-4 text-xs font-medium text-zinc-400">Schedule</th>
                    <th className="text-left p-4 text-xs font-medium text-zinc-400">Status</th>
                    <th className="text-right p-4 text-xs font-medium text-zinc-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {announcements.map((announcement) => {
                    const isActive = announcement.is_active &&
                      new Date(announcement.starts_at) <= new Date() &&
                      (!announcement.ends_at || new Date(announcement.ends_at) > new Date());

                    return (
                      <tr key={announcement.id} className="border-t border-zinc-800 hover:bg-zinc-800/30">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {getAnnouncementIcon(announcement.type)}
                            <span className="text-sm text-zinc-400 capitalize">{announcement.type}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="text-white font-medium">{announcement.title}</p>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className="text-xs border-zinc-700 capitalize">
                            {announcement.target_audience}
                          </Badge>
                        </td>
                        <td className="p-4 text-sm text-zinc-400">
                          <div>{new Date(announcement.starts_at).toLocaleDateString()}</div>
                          {announcement.ends_at && (
                            <div className="text-xs">to {new Date(announcement.ends_at).toLocaleDateString()}</div>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge className={cn(
                            'text-xs',
                            isActive
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                          )}>
                            {isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openModal('announcement', announcement)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {announcements.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-500">
                        No announcements found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Templates Tab */}
        <TabsContent value="templates" className="mt-4">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="border-b border-zinc-800">
              <CardTitle className="text-white">Email Templates</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-zinc-800/50">
                  <tr>
                    <th className="text-left p-4 text-xs font-medium text-zinc-400">Name</th>
                    <th className="text-left p-4 text-xs font-medium text-zinc-400">Subject</th>
                    <th className="text-left p-4 text-xs font-medium text-zinc-400">Variables</th>
                    <th className="text-left p-4 text-xs font-medium text-zinc-400">Status</th>
                    <th className="text-right p-4 text-xs font-medium text-zinc-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((template) => (
                    <tr key={template.id} className="border-t border-zinc-800 hover:bg-zinc-800/30">
                      <td className="p-4">
                        <p className="text-white font-medium">{template.name}</p>
                        <p className="text-xs text-zinc-500">{template.description}</p>
                      </td>
                      <td className="p-4 text-sm text-zinc-400">{template.subject}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {(template.variables || []).slice(0, 3).map((v) => (
                            <code key={v} className="text-xs bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">
                              {`{{${v}}}`}
                            </code>
                          ))}
                          {(template.variables || []).length > 3 && (
                            <span className="text-xs text-zinc-500">+{template.variables.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className={cn(
                          'text-xs',
                          template.is_active
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                        )}>
                          {template.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openModal('template', template)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {templates.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-zinc-500">
                        No email templates found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Editor Modal */}
      <ContentEditorModal
        open={showModal}
        onClose={closeModal}
        type={modalType}
        item={editingItem}
        categories={categories}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}

function ContentEditorModal({ open, onClose, type, item, categories, onSave, saving }) {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (item) {
      setFormData({ ...item });
    } else {
      setFormData({
        status: 'draft',
        is_active: true,
        type: 'info',
        target_audience: 'all',
      });
    }
  }, [item, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getTitle = () => {
    const titles = {
      page: item ? 'Edit Page' : 'New Page',
      post: item ? 'Edit Post' : 'New Post',
      article: item ? 'Edit Help Article' : 'New Help Article',
      announcement: item ? 'Edit Announcement' : 'New Announcement',
      template: 'Edit Email Template',
    };
    return titles[type] || 'Edit';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">{getTitle()}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Page / Post / Article Fields */}
          {['page', 'post', 'article'].includes(type) && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-400">Title</Label>
                  <Input
                    className="bg-zinc-800 border-zinc-700"
                    value={formData.title || ''}
                    onChange={(e) => updateField('title', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400">Slug</Label>
                  <Input
                    className="bg-zinc-800 border-zinc-700"
                    value={formData.slug || ''}
                    onChange={(e) => updateField('slug', e.target.value)}
                    required
                  />
                </div>
              </div>

              {type === 'post' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-400">Category</Label>
                    <Input
                      className="bg-zinc-800 border-zinc-700"
                      value={formData.category || ''}
                      onChange={(e) => updateField('category', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400">Featured Image URL</Label>
                    <Input
                      className="bg-zinc-800 border-zinc-700"
                      value={formData.featured_image || ''}
                      onChange={(e) => updateField('featured_image', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {type === 'article' && (
                <div className="space-y-2">
                  <Label className="text-zinc-400">Category</Label>
                  <Select
                    value={formData.category_id || ''}
                    onValueChange={(v) => updateField('category_id', v)}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {type === 'post' && (
                <div className="space-y-2">
                  <Label className="text-zinc-400">Excerpt</Label>
                  <Textarea
                    className="bg-zinc-800 border-zinc-700"
                    rows={2}
                    value={formData.excerpt || ''}
                    onChange={(e) => updateField('excerpt', e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-zinc-400">Content (Markdown)</Label>
                <Textarea
                  className="bg-zinc-800 border-zinc-700 font-mono text-sm"
                  rows={10}
                  value={formData.content || ''}
                  onChange={(e) => updateField('content', e.target.value)}
                />
              </div>

              {type === 'page' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-400">SEO Title</Label>
                    <Input
                      className="bg-zinc-800 border-zinc-700"
                      value={formData.seo_title || ''}
                      onChange={(e) => updateField('seo_title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400">SEO Description</Label>
                    <Input
                      className="bg-zinc-800 border-zinc-700"
                      value={formData.seo_description || ''}
                      onChange={(e) => updateField('seo_description', e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-zinc-400">Status</Label>
                <Select
                  value={formData.status || 'draft'}
                  onValueChange={(v) => updateField('status', v)}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Announcement Fields */}
          {type === 'announcement' && (
            <>
              <div className="space-y-2">
                <Label className="text-zinc-400">Title</Label>
                <Input
                  className="bg-zinc-800 border-zinc-700"
                  value={formData.title || ''}
                  onChange={(e) => updateField('title', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-400">Content</Label>
                <Textarea
                  className="bg-zinc-800 border-zinc-700"
                  rows={4}
                  value={formData.content || ''}
                  onChange={(e) => updateField('content', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-400">Type</Label>
                  <Select
                    value={formData.type || 'info'}
                    onValueChange={(v) => updateField('type', v)}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-400">Target Audience</Label>
                  <Select
                    value={formData.target_audience || 'all'}
                    onValueChange={(v) => updateField('target_audience', v)}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="admins">Admins Only</SelectItem>
                      <SelectItem value="users">Regular Users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-400">Start Date</Label>
                  <Input
                    type="datetime-local"
                    className="bg-zinc-800 border-zinc-700"
                    value={formData.starts_at ? formData.starts_at.slice(0, 16) : ''}
                    onChange={(e) => updateField('starts_at', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400">End Date (optional)</Label>
                  <Input
                    type="datetime-local"
                    className="bg-zinc-800 border-zinc-700"
                    value={formData.ends_at ? formData.ends_at.slice(0, 16) : ''}
                    onChange={(e) => updateField('ends_at', e.target.value || null)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active !== false}
                  onCheckedChange={(v) => updateField('is_active', v)}
                />
                <Label className="text-zinc-400">Active</Label>
              </div>
            </>
          )}

          {/* Email Template Fields */}
          {type === 'template' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-400">Name</Label>
                  <Input
                    className="bg-zinc-800 border-zinc-700"
                    value={formData.name || ''}
                    onChange={(e) => updateField('name', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400">Description</Label>
                  <Input
                    className="bg-zinc-800 border-zinc-700"
                    value={formData.description || ''}
                    onChange={(e) => updateField('description', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-400">Subject</Label>
                <Input
                  className="bg-zinc-800 border-zinc-700"
                  value={formData.subject || ''}
                  onChange={(e) => updateField('subject', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-400">HTML Content</Label>
                <Textarea
                  className="bg-zinc-800 border-zinc-700 font-mono text-sm"
                  rows={8}
                  value={formData.html_content || ''}
                  onChange={(e) => updateField('html_content', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-400">Text Content</Label>
                <Textarea
                  className="bg-zinc-800 border-zinc-700 font-mono text-sm"
                  rows={6}
                  value={formData.text_content || ''}
                  onChange={(e) => updateField('text_content', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-400">Available Variables</Label>
                <div className="flex flex-wrap gap-2 p-3 bg-zinc-800 rounded-lg">
                  {(formData.variables || []).map((v) => (
                    <code key={v} className="text-xs bg-zinc-700 px-2 py-1 rounded text-emerald-400">
                      {`{{${v}}}`}
                    </code>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active !== false}
                  onCheckedChange={(v) => updateField('is_active', v)}
                />
                <Label className="text-zinc-400">Active</Label>
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="border-zinc-700">
              Cancel
            </Button>
            <Button type="submit" className="bg-red-500 hover:bg-red-600" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
