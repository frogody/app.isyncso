import React, { useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { storage, supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { toast } from 'sonner';
import {
  Upload, X, Image as ImageIcon, Star, StarOff, GripVertical,
  Loader2, AlertCircle, CheckCircle, Trash2, RotateCcw, ZoomIn,
  FolderOpen, Check, Camera, Sparkles, LayoutGrid, Tag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { useTheme } from '@/contexts/GlobalThemeContext';

const IMAGES_PER_ROW = 4;
const MAX_VISIBLE_ROWS = 2;
const MAX_VISIBLE = IMAGES_PER_ROW * MAX_VISIBLE_ROWS; // 8

function classifyImageType(image) {
  const alt = (image.alt || '').toLowerCase();
  const url = (image.url || '').toLowerCase();

  if (alt.includes('hero') || alt.includes('studio') || alt.includes('white background') || alt.includes('main'))
    return 'studio';
  if (alt.includes('lifestyle') || alt.includes('scene') || alt.includes('context') || alt.includes('setting'))
    return 'lifestyle';
  if (alt.includes('usp') || alt.includes('graphic') || alt.includes('infographic') || alt.includes('feature'))
    return 'usp';
  if (alt.includes('video') || alt.includes('frame') || alt.includes('cinematic'))
    return 'video_frame';

  if (image.isFeatured) return 'studio';

  return 'other';
}

const IMAGE_TYPE_META = {
  studio: { label: 'Studio Shots', icon: Camera, color: 'cyan' },
  lifestyle: { label: 'Lifestyle', icon: Sparkles, color: 'blue' },
  usp: { label: 'USP Graphics', icon: LayoutGrid, color: 'purple' },
  video_frame: { label: 'Video Frames', icon: Tag, color: 'amber' },
  other: { label: 'Other', icon: ImageIcon, color: 'zinc' },
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const BUCKET_NAME = 'product-images';

/**
 * ProductImageUploader - Comprehensive image upload component for products
 */
export default function ProductImageUploader({
  images = [],
  featuredImage = null,
  onImagesChange,
  onFeaturedChange,
  maxImages = 10,
  className,
}) {
  const { t } = useTheme();
  const { user } = useUser();
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [previewImage, setPreviewImage] = useState(null);
  const [showAllGallery, setShowAllGallery] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryItems, setLibraryItems] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [selectedLibrary, setSelectedLibrary] = useState(new Set());

  const safeImages = Array.isArray(images) ? images : [];
  const allImages = [
    ...(featuredImage ? [{ ...(typeof featuredImage === 'string' ? { url: featuredImage } : featuredImage), isFeatured: true }] : []),
    ...safeImages.filter(img => img.url !== featuredImage?.url)
  ];

  const hiddenCount = Math.max(0, allImages.length - (MAX_VISIBLE - 1));
  const showMoreTile = allImages.length > MAX_VISIBLE;
  const visibleImages = showMoreTile ? allImages.slice(0, MAX_VISIBLE - 1) : allImages;

  const categorizedImages = useMemo(() => {
    const categories = {};
    allImages.forEach((img) => {
      const type = classifyImageType(img);
      if (!categories[type]) categories[type] = [];
      categories[type].push(img);
    });
    return categories;
  }, [allImages]);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const processFiles = (files) => {
    const validFiles = [];
    const errors = [];

    for (const file of files) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File too large (max 10MB)`);
        continue;
      }
      if (allImages.length + validFiles.length >= maxImages) {
        errors.push(`Maximum ${maxImages} images allowed`);
        break;
      }
      validFiles.push(file);
    }

    if (errors.length > 0) {
      toast.error(errors.join('\n'));
    }

    return validFiles;
  };

  const uploadFile = async (file) => {
    const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const ext = file.name.split('.').pop();
    const path = `${user?.company_id || 'public'}/${fileId}.${ext}`;

    try {
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

      const progressInterval = setInterval(() => {
        setUploadProgress(prev => ({
          ...prev,
          [fileId]: Math.min((prev[fileId] || 0) + 10, 90)
        }));
      }, 100);

      const result = await storage.upload(BUCKET_NAME, path, file);

      clearInterval(progressInterval);
      setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));

      setTimeout(() => {
        setUploadProgress(prev => {
          const { [fileId]: _, ...rest } = prev;
          return rest;
        });
      }, 1000);

      return {
        url: result.url,
        path: result.path,
        alt: file.name.replace(/\.[^/.]+$/, ''),
        size: file.size,
        type: file.type,
      };
    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress(prev => {
        const { [fileId]: _, ...rest } = prev;
        return rest;
      });
      throw error;
    }
  };

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const validFiles = processFiles(files);

    if (validFiles.length === 0) return;

    setUploading(true);
    try {
      const uploadedImages = await Promise.all(
        validFiles.map(file => uploadFile(file))
      );

      const newImages = [...images, ...uploadedImages];
      onImagesChange?.(newImages);

      if (!featuredImage && uploadedImages.length > 0) {
        onFeaturedChange?.(uploadedImages[0]);
      }

      toast.success(`${uploadedImages.length} image(s) uploaded`);
    } catch (error) {
      toast.error('Failed to upload some images');
    } finally {
      setUploading(false);
    }
  }, [images, featuredImage, onImagesChange, onFeaturedChange]);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    const validFiles = processFiles(files);

    if (validFiles.length === 0) return;

    setUploading(true);
    try {
      const uploadedImages = await Promise.all(
        validFiles.map(file => uploadFile(file))
      );

      const newImages = [...images, ...uploadedImages];
      onImagesChange?.(newImages);

      if (!featuredImage && uploadedImages.length > 0) {
        onFeaturedChange?.(uploadedImages[0]);
      }

      toast.success(`${uploadedImages.length} image(s) uploaded`);
    } catch (error) {
      toast.error('Failed to upload some images');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = (imageToDelete) => {
    const newImages = images.filter(img => img.url !== imageToDelete.url);
    onImagesChange?.(newImages);

    if (featuredImage?.url === imageToDelete.url) {
      onFeaturedChange?.(newImages[0] || null);
    }
  };

  const handleSetFeatured = (image) => {
    onFeaturedChange?.(image);
  };

  const handleReorder = (reorderedImages) => {
    const galleryImages = reorderedImages.filter(img => !img.isFeatured);
    onImagesChange?.(galleryImages);
  };

  const openLibraryPicker = async () => {
    setShowLibrary(true);
    setSelectedLibrary(new Set());
    setLibraryLoading(true);
    try {
      const { data, error } = await supabase
        .from('generated_content')
        .select('id, url, name, content_type, created_at, tags')
        .eq('company_id', user?.company_id)
        .eq('content_type', 'image')
        .order('created_at', { ascending: false })
        .limit(60);
      if (error) throw error;
      setLibraryItems(data || []);
    } catch (err) {
      console.error('Failed to load library:', err);
      toast.error('Failed to load content library');
    } finally {
      setLibraryLoading(false);
    }
  };

  const toggleLibraryItem = (id) => {
    setSelectedLibrary(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (allImages.length + next.size >= maxImages) {
          toast.error(`Maximum ${maxImages} images allowed`);
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const handleAddFromLibrary = () => {
    const selected = libraryItems.filter(item => selectedLibrary.has(item.id));
    const newProductImages = selected.map(item => ({
      url: item.url,
      alt: item.name || 'Library image',
      size: null,
      type: 'image/png',
    }));
    const updatedImages = [...images, ...newProductImages];
    onImagesChange?.(updatedImages);
    if (!featuredImage && newProductImages.length > 0) {
      onFeaturedChange?.(newProductImages[0]);
    }
    toast.success(`${newProductImages.length} image(s) added from library`);
    setShowLibrary(false);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative rounded-xl border-2 border-dashed transition-all cursor-pointer",
          "flex flex-col items-center justify-center p-8 text-center",
          isDragging
            ? "border-cyan-500 bg-cyan-500/10"
            : `${t('border-slate-300', 'border-zinc-700')} ${t('hover:border-slate-400', 'hover:border-zinc-600')} ${t('bg-slate-50', 'bg-zinc-900/50')} ${t('hover:bg-slate-100', 'hover:bg-zinc-900/70')}`,
          uploading && "pointer-events-none opacity-60"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        <AnimatePresence mode="wait">
          {uploading ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mb-3" />
              <p className={`${t('text-slate-900', 'text-white')} font-medium`}>Uploading...</p>
            </motion.div>
          ) : isDragging ? (
            <motion.div
              key="dragging"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center mb-3">
                <Upload className="w-8 h-8 text-cyan-400" />
              </div>
              <p className="text-cyan-400 font-medium">Drop images here</p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              <div className={`w-16 h-16 rounded-full ${t('bg-slate-200', 'bg-zinc-800')} flex items-center justify-center mb-3`}>
                <ImageIcon className={`w-8 h-8 ${t('text-slate-400', 'text-zinc-500')}`} />
              </div>
              <p className={`${t('text-slate-900', 'text-white')} font-medium mb-1`}>
                Drag & drop images here
              </p>
              <p className={`text-sm ${t('text-slate-500', 'text-zinc-500')} mb-3`}>
                or click to browse
              </p>
              <p className={`text-xs ${t('text-slate-400', 'text-zinc-600')}`}>
                PNG, JPG, WebP or GIF. Max 10MB each. Up to {maxImages} images.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add from Library Button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); openLibraryPicker(); }}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-2 rounded-lg border transition-colors text-sm",
          t('border-slate-200', 'border-zinc-800'),
          t('text-slate-600', 'text-zinc-400'),
          t('hover:bg-slate-50', 'hover:bg-zinc-900/50'),
          t('hover:text-slate-900', 'hover:text-zinc-200'),
        )}
      >
        <FolderOpen className="w-4 h-4" />
        Add from Content Library
      </button>

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploadProgress).map(([id, progress]) => (
            <div key={id} className="flex items-center gap-3">
              <Progress value={progress} className="flex-1 h-2" />
              <span className={`text-xs ${t('text-slate-500', 'text-zinc-400')} w-12`}>{progress}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Image Gallery */}
      {allImages.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className={`text-sm font-medium ${t('text-slate-700', 'text-zinc-300')}`}>
              Product Images ({allImages.length}/{maxImages})
            </h4>
            {allImages.length > 1 && (
              <p className={`text-xs ${t('text-slate-500', 'text-zinc-500')}`}>Drag to reorder</p>
            )}
          </div>

          <Reorder.Group
            axis="x"
            values={allImages}
            onReorder={handleReorder}
            className="grid grid-cols-4 gap-3"
          >
            {visibleImages.map((image) => (
              <Reorder.Item
                key={image.url}
                value={image}
                className="relative group"
              >
                <div
                  className={cn(
                    "relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
                    `${t('bg-slate-100', 'bg-zinc-800')} cursor-grab active:cursor-grabbing`,
                    image.isFeatured
                      ? "border-cyan-500 ring-2 ring-cyan-500/30"
                      : `${t('border-slate-300', 'border-zinc-700')} ${t('hover:border-slate-400', 'hover:border-zinc-600')}`
                  )}
                >
                  <img
                    src={image.url}
                    alt={image.alt || 'Product image'}
                    className="w-full h-full object-cover"
                    onClick={() => setPreviewImage(image)}
                  />

                  {image.isFeatured && (
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-cyan-500 text-[10px] font-bold text-black">
                      FEATURED
                    </div>
                  )}

                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-6 h-6 rounded bg-black/60 flex items-center justify-center">
                      <GripVertical className="w-3 h-3 text-white" />
                    </div>
                  </div>

                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewImage(image);
                      }}
                      className="h-7 w-7 text-white hover:bg-white/20"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetFeatured(image);
                      }}
                      className={cn(
                        "h-7 w-7 hover:bg-white/20",
                        image.isFeatured ? "text-cyan-400" : "text-white"
                      )}
                      title={image.isFeatured ? "Featured image" : "Set as featured"}
                    >
                      {image.isFeatured ? (
                        <Star className="w-4 h-4 fill-cyan-400" />
                      ) : (
                        <StarOff className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(image);
                      }}
                      className="h-7 w-7 text-red-400 hover:bg-red-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Reorder.Item>
            ))}

            {/* "+X more" tile */}
            {showMoreTile && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAllGallery(true)}
                  className={cn(
                    "relative aspect-square w-full rounded-lg overflow-hidden border-2 transition-all",
                    t('border-slate-300', 'border-zinc-700'),
                    t('hover:border-slate-400', 'hover:border-cyan-600'),
                    t('bg-slate-100', 'bg-zinc-800/80'),
                    "group cursor-pointer"
                  )}
                >
                  {/* Blurred preview of next hidden image */}
                  {allImages[MAX_VISIBLE - 1] && (
                    <img
                      src={allImages[MAX_VISIBLE - 1].url}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover blur-sm opacity-40"
                    />
                  )}
                  <div className={cn(
                    "absolute inset-0 flex flex-col items-center justify-center gap-1",
                    t('bg-slate-100/70', 'bg-black/60'),
                    "group-hover:bg-black/70 transition-colors"
                  )}>
                    <span className={cn("text-2xl font-bold", t('text-slate-700', 'text-white'))}>
                      +{hiddenCount}
                    </span>
                    <span className={cn("text-xs", t('text-slate-500', 'text-zinc-400'))}>
                      more
                    </span>
                  </div>
                </button>
              </div>
            )}
          </Reorder.Group>
        </div>
      )}

      {/* All Images Gallery Modal (Categorized) */}
      <Dialog open={showAllGallery} onOpenChange={setShowAllGallery}>
        <DialogContent className={cn("max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden", t('bg-white', 'bg-zinc-900'), t('border-slate-200', 'border-zinc-800'))}>
          <div className={cn("flex items-center justify-between px-6 py-4 border-b shrink-0", t('border-slate-200', 'border-zinc-800'))}>
            <div>
              <h3 className={cn("text-base font-semibold", t('text-slate-900', 'text-white'))}>All Product Images</h3>
              <p className={cn("text-xs mt-0.5", t('text-slate-500', 'text-zinc-500'))}>{allImages.length} images across {Object.keys(categorizedImages).length} categories</p>
            </div>
            <button onClick={() => setShowAllGallery(false)} className={cn("p-1.5 rounded-lg transition-colors", t('hover:bg-slate-100', 'hover:bg-zinc-800'), t('text-slate-500', 'text-zinc-400'))}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {Object.entries(IMAGE_TYPE_META).map(([typeKey, meta]) => {
              const imgs = categorizedImages[typeKey];
              if (!imgs || imgs.length === 0) return null;
              const Icon = meta.icon;
              return (
                <div key={typeKey}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className={cn("w-4 h-4", {
                      'text-cyan-400': meta.color === 'cyan',
                      'text-blue-400': meta.color === 'blue',
                      'text-purple-400': meta.color === 'purple',
                      'text-amber-400': meta.color === 'amber',
                      'text-zinc-400': meta.color === 'zinc',
                    })} />
                    <h4 className={cn("text-sm font-medium", t('text-slate-700', 'text-zinc-300'))}>{meta.label}</h4>
                    <span className={cn("text-xs px-1.5 py-0.5 rounded-full", t('bg-slate-100 text-slate-500', 'bg-zinc-800 text-zinc-500'))}>{imgs.length}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {imgs.map((img) => (
                      <button
                        key={img.url}
                        type="button"
                        onClick={() => { setPreviewImage(img); }}
                        className={cn(
                          "relative aspect-square rounded-lg overflow-hidden border-2 transition-all group",
                          img.isFeatured
                            ? "border-cyan-500 ring-2 ring-cyan-500/30"
                            : cn(t('border-slate-200', 'border-zinc-800'), t('hover:border-slate-400', 'hover:border-zinc-600'))
                        )}
                      >
                        <img src={img.url} alt={img.alt || 'Product image'} className="w-full h-full object-cover" />
                        {img.isFeatured && (
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-cyan-500 text-[10px] font-bold text-black">
                            FEATURED
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <ZoomIn className="w-5 h-5 text-white" />
                        </div>
                        <div className={cn(
                          "absolute bottom-0 inset-x-0 px-1.5 py-1 text-[10px] truncate",
                          "bg-gradient-to-t from-black/70 to-transparent text-white/80"
                        )}>
                          {img.alt || 'Untitled'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Content Library Picker */}
      <Dialog open={showLibrary} onOpenChange={setShowLibrary}>
        <DialogContent className={cn("max-w-2xl max-h-[80vh] flex flex-col p-0 overflow-hidden", t('bg-white', 'bg-zinc-900'), t('border-slate-200', 'border-zinc-800'))}>
          <div className={cn("flex items-center justify-between px-5 py-4 border-b", t('border-slate-200', 'border-zinc-800'))}>
            <div>
              <h3 className={cn("text-base font-semibold", t('text-slate-900', 'text-white'))}>Content Library</h3>
              <p className={cn("text-xs mt-0.5", t('text-slate-500', 'text-zinc-500'))}>Select images to add to this product</p>
            </div>
            {selectedLibrary.size > 0 && (
              <span className="text-xs font-medium text-cyan-400">{selectedLibrary.size} selected</span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {libraryLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              </div>
            ) : libraryItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FolderOpen className={cn("w-12 h-12 mb-3", t('text-slate-300', 'text-zinc-700'))} />
                <p className={cn("font-medium", t('text-slate-600', 'text-zinc-400'))}>No images in library</p>
                <p className={cn("text-sm mt-1", t('text-slate-400', 'text-zinc-600'))}>Generate content in the Studio first</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {libraryItems.map(item => {
                  const isSelected = selectedLibrary.has(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleLibraryItem(item.id)}
                      className={cn(
                        "relative aspect-square rounded-lg overflow-hidden border-2 transition-all group",
                        isSelected
                          ? "border-cyan-500 ring-2 ring-cyan-500/30"
                          : cn(t('border-slate-200', 'border-zinc-800'), t('hover:border-slate-400', 'hover:border-zinc-600'))
                      )}
                    >
                      <img src={item.url} alt={item.name || ''} className="w-full h-full object-cover" />
                      {isSelected && (
                        <div className="absolute inset-0 bg-cyan-500/20 flex items-center justify-center">
                          <div className="w-7 h-7 rounded-full bg-cyan-500 flex items-center justify-center">
                            <Check className="w-4 h-4 text-black" />
                          </div>
                        </div>
                      )}
                      <div className={cn(
                        "absolute bottom-0 inset-x-0 px-1.5 py-1 text-[10px] truncate",
                        "bg-gradient-to-t from-black/70 to-transparent text-white/80"
                      )}>
                        {item.name || 'Untitled'}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className={cn("flex items-center justify-end gap-2 px-5 py-3 border-t", t('border-slate-200', 'border-zinc-800'))}>
            <Button variant="ghost" size="sm" onClick={() => setShowLibrary(false)} className={t('text-slate-600', 'text-zinc-400')}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddFromLibrary}
              disabled={selectedLibrary.size === 0}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              Add {selectedLibrary.size > 0 ? `${selectedLibrary.size} image${selectedLibrary.size > 1 ? 's' : ''}` : 'selected'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Preview Lightbox */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="bg-black border-none max-w-4xl p-0 overflow-hidden">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
            >
              <X className="w-6 h-6" />
            </Button>
            {previewImage && (
              <img
                src={previewImage.url}
                alt={previewImage.alt || 'Preview'}
                className="w-full max-h-[80vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Compact version for use in forms
 */
export function ProductImageInput({
  value,
  onChange,
  className,
}) {
  const { t } = useTheme();
  const [uploading, setUploading] = useState(false);
  const { user } = useUser();
  const fileInputRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Invalid file type');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large (max 10MB)');
      return;
    }

    setUploading(true);
    try {
      const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const ext = file.name.split('.').pop();
      const path = `${user?.company_id || 'public'}/${fileId}.${ext}`;

      const result = await storage.upload(BUCKET_NAME, path, file);

      onChange?.({
        url: result.url,
        path: result.path,
        alt: file.name.replace(/\.[^/.]+$/, ''),
      });

      toast.success('Image uploaded');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const imageUrl = typeof value === 'string' ? value : value?.url;

  return (
    <div className={cn("relative", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleUpload}
        className="hidden"
      />

      {imageUrl ? (
        <div className={`relative w-32 h-32 rounded-lg overflow-hidden border ${t('border-slate-300', 'border-zinc-700')} group`}>
          <img
            src={imageUrl}
            alt="Product"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="h-8 w-8 text-white hover:bg-white/20"
              disabled={uploading}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onChange?.(null)}
              className="h-8 w-8 text-red-400 hover:bg-red-500/20"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={cn(
            `w-32 h-32 rounded-lg border-2 border-dashed ${t('border-slate-300', 'border-zinc-700')}`,
            "flex flex-col items-center justify-center gap-2",
            `${t('hover:border-slate-400', 'hover:border-zinc-600')} ${t('hover:bg-slate-50', 'hover:bg-zinc-900/50')} transition-colors`,
            uploading && "opacity-60 cursor-not-allowed"
          )}
        >
          {uploading ? (
            <Loader2 className={`w-6 h-6 ${t('text-slate-400', 'text-zinc-500')} animate-spin`} />
          ) : (
            <>
              <Upload className={`w-6 h-6 ${t('text-slate-400', 'text-zinc-500')}`} />
              <span className={`text-xs ${t('text-slate-500', 'text-zinc-500')}`}>Upload</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
