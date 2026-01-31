import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Palette, Image, Video, FolderOpen, Plus, ArrowRight,
  Sparkles, TrendingUp, Clock, FileImage, Film, Layers,
} from 'lucide-react';
import { CreatePageTransition } from '@/components/create/ui';
import { GeneratedContent, BrandAssets, VideoProject } from '@/api/entities';
import { MOTION_VARIANTS } from '@/tokens/create';
import { useUser } from '@/components/context/UserContext';

const MODULES = [
  {
    key: 'branding',
    title: 'Branding',
    description: 'Logos, color palettes, and brand identity',
    icon: Palette,
    route: 'CreateBranding',
    gradient: 'from-cyan-500/20 to-blue-500/20',
    iconColor: 'text-cyan-400',
  },
  {
    key: 'images',
    title: 'Images',
    description: 'AI-powered image generation',
    icon: Image,
    route: 'CreateImages',
    gradient: 'from-violet-500/20 to-purple-500/20',
    iconColor: 'text-violet-400',
  },
  {
    key: 'videos',
    title: 'Videos',
    description: 'Multi-shot cinematic video studio',
    icon: Video,
    route: 'CreateVideos',
    gradient: 'from-rose-500/20 to-pink-500/20',
    iconColor: 'text-rose-400',
  },
  {
    key: 'library',
    title: 'Content Library',
    description: 'Browse and manage all generated content',
    icon: FolderOpen,
    route: 'CreateLibrary',
    gradient: 'from-amber-500/20 to-orange-500/20',
    iconColor: 'text-amber-400',
  },
];

export default function Create() {
  const { user } = useUser();
  const [content, setContent] = useState([]);
  const [brandAssets, setBrandAssets] = useState([]);
  const [videoProjects, setVideoProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [contentRes, brandsRes, videosRes] = await Promise.allSettled([
        GeneratedContent.list('-created_at', { limit: 5 }),
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

  const recentItems = useMemo(() => {
    const items = [
      ...content.map(c => ({ ...c, _type: c.content_type || 'image', _date: c.created_at })),
      ...brandAssets.map(b => ({ ...b, _type: 'brand', _date: b.created_at, name: b.brand_name || b.name })),
      ...videoProjects.map(v => ({ ...v, _type: 'video_project', _date: v.created_at })),
    ];
    return items.sort((a, b) => new Date(b._date) - new Date(a._date)).slice(0, 6);
  }, [content, brandAssets, videoProjects]);

  const STAT_CARDS = [
    { label: 'Images', value: stats.totalImages, icon: FileImage, color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { label: 'Videos', value: stats.totalVideos, icon: Film, color: 'text-rose-400', bg: 'bg-rose-500/10' },
    { label: 'Brand Assets', value: stats.totalBrands, icon: Palette, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { label: 'Total Content', value: stats.totalContent, icon: Layers, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ];

  return (
    <CreatePageTransition className="min-h-screen bg-black">
      <div className="w-full px-4 lg:px-6 py-4 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-cyan-500/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Create Studio</h1>
              <p className="text-xs text-zinc-500">AI-powered content creation hub</p>
            </div>
          </div>
          <Link to={createPageUrl('CreateImages')}>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black font-medium text-sm rounded-full hover:bg-cyan-400 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Generate
            </motion.button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {STAT_CARDS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                {loading ? (
                  <div className="w-8 h-6 bg-zinc-800 rounded animate-pulse" />
                ) : (
                  <span className="text-xl font-bold text-white">{stat.value}</span>
                )}
              </div>
              <p className="text-xs text-zinc-500">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Module Cards */}
        <div>
          <h2 className="text-sm font-medium text-zinc-400 mb-3">Modules</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {MODULES.map((mod, i) => (
              <Link key={mod.key} to={createPageUrl(mod.route)}>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.06, duration: 0.35 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] p-5 cursor-pointer group hover:border-cyan-500/30 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${mod.gradient} flex items-center justify-center mb-3`}>
                    <mod.icon className={`w-5 h-5 ${mod.iconColor}`} />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">{mod.title}</h3>
                  <p className="text-xs text-zinc-500 mb-3">{mod.description}</p>
                  <div className="flex items-center gap-1 text-xs text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Open <ArrowRight className="w-3 h-3" />
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-zinc-400">Recent Activity</h2>
            <Link to={createPageUrl('CreateLibrary')} className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
              View All
            </Link>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-[20px] overflow-hidden">
            {loading ? (
              <div className="p-8 flex justify-center">
                <div className="w-6 h-6 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
              </div>
            ) : recentItems.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6 text-cyan-400" />
                </div>
                <p className="text-sm text-zinc-400 mb-1">No content yet</p>
                <p className="text-xs text-zinc-600">Start creating with AI-powered tools</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/60">
                {recentItems.map((item, i) => {
                  const typeConfig = {
                    image: { icon: FileImage, label: 'Image', color: 'text-violet-400', bg: 'bg-violet-500/10' },
                    video: { icon: Film, label: 'Video', color: 'text-rose-400', bg: 'bg-rose-500/10' },
                    video_project: { icon: Film, label: 'Video Project', color: 'text-rose-400', bg: 'bg-rose-500/10' },
                    brand: { icon: Palette, label: 'Brand', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
                  }[item._type] || { icon: Layers, label: 'Content', color: 'text-zinc-400', bg: 'bg-zinc-500/10' };

                  const TypeIcon = typeConfig.icon;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className={`w-8 h-8 rounded-lg ${typeConfig.bg} flex items-center justify-center flex-shrink-0`}>
                        <TypeIcon className={`w-4 h-4 ${typeConfig.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white truncate">{item.name || item.title || 'Untitled'}</p>
                        <p className="text-xs text-zinc-600">{typeConfig.label}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-zinc-600 flex-shrink-0">
                        <Clock className="w-3 h-3" />
                        {item._date ? new Date(item._date).toLocaleDateString() : '—'}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </CreatePageTransition>
  );
}
