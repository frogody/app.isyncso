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
import { getStatusColor } from '@/lib/adminTheme';

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
    return <Badge className={cn('text-[10px] px-1.5 py-px', getStatusColor(status))}>{status}</Badge>;
  };

  const getAnnouncementIcon = (type) => {
    const icons = {
      info: <Info className="w-3 h-3 text-blue-400" />,
      warning: <AlertTriangle className="w-3 h-3 text-yellow-400" />,
      success: <CheckCircle className="w-3 h-3 text-cyan-400" />,
      error: <AlertCircle className="w-3 h-3 text-red-400" />,
    };
    return icons[type] || icons.info;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Content Management</h1>
          <p className="text-zinc-400 text-xs">Manage pages, posts, help articles, and more</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="border-zinc-700 h-7 text-xs"
        >
          <RefreshCw className={cn("w-3 h-3 mr-1.5", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-zinc-500 mb-0.5">Total Pages</p>
                <p className="text-lg font-bold text-white">{stats?.total_pages || 0}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-zinc-500 mb-0.5">Published Posts</p>
                <p className="text-lg font-bold text-white">{stats?.published_posts || 0}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                <Newspaper className="w-4 h-4 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-zinc-500 mb-0.5">Help Articles</p>
                <p className="text-lg font-bold text-white">{stats?.total_help_articles || 0}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                <HelpCircle className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-zinc-500 mb-0.5">Active Announcements</p>
                <p className="text-lg font-bold text-white">{stats?.active_announcements || 0}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                <Megaphone className="w-4 h-4 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="pages" className="data-[state=active]:bg-zinc-800 text-xs">
            <FileText className="w-3 h-3 mr-1.5" />
            Pages
          </TabsTrigger>
          <TabsTrigger value="posts" className="data-[state=active]:bg-zinc-800 text-xs">
            <Newspaper className="w-3 h-3 mr-1.5" />
            Blog Posts
          </TabsTrigger>
          <TabsTrigger value="help" className="data-[state=active]:bg-zinc-800 text-xs">
            <HelpCircle className="w-3 h-3 mr-1.5" />
            Help Center
          </TabsTrigger>
          <TabsTrigger value="announcements" className="data-[state=active]:bg-zinc-800 text-xs">
            <Megaphone className="w-3 h-3 mr-1.5" />
            Announcements
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-zinc-800 text-xs">
            <Mail className="w-3 h-3 mr-1.5" />
            Email Templates
          </TabsTrigger>
        </TabsList>

        {/* Pages Tab */}
        <TabsContent value="pages" className="mt-3">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="border-b border-zinc-800 py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-sm">Pages</CardTitle>
                <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 h-7 text-xs" onClick={() => openModal('page')}>
                  <Plus className="w-3 h-3 mr-1.5" />
                  New Page
                </Button>
              </div>
              <div className="flex gap-2 mt-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
                  <Input
                    placeholder="Search pages..."
                    className="pl-8 bg-zinc-800 border-zinc-700 h-7 text-xs"
                    value={pagesFilter.search}
                    onChange={(e) => setPagesFilter({ ...pagesFilter, search: e.target.value })}
                  />
                </div>
                <Select
                  value={pagesFilter.status}
                  onValueChange={(v) => setPagesFilter({ ...pagesFilter, status: v })}
                >
                  <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700 h-7 text-xs">
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
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Title</th>
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Slug</th>
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Status</th>
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Author</th>
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Updated</th>
                    <th className="text-right py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((page) => (
                    <tr key={page.id} className="border-t border-zinc-800 hover:bg-zinc-800/30 h-9">
                      <td className="py-1.5 px-3">
                        <p className="text-white text-xs font-medium">{page.title}</p>
                      </td>
                      <td className="py-1.5 px-3">
                        <code className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">/{page.slug}</code>
                      </td>
                      <td className="py-1.5 px-3">{getStatusBadge(page.status)}</td>
                      <td className="py-1.5 px-3 text-xs text-zinc-400">{page.author_name || 'Unknown'}</td>
                      <td className="py-1.5 px-3 text-xs text-zinc-400">
                        {new Date(page.updated_at).toLocaleDateString()}
                      </td>
                      <td className="py-1.5 px-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreVertical className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openModal('page', page)} className="text-xs">
                              <Edit2 className="w-3 h-3 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-400 text-xs"
                              onClick={() => handleDelete('page', page.id)}
                            >
                              <Trash2 className="w-3 h-3 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                  {pages.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-zinc-500 text-xs">
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
        <TabsContent value="posts" className="mt-3">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="border-b border-zinc-800 py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-sm">Blog Posts</CardTitle>
                <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 h-7 text-xs" onClick={() => openModal('post')}>
                  <Plus className="w-3 h-3 mr-1.5" />
                  New Post
                </Button>
              </div>
              <div className="flex gap-2 mt-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
                  <Input
                    placeholder="Search posts..."
                    className="pl-8 bg-zinc-800 border-zinc-700 h-7 text-xs"
                    value={postsFilter.search}
                    onChange={(e) => setPostsFilter({ ...postsFilter, search: e.target.value })}
                  />
                </div>
                <Select
                  value={postsFilter.status}
                  onValueChange={(v) => setPostsFilter({ ...postsFilter, status: v })}
                >
                  <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700 h-7 text-xs">
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
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Title</th>
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Category</th>
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Status</th>
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Views</th>
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Published</th>
                    <th className="text-right py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr key={post.id} className="border-t border-zinc-800 hover:bg-zinc-800/30 h-9">
                      <td className="py-1.5 px-3">
                        <p className="text-white text-xs font-medium">{post.title}</p>
                        {post.excerpt && (
                          <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">{post.excerpt}</p>
                        )}
                      </td>
                      <td className="py-1.5 px-3">
                        {post.category && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-px border-zinc-700">
                            {post.category}
                          </Badge>
                        )}
                      </td>
                      <td className="py-1.5 px-3">{getStatusBadge(post.status)}</td>
                      <td className="py-1.5 px-3 text-xs text-zinc-400">{post.views || 0}</td>
                      <td className="py-1.5 px-3 text-xs text-zinc-400">
                        {post.published_at ? new Date(post.published_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-1.5 px-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreVertical className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openModal('post', post)} className="text-xs">
                              <Edit2 className="w-3 h-3 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-400 text-xs"
                              onClick={() => handleDelete('post', post.id)}
                            >
                              <Trash2 className="w-3 h-3 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                  {posts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-zinc-500 text-xs">
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
        <TabsContent value="help" className="mt-3">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="border-b border-zinc-800 py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-sm">Help Articles</CardTitle>
                <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 h-7 text-xs" onClick={() => openModal('article')}>
                  <Plus className="w-3 h-3 mr-1.5" />
                  New Article
                </Button>
              </div>
              <div className="flex gap-2 mt-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
                  <Input
                    placeholder="Search articles..."
                    className="pl-8 bg-zinc-800 border-zinc-700 h-7 text-xs"
                    value={articlesFilter.search}
                    onChange={(e) => setArticlesFilter({ ...articlesFilter, search: e.target.value })}
                  />
                </div>
                <Select
                  value={articlesFilter.status}
                  onValueChange={(v) => setArticlesFilter({ ...articlesFilter, status: v })}
                >
                  <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700 h-7 text-xs">
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
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Title</th>
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Category</th>
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Status</th>
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Views</th>
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Helpful</th>
                    <th className="text-right py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {articles.map((article) => (
                    <tr key={article.id} className="border-t border-zinc-800 hover:bg-zinc-800/30 h-9">
                      <td className="py-1.5 px-3">
                        <p className="text-white text-xs font-medium">{article.title}</p>
                      </td>
                      <td className="py-1.5 px-3">
                        <span className="text-xs text-zinc-400">{article.category_name || '-'}</span>
                      </td>
                      <td className="py-1.5 px-3">{getStatusBadge(article.status)}</td>
                      <td className="py-1.5 px-3 text-xs text-zinc-400">{article.views || 0}</td>
                      <td className="py-1.5 px-3">
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-cyan-400">{article.helpful_yes || 0}</span>
                          <span className="text-zinc-600">/</span>
                          <span className="text-red-400">{article.helpful_no || 0}</span>
                        </div>
                      </td>
                      <td className="py-1.5 px-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreVertical className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openModal('article', article)} className="text-xs">
                              <Edit2 className="w-3 h-3 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-400 text-xs"
                              onClick={() => handleDelete('article', article.id)}
                            >
                              <Trash2 className="w-3 h-3 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                  {articles.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-zinc-500 text-xs">
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
        <TabsContent value="announcements" className="mt-3">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="border-b border-zinc-800 py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-sm">Announcements</CardTitle>
                <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 h-7 text-xs" onClick={() => openModal('announcement')}>
                  <Plus className="w-3 h-3 mr-1.5" />
                  New Announcement
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-zinc-800/50">
                  <tr>
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Type</th>
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Title</th>
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Target</th>
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Schedule</th>
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Status</th>
                    <th className="text-right py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {announcements.map((announcement) => {
                    const isActive = announcement.is_active &&
                      new Date(announcement.starts_at) <= new Date() &&
                      (!announcement.ends_at || new Date(announcement.ends_at) > new Date());

                    return (
                      <tr key={announcement.id} className="border-t border-zinc-800 hover:bg-zinc-800/30 h-9">
                        <td className="py-1.5 px-3">
                          <div className="flex items-center gap-1.5">
                            {getAnnouncementIcon(announcement.type)}
                            <span className="text-xs text-zinc-400 capitalize">{announcement.type}</span>
                          </div>
                        </td>
                        <td className="py-1.5 px-3">
                          <p className="text-white text-xs font-medium">{announcement.title}</p>
                        </td>
                        <td className="py-1.5 px-3">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-px border-zinc-700 capitalize">
                            {announcement.target_audience}
                          </Badge>
                        </td>
                        <td className="py-1.5 px-3 text-xs text-zinc-400">
                          <div>{new Date(announcement.starts_at).toLocaleDateString()}</div>
                          {announcement.ends_at && (
                            <div className="text-[10px]">to {new Date(announcement.ends_at).toLocaleDateString()}</div>
                          )}
                        </td>
                        <td className="py-1.5 px-3">
                          <Badge className={cn(
                            'text-[10px] px-1.5 py-px',
                            isActive
                              ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                              : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                          )}>
                            {isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="py-1.5 px-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => openModal('announcement', announcement)}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {announcements.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-zinc-500 text-xs">
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
        <TabsContent value="templates" className="mt-3">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="border-b border-zinc-800 py-3 px-4">
              <CardTitle className="text-white text-sm">Email Templates</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-zinc-800/50">
                  <tr>
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Name</th>
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Subject</th>
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Variables</th>
                    <th className="text-left py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Status</th>
                    <th className="text-right py-2 px-3 text-[10px] font-medium text-zinc-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((template) => (
                    <tr key={template.id} className="border-t border-zinc-800 hover:bg-zinc-800/30 h-9">
                      <td className="py-1.5 px-3">
                        <p className="text-white text-xs font-medium">{template.name}</p>
                        <p className="text-[10px] text-zinc-500">{template.description}</p>
                      </td>
                      <td className="py-1.5 px-3 text-xs text-zinc-400">{template.subject}</td>
                      <td className="py-1.5 px-3">
                        <div className="flex flex-wrap gap-1">
                          {(template.variables || []).slice(0, 3).map((v) => (
                            <code key={v} className="text-[10px] bg-zinc-800 px-1 py-0.5 rounded text-zinc-400">
                              {`{{${v}}}`}
                            </code>
                          ))}
                          {(template.variables || []).length > 3 && (
                            <span className="text-[10px] text-zinc-500">+{template.variables.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-1.5 px-3">
                        <Badge className={cn(
                          'text-[10px] px-1.5 py-px',
                          template.is_active
                            ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                            : 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
                        )}>
                          {template.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-1.5 px-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => openModal('template', template)}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {templates.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-zinc-500 text-xs">
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
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-xl max-h-[90vh] overflow-y-auto p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-white text-sm">{getTitle()}</DialogTitle>

        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Page / Post / Article Fields */}
          {['page', 'post', 'article'].includes(type) && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-zinc-400 text-xs">Title</Label>
                  <Input
                    className="bg-zinc-800 border-zinc-700 h-7 text-xs"
                    value={formData.title || ''}
                    onChange={(e) => updateField('title', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-zinc-400 text-xs">Slug</Label>
                  <Input
                    className="bg-zinc-800 border-zinc-700 h-7 text-xs"
                    value={formData.slug || ''}
                    onChange={(e) => updateField('slug', e.target.value)}
                    required
                  />
                </div>
              </div>

              {type === 'post' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-zinc-400 text-xs">Category</Label>
                    <Input
                      className="bg-zinc-800 border-zinc-700 h-7 text-xs"
                      value={formData.category || ''}
                      onChange={(e) => updateField('category', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-zinc-400 text-xs">Featured Image URL</Label>
                    <Input
                      className="bg-zinc-800 border-zinc-700 h-7 text-xs"
                      value={formData.featured_image || ''}
                      onChange={(e) => updateField('featured_image', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {type === 'article' && (
                <div className="space-y-1">
                  <Label className="text-zinc-400 text-xs">Category</Label>
                  <Select
                    value={formData.category_id || ''}
                    onValueChange={(v) => updateField('category_id', v)}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 h-7 text-xs">
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
                <div className="space-y-1">
                  <Label className="text-zinc-400 text-xs">Excerpt</Label>
                  <Textarea
                    className="bg-zinc-800 border-zinc-700 text-xs"
                    rows={2}
                    value={formData.excerpt || ''}
                    onChange={(e) => updateField('excerpt', e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-zinc-400 text-xs">Content (Markdown)</Label>
                <Textarea
                  className="bg-zinc-800 border-zinc-700 font-mono text-xs"
                  rows={8}
                  value={formData.content || ''}
                  onChange={(e) => updateField('content', e.target.value)}
                />
              </div>

              {type === 'page' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-zinc-400 text-xs">SEO Title</Label>
                    <Input
                      className="bg-zinc-800 border-zinc-700 h-7 text-xs"
                      value={formData.seo_title || ''}
                      onChange={(e) => updateField('seo_title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-zinc-400 text-xs">SEO Description</Label>
                    <Input
                      className="bg-zinc-800 border-zinc-700 h-7 text-xs"
                      value={formData.seo_description || ''}
                      onChange={(e) => updateField('seo_description', e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-zinc-400 text-xs">Status</Label>
                <Select
                  value={formData.status || 'draft'}
                  onValueChange={(v) => updateField('status', v)}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 h-7 text-xs">
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
              <div className="space-y-1">
                <Label className="text-zinc-400 text-xs">Title</Label>
                <Input
                  className="bg-zinc-800 border-zinc-700 h-7 text-xs"
                  value={formData.title || ''}
                  onChange={(e) => updateField('title', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-zinc-400 text-xs">Content</Label>
                <Textarea
                  className="bg-zinc-800 border-zinc-700 text-xs"
                  rows={3}
                  value={formData.content || ''}
                  onChange={(e) => updateField('content', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-zinc-400 text-xs">Type</Label>
                  <Select
                    value={formData.type || 'info'}
                    onValueChange={(v) => updateField('type', v)}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 h-7 text-xs">
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

                <div className="space-y-1">
                  <Label className="text-zinc-400 text-xs">Target Audience</Label>
                  <Select
                    value={formData.target_audience || 'all'}
                    onValueChange={(v) => updateField('target_audience', v)}
                  >
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 h-7 text-xs">
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-zinc-400 text-xs">Start Date</Label>
                  <Input
                    type="datetime-local"
                    className="bg-zinc-800 border-zinc-700 h-7 text-xs"
                    value={formData.starts_at ? formData.starts_at.slice(0, 16) : ''}
                    onChange={(e) => updateField('starts_at', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-zinc-400 text-xs">End Date (optional)</Label>
                  <Input
                    type="datetime-local"
                    className="bg-zinc-800 border-zinc-700 h-7 text-xs"
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
                <Label className="text-zinc-400 text-xs">Active</Label>
              </div>
            </>
          )}

          {/* Email Template Fields */}
          {type === 'template' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-zinc-400 text-xs">Name</Label>
                  <Input
                    className="bg-zinc-800 border-zinc-700 h-7 text-xs"
                    value={formData.name || ''}
                    onChange={(e) => updateField('name', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-zinc-400 text-xs">Description</Label>
                  <Input
                    className="bg-zinc-800 border-zinc-700 h-7 text-xs"
                    value={formData.description || ''}
                    onChange={(e) => updateField('description', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-zinc-400 text-xs">Subject</Label>
                <Input
                  className="bg-zinc-800 border-zinc-700 h-7 text-xs"
                  value={formData.subject || ''}
                  onChange={(e) => updateField('subject', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-zinc-400 text-xs">HTML Content</Label>
                <Textarea
                  className="bg-zinc-800 border-zinc-700 font-mono text-xs"
                  rows={6}
                  value={formData.html_content || ''}
                  onChange={(e) => updateField('html_content', e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-zinc-400 text-xs">Text Content</Label>
                <Textarea
                  className="bg-zinc-800 border-zinc-700 font-mono text-xs"
                  rows={4}
                  value={formData.text_content || ''}
                  onChange={(e) => updateField('text_content', e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-zinc-400 text-xs">Available Variables</Label>
                <div className="flex flex-wrap gap-1 p-2 bg-zinc-800 rounded-lg">
                  {(formData.variables || []).map((v) => (
                    <code key={v} className="text-[10px] bg-zinc-700 px-1.5 py-0.5 rounded text-cyan-400">
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
                <Label className="text-zinc-400 text-xs">Active</Label>
              </div>
            </>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="border-zinc-700 h-7 text-xs">
              Cancel
            </Button>
            <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700 h-7 text-xs" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
