import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Palette, Image, Video, FolderOpen, Plus, ArrowRight, ArrowUpRight,
  Sparkles, Clock, FileImage, Film, Layers, Wand2, Zap, Play,
  Camera, Clapperboard, Brush, Download, Eye, ChevronRight, Star,
  Sun, Moon,
} from 'lucide-react';
import { useCreateTheme } from '@/contexts/CreateThemeContext';
import { CreatePageTransition } from '@/components/create/ui';
import { GeneratedContent, BrandAssets, VideoProject } from '@/api/entities';
import { useUser } from '@/components/context/UserContext';

// ── Neon Yellow Palette ──
// Primary: #FACC15 (yellow-400)  Glow: #EAB308 (yellow-500)  Dim: #CA8A04 (yellow-600)

function AuroraBackground({ dimmed = false }) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${dimmed ? 'opacity-30' : ''}`}>
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

function GalleryItem({ item, index, ct }) {
  const isVideo = item.content_type === 'video' || item._type === 'video' || item._type === 'video_project';
  const mediaUrl = item.url || item.thumbnail_url || item.final_thumbnail_url;
  const isVideoFile = mediaUrl && (mediaUrl.includes('.mp4') || mediaUrl.includes('.webm') || mediaUrl.includes('.mov'));
  const isImageFile = mediaUrl && (mediaUrl.includes('.png') || mediaUrl.includes('.jpg') || mediaUrl.includes('.jpeg') || mediaUrl.includes('.webp') || item.content_type === 'image');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.04, y: -4 }}
      className={`relative aspect-[4/3] rounded-2xl overflow-hidden group cursor-pointer ring-1 ${ct('ring-slate-200', 'ring-white/[0.04]')}`}
    >
      {isVideoFile ? (
        <video src={mediaUrl} muted preload="metadata" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
      ) : isImageFile ? (
        <img src={mediaUrl} alt={item.name || ''} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
      ) : (
        <div className={`w-full h-full ${isVideo ? ct('bg-gradient-to-br from-yellow-50 via-slate-100 to-slate-50', 'bg-gradient-to-br from-yellow-950/40 via-zinc-950 to-zinc-900') : ct('bg-gradient-to-br from-slate-100 via-slate-50 to-yellow-50', 'bg-gradient-to-br from-zinc-900 via-zinc-950 to-yellow-950/30')} flex items-center justify-center`}>
          {isVideo ? <Play className="w-10 h-10 text-yellow-500/20" /> : <FileImage className="w-10 h-10 text-yellow-500/20" />}
        </div>
      )}
      {/* Bottom gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-400" />
      {/* Content on hover */}
      <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
        <p className={`text-xs font-semibold ${ct('text-slate-900', 'text-white')} truncate`}>{item.name || item.title || 'Untitled'}</p>
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
  const { theme, toggleTheme, ct } = useCreateTheme();
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
    <CreatePageTransition className={`min-h-screen ${ct('bg-slate-50', 'bg-[#09090b]')}`}>
      <div className="relative w-full">
        <AuroraBackground dimmed={theme === 'light'} />

        <div className="relative z-10 w-full px-4 lg:px-6 py-6 space-y-6">

          {/* ── Hero ── */}
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7 }}
            className="relative overflow-hidden rounded-[28px]"
            style={{ background: theme === 'light' ? 'linear-gradient(145deg, rgba(250,204,21,0.06) 0%, rgba(255,255,255,0.95) 50%, rgba(234,179,8,0.04) 100%)' : 'linear-gradient(145deg, rgba(250,204,21,0.04) 0%, rgba(9,9,11,0.95) 50%, rgba(234,179,8,0.03) 100%)' }}
          >
            {/* Subtle border */}
            <div className="absolute inset-0 rounded-[28px] ring-1 ring-inset ring-yellow-500/[0.08] pointer-events-none" />
            {/* Fine grid */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(rgba(250,204,21,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(250,204,21,.3) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
            {/* Top accent line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-yellow-500/40 to-transparent" />

            <div className="relative z-10 px-8 lg:px-14 py-8 lg:py-10">
              {/* Badge + Stats row */}
              <div className="flex items-center justify-between mb-4">
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

                <button onClick={toggleTheme} className={ct('p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200', 'p-2 rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700')}>
                  {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </button>

                {/* Inline stats */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  className="hidden md:flex items-center gap-6"
                >
                  {[
                    { label: 'Images', value: stats.totalImages, icon: FileImage },
                    { label: 'Videos', value: stats.totalVideos, icon: Film },
                    { label: 'Brands', value: stats.totalBrands, icon: Palette },
                    { label: 'Total', value: stats.totalContent, icon: Layers },
                  ].map((s, i) => (
                    <motion.div
                      key={s.label}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + i * 0.06 }}
                      className="flex items-center gap-2"
                    >
                      <s.icon className="w-3.5 h-3.5 text-yellow-500/40" />
                      {loading ? (
                        <div className={`w-5 h-4 ${ct('bg-slate-200', 'bg-zinc-800')} rounded animate-pulse`} />
                      ) : (
                        <span className={`text-sm font-bold ${ct('text-slate-900', 'text-white')} tabular-nums`}>{s.value}</span>
                      )}
                      <span className={`text-[10px] ${ct('text-slate-400', 'text-zinc-600')} font-medium uppercase tracking-wider`}>{s.label}</span>
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              {/* Heading + description + buttons */}
              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className={`text-3xl lg:text-4xl font-bold ${ct('text-slate-900', 'text-white')} leading-[1.1] tracking-tight mb-3`}
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
                className={`text-[14px] ${ct('text-slate-500', 'text-zinc-400')} leading-relaxed max-w-lg mb-5`}
              >
                Professional images, cinematic videos, and complete brand systems — all powered by the world's most advanced generative AI.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="flex items-center gap-3"
              >
                <Link to={createPageUrl('CreateImages')}>
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    className="flex items-center gap-2.5 px-6 py-2.5 bg-yellow-400 text-black font-bold text-sm rounded-full hover:bg-yellow-300 transition-colors shadow-[0_0_30px_rgba(250,204,21,0.2)] hover:shadow-[0_0_40px_rgba(250,204,21,0.3)]"
                  >
                    <Wand2 className="w-4 h-4" />
                    Start Creating
                  </motion.button>
                </Link>
                <Link to={createPageUrl('CreateLibrary')}>
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    className={`flex items-center gap-2.5 px-6 py-2.5 ${ct('bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200', 'bg-white/[0.04] border border-white/[0.08] text-zinc-300 hover:bg-white/[0.07] hover:border-white/[0.12]')} font-medium text-sm rounded-full transition-all`}
                  >
                    <FolderOpen className="w-4 h-4" />
                    Library
                  </motion.button>
                </Link>
              </motion.div>
            </div>
          </motion.section>

          {/* ── Bento Grid: Tools + Gallery ── */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 auto-rows-auto">

            {/* Tools — left column, stacked */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {TOOLS.map((tool, i) => (
                <Link key={tool.key} to={createPageUrl(tool.route)}>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ x: 6, transition: { duration: 0.25 } }}
                    whileTap={{ scale: 0.98 }}
                    onHoverStart={() => setHoveredTool(tool.key)}
                    onHoverEnd={() => setHoveredTool(null)}
                    className={`relative overflow-hidden rounded-[20px] border ${ct('border-slate-200 bg-white', 'border-white/[0.04] bg-zinc-950/80')} p-5 cursor-pointer group`}
                  >
                    {/* Hover glow */}
                    <AnimatePresence>
                      {hoveredTool === tool.key && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 pointer-events-none"
                          style={{ background: 'radial-gradient(ellipse at 0% 50%, rgba(250,204,21,0.05) 0%, transparent 60%)' }}
                        />
                      )}
                    </AnimatePresence>
                    {/* Left accent bar */}
                    <div className="absolute left-0 top-3 bottom-3 w-[2px] bg-gradient-to-b from-yellow-500/0 group-hover:from-yellow-500/40 via-yellow-500/0 group-hover:via-yellow-500/20 to-yellow-500/0 group-hover:to-yellow-500/0 transition-all duration-500" />

                    <div className="relative z-10 flex items-start gap-4">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center shadow-lg shadow-yellow-500/10 flex-shrink-0`}>
                        <tool.icon className="w-5 h-5 text-black" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className={`text-[14px] font-bold ${ct('text-slate-900', 'text-white')} tracking-tight`}>{tool.title}</h3>
                          <motion.div
                            animate={hoveredTool === tool.key ? { x: 0, opacity: 1 } : { x: -4, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ArrowUpRight className="w-4 h-4 text-yellow-400/50" />
                          </motion.div>
                        </div>
                        <p className={`text-[11px] ${ct('text-slate-500', 'text-zinc-500')} leading-relaxed mb-2.5`}>{tool.description}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {tool.features.map(f => (
                            <span key={f} className="text-[9px] font-medium px-2 py-1 rounded-full bg-yellow-500/[0.04] border border-yellow-500/[0.07] text-yellow-500/50">
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}

              {/* Library quick link */}
              <Link to={createPageUrl('CreateLibrary')}>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35, duration: 0.5 }}
                  whileHover={{ x: 6 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-4 p-5 rounded-[20px] border ${ct('border-slate-200 bg-white', 'border-white/[0.04] bg-zinc-950/80')} cursor-pointer group`}
                >
                  <div className={`w-11 h-11 rounded-xl ${ct('bg-slate-100 border border-slate-200', 'bg-white/[0.04] border border-white/[0.06]')} flex items-center justify-center flex-shrink-0 group-hover:bg-yellow-500/[0.06] group-hover:border-yellow-500/[0.1] transition-all duration-300`}>
                    <FolderOpen className={`w-5 h-5 ${ct('text-slate-400', 'text-zinc-500')} group-hover:text-yellow-400 transition-colors`} />
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-[14px] font-bold ${ct('text-slate-900', 'text-white')} tracking-tight`}>Content Library</h3>
                    <p className={`text-[11px] ${ct('text-slate-400', 'text-zinc-600')}`}>Browse, download, and manage all your generated content</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${ct('text-slate-300', 'text-zinc-800')} group-hover:text-yellow-500/40 transition-colors`} />
                </motion.div>
              </Link>
            </div>

            {/* Gallery — right column */}
            <div className="lg:col-span-7">
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-lg font-bold ${ct('text-slate-900', 'text-white')} tracking-tight`}>Recent Creations</h2>
                <Link to={createPageUrl('CreateLibrary')}>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex items-center gap-1.5 text-xs text-yellow-400/60 hover:text-yellow-400 transition-colors font-semibold">
                    View All <ArrowRight className="w-3.5 h-3.5" />
                  </motion.button>
                </Link>
              </div>

              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[1,2,3,4,5,6].map(i => (
                    <div key={i} className={`aspect-[4/3] rounded-2xl ${ct('bg-slate-200', 'bg-zinc-900/60')} ring-1 ${ct('ring-slate-200', 'ring-white/[0.03]')} animate-pulse`} />
                  ))}
                </div>
              ) : galleryItems.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="relative overflow-hidden rounded-[20px] border border-dashed border-yellow-500/[0.1] py-20 text-center bg-yellow-500/[0.01] h-full flex flex-col items-center justify-center"
                >
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-14 h-14 rounded-2xl bg-yellow-500/[0.06] border border-yellow-500/[0.1] flex items-center justify-center mb-5"
                  >
                    <Sparkles className="w-6 h-6 text-yellow-400/50" />
                  </motion.div>
                  <p className={`text-base font-semibold ${ct('text-slate-900', 'text-white')} mb-1`}>Your canvas awaits</p>
                  <p className={`text-sm ${ct('text-slate-400', 'text-zinc-600')} mb-5 max-w-xs`}>Generate your first image or video to see it here</p>
                  <Link to={createPageUrl('CreateImages')}>
                    <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-400 text-black font-bold text-sm rounded-full shadow-[0_0_24px_rgba(250,204,21,0.12)]">
                      <Wand2 className="w-4 h-4" />
                      Start Creating
                    </motion.button>
                  </Link>
                </motion.div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {galleryItems.map((item, i) => (
                    <GalleryItem key={item.id} item={item} index={i} ct={ct} />
                  ))}
                </div>
              )}
            </div>

          </section>

        </div>
      </div>
    </CreatePageTransition>
  );
}
