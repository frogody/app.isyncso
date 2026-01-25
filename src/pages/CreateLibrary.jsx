import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUser } from '@/components/context/UserContext';
import { GeneratedContent } from '@/api/entities';
import {
  FolderOpen,
  Image,
  Video,
  Download,
  Trash2,
  Search,
  Filter,
  Grid,
  List,
  MoreVertical,
  CheckSquare,
  Square,
  X,
  Eye,
  RefreshCw,
  Clock,
  Package,
  SortAsc,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';

export default function CreateLibrary() {
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

  useEffect(() => {
    if (user?.company_id) {
      loadContent();
    }
  }, [user?.company_id, filterType, sortBy]);

  const loadContent = async () => {
    setLoading(true);
    try {
      const filters = { company_id: user.company_id };
      if (filterType !== 'all') {
        filters.content_type = filterType;
      }
      const data = await GeneratedContent.filter(filters, sortBy, 100);
      setContent(data || []);
    } catch (error) {
      console.error('Error loading content:', error);
      toast.error('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const filteredContent = content.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.name?.toLowerCase().includes(query) ||
      item.generation_config?.prompt?.toLowerCase().includes(query) ||
      item.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  });

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
      toast.success(`${selectedItems.length} items deleted`);
    } catch (error) {
      toast.error('Failed to delete items');
    }
  };

  const handleBulkDownload = async () => {
    if (!selectedItems.length) return;
    const items = content.filter(item => selectedItems.includes(item.id));
    for (const item of items) {
      await handleDownload(item);
      await new Promise(resolve => setTimeout(resolve, 500));
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

  const handleUseSettings = (item) => {
    if (item.content_type === 'image') {
      navigate(createPageUrl('CreateImages'));
    } else {
      navigate(createPageUrl('CreateVideos'));
    }
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

  return (
    <div className="min-h-screen bg-black relative">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-pink-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 w-full px-4 lg:px-6 py-4 space-y-4">
        <PageHeader
          title="Content Library"
          subtitle="Manage all your AI-generated images and videos"
          icon={FolderOpen}
          color="rose"
          badge={
            <Badge variant="outline" className="border-zinc-700 text-zinc-300 bg-zinc-800/50">
              {filteredContent.length} items
            </Badge>
          }
        />

        {/* Toolbar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3"
        >
          <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, prompt, or tags..."
                className="pl-10 bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-rose-500/50 focus:ring-rose-500/20"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Type Filter */}
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-32 bg-zinc-900/50 border-zinc-700 text-white">
                  <Filter className="w-4 h-4 mr-2 text-zinc-400" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="all" className="text-white hover:bg-zinc-800">All Types</SelectItem>
                  <SelectItem value="image" className="text-white hover:bg-zinc-800">Images</SelectItem>
                  <SelectItem value="video" className="text-white hover:bg-zinc-800">Videos</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40 bg-zinc-900/50 border-zinc-700 text-white">
                  <SortAsc className="w-4 h-4 mr-2 text-zinc-400" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="-created_at" className="text-white hover:bg-zinc-800">Newest First</SelectItem>
                  <SelectItem value="created_at" className="text-white hover:bg-zinc-800">Oldest First</SelectItem>
                  <SelectItem value="name" className="text-white hover:bg-zinc-800">Name A-Z</SelectItem>
                  <SelectItem value="-name" className="text-white hover:bg-zinc-800">Name Z-A</SelectItem>
                </SelectContent>
              </Select>

              {/* View Mode */}
              <div className="flex border border-zinc-700 rounded-xl overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-rose-500 text-white' : 'bg-zinc-900/50 text-zinc-400 hover:text-zinc-300'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-rose-500 text-white' : 'bg-zinc-900/50 text-zinc-400 hover:text-zinc-300'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedItems.length > 0 && (
            <div className="mt-3 pt-3 border-t border-zinc-700/50 flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={selectAll}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                {selectedItems.length === filteredContent.length ? (
                  <>
                    <X className="w-4 h-4 mr-1" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-4 h-4 mr-1" />
                    Select All
                  </>
                )}
              </Button>
              <span className="text-zinc-400 text-sm">
                {selectedItems.length} selected
              </span>
              <div className="flex-1" />
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkDownload}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBulkDelete}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            </div>
          )}
        </motion.div>

        {/* Content Grid/List */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 text-rose-400 animate-spin mx-auto mb-4" />
            <p className="text-zinc-400">Loading content...</p>
          </div>
        ) : filteredContent.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-8 text-center"
          >
            <FolderOpen className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No content yet</h3>
            <p className="text-zinc-400 mb-6">
              {searchQuery || filterType !== 'all'
                ? 'No content matches your filters'
                : 'Start creating images and videos to build your library'}
            </p>
            <div className="flex justify-center gap-2">
              <Button
                onClick={() => navigate(createPageUrl('CreateImages'))}
                className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 border-0"
              >
                <Image className="w-4 h-4 mr-2" />
                Create Image
              </Button>
              <Button
                onClick={() => navigate(createPageUrl('CreateVideos'))}
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                <Video className="w-4 h-4 mr-2" />
                Create Video
              </Button>
            </div>
          </motion.div>
        ) : viewMode === 'grid' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
          >
            {filteredContent.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.03 }}
                className={`group relative aspect-square rounded-xl overflow-hidden border transition-all cursor-pointer ${
                  selectedItems.includes(item.id)
                    ? 'border-rose-500 ring-2 ring-rose-500/50'
                    : 'border-zinc-700/50 hover:border-zinc-600'
                }`}
              >
                {/* Selection checkbox */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(item.id);
                  }}
                  className={`absolute top-2 left-2 z-10 p-1 rounded transition-opacity ${
                    selectedItems.includes(item.id) || 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  {selectedItems.includes(item.id) ? (
                    <CheckSquare className="w-5 h-5 text-rose-400" />
                  ) : (
                    <Square className="w-5 h-5 text-white bg-black/50 rounded" />
                  )}
                </button>

                {/* Content type badge */}
                <div className="absolute top-2 right-2 z-10">
                  <Badge className={`${item.content_type === 'video' ? 'bg-purple-500/80' : 'bg-rose-500/80'} text-white text-xs border-0`}>
                    {item.content_type === 'video' ? (
                      <Video className="w-3 h-3" />
                    ) : (
                      <Image className="w-3 h-3" />
                    )}
                  </Badge>
                </div>

                {/* Thumbnail */}
                {item.content_type === 'video' ? (
                  item.thumbnail_url ? (
                    <img
                      src={item.thumbnail_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onClick={() => setPreviewItem(item)}
                    />
                  ) : (
                    <div
                      className="w-full h-full bg-zinc-900 flex items-center justify-center"
                      onClick={() => setPreviewItem(item)}
                    >
                      <Video className="w-12 h-12 text-zinc-700" />
                    </div>
                  )
                ) : (
                  <img
                    src={item.thumbnail_url || item.url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onClick={() => setPreviewItem(item)}
                  />
                )}

                {/* Duration badge for videos */}
                {item.content_type === 'video' && item.duration && (
                  <div className="absolute bottom-2 left-2">
                    <Badge className="bg-black/70 text-white text-xs border-0">
                      <Clock className="w-3 h-3 mr-1" />
                      {item.duration}s
                    </Badge>
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewItem(item);
                    }}
                    className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
                    title="Preview"
                  >
                    <Eye className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(item);
                    }}
                    className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id);
                    }}
                    className="p-2 bg-zinc-800 rounded-lg hover:bg-red-900 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-2"
          >
            {filteredContent.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.03 }}
                className={`bg-zinc-900/50 border rounded-xl transition-all cursor-pointer ${
                  selectedItems.includes(item.id)
                    ? 'border-rose-500 ring-1 ring-rose-500/50'
                    : 'border-zinc-800/60 hover:border-zinc-700'
                }`}
              >
                <div className="p-3 flex items-center gap-3">
                  {/* Selection */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(item.id);
                    }}
                  >
                    {selectedItems.includes(item.id) ? (
                      <CheckSquare className="w-5 h-5 text-rose-400" />
                    ) : (
                      <Square className="w-5 h-5 text-zinc-500 hover:text-zinc-400" />
                    )}
                  </button>

                  {/* Thumbnail */}
                  <div
                    className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0"
                    onClick={() => setPreviewItem(item)}
                  >
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
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0" onClick={() => setPreviewItem(item)}>
                    <h3 className="text-white font-medium truncate">{item.name}</h3>
                    <p className="text-zinc-500 text-sm truncate">
                      {item.generation_config?.prompt || 'No prompt'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={`text-xs ${
                        item.content_type === 'video' ? 'border-purple-500/50 text-purple-400' : 'border-rose-500/50 text-rose-400'
                      }`}>
                        {item.content_type === 'video' ? <Video className="w-3 h-3 mr-1" /> : <Image className="w-3 h-3 mr-1" />}
                        {item.content_type}
                      </Badge>
                      {item.duration && (
                        <span className="text-zinc-500 text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.duration}s
                        </span>
                      )}
                      {item.product_context?.product_name && (
                        <span className="text-zinc-500 text-xs flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {item.product_context.product_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date */}
                  <div className="text-zinc-500 text-sm hidden md:block">
                    {formatDate(item.created_at)}
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-700">
                      <DropdownMenuItem
                        onClick={() => setPreviewItem(item)}
                        className="text-white hover:bg-zinc-800"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDownload(item)}
                        className="text-white hover:bg-zinc-800"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleUseSettings(item)}
                        className="text-white hover:bg-zinc-800"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Use Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-zinc-700" />
                      <DropdownMenuItem
                        onClick={() => handleDelete(item.id)}
                        className="text-red-400 hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Preview Dialog */}
        <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
          <DialogContent className="max-w-4xl bg-zinc-900 border-zinc-700">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                {previewItem?.content_type === 'video' ? (
                  <Video className="w-5 h-5 text-purple-400" />
                ) : (
                  <Image className="w-5 h-5 text-rose-400" />
                )}
                {previewItem?.name || 'Generated Content'}
              </DialogTitle>
            </DialogHeader>
            {previewItem && (
              <div className="space-y-4">
                {/* Content */}
                {previewItem.content_type === 'video' ? (
                  <video
                    src={previewItem.url}
                    controls
                    autoPlay
                    className="w-full rounded-xl"
                    poster={previewItem.thumbnail_url}
                  />
                ) : (
                  <img
                    src={previewItem.url}
                    alt={previewItem.name}
                    className="w-full rounded-xl"
                  />
                )}

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                    <Label className="text-zinc-500 text-[10px] mb-1 block">Created</Label>
                    <p className="text-zinc-300 text-xs">{formatDate(previewItem.created_at)}</p>
                  </div>
                  {previewItem.content_type === 'video' && previewItem.duration && (
                    <div className="p-2 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                      <Label className="text-zinc-500 text-[10px] mb-1 block">Duration</Label>
                      <p className="text-zinc-300 text-xs">{previewItem.duration} seconds</p>
                    </div>
                  )}
                  {previewItem.generation_config?.style && (
                    <div className="p-2 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                      <Label className="text-zinc-500 text-[10px] mb-1 block">Style</Label>
                      <p className="text-zinc-300 text-xs capitalize">{previewItem.generation_config.style.replace('_', ' ')}</p>
                    </div>
                  )}
                  {previewItem.dimensions && (
                    <div className="p-2 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                      <Label className="text-zinc-500 text-[10px] mb-1 block">Dimensions</Label>
                      <p className="text-zinc-300 text-xs">{previewItem.dimensions.width} x {previewItem.dimensions.height}</p>
                    </div>
                  )}
                </div>

                {/* Prompt */}
                {previewItem.generation_config?.prompt && (
                  <div className="p-2 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                    <Label className="text-zinc-500 text-[10px] mb-1 block">Prompt</Label>
                    <p className="text-zinc-300 text-xs">{previewItem.generation_config.prompt}</p>
                  </div>
                )}

                {/* Product Context */}
                {previewItem.product_context?.product_name && (
                  <div className="p-2 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                    <Label className="text-zinc-500 text-[10px] mb-1 block">Product Context</Label>
                    <p className="text-zinc-300 text-xs flex items-center gap-2">
                      <Package className="w-3 h-3" />
                      {previewItem.product_context.product_name}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={() => handleDownload(previewItem)}
                    className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 border-0"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleUseSettings(previewItem);
                      setPreviewItem(null);
                    }}
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate with Same Settings
                  </Button>
                  <div className="flex-1" />
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleDelete(previewItem.id);
                      setPreviewItem(null);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
