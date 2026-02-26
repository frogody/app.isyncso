import React from 'react';
import { useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useTeamAccess } from '@/components/context/UserContext';
import { getEngineAppForPath, ENGINE_APP_DESCRIPTIONS } from '@/lib/engineAppsConfig';

// Per-app accent colors (mirrors Layout.jsx getEngineColors)
const APP_COLORS = {
  finance:  { text: 'text-blue-400',   bg: 'bg-blue-500/10',  border: 'border-blue-500/20',  iconBg: 'bg-blue-500/20'  },
  growth:   { text: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', iconBg: 'bg-indigo-500/20' },
  learn:    { text: 'text-cyan-400',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/20',   iconBg: 'bg-cyan-500/20'   },
  talent:   { text: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    iconBg: 'bg-red-500/20'    },
  sentinel: { text: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/20',iconBg: 'bg-emerald-500/20'},
  raise:    { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', iconBg: 'bg-orange-500/20' },
  create:   { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', iconBg: 'bg-yellow-500/20' },
  reach:    { text: 'text-cyan-400',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/20',   iconBg: 'bg-cyan-500/20'   },
};

const DEFAULT_COLORS = { text: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20', iconBg: 'bg-zinc-500/20' };

export default function AppLicenseGate({ children }) {
  const { pathname } = useLocation();
  const { effectiveApps, isLoading } = useTeamAccess();

  const appConfig = getEngineAppForPath(pathname);

  // Not an engine app route — pass through
  if (!appConfig) return children;

  // Still loading — pass through to avoid flash
  if (isLoading) return children;

  // Check license: effectiveApps.includes(id) → licensed
  // When effectiveApps = [] → isLicensed = false for ALL engine apps
  const isLicensed = effectiveApps.includes(appConfig.id);

  if (isLicensed) return children;

  // ── Gate screen ──
  const colors = APP_COLORS[appConfig.id] || DEFAULT_COLORS;
  const Icon = appConfig.icon;
  const description = ENGINE_APP_DESCRIPTIONS[appConfig.id] || '';

  return (
    <div className="min-h-full flex items-center justify-center p-6 bg-black/20">
      <div className={`w-full max-w-md rounded-2xl border ${colors.border} ${colors.bg} backdrop-blur-xl p-8 text-center`}>
        {/* App icon */}
        <div className={`mx-auto w-16 h-16 rounded-2xl ${colors.iconBg} flex items-center justify-center mb-6`}>
          <Icon className={`w-8 h-8 ${colors.text}`} />
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-white mb-2">
          Welcome to {appConfig.title}
        </h2>

        {/* Description */}
        {description && (
          <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
            {description}
          </p>
        )}

        {/* Lock message */}
        <div className="flex items-center justify-center gap-2 text-zinc-500 text-sm mb-6">
          <Lock className="w-4 h-4" />
          <span>A license is required to access this app.</span>
        </div>

        {/* CTA */}
        <button
          onClick={() => window.location.href = 'mailto:support@isyncso.com?subject=License%20Request%20-%20' + encodeURIComponent(appConfig.title)}
          className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-full ${colors.text} border ${colors.border} hover:bg-white/5 transition-colors text-sm font-medium`}
        >
          Contact Admin
        </button>
      </div>
    </div>
  );
}
