import React from 'react';
import {
  LayoutDashboard, TrendingUp, Users, DollarSign, UserCheck,
  Sparkles, GraduationCap, Palette, Package, Rocket,
  ShieldCheck, MessageSquare, CheckSquare, Plug,
} from 'lucide-react';

const navItems = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { divider: true },
  { key: 'growth', label: 'Growth', icon: TrendingUp },
  { key: 'crm', label: 'CRM', icon: Users },
  { key: 'talent', label: 'Talent', icon: UserCheck },
  { key: 'finance', label: 'Finance', icon: DollarSign },
  { divider: true },
  { key: 'learn', label: 'Learn', icon: GraduationCap },
  { key: 'create', label: 'Create', icon: Palette },
  { key: 'products', label: 'Products', icon: Package },
  { key: 'raise', label: 'Raise', icon: Rocket },
  { divider: true },
  { key: 'sentinel', label: 'Sentinel', icon: ShieldCheck },
  { key: 'inbox', label: 'Inbox', icon: MessageSquare },
  { key: 'tasks', label: 'Tasks', icon: CheckSquare },
  { key: 'integrations', label: 'Integrations', icon: Plug },
];

export default function DemoSidebar({ currentPage = 'dashboard' }) {
  return (
    <div className="w-56 h-screen bg-zinc-950 border-r border-zinc-800 flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-3 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
            <Sparkles className="w-4.5 h-4.5 text-cyan-400" />
          </div>
          <div>
            <h1 className="font-bold text-white text-sm">iSyncso</h1>
            <p className="text-[10px] text-zinc-500">AI Business Platform</p>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item, i) => {
          if (item.divider) {
            return <div key={`d-${i}`} className="h-px bg-zinc-800/60 my-1.5" />;
          }
          const Icon = item.icon;
          const isActive = currentPage === item.key;
          return (
            <div
              key={item.key}
              className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-all cursor-default text-sm ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-zinc-400'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="font-medium">{item.label}</span>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-zinc-800">
        <div className="flex items-center gap-2.5 px-2.5 py-1.5 text-zinc-500 text-xs">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>Demo Mode</span>
        </div>
      </div>
    </div>
  );
}
