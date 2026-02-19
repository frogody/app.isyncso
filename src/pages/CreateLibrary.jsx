import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/components/context/UserContext';
import { GeneratedContent } from '@/api/entities';
import { supabase } from '@/api/supabaseClient';
import {
  FolderOpen,
  Image,
  Video,
  Download,
  Trash2,
  Search,
  Grid,
  List,
  CheckSquare,
  Square,
  X,
  Eye,
  RefreshCw,
  Clock,
  Package,
  Loader2,
  Heart,
  Play,
  Sparkles,
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Camera,
} from 'lucide-react';
import { CreatePageTransition } from '@/components/create/ui';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';

const PAGE_SIZE = 24;

const SORT_OPTIONS = [
  { value: '-created_at', label: 'Newest' },
  { value: 'created_at', label: 'Oldest' },
  { value: 'name', label: 'Name A-Z' },
  { value: '-name', label: 'Name Z-A' },
];

const FILTER_CHIPS = [
  { value: 'all', label: 'All' },
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Videos' },
  { value: 'favorites', label: 'Favorites' },
  { value: 'recent', label: 'Recent' },
  { value: 'sync_studio', label: 'Sync Studio' },
  { value: 'fashion_booth', label: 'Fashion Booth' },
];

export default function CreateLibrary({ embedded = false }) {
  const { theme, toggleTheme, ct } = useTheme();
  const { user } = useUser();
  const navigate = useNavigate();
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('-created_at');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedItems, setSelectedItems] = useState([]);
  const [previewItem, setPreviewItem] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // item id or 'bulk'
  const [sortOpen, setSortOpen] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (user?.company_id) {
      loadContent();
    }
  }, [user?.company_id, sortBy, filterType]);

  // Reset page on filter/search change
  useEffect(() => {
    setPage(1);
  }, [filterType, searchQuery, sortBy]);

  const loadContent = async () => {
    setLoading(true);
    try {
      if (filterType === 'sync_studio') {
        const { data: studioImages, error } = await supabase
          .from('sync_studio_generated_images')
          .select('*, sync_studio_jobs!inner(user_id, vibe)')
          .eq('sync_studio_jobs.user_id', user.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const transformed = (studioImages || []).map(img => ({
          id: img.image_id,
          url: img.image_url,
          name: `Shot ${img.shot_number} - ${img.product_ean}`,
          content_type: 'image',
          created_at: img.created_at,
          tags: [img.shot_type || 'photo', 'sync_studio'],
          is_favorite: false,
          metadata: { source: 'sync_studio', product_ean: img.product_ean, shot_number: img.shot_number },
        }));
        setContent(transformed);
      } else {
        // Query generated_content table
        const filters = { company_id: user.company_id };
        const generatedData = await GeneratedContent.filter(filters, sortBy, 100);

        // Also query sync_studio_generated_images and merge for 'all', 'image', and 'recent' filters
        if (filterType === 'all' || filterType === 'image' || filterType === 'recent') {
          try {
            const { data: studioImages } = await supabase
              .from('sync_studio_generated_images')
              .select('*, sync_studio_jobs!inner(user_id, vibe)')
              .eq('sync_studio_jobs.user_id', user.id)
              .eq('status', 'completed')
              .order('created_at', { ascending: false });

            const transformedStudio = (studioImages || []).map(img => ({
              id: img.image_id,
              url: img.image_url,
              name: `Shot ${img.shot_number} - ${img.product_ean}`,
              content_type: 'image',
              created_at: img.created_at,
              tags: ['photo', 'sync_studio'],
              is_favorite: false,
              metadata: { source: 'sync_studio', product_ean: img.product_ean, shot_number: img.shot_number },
            }));

            // Merge and sort by created_at descending
            const merged = [...(generatedData || []), ...transformedStudio];
            merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setContent(merged);
          } catch (err) {
            console.error('Error loading studio images:', err);
            setContent(generatedData || []);
          }
        } else {
          setContent(generatedData || []);
        }
      }
    } catch (error) {
      console.error('Error loading content:', error);
      toast.error('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const filteredContent = useMemo(() => {
    let items = content;

    // Type filter
    if (filterType === 'image') {
      items = items.filter(item => item.content_type === 'image');
    } else if (filterType === 'video') {
      items = items.filter(item => item.content_type === 'video');
    } else if (filterType === 'favorites') {
      items = items.filter(item => item.is_favorite);
    } else if (filterType === 'recent') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      items = items.filter(item => new Date(item.created_at) >= sevenDaysAgo);
    } else if (filterType === 'fashion_booth') {
      items = items.filter(item =>
        item.tags?.some(t => t === 'fashion_booth' || t === 'outfit_extractor') ||
        item.generation_config?.source === 'fashion_booth' ||
        item.generation_config?.source === 'outfit_extractor' ||
        item.name?.startsWith('Fashion Booth') ||
        item.name?.startsWith('Outfit Extract')
      );
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item =>
        item.name?.toLowerCase().includes(query) ||
        item.generation_config?.prompt?.toLowerCase().includes(query) ||
        item.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return items;
  }, [content, filterType, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredContent.length / PAGE_SIZE));
  const paginatedContent = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredContent.slice(start, start + PAGE_SIZE);
  }, [filteredContent, page]);

  const favoritesCount = useMemo(() => {
    return content.filter(item => item.is_favorite).length;
  }, [content]);

  const handleDownload = async (item) => {
    try {
      const response = await fetch(item.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${item.name || 'download'}.${item.content_type === 'video' ? 'mp4' : 'png'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch (error) {
      toast.error('Failed to download');
    }
  };

  const handleDelete = async (id) => {
    try {
      await GeneratedContent.delete(id);
      setContent(prev => prev.filter(item => item.id !== id));
      setSelectedItems(prev => prev.filter(itemId => itemId !== id));
      if (previewItem?.id === id) setPreviewItem(null);
      toast.success('Item deleted');
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedItems.length) return;
    try {
      await Promise.all(selectedItems.map(id => GeneratedContent.delete(id)));
      setContent(prev => prev.filter(item => !selectedItems.includes(item.id)));
      setSelectedItems([]);
      if (previewItem && selectedItems.includes(previewItem.id)) setPreviewItem(null);
      toast.success(`${selectedItems.length} items deleted`);
    } catch (error) {
      toast.error('Failed to delete items');
    }
  };

  const handleBulkDownload = async () => {
    if (!selectedItems.length) return;
    const items = content.filter(item => selectedItems.includes(item.id));
    toast.info(`Downloading ${items.length} items...`);
    const BATCH_SIZE = 3;
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(item => handleDownload(item)));
    }
    toast.success(`Downloaded ${items.length} items`);
  };

  const toggleSelect = (id) => {
    setSelectedItems(prev =>
      prev.includes(id)
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedItems.length === filteredContent.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredContent.map(item => item.id));
    }
  };

  const toggleFavorite = async (id) => {
    const item = content.find(c => c.id === id);
    if (!item) return;
    const newValue = !item.is_favorite;
    // Optimistic update
    setContent(prev => prev.map(c => c.id === id ? { ...c, is_favorite: newValue } : c));
    try {
      await GeneratedContent.update(id, { is_favorite: newValue });
    } catch (error) {
      // Revert on failure
      setContent(prev => prev.map(c => c.id === id ? { ...c, is_favorite: !newValue } : c));
      toast.error('Failed to update favorite');
    }
  };

  const handleUseSettings = (item) => {
    if (item.content_type === 'image') {
      navigate(createPageUrl('CreateImages'));
    } else {
      navigate(createPageUrl('CreateVideos'));
    }
  };

  const confirmDelete = (target) => {
    setDeleteTarget(target);
    setShowDeleteConfirm(true);
  };

  const executeDelete = async () => {
    if (deleteTarget === 'bulk') {
      await handleBulkDelete();
    } else if (deleteTarget) {
      await handleDelete(deleteTarget);
    }
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const deleteCount = deleteTarget === 'bulk' ? selectedItems.length : 1;

  const Wrapper = embedded ? React.Fragment : CreatePageTransition;

  return (
    <Wrapper>
      <div className={`${embedded ? '' : 'min-h-screen'} ${ct('bg-slate-50', 'bg-[#09090b]')}`}>
        <div className="w-full px-4 lg:px-6 py-6 space-y-5">

          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {!embedded && (
                <>
                  <button
                    onClick={() => navigate(createPageUrl('Create'))}
                    className={`flex items-center gap-1.5 text-sm ${ct('text-slate-500 hover:text-slate-900', 'text-zinc-400 hover:text-white')} transition-colors`}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Create Studio
                  </button>
                  <div className={`w-px h-5 ${ct('bg-slate-200', 'bg-zinc-800')}`} />
                </>
              )}
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  <FolderOpen className="w-4 h-4 text-yellow-400" />
                </div>
                <h1 className={`text-lg font-semibold ${ct('text-slate-900', 'text-white')}`}>Content Library</h1>
                {!loading && (
                  <span className="px-2 py-0.5 text-xs font-medium text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
                    {filteredContent.length} items
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Theme toggle */}
              <button onClick={toggleTheme} className={ct('p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200', 'p-2 rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700')}>
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>

              {/* View toggle */}
              <div className={`flex border ${ct('border-slate-200', 'border-zinc-800/60')} rounded-full overflow-hidden`}>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-yellow-500 text-black' : ct('bg-white text-slate-500 hover:text-slate-600', 'bg-zinc-900/50 text-zinc-400 hover:text-zinc-300')}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-yellow-500 text-black' : ct('bg-white text-slate-500 hover:text-slate-600', 'bg-zinc-900/50 text-zinc-400 hover:text-zinc-300')}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${ct('text-slate-400', 'text-zinc-500')}`} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, prompt, or tags..."
                className={`w-full pl-9 pr-3 py-2 text-sm ${ct('bg-white border-slate-200 text-slate-900 placeholder:text-slate-400', 'bg-zinc-900/50 border-zinc-800/60 text-white placeholder:text-zinc-500')} border rounded-full focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 transition-colors`}
              />
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {FILTER_CHIPS.map(chip => {
                const isActive = filterType === chip.value;
                return (
                  <button
                    key={chip.value}
                    onClick={() => setFilterType(chip.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                      isActive
                        ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                        : ct('bg-white border-slate-200 text-slate-500 hover:text-slate-600 hover:border-slate-300', 'bg-zinc-900/50 border-zinc-800/60 text-zinc-400 hover:text-zinc-300 hover:border-zinc-700')
                    }`}
                  >
                    {chip.label}
                    {chip.value === 'favorites' && favoritesCount > 0 && (
                      <span className="ml-1 text-[10px] opacity-70">{favoritesCount}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Sort Dropdown */}
            <div className="relative ml-auto">
              <button
                onClick={() => setSortOpen(!sortOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full ${ct('bg-white border-slate-200 text-slate-500 hover:text-slate-600 hover:border-slate-300', 'bg-zinc-900/50 border-zinc-800/60 text-zinc-400 hover:text-zinc-300 hover:border-zinc-700')} border transition-colors`}
              >
                {SORT_OPTIONS.find(o => o.value === sortBy)?.label}
                <ChevronDown className="w-3 h-3" />
              </button>
              {sortOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
                  <div className={`absolute right-0 top-full mt-1 z-50 w-36 ${ct('bg-white border-slate-200', 'bg-zinc-900 border-zinc-800')} border rounded-xl overflow-hidden shadow-xl`}>
                    {SORT_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        onClick={() => { setSortBy(option.value); setSortOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                          sortBy === option.value
                            ? 'bg-yellow-500/10 text-yellow-400'
                            : ct('text-slate-500 hover:bg-slate-100 hover:text-slate-900', 'text-zinc-400 hover:bg-zinc-800 hover:text-white')
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex gap-4">
            {/* Grid / List */}
            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-24">
                  <Loader2 className="w-10 h-10 text-yellow-400 animate-spin mb-3" />
                  <p className={`text-sm ${ct('text-slate-500', 'text-zinc-500')}`}>Loading content...</p>
                </div>
              ) : filteredContent.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-24"
                >
                  {content.length === 0 && !searchQuery && filterType === 'all' ? (
                    <>
                      <div className={`p-4 rounded-[20px] ${ct('bg-white border-slate-200', 'bg-zinc-900/50 border-zinc-800/60')} border mb-4`}>
                        <Sparkles className={`w-10 h-10 ${ct('text-slate-400', 'text-zinc-500')}`} />
                      </div>
                      <h3 className={`text-base font-medium ${ct('text-slate-900', 'text-white')} mb-1`}>Your library is empty</h3>
                      <p className={`text-sm ${ct('text-slate-500', 'text-zinc-500')} mb-5`}>Start creating images and videos to build your library</p>
                      <button
                        onClick={() => navigate(createPageUrl('CreateImages'))}
                        className="px-5 py-2 text-sm font-medium rounded-full bg-yellow-500 hover:bg-yellow-400 text-black transition-colors"
                      >
                        Start creating
                      </button>
                    </>
                  ) : (
                    <>
                      <Search className={`w-8 h-8 ${ct('text-slate-400', 'text-zinc-600')} mb-3`} />
                      <h3 className={`text-base font-medium ${ct('text-slate-900', 'text-white')} mb-1`}>No items match your search</h3>
                      <p className={`text-sm ${ct('text-slate-500', 'text-zinc-500')}`}>Try a different search term</p>
                    </>
                  )}
                </motion.div>
              ) : viewMode === 'grid' ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5"
                >
                  {paginatedContent.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.25, delay: index * 0.02 }}
                      className={`group relative aspect-square rounded-[20px] overflow-hidden border transition-all cursor-pointer ${
                        selectedItems.includes(item.id)
                          ? 'border-yellow-500 ring-2 ring-yellow-500/30'
                          : ct('border-slate-200 hover:border-slate-300', 'border-zinc-800/40 hover:border-zinc-700')
                      }`}
                      onClick={() => setPreviewItem(item)}
                    >
                      {/* Selection checkbox */}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
                        className={`absolute top-2 left-2 z-10 transition-opacity ${
                          selectedItems.includes(item.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        {selectedItems.includes(item.id) ? (
                          <CheckSquare className="w-5 h-5 text-yellow-400 drop-shadow-lg" />
                        ) : (
                          <Square className="w-5 h-5 text-white/70 drop-shadow-lg" />
                        )}
                      </button>

                      {/* Favorite heart */}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(item.id); }}
                        className={`absolute top-2 right-2 z-10 transition-opacity ${
                          item.is_favorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <Heart
                          className={`w-5 h-5 drop-shadow-lg transition-colors ${
                            item.is_favorite
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-white/70'
                          }`}
                        />
                      </button>

                      {/* Thumbnail */}
                      {item.content_type === 'video' ? (
                        item.thumbnail_url ? (
                          <img src={item.thumbnail_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <video
                            src={item.url}
                            preload="metadata"
                            className="w-full h-full object-cover"
                            muted
                          />
                        )
                      ) : (
                        <img src={item.thumbnail_url || item.url} alt={item.name} className="w-full h-full object-cover" />
                      )}

                      {/* Video play overlay */}
                      {item.content_type === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-80 group-hover:opacity-0 transition-opacity">
                            <Play className="w-4 h-4 text-white ml-0.5" />
                          </div>
                        </div>
                      )}

                      {/* Hover bottom bar */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-8 pb-2 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); setPreviewItem(item); }}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                            title="Preview"
                          >
                            <Eye className="w-3.5 h-3.5 text-white" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDownload(item); }}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5 text-white" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); confirmDelete(item.id); }}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-red-500/30 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-white" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                /* List View */
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-1.5"
                >
                  {paginatedContent.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.02 }}
                      onClick={() => setPreviewItem(item)}
                      className={`group flex items-center gap-3 p-2.5 rounded-[20px] border cursor-pointer transition-all ${
                        selectedItems.includes(item.id)
                          ? 'border-yellow-500 bg-yellow-500/5'
                          : ct('border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50', 'border-zinc-800/60 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50')
                      }`}
                    >
                      <button onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}>
                        {selectedItems.includes(item.id) ? (
                          <CheckSquare className="w-4 h-4 text-yellow-400" />
                        ) : (
                          <Square className={`w-4 h-4 ${ct('text-slate-300 group-hover:text-slate-500', 'text-zinc-600 group-hover:text-zinc-400')}`} />
                        )}
                      </button>

                      <div className={`w-10 h-10 rounded-xl overflow-hidden ${ct('bg-slate-100', 'bg-zinc-800')} flex-shrink-0 relative`}>
                        {item.content_type === 'video' ? (
                          item.thumbnail_url ? (
                            <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Video className="w-4 h-4 text-zinc-600" />
                            </div>
                          )
                        ) : (
                          <img src={item.thumbnail_url || item.url} alt="" className="w-full h-full object-cover" />
                        )}
                        {item.content_type === 'video' && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Play className="w-3 h-3 text-white/80" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className={`text-sm font-medium ${ct('text-slate-900', 'text-white')} truncate`}>{item.name || 'Untitled'}</h3>
                        <p className={`text-xs ${ct('text-slate-500', 'text-zinc-500')} truncate`}>
                          {item.generation_config?.prompt || 'No prompt'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${
                          item.content_type === 'video'
                            ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'
                            : ct('border-slate-200 text-slate-500 bg-slate-50', 'border-zinc-700 text-zinc-400 bg-zinc-800/50')
                        }`}>
                          {item.content_type}
                        </span>
                        {item.duration && (
                          <span className={`text-[10px] ${ct('text-slate-500', 'text-zinc-500')} flex items-center gap-0.5`}>
                            <Clock className="w-3 h-3" />{item.duration}s
                          </span>
                        )}
                      </div>

                      <span className={`text-[11px] ${ct('text-slate-400', 'text-zinc-600')} hidden md:block whitespace-nowrap`}>
                        {formatDate(item.created_at)}
                      </span>

                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(item.id); }}
                        className="p-1"
                      >
                        <Heart className={`w-4 h-4 transition-colors ${
                          item.is_favorite ? 'text-yellow-400 fill-yellow-400' : ct('text-slate-300 hover:text-slate-500', 'text-zinc-700 hover:text-zinc-500')
                        }`} />
                      </button>

                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); handleDownload(item); }} className={`p-1 rounded ${ct('hover:bg-slate-100', 'hover:bg-zinc-800')}`} title="Download">
                          <Download className={`w-3.5 h-3.5 ${ct('text-slate-400', 'text-zinc-400')}`} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); confirmDelete(item.id); }} className="p-1 rounded hover:bg-red-900/30" title="Delete">
                          <Trash2 className={`w-3.5 h-3.5 ${ct('text-slate-400', 'text-zinc-400')}`} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
              {/* Pagination */}
              {filteredContent.length > PAGE_SIZE && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${ct('bg-white border-slate-200 text-slate-600 hover:bg-slate-50', 'bg-zinc-900/50 border-zinc-800/60 text-zinc-300 hover:bg-zinc-800')}`}
                  >
                    <ChevronLeft className="w-3 h-3" />
                    Previous
                  </button>
                  <span className={`text-xs ${ct('text-slate-500', 'text-zinc-500')} px-2`}>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${ct('bg-white border-slate-200 text-slate-600 hover:bg-slate-50', 'bg-zinc-900/50 border-zinc-800/60 text-zinc-300 hover:bg-zinc-800')}`}
                  >
                    Next
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Bulk Actions Bar */}
        <AnimatePresence>
          {selectedItems.length > 0 && (
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
            >
              <div className={`flex items-center gap-3 px-5 py-3 rounded-full ${ct('bg-white/90 border-slate-200', 'bg-zinc-900/90 border-zinc-800/80')} backdrop-blur-xl border shadow-2xl ${ct('shadow-black/10', 'shadow-black/50')}`}>
                <span className={`text-sm ${ct('text-slate-700', 'text-zinc-300')} font-medium whitespace-nowrap`}>
                  {selectedItems.length} selected
                </span>
                <div className={`w-px h-5 ${ct('bg-slate-200', 'bg-zinc-700')}`} />
                <button
                  onClick={selectAll}
                  className={`text-xs ${ct('text-slate-500 hover:text-slate-900', 'text-zinc-400 hover:text-white')} transition-colors whitespace-nowrap`}
                >
                  {selectedItems.length === filteredContent.length ? 'Deselect' : 'Select All'}
                </button>
                <div className={`w-px h-5 ${ct('bg-slate-200', 'bg-zinc-700')}`} />
                <button
                  onClick={handleBulkDownload}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full ${ct('bg-slate-100 hover:bg-slate-200 text-slate-600', 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300')} transition-colors`}
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
                <button
                  onClick={() => confirmDelete('bulk')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-red-900/30 hover:bg-red-900/50 text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Dialog */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
              onClick={() => setShowDeleteConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-sm mx-4 p-6 rounded-[20px] ${ct('bg-white border-slate-200', 'bg-zinc-900 border-zinc-800/60')} border`}
              >
                <h3 className={`text-base font-semibold ${ct('text-slate-900', 'text-white')} mb-1`}>
                  Delete {deleteCount} item{deleteCount > 1 ? 's' : ''}?
                </h3>
                <p className={`text-sm ${ct('text-slate-500', 'text-zinc-500')} mb-5`}>This action cannot be undone.</p>
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className={`px-4 py-2 text-sm font-medium rounded-full ${ct('text-slate-500 hover:text-slate-900', 'text-zinc-400 hover:text-white')} transition-colors`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeDelete}
                    className="px-4 py-2 text-sm font-medium rounded-full bg-red-600 hover:bg-red-500 text-white transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fullscreen Image Lightbox */}
        <AnimatePresence>
          {previewItem && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm cursor-pointer"
              onClick={() => setPreviewItem(null)}
            >
              {previewItem.content_type === 'video' ? (
                <motion.video
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  src={previewItem.url}
                  controls
                  autoPlay
                  className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <motion.img
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  src={previewItem.url}
                  alt={previewItem.name || ''}
                  className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              <button
                onClick={() => setPreviewItem(null)}
                className="absolute top-6 right-6 p-2 rounded-full bg-zinc-800/80 text-white hover:bg-zinc-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Wrapper>
  );
}
