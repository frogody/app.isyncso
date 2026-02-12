import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  Image as ImageIcon,
  Film,
  Camera,
  Clapperboard,
  LayoutTemplate,
  FolderOpen,
  Mic,
  AudioLines,
  UserCircle,
} from 'lucide-react';

const NAV_ITEMS = [
  { key: 'home',       label: 'Studio',     path: '/Studio',           icon: Home },
  { key: 'image',      label: 'Image',      path: '/StudioImage',      icon: ImageIcon },
  { key: 'video',      label: 'Video',      path: '/StudioVideo',      icon: Film },
  { key: 'photoshoot', label: 'Photoshoot', path: '/StudioPhotoshoot', icon: Camera },
  { key: 'clipshoot',  label: 'Clipshoot',  path: '/StudioClipshoot',  icon: Clapperboard },
  { key: 'templates',  label: 'Templates',  path: '/StudioTemplates',  icon: LayoutTemplate },
  { key: 'library',    label: 'Library',    path: '/StudioLibrary',    icon: FolderOpen },
  { key: 'podcast',    label: 'Podcast',    path: '/StudioPodcast',    icon: Mic },
  { key: 'voice',      label: 'Voice',      path: '/StudioVoice',      icon: AudioLines },
  { key: 'avatar',     label: 'Avatar',     path: '/StudioAvatar',     icon: UserCircle },
];

export default function StudioNav({ current }) {
  const navigate = useNavigate();
  const location = useLocation();

  const activePath = current || location.pathname;

  const isItemActive = (item) => {
    if (activePath === item.path || activePath.startsWith(item.path + '/')) {
      return true;
    }
    // Backward compat: Photoshoot tab also matches /SyncStudio* routes
    if (item.key === 'photoshoot' && activePath.startsWith('/SyncStudio')) {
      return true;
    }
    return false;
  };

  return (
    <nav className="flex items-center gap-1 px-2 py-1.5 bg-zinc-900/60 border border-zinc-800/50 rounded-xl backdrop-blur-sm">
      <div className="flex items-center gap-0.5 mr-2">
        <Clapperboard className="w-4 h-4 text-yellow-400" />
        <span className="text-xs font-semibold text-yellow-400 tracking-wide">STUDIO</span>
      </div>
      <div className="w-px h-4 bg-zinc-700/50" />
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = isItemActive(item);

        return (
          <button
            key={item.key}
            onClick={() => navigate(item.path)}
            className={`relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isActive
                ? 'text-yellow-400'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="studio-main-nav-active"
                className="absolute inset-0 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <Icon className="w-3.5 h-3.5 relative z-10" />
            <span className="relative z-10 hidden sm:inline">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
