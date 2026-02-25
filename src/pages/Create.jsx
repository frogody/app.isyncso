import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Image, Film, Camera, Mic, AudioLines, UserCircle, Shirt,
  FileImage, Play, Layers, Palette, ArrowRight, Sparkles, Plus,
  Sun, Moon,
} from 'lucide-react';
import { GeneratedContent, VideoProject } from '@/api/entities';
import { useUser } from '@/components/context/UserContext';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/GlassCard';
import { Skeleton } from '@/components/ui/skeleton';
import { MotionButton } from '@/components/ui/button';

const TOOLS = [
  {
    key: 'image',
    title: 'Image Studio',
    description: 'AI product photos & marketing visuals',
    icon: Image,
    route: '/StudioImage',
  },
  {
    key: 'video',
    title: 'Video Studio',
    description: 'Cinematic AI product videos',
    icon: Film,
    route: '/StudioVideo',
    hidden: true,
  },
  {
    key: 'photoshoot',
    title: 'Photoshoot',
    description: 'Bulk AI catalog photography',
    icon: Camera,
    route: '/StudioPhotoshoot',
  },
  {
    key: 'clipshoot',
    title: 'Clipshoot',
    description: 'Multi-shot video storyboards',
    icon: Film,
    route: '/StudioClipshoot',
    hidden: true,
  },
  {
    key: 'podcast',
    title: 'Podcast',
    description: 'AI podcasts with multiple speakers',
    icon: Mic,
    route: '/StudioPodcast',
  },
  {
    key: 'voiceclone',
    title: 'Voice Clone',
    description: 'Clone any voice for content',
    icon: AudioLines,
    route: '/StudioVoice',
  },
  {
    key: 'fashion',
    title: 'Fashion Booth',
    description: 'AI fashion photography',
    icon: Shirt,
    route: '/StudioFashionBooth',
  },
  {
    key: 'avatar',
    title: 'Avatar',
    description: 'AI avatars for UGC & social',
    icon: UserCircle,
    route: '/StudioAvatar',
    status: 'soon',
  },
];

export default function Create() {
  const { user } = useUser();
  const { theme, toggleTheme, ct } = useTheme();
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
      totalPodcasts: content.filter(c => c.content_type === 'podcast' || c.content_type === 'audio').length,
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

  const visibleTools = TOOLS.filter(t => !t.hidden);

  if (loading) {
    return (
      <div className={`min-h-screen ${ct('bg-slate-50', 'bg-black')} p-4`}>
        <div className="max-w-7xl mx-auto space-y-4">
          <Skeleton className={`h-16 w-full ${ct('bg-slate-200', 'bg-zinc-800')} rounded-xl`} />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className={`h-20 ${ct('bg-slate-200', 'bg-zinc-800')} rounded-xl`} />)}
          </div>
          <Skeleton className={`h-64 ${ct('bg-slate-200', 'bg-zinc-800')} rounded-xl`} />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${ct('bg-slate-50', 'bg-black')} relative`}>
      {/* Background gradient orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-yellow-400/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 w-full px-4 lg:px-6 py-4 space-y-4">
        {/* Page Header */}
        <PageHeader
          icon={Palette}
          title="Create Studio"
          subtitle="Generate images, videos, podcasts, and more with AI"
          color="yellow"
          actions={
            <div className="flex gap-2">
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg border transition-colors ${ct(
                  'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
                  'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                )}`}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <MotionButton
                onClick={() => navigate('/StudioImage')}
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Creation
              </MotionButton>
            </div>
          }
        />

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={FileImage} label="Images" value={stats.totalImages} color="yellow" delay={0} />
          <StatCard icon={Film} label="Videos" value={stats.totalVideos} color="yellow" delay={0.05} />
          <StatCard icon={Mic} label="Podcasts" value={stats.totalPodcasts} color="yellow" delay={0.1} />
          <StatCard icon={Layers} label="Total" value={stats.totalContent} color="yellow" delay={0.15} />
        </div>

        {/* Studio Tools Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className={`text-sm font-semibold ${ct('text-slate-900', 'text-white')}`}>Studio Tools</h2>
            <span className={`text-xs ${ct('text-slate-400', 'text-zinc-500')}`}>
              {visibleTools.filter(t => t.status !== 'soon').length} active
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {visibleTools.map((tool, i) => {
              const Icon = tool.icon;
              const isSoon = tool.status === 'soon';
              return (
                <motion.button
                  key={tool.key}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  onClick={() => !isSoon && navigate(tool.route)}
                  disabled={isSoon}
                  className={`group text-left p-4 rounded-xl border transition-colors ${ct(
                    'bg-white border-slate-200 shadow-sm hover:border-slate-300',
                    'bg-zinc-900/50 border-zinc-800/60 hover:border-zinc-700/60'
                  )} ${isSoon ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 border ${ct(
                    'bg-yellow-100 border-yellow-200',
                    'bg-yellow-500/10 border-yellow-500/20'
                  )}`}>
                    <Icon className={`w-5 h-5 ${ct('text-yellow-600', 'text-yellow-400')}`} />
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`text-sm font-semibold ${ct('text-slate-900', 'text-white')}`}>{tool.title}</h3>
                    {isSoon && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${ct(
                        'bg-yellow-100 text-yellow-700 border border-yellow-200',
                        'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                      )}`}>
                        Soon
                      </span>
                    )}
                  </div>
                  <p className={`text-xs leading-relaxed line-clamp-2 ${ct('text-slate-500', 'text-zinc-500')}`}>
                    {tool.description}
                  </p>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Recent Creations */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className={`text-sm font-semibold ${ct('text-slate-900', 'text-white')}`}>Recent Creations</h2>
            <button
              onClick={() => navigate('/StudioLibrary')}
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${ct(
                'text-slate-500 hover:text-yellow-600',
                'text-zinc-500 hover:text-yellow-400'
              )}`}
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {galleryItems.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-16 rounded-xl border border-dashed ${ct(
              'border-slate-300 bg-white',
              'border-zinc-800 bg-zinc-900/30'
            )}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${ct(
                'bg-yellow-100',
                'bg-yellow-500/10'
              )}`}>
                <Sparkles className={`w-5 h-5 ${ct('text-yellow-600', 'text-yellow-400')}`} />
              </div>
              <p className={`text-sm font-semibold mb-1 ${ct('text-slate-900', 'text-white')}`}>Your canvas awaits</p>
              <p className={`text-xs mb-5 ${ct('text-slate-500', 'text-zinc-500')}`}>Generate your first image or video</p>
              <MotionButton
                onClick={() => navigate('/StudioImage')}
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Start Creating
              </MotionButton>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {galleryItems.map((item, i) => {
                const isVideo = item.content_type === 'video' || item._type === 'video_project';
                const mediaUrl = item.url || item.thumbnail_url || item.final_thumbnail_url;
                const isVideoFile = mediaUrl && (mediaUrl.includes('.mp4') || mediaUrl.includes('.webm'));
                const isImageFile = mediaUrl && (mediaUrl.includes('.png') || mediaUrl.includes('.jpg') || mediaUrl.includes('.jpeg') || mediaUrl.includes('.webp') || item.content_type === 'image');

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.05 }}
                    className={`relative aspect-square rounded-xl overflow-hidden group cursor-pointer border ${ct(
                      'border-slate-200 shadow-sm',
                      'border-zinc-800/60'
                    )}`}
                    onClick={() => navigate('/StudioLibrary')}
                  >
                    {isVideoFile ? (
                      <video src={mediaUrl} muted preload="metadata" className="w-full h-full object-cover" />
                    ) : isImageFile ? (
                      <img src={mediaUrl} alt={item.name || ''} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${ct(
                        'bg-slate-100',
                        'bg-zinc-900'
                      )}`}>
                        {isVideo ? <Play className="w-8 h-8 text-zinc-400" /> : <FileImage className="w-8 h-8 text-zinc-400" />}
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    <div className="absolute bottom-0 left-0 right-0 p-2.5 translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200">
                      <p className="text-xs font-medium text-white truncate">{item.name || item.title || 'Untitled'}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {isVideo ? <Film className="w-3 h-3 text-yellow-400" /> : <FileImage className="w-3 h-3 text-yellow-400" />}
                        <span className="text-[10px] text-yellow-400">{isVideo ? 'Video' : 'Image'}</span>
                      </div>
                    </div>

                    {isVideo && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center bg-black/50 backdrop-blur-sm">
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
  );
}
