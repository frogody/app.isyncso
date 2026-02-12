import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  Download,
  Camera,
  LayoutDashboard,
  Zap,
  Images,
  History,
} from 'lucide-react';

const NAV_ITEMS = [
  { key: 'home', label: 'Studio', path: '/SyncStudio', icon: Home },
  { key: 'import', label: 'Import', path: '/SyncStudioImport', icon: Download },
  { key: 'dashboard', label: 'Dashboard', path: '/SyncStudioDashboard', icon: LayoutDashboard },
  { key: 'photoshoot', label: 'Photoshoot', path: '/SyncStudioPhotoshoot', icon: Zap },
  { key: 'results', label: 'Results', path: '/SyncStudioResults', icon: Images },
  { key: 'history', label: 'History', path: '/SyncStudioReturn', icon: History },
];

export default function SyncStudioNav({ current }) {
  const navigate = useNavigate();
  const location = useLocation();

  const activePath = current || location.pathname;

  return (
    <nav className="flex items-center gap-1 px-2 py-1.5 bg-zinc-900/60 border border-zinc-800/50 rounded-xl backdrop-blur-sm">
      <div className="flex items-center gap-0.5 mr-2">
        <Camera className="w-4 h-4 text-yellow-400" />
        <span className="text-xs font-semibold text-yellow-400 tracking-wide">STUDIO</span>
      </div>
      <div className="w-px h-4 bg-zinc-700/50" />
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activePath === item.path || activePath.startsWith(item.path + '?');

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
                layoutId="studio-nav-active"
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
