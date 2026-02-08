import React from 'react';
import {
  LayoutDashboard, Contact, FolderKanban, Package, Inbox,
  Euro, Rocket, GraduationCap, UserPlus, Shield, TrendingUp, Palette,
  Settings, Bell,
} from 'lucide-react';
import { Sparkles } from 'lucide-react';

// Matches real app navigation structure exactly
const coreNavItems = [
  { key: 'dashboard', icon: LayoutDashboard, title: 'Dashboard' },
  { key: 'crm', icon: Contact, title: 'CRM' },
  { key: 'products', icon: Package, title: 'Products' },
  { key: 'inbox', icon: Inbox, title: 'Inbox' },
];

const engineItems = [
  { key: 'finance', icon: Euro, title: 'Finance', color: { text: 'text-amber-400', bg: 'bg-amber-950/30', solid: 'bg-amber-500', glow: 'shadow-[0_0_10px_rgba(245,158,11,0.5)]' } },
  { key: 'growth', icon: Rocket, title: 'Growth', color: { text: 'text-indigo-400', bg: 'bg-indigo-950/30', solid: 'bg-indigo-500', glow: 'shadow-[0_0_10px_rgba(99,102,241,0.5)]' } },
  { key: 'learn', icon: GraduationCap, title: 'Learn', color: { text: 'text-teal-400', bg: 'bg-teal-950/30', solid: 'bg-teal-500', glow: 'shadow-[0_0_10px_rgba(20,184,166,0.5)]' } },
  { key: 'talent', icon: UserPlus, title: 'Talent', color: { text: 'text-red-400', bg: 'bg-red-950/30', solid: 'bg-red-500', glow: 'shadow-[0_0_10px_rgba(239,68,68,0.5)]' } },
  { key: 'sentinel', icon: Shield, title: 'Sentinel', color: { text: 'text-[#86EFAC]', bg: 'bg-[#86EFAC]/10', solid: 'bg-[#86EFAC]', glow: 'shadow-[0_0_10px_rgba(134,239,172,0.5)]' } },
  { key: 'raise', icon: TrendingUp, title: 'Raise', color: { text: 'text-orange-400', bg: 'bg-orange-950/30', solid: 'bg-orange-500', glow: 'shadow-[0_0_10px_rgba(249,115,22,0.5)]' } },
  { key: 'create', icon: Palette, title: 'Create', color: { text: 'text-yellow-400', bg: 'bg-yellow-950/30', solid: 'bg-yellow-500', glow: 'shadow-[0_0_10px_rgba(234,179,8,0.5)]' } },
];

// Simplified SYNC avatar ring for demo (no animation dependencies)
function DemoSyncAvatar({ size = 36 }) {
  const r = size / 2;
  const segmentR = r - 2;
  const innerR = r * 0.58;

  const segments = [
    { color: '#ec4899', from: 0.02, to: 0.08 },
    { color: '#06b6d4', from: 0.12, to: 0.18 },
    { color: '#6366f1', from: 0.22, to: 0.28 },
    { color: '#10b981', from: 0.32, to: 0.38 },
    { color: '#86EFAC', from: 0.42, to: 0.48 },
    { color: '#f59e0b', from: 0.52, to: 0.58 },
    { color: '#f43f5e', from: 0.62, to: 0.68 },
    { color: '#f97316', from: 0.72, to: 0.78 },
    { color: '#3b82f6', from: 0.82, to: 0.88 },
    { color: '#14b8a6', from: 0.92, to: 0.98 },
  ];

  const polar = (cx, cy, radius, a) => {
    const ang = (a - 0.25) * Math.PI * 2;
    return { x: cx + radius * Math.cos(ang), y: cy + radius * Math.sin(ang) };
  };

  const arcPath = (cx, cy, radius, a0, a1) => {
    const p0 = polar(cx, cy, radius, a0);
    const p1 = polar(cx, cy, radius, a1);
    const large = a1 - a0 > 0.5 ? 1 : 0;
    return `M ${p0.x} ${p0.y} A ${radius} ${radius} 0 ${large} 1 ${p1.x} ${p1.y}`;
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 70%)',
          transform: 'scale(1.2)',
          opacity: 0.3,
        }}
      />
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0">
        <defs>
          <filter id="demoGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={1.5} result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <g filter="url(#demoGlow)">
          {segments.map((seg, i) => (
            <path
              key={i}
              d={arcPath(r, r, segmentR, seg.from, seg.to)}
              fill="none"
              stroke={seg.color}
              strokeWidth={3}
              strokeLinecap="round"
              opacity={0.75}
            />
          ))}
        </g>
      </svg>
      {/* Inner dark circle with subtle purple glow */}
      <div
        className="absolute rounded-full"
        style={{
          top: size / 2 - innerR,
          left: size / 2 - innerR,
          width: innerR * 2,
          height: innerR * 2,
          background: 'radial-gradient(circle, rgba(168,85,247,0.35) 0%, rgba(0,0,0,0.6) 100%)',
        }}
      />
    </div>
  );
}

export default function DemoSidebar({ currentPage = 'dashboard' }) {
  return (
    <div className="hidden md:flex flex-col w-[72px] lg:w-[80px] h-screen bg-black/95 border-r border-zinc-800 shrink-0 overflow-visible relative z-20">
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-1 scrollbar-hide">
        {/* SYNC Avatar at top */}
        <div className="flex items-center justify-center min-h-[44px] w-full p-2 mb-2 rounded-xl">
          <DemoSyncAvatar size={36} />
        </div>

        {/* Core Navigation */}
        <div className="space-y-1">
          {coreNavItems.map((item) => {
            const isActive = currentPage === item.key;
            const Icon = item.icon;
            return (
              <div
                key={item.key}
                className={`flex items-center justify-center min-h-[44px] p-3 rounded-xl transition-all duration-200 group relative cursor-default
                  ${isActive
                    ? 'text-cyan-400 bg-cyan-950/30'
                    : 'text-gray-400'
                  }
                `}
                title={item.title}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-cyan-400' : ''}`} />
                {isActive && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyan-500 rounded-l-full shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                )}
              </div>
            );
          })}
        </div>

        <div className="h-px bg-white/5 mx-2 my-2" />

        {/* Engine Apps — color-coded like real app */}
        <div className="space-y-1">
          {engineItems.map((item) => {
            const isActive = currentPage === item.key;
            const Icon = item.icon;
            const colors = item.color;
            return (
              <div
                key={item.key}
                className={`flex items-center justify-center min-h-[44px] p-3 rounded-xl transition-all duration-200 group relative cursor-default w-full
                  ${isActive
                    ? `${colors.text} ${colors.bg}`
                    : 'text-gray-400'
                  }
                `}
                title={item.title}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? colors.text : ''}`} />
                {isActive && (
                  <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-l-full ${colors.solid} ${colors.glow}`} />
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="p-4 space-y-1 bg-gradient-to-t from-black via-black to-transparent">
        {/* Notifications (decorative) */}
        <div className="flex items-center justify-center min-h-[44px] p-3 rounded-xl text-gray-400 cursor-default" title="Notifications">
          <Bell className="w-5 h-5" />
        </div>
        {/* Settings (decorative) */}
        <div className="flex items-center justify-center min-h-[44px] p-3 rounded-xl text-gray-400 cursor-default" title="Settings">
          <Settings className="w-5 h-5" />
        </div>
        {/* Credits badge */}
        <div className="flex items-center justify-center min-h-[44px] p-3 rounded-xl text-gray-400 cursor-default" title="Credits">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-400/30 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-cyan-400">50</span>
          </div>
        </div>
      </div>
    </div>
  );
}
