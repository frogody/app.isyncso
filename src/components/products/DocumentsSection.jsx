import React, { useState, useRef } from 'react';
import {
  FileText, Upload, Download, Trash2, Eye, File, FileImage,
  FileSpreadsheet, FileArchive, Film, Music, MoreVertical,
  Plus, FolderOpen, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const FILE_ICONS = {
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  csv: FileSpreadsheet,
  jpg: FileImage,
  jpeg: FileImage,
  png: FileImage,
  gif: FileImage,
  webp: FileImage,
  svg: FileImage,
  mp4: Film,
  mov: Film,
  avi: Film,
  mp3: Music,
  wav: Music,
  zip: FileArchive,
  rar: FileArchive,
  '7z': FileArchive,
};

const CATEGORY_COLORS = {
  specification: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  certificate: 'bg-green-500/20 text-green-400 border-green-500/30',
  manual: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  marketing: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  compliance: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  other: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

function getFileIcon(filename) {
  const ext = filename?.split('.').pop()?.toLowerCase();
  return FILE_ICONS[ext] || File;
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function DocumentCard({ document, onDelete, onDownload, onPreview }) {
  const FileIcon = getFileIcon(document.name);
  const categoryColor = CATEGORY_COLORS[document.category] || CATEGORY_COLORS.other;

  return (
    <div className="group p-3 rounded-lg bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-all">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-zinc-800 border border-white/5 flex items-center justify-center">
          <FileIcon className="w-5 h-5 text-zinc-400" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{document.name}</p>
              <div className="flex items-center gap-2 mt-1">
                {document.category && (
                  <Badge variant="outline" className={cn("text-xs py-0", categoryColor)}>
                    {document.category}
                  </Badge>
                )}
                {document.size && (
                  <span className="text-xs text-zinc-600">{formatFileSize(document.size)}</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-4 h-4 text-zinc-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                <DropdownMenuItem
                  className="text-zinc-300 cursor-pointer"
                  onClick={() => onPreview?.(document)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-zinc-300 cursor-pointer"
                  onClick={() => onDownload?.(document)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-400 cursor-pointer"
                  onClick={() => onDelete?.(document)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {document.description && (
            <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{document.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DocumentsSection({
  documents = [],
  onUpload,
  onDelete,
  onDownload,
  className
}) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        await onUpload?.(file);
      }
      toast.success(`${files.length} file(s) uploaded`);
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error('Failed to upload file(s)');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePreview = (doc) => {
    if (doc.url) {
      window.open(doc.url, '_blank');
    }
  };

  const handleDownload = (doc) => {
    if (doc.url) {
      const link = document.createElement('a');
      link.href = doc.url;
      link.download = doc.name;
      link.click();
    }
    onDownload?.(doc);
  };

  // Group documents by category
  const groupedDocs = documents.reduce((acc, doc) => {
    const category = doc.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(doc);
    return acc;
  }, {});

  const categories = Object.keys(groupedDocs);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-orange-400" />
          <span className="font-medium text-white">Documents & Files</span>
          {documents.length > 0 && (
            <Badge variant="outline" className="border-white/10 text-zinc-400">
              {documents.length}
            </Badge>
          )}
        </div>

        <Button
          size="sm"
          variant="outline"
          className="border-white/10 text-zinc-300 hover:text-white"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Plus className="w-4 h-4 mr-1" />
          {uploading ? 'Uploading...' : 'Add File'}
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          onChange={handleFileSelect}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.gif,.mp4,.mov,.zip"
        />
      </div>

      {/* Empty State */}
      {documents.length === 0 && (
        <div
          className="border-2 border-dashed border-white/10 rounded-lg p-8 text-center cursor-pointer hover:border-orange-500/30 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm text-zinc-400">Drop files here or click to upload</p>
          <p className="text-xs text-zinc-600 mt-1">
            Specs, certificates, manuals, marketing materials
          </p>
        </div>
      )}

      {/* Document List */}
      {categories.length > 0 && (
        <div className="space-y-4">
          {categories.map((category) => (
            <div key={category}>
              {categories.length > 1 && (
                <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
                  {category}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {groupedDocs[category].map((doc, index) => (
                  <DocumentCard
                    key={doc.id || index}
                    document={doc}
                    onDelete={onDelete}
                    onDownload={handleDownload}
                    onPreview={handlePreview}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
