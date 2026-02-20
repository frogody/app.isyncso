import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Image, Film, Camera, Clapperboard, ArrowRight, Sparkles, Mic, AudioLines,
  UserCircle, Wand2, FolderOpen, FileImage, Play, Layers, Palette,
  LayoutTemplate, Brush, CalendarDays, Clock, ChevronRight, Eye, Download, Shirt,
  Zap, ArrowUpRight, Plus,
} from 'lucide-react';
import { StudioNav } from '@/components/studio';
import { GeneratedContent, VideoProject } from '@/api/entities';
import { useUser } from '@/components/context/UserContext';
import { toast } from 'sonner';

const TOOLS = [
  {
    key: 'image',
    title: 'Image Studio',
    description: 'AI product photos & marketing visuals',
    icon: Image,
    route: '/StudioImage',
    accent: '#06b6d4',       // cyan-500
    accentLight: '#22d3ee',  // cyan-400
    bgGlow: 'rgba(6, 182, 212, 0.08)',
    status: 'live',
  },
  {
    key: 'video',
    title: 'Video Studio',
    description: 'Cinematic AI product videos',
    icon: Film,
    route: '/StudioVideo',
    accent: '#8b5cf6',       // violet-500
    accentLight: '#a78bfa',  // violet-400
    bgGlow: 'rgba(139, 92, 246, 0.08)',
    status: 'live',
  },
  {
    key: 'photoshoot',
    title: 'Photoshoot',
    description: 'Bulk AI catalog photography',
    icon: Camera,
    route: '/StudioPhotoshoot',
    accent: '#f43f5e',       // rose-500
    accentLight: '#fb7185',  // rose-400
    bgGlow: 'rgba(244, 63, 94, 0.08)',
    status: 'live',
  },
  {
    key: 'clipshoot',
    title: 'Clipshoot',
    description: 'Multi-shot video storyboards',
    icon: Clapperboard,
    route: '/StudioClipshoot',
    accent: '#f97316',       // orange-500
    accentLight: '#fb923c',  // orange-400
    bgGlow: 'rgba(249, 115, 22, 0.08)',
    status: 'live',
  },
  {
    key: 'podcast',
    title: 'Podcast',
    description: 'AI podcasts with multiple speakers',
    icon: Mic,
    route: '/StudioPodcast',
    accent: '#10b981',       // emerald-500
    accentLight: '#34d399',  // emerald-400
    bgGlow: 'rgba(16, 185, 129, 0.08)',
    status: 'live',
  },
  {
    key: 'voiceclone',
    title: 'Voice Clone',
    description: 'Clone any voice for content',
    icon: AudioLines,
    route: '/StudioVoice',
    accent: '#ec4899',       // pink-500
    accentLight: '#f472b6',  // pink-400
    bgGlow: 'rgba(236, 72, 153, 0.08)',
    status: 'live',
  },
  {
    key: 'fashion',
    title: 'Fashion Booth',
    description: 'AI fashion photography',
    icon: Shirt,
    route: '/StudioFashionBooth',
    accent: '#eab308',       // yellow-500
    accentLight: '#facc15',  // yellow-400
    bgGlow: 'rgba(234, 179, 8, 0.08)',
    status: 'live',
  },
  {
    key: 'avatar',
    title: 'Avatar',
    description: 'AI avatars for UGC & social',
    icon: UserCircle,
    route: '/StudioAvatar',
    accent: '#6366f1',       // indigo-500
    accentLight: '#818cf8',  // indigo-400
    bgGlow: 'rgba(99, 102, 241, 0.08)',
    status: 'soon',
  },
];

const QUICK_LINKS = [
  { label: 'Templates', route: '/StudioTemplates', icon: LayoutTemplate },
  { label: 'Branding', route: '/CreateBranding', icon: Brush },
  { label: 'Calendar', route: '/ContentCalendar', icon: CalendarDays },
  { label: 'Library', route: '/StudioLibrary', icon: FolderOpen },
];

function ToolCard({ tool, index }) {
  const navigate = useNavigate();
  const Icon = tool.icon;
  const isSoon = tool.status === 'soon';

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.05, type: 'spring', stiffness: 300, damping: 30 }}
      onClick={() => navigate(tool.route)}
      className="group relative text-left rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        background: 'rgba(24, 24, 27, 0.6)',
        border: '1px solid rgba(63, 63, 70, 0.4)',
      }}
      whileHover={{ y: -4, transition: { duration: 0.25 } }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(90deg, transparent, ${tool.accent}, transparent)` }}
      />

      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${tool.bgGlow}, transparent 70%)`,
        }}
      />

      <div className="relative p-4 lg:p-5">
        {/* Icon */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110"
          style={{
            background: `linear-gradient(135deg, ${tool.accent}15, ${tool.accent}08)`,
            border: `1px solid ${tool.accent}25`,
            boxShadow: `0 0 0 0 ${tool.accent}00`,
          }}
        >
          <Icon className="w-5 h-5 transition-colors duration-300" style={{ color: tool.accentLight }} />
        </div>

        {/* Title + badge */}
        <div className="flex items-center gap-2 mb-1.5">
          <h3 className="text-[15px] font-semibold text-white tracking-tight">{tool.title}</h3>
          {isSoon ? (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full tracking-wide uppercase"
              style={{ background: `${tool.accent}15`, color: tool.accentLight, border: `1px solid ${tool.accent}30` }}>
              Soon
            </span>
          ) : (
            <span className="w-1.5 h-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: tool.accent }} />
          )}
        </div>

        <p className="text-[12px] text-zinc-500 leading-relaxed mb-4 line-clamp-2">{tool.description}</p>

        {/* Bottom action */}
        <div className="flex items-center gap-1.5 text-[12px] font-medium transition-all duration-300"
          style={{ color: 'rgb(113, 113, 122)' }}>
          <span className="group-hover:opacity-0 transition-opacity duration-200">Open Studio</span>
          <span className="absolute bottom-4 lg:bottom-5 left-4 lg:left-5 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1"
            style={{ color: tool.accentLight }}>
            Launch <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </motion.button>
  );
}

function GalleryCard({ item, index }) {
  const navigate = useNavigate();
  const isVideo = item.content_type === 'video' || item._type === 'video_project';
  const mediaUrl = item.url || item.thumbnail_url || item.final_thumbnail_url;
  const isVideoFile = mediaUrl && (mediaUrl.includes('.mp4') || mediaUrl.includes('.webm'));
  const isImageFile = mediaUrl && (mediaUrl.includes('.png') || mediaUrl.includes('.jpg') || mediaUrl.includes('.jpeg') || mediaUrl.includes('.webp') || item.content_type === 'image');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 + index * 0.06, type: 'spring', stiffness: 200, damping: 25 }}
      className="relative aspect-square rounded-2xl overflow-hidden group cursor-pointer"
      style={{
        border: '1px solid rgba(63, 63, 70, 0.3)',
      }}
      onClick={() => navigate('/StudioLibrary')}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
    >
      {isVideoFile ? (
        <video src={mediaUrl} muted preload="metadata" className="w-full h-full object-cover" />
      ) : isImageFile ? (
        <img src={mediaUrl} alt={item.name || ''} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-zinc-900 via-zinc-950 to-cyan-950/10 flex items-center justify-center">
          {isVideo ? <Play className="w-8 h-8 text-zinc-700" /> : <FileImage className="w-8 h-8 text-zinc-700" />}
        </div>
      )}

      {/* Hover overlay with frosted bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
      <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
        <p className="text-xs font-medium text-white truncate">{item.name || item.title || 'Untitled'}</p>
        <div className="flex items-center gap-1.5 mt-1">
          {isVideo ? <Film className="w-3 h-3 text-violet-400" /> : <FileImage className="w-3 h-3 text-cyan-400" />}
          <span className="text-[10px]" style={{ color: isVideo ? '#a78bfa' : '#22d3ee' }}>
            {isVideo ? 'Video' : 'Image'}
          </span>
        </div>
      </div>

      {/* Video play badge */}
      {isVideo && (
        <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
          <Play className="w-3 h-3 text-white fill-white ml-0.5" />
        </div>
      )}
    </motion.div>
  );
}

export default function Create() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [content, setContent] = useState([]);
  const [videoProjects, setVideoProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [contentRes, videosRes] = await Promise.allSettled([
        GeneratedContent.list('-created_at', { limit: 12 }),
        VideoProject.list('-created_at', { limit: 5 }),
      ]);
      if (contentRes.status === 'fulfilled') setContent(contentRes.value || []);
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
    return {
      totalImages: images.length,
      totalVideos: videos.length + videoProjects.length,
      totalContent: content.length,
    };
  }, [content, videoProjects]);

  const galleryItems = useMemo(() => {
    const items = [
      ...content.map(c => ({ ...c, _type: c.content_type || 'image', _date: c.created_at })),
      ...videoProjects.map(v => ({ ...v, _type: 'video_project', _date: v.created_at })),
    ];
    return items.sort((a, b) => new Date(b._date) - new Date(a._date)).slice(0, 8);
  }, [content, videoProjects]);

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Sticky StudioNav */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-zinc-800/60">
        <div className="w-full px-4 lg:px-6 py-3 flex justify-center">
          <StudioNav />
        </div>
      </div>

      {/* Ambient background mesh */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-[0.025]"
          style={{ background: 'radial-gradient(circle, #8b5cf6, transparent 70%)' }} />
      </div>

      <div className="relative z-10 w-full px-4 lg:px-6 py-6 space-y-6">

        {/* ── Hero Section ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(24,24,27,0.8) 0%, rgba(15,15,18,0.9) 100%)',
            border: '1px solid rgba(63, 63, 70, 0.3)',
          }}
        >
          {/* Decorative grid */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
            }} />

          {/* Top gradient line */}
          <div className="absolute top-0 left-1/4 right-1/4 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.4), rgba(139,92,246,0.4), transparent)' }} />

          <div className="relative px-6 lg:px-10 py-8 lg:py-10">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div className="max-w-xl">
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4"
                  style={{
                    background: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(139,92,246,0.08))',
                    border: '1px solid rgba(6,182,212,0.2)',
                  }}
                >
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[11px] font-semibold text-cyan-300 tracking-wide uppercase">Create Studio</span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.4 }}
                  className="text-3xl lg:text-4xl font-bold text-white mb-3 tracking-tight"
                  style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
                >
                  Your AI-Powered{' '}
                  <span className="bg-clip-text text-transparent"
                    style={{ backgroundImage: 'linear-gradient(135deg, #22d3ee, #a78bfa)' }}>
                    Creative Suite
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="text-sm text-zinc-400 leading-relaxed max-w-md"
                >
                  Generate studio-quality images, cinematic videos, podcasts, voice clones, and more — powered by the world's most advanced generative AI models.
                </motion.p>
              </div>

              {/* Stats cluster */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-3 lg:gap-4"
              >
                {[
                  { label: 'Images', value: stats.totalImages, icon: FileImage, color: '#22d3ee' },
                  { label: 'Videos', value: stats.totalVideos, icon: Film, color: '#a78bfa' },
                  { label: 'Total', value: stats.totalContent, icon: Layers, color: '#34d399' },
                ].map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 + i * 0.06 }}
                    className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl"
                    style={{
                      background: 'rgba(24,24,27,0.5)',
                      border: '1px solid rgba(63,63,70,0.3)',
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <s.icon className="w-3.5 h-3.5 opacity-50" style={{ color: s.color }} />
                      {loading ? (
                        <div className="w-6 h-5 bg-zinc-800 rounded animate-pulse" />
                      ) : (
                        <span className="text-xl font-bold text-white tabular-nums">{s.value}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-600 font-semibold uppercase tracking-widest">{s.label}</span>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* ── Tool Cards Grid ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.15em]">Studio Tools</h2>
            <span className="text-[11px] text-zinc-700 font-medium">{TOOLS.filter(t => t.status === 'live').length} active</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {TOOLS.map((tool, i) => (
              <ToolCard key={tool.key} tool={tool} index={i} />
            ))}
          </div>
        </section>

        {/* ── Quick Links + Recent Creations ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* Quick Links */}
          <div className="lg:col-span-3 space-y-2">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.15em] mb-3">Quick Links</h2>
            {QUICK_LINKS.map((link, i) => {
              const Icon = link.icon;
              return (
                <motion.div
                  key={link.label}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                >
                  <button
                    onClick={() => navigate(link.route)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group"
                    style={{
                      background: 'rgba(24,24,27,0.4)',
                      border: '1px solid rgba(63,63,70,0.3)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'rgba(6,182,212,0.2)';
                      e.currentTarget.style.background = 'rgba(24,24,27,0.6)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'rgba(63,63,70,0.3)';
                      e.currentTarget.style.background = 'rgba(24,24,27,0.4)';
                    }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200"
                      style={{ background: 'rgba(63,63,70,0.3)' }}>
                      <Icon className="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 transition-colors duration-200" />
                    </div>
                    <span className="text-sm font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors duration-200">{link.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-500 ml-auto transition-colors duration-200" />
                  </button>
                </motion.div>
              );
            })}

            {/* New creation CTA */}
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="pt-2"
            >
              <button
                onClick={() => navigate('/StudioImage')}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, rgba(6,182,212,0.12), rgba(139,92,246,0.08))',
                  border: '1px solid rgba(6,182,212,0.2)',
                  color: '#22d3ee',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(139,92,246,0.12))';
                  e.currentTarget.style.borderColor = 'rgba(6,182,212,0.35)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(6,182,212,0.12), rgba(139,92,246,0.08))';
                  e.currentTarget.style.borderColor = 'rgba(6,182,212,0.2)';
                }}
              >
                <Plus className="w-4 h-4" />
                New Creation
              </button>
            </motion.div>
          </div>

          {/* Recent Creations */}
          <div className="lg:col-span-9">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.15em]">Recent Creations</h2>
              <button
                onClick={() => navigate('/StudioLibrary')}
                className="flex items-center gap-1.5 text-[11px] text-zinc-600 hover:text-cyan-400 transition-colors duration-200 font-semibold"
              >
                View All <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {[1,2,3,4,5,6,7,8].map(i => (
                  <div key={i} className="aspect-square rounded-2xl animate-pulse"
                    style={{ background: 'rgba(24,24,27,0.5)', border: '1px solid rgba(63,63,70,0.2)' }} />
                ))}
              </div>
            ) : galleryItems.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 rounded-2xl"
                style={{
                  border: '1px dashed rgba(63,63,70,0.4)',
                  background: 'rgba(24,24,27,0.2)',
                }}
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{
                    background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(139,92,246,0.05))',
                    border: '1px solid rgba(6,182,212,0.15)',
                  }}>
                  <Sparkles className="w-6 h-6 text-cyan-400/40" />
                </div>
                <p className="text-sm font-semibold text-white mb-1">Your canvas awaits</p>
                <p className="text-xs text-zinc-600 mb-5">Generate your first image or video</p>
                <button
                  onClick={() => navigate('/StudioImage')}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-full transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
                    color: 'white',
                  }}
                >
                  <Wand2 className="w-4 h-4" />
                  Start Creating
                </button>
              </motion.div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {galleryItems.map((item, i) => (
                  <GalleryCard key={item.id} item={item} index={i} />
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
