/**
 * FilePreview - Enhanced file preview component for inbox messages
 *
 * Supports:
 * - Image preview with lightbox
 * - Video player
 * - Audio player
 * - PDF preview
 * - Code file preview with syntax highlighting
 * - Various file type icons
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, ExternalLink, X, FileText, Image, Film,
  Music, FileCode, FileSpreadsheet, FileArchive,
  File, Play, Pause, Volume2, VolumeX, Maximize2
} from 'lucide-react';

// File type configuration
const FILE_TYPE_CONFIG = {
  // Images
  image: {
    icon: Image,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-400/30',
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico']
  },
  // Videos
  video: {
    icon: Film,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-400/30',
    extensions: ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv']
  },
  // Audio
  audio: {
    icon: Music,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/20',
    borderColor: 'border-pink-400/30',
    extensions: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma']
  },
  // Documents
  pdf: {
    icon: FileText,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-400/30',
    extensions: ['pdf']
  },
  document: {
    icon: FileText,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-400/30',
    extensions: ['doc', 'docx', 'odt', 'rtf', 'txt']
  },
  spreadsheet: {
    icon: FileSpreadsheet,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-400/30',
    extensions: ['xls', 'xlsx', 'csv', 'ods']
  },
  // Code
  code: {
    icon: FileCode,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-400/30',
    extensions: ['js', 'jsx', 'ts', 'tsx', 'py', 'rb', 'java', 'cpp', 'c', 'h', 'go', 'rs', 'php', 'html', 'css', 'scss', 'json', 'xml', 'yaml', 'yml', 'md']
  },
  // Archives
  archive: {
    icon: FileArchive,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-400/30',
    extensions: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2']
  },
  // Default
  default: {
    icon: File,
    color: 'text-zinc-400',
    bgColor: 'bg-zinc-500/20',
    borderColor: 'border-zinc-400/30',
    extensions: []
  }
};

// Get file type from extension
function getFileType(filename) {
  if (!filename) return 'default';
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  for (const [type, config] of Object.entries(FILE_TYPE_CONFIG)) {
    if (config.extensions.includes(ext)) {
      return type;
    }
  }
  return 'default';
}

// Format file size
function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// Image Lightbox Modal
function ImageLightbox({ src, alt, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-zinc-800/80 rounded-lg hover:bg-zinc-700 transition-colors z-10"
      >
        <X className="w-5 h-5 text-white" />
      </button>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        <a
          href={src}
          download
          onClick={(e) => e.stopPropagation()}
          className="px-4 py-2 bg-zinc-800/80 rounded-lg hover:bg-zinc-700 transition-colors flex items-center gap-2 text-white text-sm"
        >
          <Download className="w-4 h-4" />
          Download
        </a>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="px-4 py-2 bg-zinc-800/80 rounded-lg hover:bg-zinc-700 transition-colors flex items-center gap-2 text-white text-sm"
        >
          <ExternalLink className="w-4 h-4" />
          Open
        </a>
      </div>
      <motion.img
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        src={src}
        alt={alt}
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
    </motion.div>
  );
}

// Audio Player Component
function AudioPlayer({ src, filename }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = React.useRef(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    const rect = e.target.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    if (audioRef.current) {
      audioRef.current.currentTime = percent * audioRef.current.duration;
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mt-3 p-3 bg-zinc-800/50 border border-zinc-700 rounded-xl max-w-sm">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-cyan-500 hover:bg-cyan-400 flex items-center justify-center transition-colors"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-white" />
          ) : (
            <Play className="w-5 h-5 text-white ml-0.5" />
          )}
        </button>
        <div className="flex-1">
          <div className="text-sm text-zinc-200 truncate font-medium">{filename}</div>
          <div
            className="h-1 bg-zinc-700 rounded-full mt-1.5 cursor-pointer"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-cyan-400 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-zinc-500">
              {formatTime(audioRef.current?.currentTime)}
            </span>
            <span className="text-xs text-zinc-500">
              {formatTime(duration)}
            </span>
          </div>
        </div>
        <button
          onClick={toggleMute}
          className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-zinc-400" />
          ) : (
            <Volume2 className="w-4 h-4 text-zinc-400" />
          )}
        </button>
      </div>
    </div>
  );
}

// Video Player Component
function VideoPlayer({ src, filename, poster }) {
  const [showLightbox, setShowLightbox] = useState(false);

  return (
    <>
      <div className="mt-3 relative group max-w-md">
        <video
          src={src}
          poster={poster}
          controls
          className="rounded-xl max-h-80 w-full object-cover border border-zinc-700"
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button
            onClick={() => setShowLightbox(true)}
            className="p-2 bg-black/70 rounded-lg hover:bg-black/90 backdrop-blur-sm"
          >
            <Maximize2 className="w-4 h-4 text-white" />
          </button>
          <a
            href={src}
            download
            className="p-2 bg-black/70 rounded-lg hover:bg-black/90 backdrop-blur-sm"
          >
            <Download className="w-4 h-4 text-white" />
          </a>
        </div>
      </div>

      <AnimatePresence>
        {showLightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
            onClick={() => setShowLightbox(false)}
          >
            <button
              onClick={() => setShowLightbox(false)}
              className="absolute top-4 right-4 p-2 bg-zinc-800/80 rounded-lg hover:bg-zinc-700 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <video
              src={src}
              controls
              autoPlay
              className="max-w-[90vw] max-h-[90vh] rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// PDF Preview Component
function PDFPreview({ src, filename }) {
  const [showEmbed, setShowEmbed] = useState(false);

  return (
    <div className="mt-3 max-w-md">
      <div className="p-3 bg-zinc-800/50 border border-zinc-700 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center">
            <FileText className="w-6 h-6 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-zinc-200 truncate font-medium">{filename}</div>
            <div className="text-xs text-zinc-500">PDF Document</div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setShowEmbed(!showEmbed)}
              className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
              title={showEmbed ? 'Hide preview' : 'Show preview'}
            >
              <Maximize2 className="w-4 h-4 text-zinc-400" />
            </button>
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-zinc-400" />
            </a>
            <a
              href={src}
              download
              className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4 text-zinc-400" />
            </a>
          </div>
        </div>

        <AnimatePresence>
          {showEmbed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 400, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 overflow-hidden rounded-lg"
            >
              <iframe
                src={`${src}#view=FitH`}
                className="w-full h-full border-0 bg-white rounded-lg"
                title={filename}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Generic File Preview Component
function GenericFilePreview({ src, filename, fileSize }) {
  const fileType = getFileType(filename);
  const config = FILE_TYPE_CONFIG[fileType] || FILE_TYPE_CONFIG.default;
  const Icon = config.icon;

  return (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 flex items-center gap-3 p-3 bg-zinc-800/50 border border-zinc-700 rounded-xl hover:bg-zinc-800 hover:border-zinc-600 transition-all max-w-sm group"
    >
      <div className={`w-12 h-12 rounded-lg ${config.bgColor} border ${config.borderColor} flex items-center justify-center`}>
        <Icon className={`w-6 h-6 ${config.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-zinc-200 truncate font-medium">{filename || 'File'}</div>
        <div className="text-xs text-zinc-500 flex items-center gap-2">
          <span>Click to download</span>
          {fileSize && <span>• {formatFileSize(fileSize)}</span>}
        </div>
      </div>
      <Download className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
    </a>
  );
}

// Main FilePreview Component
export default function FilePreview({ type, url, filename, fileSize, poster }) {
  const [showLightbox, setShowLightbox] = useState(false);
  const fileType = getFileType(filename);

  // Handle images
  if (type === 'image' || fileType === 'image') {
    return (
      <>
        <div className="mt-3 relative group max-w-md">
          <img
            src={url}
            alt={filename || 'Image'}
            className="rounded-xl max-h-80 object-cover cursor-pointer hover:opacity-90 transition-opacity border border-zinc-700"
            onClick={() => setShowLightbox(true)}
          />
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <button
              onClick={() => setShowLightbox(true)}
              className="p-2 bg-black/70 rounded-lg hover:bg-black/90 backdrop-blur-sm"
            >
              <Maximize2 className="w-4 h-4 text-white" />
            </button>
            <a
              href={url}
              download
              className="p-2 bg-black/70 rounded-lg hover:bg-black/90 backdrop-blur-sm"
            >
              <Download className="w-4 h-4 text-white" />
            </a>
          </div>
        </div>
        <AnimatePresence>
          {showLightbox && (
            <ImageLightbox
              src={url}
              alt={filename}
              onClose={() => setShowLightbox(false)}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  // Handle videos
  if (type === 'video' || fileType === 'video') {
    return <VideoPlayer src={url} filename={filename} poster={poster} />;
  }

  // Handle audio
  if (fileType === 'audio') {
    return <AudioPlayer src={url} filename={filename} />;
  }

  // Handle PDFs
  if (fileType === 'pdf') {
    return <PDFPreview src={url} filename={filename} />;
  }

  // Handle all other files
  return <GenericFilePreview src={url} filename={filename} fileSize={fileSize} />;
}

export { getFileType, formatFileSize, FILE_TYPE_CONFIG };
