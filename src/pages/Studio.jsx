import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Image, Film, Camera, Clapperboard, ArrowRight, Sparkles, Mic, AudioLines, UserCircle } from 'lucide-react';
import { StudioNav } from '@/components/studio';

const TOOLS = [
  {
    key: 'image',
    title: 'Image',
    description: 'Generate AI product photos and marketing visuals',
    icon: Image,
    route: '/StudioImage',
    gradient: 'from-blue-500/20 to-cyan-500/10',
    color: 'text-blue-400',
  },
  {
    key: 'video',
    title: 'Video',
    description: 'Create AI-powered cinematic product videos',
    icon: Film,
    route: '/StudioVideo',
    gradient: 'from-purple-500/20 to-violet-500/10',
    color: 'text-purple-400',
  },
  {
    key: 'photoshoot',
    title: 'Photoshoot',
    description: 'Bulk AI photography for your entire product catalog',
    icon: Camera,
    route: '/StudioPhotoshoot',
    gradient: 'from-yellow-500/20 to-amber-500/10',
    color: 'text-yellow-400',
  },
  {
    key: 'clipshoot',
    title: 'Clipshoot',
    description: 'Multi-shot video storyboards assembled into clips',
    icon: Clapperboard,
    route: '/StudioClipshoot',
    gradient: 'from-emerald-500/20 to-green-500/10',
    color: 'text-emerald-400',
  },
  {
    key: 'podcast',
    title: 'Podcast',
    description: 'Create AI-powered podcasts with multiple speakers and voice clones',
    icon: Mic,
    route: '/StudioPodcast',
    gradient: 'from-orange-500/20 to-red-500/10',
    color: 'text-orange-400',
  },
  {
    key: 'voiceclone',
    title: 'Voice Clone',
    description: 'Clone your voice for videos, podcasts, and explainer content',
    icon: AudioLines,
    route: '/StudioVoice',
    gradient: 'from-pink-500/20 to-rose-500/10',
    color: 'text-pink-400',
  },
  {
    key: 'avatar',
    title: 'Avatar',
    description: 'Create AI avatars from photos for UGC videos and Instagram posts',
    icon: UserCircle,
    route: '/StudioAvatar',
    gradient: 'from-violet-500/20 to-purple-500/10',
    color: 'text-violet-400',
  },
];

export default function Studio() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Sticky nav */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl border-b border-zinc-800/60">
        <div className="w-full px-4 lg:px-8 py-3 flex justify-center">
          <StudioNav />
        </div>
      </div>

      <div className="w-full px-4 lg:px-8 py-8">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs font-medium text-yellow-300">AI-Powered Studio</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Create Studio</h1>
          <p className="text-zinc-500 text-sm max-w-md mx-auto">
            Generate images, videos, podcasts, avatars, and more — all in one place.
          </p>
        </div>

        {/* Tool Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {TOOLS.map((tool, i) => {
            const Icon = tool.icon;
            return (
              <motion.button
                key={tool.key}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => navigate(tool.route)}
                className="group text-left bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-5 hover:border-zinc-700 transition-all"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center mb-4 border border-zinc-800/40`}>
                  <Icon className={`w-5 h-5 ${tool.color}`} />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{tool.title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed mb-3">{tool.description}</p>
                <span className="inline-flex items-center gap-1 text-xs text-zinc-600 group-hover:text-yellow-400 transition-colors">
                  Open <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
