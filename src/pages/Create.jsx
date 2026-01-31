import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Palette, Image, Video, FolderOpen, Plus, ArrowRight, ArrowUpRight,
  Sparkles, Clock, FileImage, Film, Layers, Wand2, Zap, Play,
  Camera, Clapperboard, Brush, Download, Eye,
} from 'lucide-react';
import { CreatePageTransition } from '@/components/create/ui';
import { GeneratedContent, BrandAssets, VideoProject } from '@/api/entities';
import { MOTION_VARIANTS } from '@/tokens/create';
import { useUser } from '@/components/context/UserContext';

// Animated mesh gradient background
function MeshGradient() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -40, 20, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)' }}
      />
      <motion.div
        animate={{
          x: [0, -30, 20, 0],
          y: [0, 30, -20, 0],
          scale: [1, 0.95, 1.1, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -bottom-1/4 -right-1/4 w-[500px] h-[500px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)' }}
      />
      <motion.div
        animate={{
          x: [0, 20, -10, 0],
          y: [0, -20, 30, 0],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/3 left-1/2 w-[400px] h-[400px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(244,63,94,0.07) 0%, transparent 70%)' }}
      />
    </div>
  );
}

// Floating particle dots
function FloatingParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 15 + 10,
      delay: Math.random() * 5,
      opacity: Math.random() * 0.3 + 0.1,
    })), []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-cyan-400"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, opacity: 0 }}
          animate={{
            y: [0, -60, 0],
            opacity: [0, p.opacity, 0],
          }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

// Thumbnail gallery grid item
function GalleryItem({ item, index }) {
  const isVideo = item.content_type === 'video' || item._type === 'video' || item._type === 'video_project';
  const thumbnailUrl = item.url || item.thumbnail_url || item.final_thumbnail_url;
  const isImage = thumbnailUrl && (thumbnailUrl.includes('.png') || thumbnailUrl.includes('.jpg') || thumbnailUrl.includes('.jpeg') || thumbnailUrl.includes('.webp') || item.content_type === 'image');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.03, y: -4 }}
      className="relative aspect-square rounded-2xl overflow-hidden group cursor-pointer"
    >
      {isImage ? (
        <img src={thumbnailUrl} alt={item.name || ''} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className={`w-full h-full ${
          isVideo
            ? 'bg-gradient-to-br from-rose-950/80 via-zinc-900 to-violet-950/80'
            : 'bg-gradient-to-br from-cyan-950/80 via-zinc-900 to-blue-950/80'
        } flex items-center justify-center`}>
          {isVideo ? <Play className="w-8 h-8 text-white/30" /> : <FileImage className="w-8 h-8 text-white/30" />}
        </div>
      )}
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-3">
        <p className="text-xs font-medium text-white truncate">{item.name || item.title || 'Untitled'}</p>
        <div className="flex items-center gap-1 mt-1">
          {isVideo ? <Film className="w-3 h-3 text-rose-400" /> : <FileImage className="w-3 h-3 text-cyan-400" />}
          <span className="text-[10px] text-zinc-400">{isVideo ? 'Video' : 'Image'}</span>
        </div>
      </div>
      {isVideo && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <Play className="w-3 h-3 text-white fill-white" />
        </div>
      )}
    </motion.div>
  );
}

const TOOLS = [
  {
    key: 'images',
    title: 'AI Images',
    subtitle: 'FLUX Pro & Kontext',
    description: 'Generate stunning product photos, marketing visuals, and creative imagery with state-of-the-art AI models',
    icon: Camera,
    route: 'CreateImages',
    gradient: 'from-violet-600 to-fuchsia-600',
    bgGlow: 'rgba(139,92,246,0.15)',
    features: ['Product scenes', 'Marketing banners', 'Social media'],
  },
  {
    key: 'videos',
    title: 'AI Video Studio',
    subtitle: 'Kling & Minimax',
    description: 'Create cinematic multi-shot videos with AI storyboarding, per-shot generation, and automatic assembly',
    icon: Clapperboard,
    route: 'CreateVideos',
    gradient: 'from-rose-600 to-orange-600',
    bgGlow: 'rgba(244,63,94,0.15)',
    features: ['Storyboard AI', 'Multi-shot', 'Auto-edit'],
  },
  {
    key: 'branding',
    title: 'Brand Designer',
    subtitle: 'Identity & Assets',
    description: 'Design complete brand identities with AI-generated logos, color palettes, typography, and brand guidelines',
    icon: Brush,
    route: 'CreateBranding',
    gradient: 'from-cyan-600 to-blue-600',
    bgGlow: 'rgba(6,182,212,0.15)',
    features: ['Logo design', 'Color palettes', 'Brand kit'],
  },
];

export default function Create() {
  const { user } = useUser();
  const [content, setContent] = useState([]);
  const [brandAssets, setBrandAssets] = useState([]);
  const [videoProjects, setVideoProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredTool, setHoveredTool] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [contentRes, brandsRes, videosRes] = await Promise.allSettled([
        GeneratedContent.list('-created_at', { limit: 12 }),
        BrandAssets.list('-created_at', { limit: 5 }),
        VideoProject.list('-created_at', { limit: 5 }),
      ]);
      if (contentRes.status === 'fulfilled') setContent(contentRes.value || []);
      if (brandsRes.status === 'fulfilled') setBrandAssets(brandsRes.value || []);
      if (videosRes.status === 'fulfilled') setVideoProjects(videosRes.value || []);
    } catch (e) {
      console.error('Failed to load create dashboard data:', e);
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const images = content.filter(c => c.content_type === 'image');
    const videos = content.filter(c => c.content_type === 'video');
    return {
      totalImages: images.length,
      totalVideos: videos.length + videoProjects.length,
      totalBrands: brandAssets.length,
      totalContent: content.length,
    };
  }, [content, brandAssets, videoProjects]);

  const galleryItems = useMemo(() => {
    const items = [
      ...content.map(c => ({ ...c, _type: c.content_type || 'image', _date: c.created_at })),
      ...videoProjects.map(v => ({ ...v, _type: 'video_project', _date: v.created_at })),
    ];
    return items.sort((a, b) => new Date(b._date) - new Date(a._date)).slice(0, 8);
  }, [content, videoProjects]);

  return (
    <CreatePageTransition className="min-h-screen bg-black">
      <div className="relative w-full">
        <MeshGradient />
        <FloatingParticles />

        <div className="relative z-10 w-full px-4 lg:px-6 py-5 space-y-8">

          {/* ── Hero Section ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-[24px] border border-zinc-800/40"
            style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.06) 0%, rgba(0,0,0,0.8) 40%, rgba(139,92,246,0.06) 100%)' }}
          >
            <div className="relative z-10 px-6 lg:px-10 py-8 lg:py-12">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="space-y-4 max-w-xl">
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Sparkles className="w-5 h-5 text-cyan-400" />
                    </motion.div>
                    <span className="text-xs font-medium text-cyan-400 tracking-widest uppercase">AI Create Studio</span>
                  </div>
                  <h1 className="text-3xl lg:text-4xl font-bold text-white leading-tight">
                    Bring ideas to life
                    <br />
                    <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
                      in seconds
                    </span>
                  </h1>
                  <p className="text-sm text-zinc-400 leading-relaxed max-w-md">
                    Generate stunning images, cinematic videos, and complete brand identities using cutting-edge AI models.
                  </p>
                  <div className="flex items-center gap-3 pt-2">
                    <Link to={createPageUrl('CreateImages')}>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold text-sm rounded-full shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-shadow"
                      >
                        <Wand2 className="w-4 h-4" />
                        Start Creating
                      </motion.button>
                    </Link>
                    <Link to={createPageUrl('CreateLibrary')}>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 text-white font-medium text-sm rounded-full hover:bg-white/10 transition-colors"
                      >
                        <FolderOpen className="w-4 h-4" />
                        Library
                      </motion.button>
                    </Link>
                  </div>
                </div>

                {/* Live stats floating cards */}
                <div className="hidden lg:grid grid-cols-2 gap-3">
                  {[
                    { label: 'Images Created', value: stats.totalImages, icon: FileImage, color: 'from-violet-500/20 to-purple-500/20', text: 'text-violet-400' },
                    { label: 'Videos Produced', value: stats.totalVideos, icon: Film, color: 'from-rose-500/20 to-pink-500/20', text: 'text-rose-400' },
                    { label: 'Brand Assets', value: stats.totalBrands, icon: Palette, color: 'from-cyan-500/20 to-blue-500/20', text: 'text-cyan-400' },
                    { label: 'Total Content', value: stats.totalContent, icon: Layers, color: 'from-amber-500/20 to-orange-500/20', text: 'text-amber-400' },
                  ].map((s, i) => (
                    <motion.div
                      key={s.label}
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
                      className="bg-white/[0.04] backdrop-blur-md border border-white/[0.06] rounded-2xl px-4 py-3 min-w-[140px]"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                          <s.icon className={`w-3.5 h-3.5 ${s.text}`} />
                        </div>
                        {loading ? (
                          <div className="w-6 h-5 bg-zinc-800 rounded animate-pulse" />
                        ) : (
                          <span className="text-lg font-bold text-white">{s.value}</span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{s.label}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Decorative grid pattern */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
              style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
            />
          </motion.div>

          {/* ── Tool Cards ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Creative Tools</h2>
              <div className="flex items-center gap-1 text-xs text-zinc-600">
                <Zap className="w-3 h-3" />
                Powered by FLUX, Kling, Minimax
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {TOOLS.map((tool, i) => (
                <Link key={tool.key} to={createPageUrl(tool.route)}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ y: -6, transition: { duration: 0.25 } }}
                    whileTap={{ scale: 0.98 }}
                    onHoverStart={() => setHoveredTool(tool.key)}
                    onHoverEnd={() => setHoveredTool(null)}
                    className="relative overflow-hidden rounded-[20px] border border-zinc-800/50 p-6 cursor-pointer group h-full"
                    style={{ background: `linear-gradient(160deg, rgba(24,24,27,0.9) 0%, rgba(0,0,0,0.95) 100%)` }}
                  >
                    {/* Glow effect on hover */}
                    <AnimatePresence>
                      {hoveredTool === tool.key && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 pointer-events-none"
                          style={{ background: `radial-gradient(ellipse at 30% 20%, ${tool.bgGlow} 0%, transparent 70%)` }}
                        />
                      )}
                    </AnimatePresence>

                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center shadow-lg`}>
                          <tool.icon className="w-6 h-6 text-white" />
                        </div>
                        <motion.div
                          initial={{ x: -5, opacity: 0 }}
                          animate={hoveredTool === tool.key ? { x: 0, opacity: 1 } : { x: -5, opacity: 0 }}
                          className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"
                        >
                          <ArrowUpRight className="w-4 h-4 text-white" />
                        </motion.div>
                      </div>

                      <h3 className="text-base font-bold text-white mb-0.5">{tool.title}</h3>
                      <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2">{tool.subtitle}</p>
                      <p className="text-xs text-zinc-400 leading-relaxed mb-4">{tool.description}</p>

                      <div className="flex flex-wrap gap-1.5">
                        {tool.features.map(f => (
                          <span key={f} className="text-[10px] px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-zinc-400">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>

          {/* ── Gallery Grid ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Recent Creations</h2>
              <Link to={createPageUrl('CreateLibrary')}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View Library
                </motion.button>
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {[1,2,3,4,5,6,7,8].map(i => (
                  <div key={i} className="aspect-square rounded-2xl bg-zinc-900/50 border border-zinc-800/40 animate-pulse" />
                ))}
              </div>
            ) : galleryItems.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative overflow-hidden rounded-[24px] border border-dashed border-zinc-800/60 py-16 text-center"
              >
                <div className="relative z-10">
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/10 to-violet-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-4"
                  >
                    <Sparkles className="w-7 h-7 text-cyan-400" />
                  </motion.div>
                  <p className="text-base font-medium text-white mb-1">Your canvas awaits</p>
                  <p className="text-sm text-zinc-500 mb-5 max-w-xs mx-auto">Create your first piece of content and watch your gallery come to life</p>
                  <Link to={createPageUrl('CreateImages')}>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold text-sm rounded-full"
                    >
                      <Wand2 className="w-4 h-4" />
                      Generate First Image
                    </motion.button>
                  </Link>
                </div>
              </motion.div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {galleryItems.map((item, i) => (
                  <GalleryItem key={item.id} item={item} index={i} />
                ))}
              </div>
            )}
          </div>

          {/* ── Quick Actions Footer ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 pb-4"
          >
            {[
              { label: 'Generate Image', icon: Camera, route: 'CreateImages', desc: 'AI-powered visuals' },
              { label: 'Create Video', icon: Clapperboard, route: 'CreateVideos', desc: 'Cinematic production' },
              { label: 'Design Brand', icon: Brush, route: 'CreateBranding', desc: 'Full brand identity' },
              { label: 'Browse Library', icon: Download, route: 'CreateLibrary', desc: 'All your content' },
            ].map((action, i) => (
              <Link key={action.label} to={createPageUrl(action.route)}>
                <motion.div
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-zinc-800/40 hover:border-cyan-500/20 hover:bg-white/[0.04] transition-all cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/15 transition-colors">
                    <action.icon className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{action.label}</p>
                    <p className="text-[10px] text-zinc-600">{action.desc}</p>
                  </div>
                </motion.div>
              </Link>
            ))}
          </motion.div>

        </div>
      </div>
    </CreatePageTransition>
  );
}
