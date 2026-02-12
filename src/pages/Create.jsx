import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Image, Film, Camera, Clapperboard, ArrowRight, Sparkles, Mic, AudioLines,
  UserCircle, Wand2, FolderOpen, FileImage, Play, Layers, Palette,
  LayoutTemplate, Brush, CalendarDays, Clock, ChevronRight, Eye, Download,
} from 'lucide-react';
import { StudioNav } from '@/components/studio';
import { GeneratedContent, VideoProject } from '@/api/entities';
import { useUser } from '@/components/context/UserContext';
import { toast } from 'sonner';

const TOOLS = [
  {
    key: 'image',
    title: 'Image',
    description: 'AI product photos & marketing visuals',
    icon: Image,
    route: '/StudioImage',
    gradient: 'from-blue-500/20 to-cyan-500/10',
    color: 'text-blue-400',
    borderColor: 'group-hover:border-blue-500/30',
  },
  {
    key: 'video',
    title: 'Video',
    description: 'Cinematic AI product videos',
    icon: Film,
    route: '/StudioVideo',
    gradient: 'from-purple-500/20 to-violet-500/10',
    color: 'text-purple-400',
    borderColor: 'group-hover:border-purple-500/30',
  },
  {
    key: 'photoshoot',
    title: 'Photoshoot',
    description: 'Bulk AI photography for your catalog',
    icon: Camera,
    route: '/StudioPhotoshoot',
    gradient: 'from-yellow-500/20 to-amber-500/10',
    color: 'text-yellow-400',
    borderColor: 'group-hover:border-yellow-500/30',
  },
  {
    key: 'clipshoot',
    title: 'Clipshoot',
    description: 'Multi-shot video storyboards',
    icon: Clapperboard,
    route: '/StudioClipshoot',
    gradient: 'from-emerald-500/20 to-green-500/10',
    color: 'text-emerald-400',
    borderColor: 'group-hover:border-emerald-500/30',
  },
  {
    key: 'podcast',
    title: 'Podcast',
    description: 'AI podcasts with multiple speakers',
    icon: Mic,
    route: '/StudioPodcast',
    gradient: 'from-orange-500/20 to-red-500/10',
    color: 'text-orange-400',
    borderColor: 'group-hover:border-orange-500/30',
  },
  {
    key: 'voiceclone',
    title: 'Voice Clone',
    description: 'Clone any voice for content',
    icon: AudioLines,
    route: '/StudioVoice',
    gradient: 'from-pink-500/20 to-rose-500/10',
    color: 'text-pink-400',
    borderColor: 'group-hover:border-pink-500/30',
  },
  {
    key: 'avatar',
    title: 'Avatar',
    description: 'AI avatars for UGC & social',
    icon: UserCircle,
    route: '/StudioAvatar',
    gradient: 'from-violet-500/20 to-purple-500/10',
    color: 'text-violet-400',
    borderColor: 'group-hover:border-violet-500/30',
  },
];

const QUICK_LINKS = [
  { label: 'Templates', route: '/StudioTemplates', icon: LayoutTemplate },
  { label: 'Branding', route: '/CreateBranding', icon: Brush },
  { label: 'Calendar', route: '/ContentCalendar', icon: CalendarDays },
  { label: 'Library', route: '/StudioLibrary', icon: FolderOpen },
];

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
    return items.sort((a, b) => new Date(b._date) - new Date(a._date)).slice(0, 6);
  }, [content, videoProjects]);

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Sticky StudioNav */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-zinc-800/60">
        <div className="w-full px-4 lg:px-8 py-3 flex justify-center">
          <StudioNav />
        </div>
      </div>

      <div className="w-full px-4 lg:px-8 py-6 space-y-8">

        {/* ── Hero Section ── */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800/40">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/[0.04] via-transparent to-yellow-500/[0.02]" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent" />

          <div className="relative px-6 lg:px-10 py-8 lg:py-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 mb-4"
                >
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-xs font-medium text-yellow-300">AI-Powered Studio</span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  className="text-2xl lg:text-3xl font-bold text-white mb-2"
                >
                  Create Studio
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-sm text-zinc-500 max-w-lg"
                >
                  Images, videos, podcasts, avatars, voice clones, and more — powered by the world's most advanced generative AI.
                </motion.p>
              </div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-5"
              >
                {[
                  { label: 'Images', value: stats.totalImages, icon: FileImage },
                  { label: 'Videos', value: stats.totalVideos, icon: Film },
                  { label: 'Total', value: stats.totalContent, icon: Layers },
                ].map((s) => (
                  <div key={s.label} className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1.5">
                      <s.icon className="w-3.5 h-3.5 text-yellow-500/40" />
                      {loading ? (
                        <div className="w-6 h-5 bg-zinc-800 rounded animate-pulse" />
                      ) : (
                        <span className="text-lg font-bold text-white tabular-nums">{s.value}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">{s.label}</span>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </div>

        {/* ── Tool Cards Grid ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Tools</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            {TOOLS.map((tool, i) => {
              const Icon = tool.icon;
              return (
                <motion.button
                  key={tool.key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => navigate(tool.route)}
                  className="group relative text-left bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-4 hover:bg-zinc-900/80 transition-all"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center mb-3 border border-zinc-800/40`}>
                    <Icon className={`w-5 h-5 ${tool.color}`} />
                  </div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <h3 className="text-sm font-semibold text-white">{tool.title}</h3>
                    {tool.soon && (
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700/50">Soon</span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-2">{tool.description}</p>
                  <div className="mt-3 flex items-center gap-1 text-[11px] text-zinc-700 group-hover:text-yellow-400 transition-colors">
                    Open <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* ── Quick Links + Recent Creations ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Quick Links */}
          <div className="lg:col-span-3 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Quick Links</h2>
            {QUICK_LINKS.map((link, i) => {
              const Icon = link.icon;
              return (
                <motion.div
                  key={link.label}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                >
                  <button
                    onClick={() => navigate(link.route)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/60 hover:border-zinc-700 hover:bg-zinc-900/80 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-zinc-800/80 flex items-center justify-center group-hover:bg-yellow-500/10 transition-colors">
                      <Icon className="w-4 h-4 text-zinc-500 group-hover:text-yellow-400 transition-colors" />
                    </div>
                    <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">{link.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-500 ml-auto transition-colors" />
                  </button>
                </motion.div>
              );
            })}
          </div>

          {/* Recent Creations */}
          <div className="lg:col-span-9">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Recent Creations</h2>
              <button
                onClick={() => navigate('/StudioLibrary')}
                className="flex items-center gap-1 text-xs text-zinc-600 hover:text-yellow-400 transition-colors font-medium"
              >
                View All <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="aspect-[4/3] rounded-2xl bg-zinc-900/60 border border-zinc-800/40 animate-pulse" />
                ))}
              </div>
            ) : galleryItems.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-zinc-800/60 bg-zinc-900/20"
              >
                <div className="w-12 h-12 rounded-2xl bg-yellow-500/[0.06] border border-yellow-500/[0.1] flex items-center justify-center mb-4">
                  <Sparkles className="w-5 h-5 text-yellow-400/50" />
                </div>
                <p className="text-sm font-medium text-white mb-1">Your canvas awaits</p>
                <p className="text-xs text-zinc-600 mb-4">Generate your first image or video</p>
                <button
                  onClick={() => navigate('/StudioImage')}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold text-sm rounded-full transition-colors"
                >
                  <Wand2 className="w-4 h-4" />
                  Start Creating
                </button>
              </motion.div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {galleryItems.map((item, i) => {
                  const isVideo = item.content_type === 'video' || item._type === 'video_project';
                  const mediaUrl = item.url || item.thumbnail_url || item.final_thumbnail_url;
                  const isVideoFile = mediaUrl && (mediaUrl.includes('.mp4') || mediaUrl.includes('.webm'));
                  const isImageFile = mediaUrl && (mediaUrl.includes('.png') || mediaUrl.includes('.jpg') || mediaUrl.includes('.jpeg') || mediaUrl.includes('.webp') || item.content_type === 'image');

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="relative aspect-[4/3] rounded-2xl overflow-hidden group cursor-pointer border border-zinc-800/40 hover:border-zinc-700 transition-all"
                      onClick={() => navigate('/StudioLibrary')}
                    >
                      {isVideoFile ? (
                        <video src={mediaUrl} muted preload="metadata" className="w-full h-full object-cover" />
                      ) : isImageFile ? (
                        <img src={mediaUrl} alt={item.name || ''} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-zinc-900 via-zinc-950 to-yellow-950/20 flex items-center justify-center">
                          {isVideo ? <Play className="w-8 h-8 text-yellow-500/20" /> : <FileImage className="w-8 h-8 text-yellow-500/20" />}
                        </div>
                      )}

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                        <p className="text-xs font-medium text-white truncate">{item.name || item.title || 'Untitled'}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {isVideo ? <Film className="w-3 h-3 text-yellow-400" /> : <FileImage className="w-3 h-3 text-yellow-400" />}
                          <span className="text-[10px] text-yellow-400/70">{isVideo ? 'Video' : 'Image'}</span>
                        </div>
                      </div>

                      {isVideo && (
                        <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                          <Play className="w-3 h-3 text-white fill-white ml-0.5" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
