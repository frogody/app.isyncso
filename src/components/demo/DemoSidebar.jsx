import React from 'react';
import { LayoutDashboard, TrendingUp, Users, DollarSign, UserCheck, Sparkles } from 'lucide-react';

const navItems = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'growth', label: 'Growth', icon: TrendingUp },
  { key: 'crm', label: 'CRM', icon: Users },
  { key: 'talent', label: 'Talent', icon: UserCheck },
  { key: 'finance', label: 'Finance', icon: DollarSign },
];

export default function DemoSidebar({ currentPage = 'dashboard' }) {
  return (
    <div className="w-64 h-screen bg-zinc-950 border-r border-zinc-800 flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="font-bold text-white text-lg">iSyncso</h1>
            <p className="text-xs text-zinc-500">AI Business Platform</p>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentPage === item.key;
          return (
            <div
              key={item.key}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-default ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-zinc-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-center gap-3 px-3 py-2 text-zinc-500 text-sm">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>Demo Mode</span>
        </div>
      </div>
    </div>
  );
}
