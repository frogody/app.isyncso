import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Palette, Image, Video, FolderOpen, Plus, ArrowRight, ArrowUpRight,
  Sparkles, Clock, FileImage, Film, Layers, Wand2, Zap, Play,
  Camera, Clapperboard, Brush, Download, Eye, ChevronRight, Star,
} from 'lucide-react';
import { CreatePageTransition } from '@/components/create/ui';
import { GeneratedContent, BrandAssets, VideoProject } from '@/api/entities';
import { useUser } from '@/components/context/UserContext';

// ── Neon Yellow Palette ──
// Primary: #FACC15 (yellow-400)  Glow: #EAB308 (yellow-500)  Dim: #CA8A04 (yellow-600)

function AuroraBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Primary yellow aurora */}
      <motion.div
        animate={{ x: [0, 40, -30, 0], y: [0, -50, 30, 0], scale: [1, 1.15, 0.9, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-[200px] -left-[100px] w-[700px] h-[700px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(250,204,21,0.08) 0%, transparent 65%)' }}
      />
      {/* Secondary warm glow */}
      <motion.div
        animate={{ x: [0, -40, 25, 0], y: [0, 35, -25, 0], scale: [1, 0.9, 1.15, 1] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -bottom-[200px] -right-[150px] w-[600px] h-[600px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(234,179,8,0.06) 0%, transparent 65%)' }}
      />
      {/* Accent amber */}
      <motion.div
        animate={{ x: [0, 25, -15, 0], y: [0, -30, 40, 0] }}
        transition={{ duration: 32, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/2 left-1/3 w-[400px] h-[400px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(250,204,21,0.04) 0%, transparent 60%)' }}
      />
      {/* Subtle noise texture */}
      <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")` }} />
    </div>
  );
}

function GalleryItem({ item, index }) {
  const isVideo = item.content_type === 'video' || item._type === 'video' || item._type === 'video_project';
  const thumbnailUrl = item.url || item.thumbnail_url || item.final_thumbnail_url;
  const hasImage = thumbnailUrl && (thumbnailUrl.includes('.png') || thumbnailUrl.includes('.jpg') || thumbnailUrl.includes('.jpeg') || thumbnailUrl.includes('.webp') || item.content_type === 'image');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.04, y: -4 }}
      className="relative aspect-[4/5] rounded-2xl overflow-hidden group cursor-pointer ring-1 ring-white/[0.04]"
    >
      {hasImage ? (
        <img src={thumbnailUrl} alt={item.name || ''} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
      ) : (
        <div className={`w-full h-full ${isVideo ? 'bg-gradient-to-br from-yellow-950/40 via-zinc-950 to-zinc-900' : 'bg-gradient-to-br from-zinc-900 via-zinc-950 to-yellow-950/30'} flex items-center justify-center`}>
          {isVideo ? <Play className="w-10 h-10 text-yellow-500/20" /> : <FileImage className="w-10 h-10 text-yellow-500/20" />}
        </div>
      )}
      {/* Bottom gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-400" />
      {/* Content on hover */}
      <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
        <p className="text-xs font-semibold text-white truncate">{item.name || item.title || 'Untitled'}</p>
        <div className="flex items-center gap-1.5 mt-1">
          {isVideo ? <Film className="w-3 h-3 text-yellow-400" /> : <FileImage className="w-3 h-3 text-yellow-400" />}
          <span className="text-[10px] text-yellow-400/70 font-medium">{isVideo ? 'Video' : 'Image'}</span>
        </div>
      </div>
      {isVideo && (
        <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/50 backdrop-blur-md ring-1 ring-white/10 flex items-center justify-center">
          <Play className="w-3 h-3 text-white fill-white ml-0.5" />
        </div>
      )}
    </motion.div>
  );
}

const TOOLS = [
  {
    key: 'images',
    title: 'AI Image Generation',
    subtitle: 'FLUX Pro & Kontext',
    description: 'State-of-the-art product photography, marketing visuals, and creative imagery — generated in seconds.',
    icon: Camera,
    route: 'CreateImages',
    gradient: 'from-yellow-400 to-amber-500',
    features: ['Product Scenes', 'Marketing', 'Social Content'],
  },
  {
    key: 'videos',
    title: 'Cinematic Video Studio',
    subtitle: 'Kling v2.1 & Minimax',
    description: 'AI storyboarding, multi-shot generation with real people, and automatic video assembly with transitions.',
    icon: Clapperboard,
    route: 'CreateVideos',
    gradient: 'from-amber-500 to-orange-500',
    features: ['Storyboard AI', 'Multi-Shot', 'Auto-Assembly'],
  },
  {
    key: 'branding',
    title: 'Brand Identity Designer',
    subtitle: 'Complete Brand Kits',
    description: 'Generate full brand identities — logos, palettes, typography systems, and exportable brand guidelines.',
    icon: Brush,
    route: 'CreateBranding',
    gradient: 'from-yellow-500 to-yellow-300',
    features: ['Logo Design', 'Color Systems', 'Brand Kit'],
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
      console.error('Failed to load data:', e);
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const images = content.filter(c => c.content_type === 'image');
    const videos = content.filter(c => c.content_type === 'video');
    return { totalImages: images.length, totalVideos: videos.length + videoProjects.length, totalBrands: brandAssets.length, totalContent: content.length };
  }, [content, brandAssets, videoProjects]);

  const galleryItems = useMemo(() => {
    const items = [
      ...content.map(c => ({ ...c, _type: c.content_type || 'image', _date: c.created_at })),
      ...videoProjects.map(v => ({ ...v, _type: 'video_project', _date: v.created_at })),
    ];
    return items.sort((a, b) => new Date(b._date) - new Date(a._date)).slice(0, 8);
  }, [content, videoProjects]);

  return (
    <CreatePageTransition className="min-h-screen bg-[#09090b]">
      <div className="relative w-full">
        <AuroraBackground />

        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-5 lg:px-8 py-6 space-y-10">

          {/* ── Hero ── */}
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7 }}
            className="relative overflow-hidden rounded-[28px]"
            style={{ background: 'linear-gradient(145deg, rgba(250,204,21,0.04) 0%, rgba(9,9,11,0.95) 50%, rgba(234,179,8,0.03) 100%)' }}
          >
            {/* Subtle border */}
            <div className="absolute inset-0 rounded-[28px] ring-1 ring-inset ring-yellow-500/[0.08] pointer-events-none" />
            {/* Fine grid */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(rgba(250,204,21,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(250,204,21,.3) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
            {/* Top accent line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-yellow-500/40 to-transparent" />

            <div className="relative z-10 px-8 lg:px-14 py-12 lg:py-16">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                <div className="space-y-5 max-w-2xl">
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/[0.08] border border-yellow-500/[0.12]"
                  >
                    <motion.div animate={{ rotate: [0, 12, -12, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
                      <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                    </motion.div>
                    <span className="text-[11px] font-semibold text-yellow-400 tracking-[0.15em] uppercase">Create Studio</span>
                  </motion.div>

                  <motion.h1
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="text-4xl lg:text-5xl font-bold text-white leading-[1.1] tracking-tight"
                  >
                    Imagine it.{' '}
                    <span className="relative">
                      <span className="text-yellow-400">Create it.</span>
                      <motion.span
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: 0.8, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute -bottom-1 left-0 right-0 h-[2px] bg-gradient-to-r from-yellow-400 to-transparent origin-left"
                      />
                    </span>
                  </motion.h1>

                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="text-[15px] text-zinc-400 leading-relaxed max-w-lg"
                  >
                    Professional images, cinematic videos, and complete brand systems — all powered by the world's most advanced generative AI.
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="flex items-center gap-3 pt-1"
                  >
                    <Link to={createPageUrl('CreateImages')}>
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        className="flex items-center gap-2.5 px-6 py-3 bg-yellow-400 text-black font-bold text-sm rounded-full hover:bg-yellow-300 transition-colors shadow-[0_0_30px_rgba(250,204,21,0.2)] hover:shadow-[0_0_40px_rgba(250,204,21,0.3)]"
                      >
                        <Wand2 className="w-4 h-4" />
                        Start Creating
                      </motion.button>
                    </Link>
                    <Link to={createPageUrl('CreateLibrary')}>
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        className="flex items-center gap-2.5 px-6 py-3 bg-white/[0.04] border border-white/[0.08] text-zinc-300 font-medium text-sm rounded-full hover:bg-white/[0.07] hover:border-white/[0.12] transition-all"
                      >
                        <FolderOpen className="w-4 h-4" />
                        Library
                      </motion.button>
                    </Link>
                  </motion.div>
                </div>

                {/* Stats */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className="hidden lg:grid grid-cols-2 gap-3"
                >
                  {[
                    { label: 'Images', value: stats.totalImages, icon: FileImage },
                    { label: 'Videos', value: stats.totalVideos, icon: Film },
                    { label: 'Brands', value: stats.totalBrands, icon: Palette },
                    { label: 'Total', value: stats.totalContent, icon: Layers },
                  ].map((s, i) => (
                    <motion.div
                      key={s.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + i * 0.07 }}
                      className="bg-white/[0.03] backdrop-blur-sm border border-white/[0.05] rounded-2xl px-5 py-4 min-w-[130px]"
                    >
                      <div className="flex items-center gap-2.5 mb-1">
                        <s.icon className="w-4 h-4 text-yellow-500/60" />
                        {loading ? (
                          <div className="w-6 h-5 bg-zinc-800 rounded animate-pulse" />
                        ) : (
                          <span className="text-2xl font-bold text-white tabular-nums">{s.value}</span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-[0.12em]">{s.label}</p>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </div>
          </motion.section>

          {/* ── Creative Tools ── */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Creative Tools</h2>
                <p className="text-xs text-zinc-600 mt-0.5">Choose your canvas</p>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-700 font-medium uppercase tracking-wider">
                <Zap className="w-3 h-3 text-yellow-500/40" />
                FLUX &middot; Kling &middot; Minimax
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {TOOLS.map((tool, i) => (
                <Link key={tool.key} to={createPageUrl(tool.route)}>
                  <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ y: -8, transition: { duration: 0.3, ease: 'easeOut' } }}
                    whileTap={{ scale: 0.98 }}
                    onHoverStart={() => setHoveredTool(tool.key)}
                    onHoverEnd={() => setHoveredTool(null)}
                    className="relative overflow-hidden rounded-[22px] border border-white/[0.04] p-6 lg:p-7 cursor-pointer group h-full bg-zinc-950/80"
                  >
                    {/* Hover glow */}
                    <AnimatePresence>
                      {hoveredTool === tool.key && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="absolute inset-0 pointer-events-none"
                          style={{ background: 'radial-gradient(ellipse at 30% 0%, rgba(250,204,21,0.06) 0%, transparent 60%)' }}
                        />
                      )}
                    </AnimatePresence>
                    {/* Top edge glow on hover */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-500/0 group-hover:via-yellow-500/30 to-transparent transition-all duration-500" />

                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-5">
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center shadow-lg shadow-yellow-500/10`}>
                          <tool.icon className="w-5 h-5 text-black" />
                        </div>
                        <motion.div
                          animate={hoveredTool === tool.key ? { x: 0, opacity: 1 } : { x: -4, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ArrowUpRight className="w-5 h-5 text-yellow-400/60" />
                        </motion.div>
                      </div>

                      <h3 className="text-[15px] font-bold text-white mb-0.5 tracking-tight">{tool.title}</h3>
                      <p className="text-[10px] font-semibold text-yellow-500/40 uppercase tracking-[0.15em] mb-3">{tool.subtitle}</p>
                      <p className="text-[13px] text-zinc-500 leading-relaxed mb-5">{tool.description}</p>

                      <div className="flex flex-wrap gap-2">
                        {tool.features.map(f => (
                          <span key={f} className="text-[10px] font-medium px-3 py-1.5 rounded-full bg-yellow-500/[0.05] border border-yellow-500/[0.08] text-yellow-500/60 tracking-wide">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </section>

          {/* ── Gallery ── */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Recent Creations</h2>
                <p className="text-xs text-zinc-600 mt-0.5">Your latest AI-generated content</p>
              </div>
              <Link to={createPageUrl('CreateLibrary')}>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex items-center gap-1.5 text-xs text-yellow-400/70 hover:text-yellow-400 transition-colors font-semibold">
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </motion.button>
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {[1,2,3,4,5,6,7,8].map(i => (
                  <div key={i} className="aspect-[4/5] rounded-2xl bg-zinc-900/60 ring-1 ring-white/[0.03] animate-pulse" />
                ))}
              </div>
            ) : galleryItems.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative overflow-hidden rounded-[24px] border border-dashed border-yellow-500/[0.12] py-20 text-center bg-yellow-500/[0.01]"
              >
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-16 h-16 rounded-2xl bg-yellow-500/[0.06] border border-yellow-500/[0.1] flex items-center justify-center mx-auto mb-5"
                >
                  <Sparkles className="w-7 h-7 text-yellow-400/60" />
                </motion.div>
                <p className="text-lg font-semibold text-white mb-1">Your canvas awaits</p>
                <p className="text-sm text-zinc-600 mb-6 max-w-xs mx-auto">Create your first piece and watch your gallery come alive</p>
                <Link to={createPageUrl('CreateImages')}>
                  <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-400 text-black font-bold text-sm rounded-full shadow-[0_0_30px_rgba(250,204,21,0.15)]">
                    <Wand2 className="w-4 h-4" />
                    Generate First Image
                  </motion.button>
                </Link>
              </motion.div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {galleryItems.map((item, i) => (
                  <GalleryItem key={item.id} item={item} index={i} />
                ))}
              </div>
            )}
          </section>

          {/* ── Quick Access ── */}
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="pb-6"
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Generate Image', icon: Camera, route: 'CreateImages', desc: 'AI-powered visuals' },
                { label: 'Create Video', icon: Clapperboard, route: 'CreateVideos', desc: 'Cinematic production' },
                { label: 'Design Brand', icon: Brush, route: 'CreateBranding', desc: 'Full brand identity' },
                { label: 'Content Library', icon: FolderOpen, route: 'CreateLibrary', desc: 'Browse all content' },
              ].map((a) => (
                <Link key={a.label} to={createPageUrl(a.route)}>
                  <motion.div
                    whileHover={{ y: -3, transition: { duration: 0.2 } }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-white/[0.015] border border-white/[0.04] hover:border-yellow-500/[0.15] hover:bg-yellow-500/[0.02] transition-all duration-300 cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-yellow-500/[0.06] flex items-center justify-center group-hover:bg-yellow-500/[0.1] transition-colors duration-300">
                      <a.icon className="w-4.5 h-4.5 text-yellow-500/60 group-hover:text-yellow-400 transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-300 group-hover:text-white transition-colors">{a.label}</p>
                      <p className="text-[10px] text-zinc-700">{a.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-800 group-hover:text-yellow-500/40 transition-colors" />
                  </motion.div>
                </Link>
              ))}
            </div>
          </motion.section>

        </div>
      </div>
    </CreatePageTransition>
  );
}
