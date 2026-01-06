import React, { useState, useEffect } from 'react';
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
  Calendar,
  Tag,
  MoreVertical,
  CheckSquare,
  Square,
  X,
  Eye,
  RefreshCw,
  Clock,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

  // Load content
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
      // Small delay between downloads
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500/10 rounded-lg">
                <FolderOpen className="w-6 h-6 text-rose-400" />
              </div>
              <h1 className="text-2xl font-bold text-white">Content Library</h1>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-slate-600 text-slate-300">
                {filteredContent.length} items
              </Badge>
            </div>
          </div>
          <p className="text-slate-400">Manage all your AI-generated images and videos</p>
        </div>

        {/* Toolbar */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, prompt, or tags..."
                  className="pl-10 bg-slate-900/50 border-slate-600 text-white"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Type Filter */}
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-32 bg-slate-900/50 border-slate-600 text-white">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all" className="text-white hover:bg-slate-700">All Types</SelectItem>
                    <SelectItem value="image" className="text-white hover:bg-slate-700">Images</SelectItem>
                    <SelectItem value="video" className="text-white hover:bg-slate-700">Videos</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40 bg-slate-900/50 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="-created_at" className="text-white hover:bg-slate-700">Newest First</SelectItem>
                    <SelectItem value="created_at" className="text-white hover:bg-slate-700">Oldest First</SelectItem>
                    <SelectItem value="name" className="text-white hover:bg-slate-700">Name A-Z</SelectItem>
                    <SelectItem value="-name" className="text-white hover:bg-slate-700">Name Z-A</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Mode */}
                <div className="flex border border-slate-600 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'bg-rose-500 text-white' : 'bg-slate-900/50 text-slate-400'}`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'bg-rose-500 text-white' : 'bg-slate-900/50 text-slate-400'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedItems.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-700 flex items-center gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={selectAll}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
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
                <span className="text-slate-400 text-sm">
                  {selectedItems.length} selected
                </span>
                <div className="flex-1" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkDownload}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
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
          </CardContent>
        </Card>

        {/* Content Grid/List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading content...</p>
          </div>
        ) : filteredContent.length === 0 ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="py-12 text-center">
              <FolderOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No content yet</h3>
              <p className="text-slate-400 mb-6">
                {searchQuery || filterType !== 'all'
                  ? 'No content matches your filters'
                  : 'Start creating images and videos to build your library'}
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  onClick={() => navigate(createPageUrl('CreateImages'))}
                  className="bg-rose-500 hover:bg-rose-600"
                >
                  <Image className="w-4 h-4 mr-2" />
                  Create Image
                </Button>
                <Button
                  onClick={() => navigate(createPageUrl('CreateVideos'))}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <Video className="w-4 h-4 mr-2" />
                  Create Video
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredContent.map(item => (
              <div
                key={item.id}
                className={`group relative aspect-square rounded-lg overflow-hidden border transition-all cursor-pointer ${
                  selectedItems.includes(item.id)
                    ? 'border-rose-500 ring-2 ring-rose-500/50'
                    : 'border-slate-700 hover:border-slate-600'
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
                  <Badge className={`${item.content_type === 'video' ? 'bg-purple-500/80' : 'bg-blue-500/80'} text-white text-xs`}>
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
                      className="w-full h-full bg-slate-900 flex items-center justify-center"
                      onClick={() => setPreviewItem(item)}
                    >
                      <Video className="w-12 h-12 text-slate-600" />
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
                    <Badge className="bg-black/70 text-white text-xs">
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
                    className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700"
                    title="Preview"
                  >
                    <Eye className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(item);
                    }}
                    className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700"
                    title="Download"
                  >
                    <Download className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id);
                    }}
                    className="p-2 bg-slate-800 rounded-lg hover:bg-red-900"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredContent.map(item => (
              <Card
                key={item.id}
                className={`bg-slate-800/50 border transition-all cursor-pointer ${
                  selectedItems.includes(item.id)
                    ? 'border-rose-500 ring-1 ring-rose-500/50'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <CardContent className="p-4 flex items-center gap-4">
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
                      <Square className="w-5 h-5 text-slate-500" />
                    )}
                  </button>

                  {/* Thumbnail */}
                  <div
                    className="w-16 h-16 rounded-lg overflow-hidden bg-slate-900 flex-shrink-0"
                    onClick={() => setPreviewItem(item)}
                  >
                    {item.content_type === 'video' ? (
                      item.thumbnail_url ? (
                        <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="w-6 h-6 text-slate-600" />
                        </div>
                      )
                    ) : (
                      <img src={item.thumbnail_url || item.url} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0" onClick={() => setPreviewItem(item)}>
                    <h3 className="text-white font-medium truncate">{item.name}</h3>
                    <p className="text-slate-400 text-sm truncate">
                      {item.generation_config?.prompt || 'No prompt'}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <Badge variant="outline" className={`text-xs ${
                        item.content_type === 'video' ? 'border-purple-500 text-purple-400' : 'border-blue-500 text-blue-400'
                      }`}>
                        {item.content_type === 'video' ? <Video className="w-3 h-3 mr-1" /> : <Image className="w-3 h-3 mr-1" />}
                        {item.content_type}
                      </Badge>
                      {item.duration && (
                        <span className="text-slate-500 text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.duration}s
                        </span>
                      )}
                      {item.product_context?.product_name && (
                        <span className="text-slate-500 text-xs flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {item.product_context.product_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date */}
                  <div className="text-slate-500 text-sm hidden md:block">
                    {formatDate(item.created_at)}
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                      <DropdownMenuItem
                        onClick={() => setPreviewItem(item)}
                        className="text-white hover:bg-slate-700"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDownload(item)}
                        className="text-white hover:bg-slate-700"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleUseSettings(item)}
                        className="text-white hover:bg-slate-700"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Use Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-slate-700" />
                      <DropdownMenuItem
                        onClick={() => handleDelete(item.id)}
                        className="text-red-400 hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
        <DialogContent className="max-w-4xl bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              {previewItem?.content_type === 'video' ? (
                <Video className="w-5 h-5 text-purple-400" />
              ) : (
                <Image className="w-5 h-5 text-blue-400" />
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
                  className="w-full rounded-lg"
                  poster={previewItem.thumbnail_url}
                />
              ) : (
                <img
                  src={previewItem.url}
                  alt={previewItem.name}
                  className="w-full rounded-lg"
                />
              )}

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-800 rounded-lg">
                  <Label className="text-slate-400 text-xs mb-1 block">Created</Label>
                  <p className="text-slate-300 text-sm">{formatDate(previewItem.created_at)}</p>
                </div>
                {previewItem.content_type === 'video' && previewItem.duration && (
                  <div className="p-3 bg-slate-800 rounded-lg">
                    <Label className="text-slate-400 text-xs mb-1 block">Duration</Label>
                    <p className="text-slate-300 text-sm">{previewItem.duration} seconds</p>
                  </div>
                )}
                {previewItem.generation_config?.style && (
                  <div className="p-3 bg-slate-800 rounded-lg">
                    <Label className="text-slate-400 text-xs mb-1 block">Style</Label>
                    <p className="text-slate-300 text-sm capitalize">{previewItem.generation_config.style.replace('_', ' ')}</p>
                  </div>
                )}
                {previewItem.dimensions && (
                  <div className="p-3 bg-slate-800 rounded-lg">
                    <Label className="text-slate-400 text-xs mb-1 block">Dimensions</Label>
                    <p className="text-slate-300 text-sm">{previewItem.dimensions.width} x {previewItem.dimensions.height}</p>
                  </div>
                )}
              </div>

              {/* Prompt */}
              {previewItem.generation_config?.prompt && (
                <div className="p-3 bg-slate-800 rounded-lg">
                  <Label className="text-slate-400 text-xs mb-1 block">Prompt</Label>
                  <p className="text-slate-300 text-sm">{previewItem.generation_config.prompt}</p>
                </div>
              )}

              {/* Product Context */}
              {previewItem.product_context?.product_name && (
                <div className="p-3 bg-slate-800 rounded-lg">
                  <Label className="text-slate-400 text-xs mb-1 block">Product Context</Label>
                  <p className="text-slate-300 text-sm flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    {previewItem.product_context.product_name}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={() => handleDownload(previewItem)}
                  className="bg-rose-500 hover:bg-rose-600"
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
                  className="border-slate-600 text-slate-300 hover:bg-slate-800"
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
  );
}
