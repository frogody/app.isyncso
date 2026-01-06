import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { storage } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { toast } from 'sonner';
import {
  Upload, X, Image as ImageIcon, Star, StarOff, GripVertical,
  Loader2, AlertCircle, CheckCircle, Trash2, RotateCcw, ZoomIn
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const BUCKET_NAME = 'product-images';

/**
 * ProductImageUploader - Comprehensive image upload component for products
 *
 * Features:
 * - Drag & drop upload
 * - Multiple file upload
 * - Upload progress indicators
 * - Reorder images via drag & drop
 * - Set/unset featured image
 * - Preview with lightbox
 * - Delete images
 * - Supabase Storage integration
 */
export default function ProductImageUploader({
  images = [],
  featuredImage = null,
  onImagesChange,
  onFeaturedChange,
  maxImages = 10,
  className,
}) {
  const { user } = useUser();
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [previewImage, setPreviewImage] = useState(null);

  // Combine featured and gallery for display (featured first if exists)
  const allImages = [
    ...(featuredImage ? [{ ...featuredImage, isFeatured: true }] : []),
    ...images.filter(img => img.url !== featuredImage?.url)
  ];

  // Handle drag events
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

  // Process and validate files
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

  // Upload a single file to Supabase Storage
  const uploadFile = async (file) => {
    const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const ext = file.name.split('.').pop();
    const path = `${user?.company_id || 'public'}/${fileId}.${ext}`;

    try {
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

      // Simulate progress (Supabase doesn't provide real progress for small files)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => ({
          ...prev,
          [fileId]: Math.min((prev[fileId] || 0) + 10, 90)
        }));
      }, 100);

      const result = await storage.upload(BUCKET_NAME, path, file);

      clearInterval(progressInterval);
      setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));

      // Clean up progress after a moment
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

  // Handle file drop
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

      // If no featured image yet, set the first uploaded one
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

  // Handle file input change
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

  // Handle image deletion
  const handleDelete = (imageToDelete) => {
    const newImages = images.filter(img => img.url !== imageToDelete.url);
    onImagesChange?.(newImages);

    // If deleting featured image, set new featured or clear it
    if (featuredImage?.url === imageToDelete.url) {
      onFeaturedChange?.(newImages[0] || null);
    }
  };

  // Handle set as featured
  const handleSetFeatured = (image) => {
    onFeaturedChange?.(image);
  };

  // Handle reorder
  const handleReorder = (reorderedImages) => {
    // Extract just the gallery images (non-featured)
    const galleryImages = reorderedImages.filter(img => !img.isFeatured);
    onImagesChange?.(galleryImages);
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
            ? "border-amber-500 bg-amber-500/10"
            : "border-zinc-700 hover:border-zinc-600 bg-zinc-900/50 hover:bg-zinc-900/70",
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
              <Loader2 className="w-10 h-10 text-amber-400 animate-spin mb-3" />
              <p className="text-white font-medium">Uploading...</p>
            </motion.div>
          ) : isDragging ? (
            <motion.div
              key="dragging"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-3">
                <Upload className="w-8 h-8 text-amber-400" />
              </div>
              <p className="text-amber-400 font-medium">Drop images here</p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-3">
                <ImageIcon className="w-8 h-8 text-zinc-500" />
              </div>
              <p className="text-white font-medium mb-1">
                Drag & drop images here
              </p>
              <p className="text-sm text-zinc-500 mb-3">
                or click to browse
              </p>
              <p className="text-xs text-zinc-600">
                PNG, JPG, WebP or GIF. Max 10MB each. Up to {maxImages} images.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploadProgress).map(([id, progress]) => (
            <div key={id} className="flex items-center gap-3">
              <Progress value={progress} className="flex-1 h-2" />
              <span className="text-xs text-zinc-400 w-12">{progress}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Image Gallery */}
      {allImages.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-zinc-300">
              Product Images ({allImages.length}/{maxImages})
            </h4>
            {allImages.length > 1 && (
              <p className="text-xs text-zinc-500">Drag to reorder</p>
            )}
          </div>

          <Reorder.Group
            axis="x"
            values={allImages}
            onReorder={handleReorder}
            className="flex flex-wrap gap-3"
          >
            {allImages.map((image) => (
              <Reorder.Item
                key={image.url}
                value={image}
                className="relative group"
              >
                <div
                  className={cn(
                    "relative w-28 h-28 rounded-lg overflow-hidden border-2 transition-all",
                    "bg-zinc-800 cursor-grab active:cursor-grabbing",
                    image.isFeatured
                      ? "border-amber-500 ring-2 ring-amber-500/30"
                      : "border-zinc-700 hover:border-zinc-600"
                  )}
                >
                  {/* Image */}
                  <img
                    src={image.url}
                    alt={image.alt || 'Product image'}
                    className="w-full h-full object-cover"
                    onClick={() => setPreviewImage(image)}
                  />

                  {/* Featured Badge */}
                  {image.isFeatured && (
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-amber-500 text-[10px] font-bold text-black">
                      FEATURED
                    </div>
                  )}

                  {/* Drag Handle */}
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-6 h-6 rounded bg-black/60 flex items-center justify-center">
                      <GripVertical className="w-3 h-3 text-white" />
                    </div>
                  </div>

                  {/* Hover Actions */}
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
                        image.isFeatured ? "text-amber-400" : "text-white"
                      )}
                      title={image.isFeatured ? "Featured image" : "Set as featured"}
                    >
                      {image.isFeatured ? (
                        <Star className="w-4 h-4 fill-amber-400" />
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
          </Reorder.Group>
        </div>
      )}

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
  value, // Single image object or URL
  onChange,
  className,
}) {
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
        <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-zinc-700 group">
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
            "w-32 h-32 rounded-lg border-2 border-dashed border-zinc-700",
            "flex flex-col items-center justify-center gap-2",
            "hover:border-zinc-600 hover:bg-zinc-900/50 transition-colors",
            uploading && "opacity-60 cursor-not-allowed"
          )}
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
          ) : (
            <>
              <Upload className="w-6 h-6 text-zinc-500" />
              <span className="text-xs text-zinc-500">Upload</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
