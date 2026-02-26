import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Image, Film, Camera, ArrowRight, Sparkles, Mic, AudioLines, UserCircle, Shirt, FolderOpen } from 'lucide-react';
import { useTheme } from '@/contexts/GlobalThemeContext';

const TOOLS = [
  {
    key: 'image',
    title: 'Image Studio',
    description: 'AI product photos & marketing visuals',
    icon: Image,
    route: '/StudioImage',
  },
  {
    key: 'photoshoot',
    title: 'Photoshoot',
    description: 'Bulk AI catalog photography',
    icon: Camera,
    route: '/StudioPhotoshoot',
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
  {
    key: 'library',
    title: 'Library',
    description: 'Browse all your generated content',
    icon: FolderOpen,
    route: '/StudioLibrary',
  },
];

export default function Studio() {
  const navigate = useNavigate();
  const { ct } = useTheme();

  return (
    <div className={`min-h-screen ${ct('bg-slate-50', 'bg-black')}`}>
      <div className="w-full px-4 lg:px-8 py-8">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 ${ct(
            'bg-yellow-100 border border-yellow-200',
            'bg-yellow-500/10 border border-yellow-500/20'
          )}`}>
            <Sparkles className={`w-3.5 h-3.5 ${ct('text-yellow-600', 'text-yellow-400')}`} />
            <span className={`text-xs font-medium ${ct('text-yellow-700', 'text-yellow-300')}`}>AI-Powered Studio</span>
          </div>
          <h1 className={`text-3xl font-bold mb-2 ${ct('text-slate-900', 'text-white')}`}>Create Studio</h1>
          <p className={`text-sm max-w-md mx-auto ${ct('text-slate-500', 'text-zinc-500')}`}>
            Generate images, videos, podcasts, avatars, and more — all in one place.
          </p>
        </div>

        {/* Tool Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {TOOLS.map((tool, i) => {
            const Icon = tool.icon;
            const isSoon = tool.status === 'soon';
            return (
              <motion.button
                key={tool.key}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => !isSoon && navigate(tool.route)}
                disabled={isSoon}
                className={`group text-left p-5 rounded-xl border transition-colors ${ct(
                  'bg-white border-slate-200 shadow-sm hover:border-slate-300',
                  'bg-zinc-900/50 border-zinc-800/60 hover:border-zinc-700/60'
                )} ${isSoon ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 border ${ct(
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
                <p className={`text-xs leading-relaxed mb-3 ${ct('text-slate-500', 'text-zinc-500')}`}>{tool.description}</p>
                <span className={`inline-flex items-center gap-1 text-xs transition-colors ${ct(
                  'text-slate-400 group-hover:text-yellow-600',
                  'text-zinc-600 group-hover:text-yellow-400'
                )}`}>
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
