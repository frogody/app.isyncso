/**
 * AdminSidebar Component
 * Navigation sidebar for admin panel
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAdmin } from './AdminGuard';
import {
  LayoutDashboard,
  Users,
  Building2,
  Store,
  AppWindow,
  BarChart3,
  Settings,
  Flag,
  ScrollText,
  Shield,
  ChevronLeft,
  Crown,
  CreditCard,
  Plug2,
  Server,
  FileText,
  Headphones,
  Bot,
  Package,
  Coins,
  Presentation,
  Map,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const adminNavItems = [
  { title: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { title: 'Users', href: '/admin/users', icon: Users },
  { title: 'Organizations', href: '/admin/organizations', icon: Building2 },
  { title: 'Marketplace', href: '/admin/marketplace', icon: Store },
  { title: 'Nests', href: '/admin/nests', icon: Package },
  { title: 'Growth Nests', href: '/admin/growth-nests', icon: Package },
  { title: 'Apps', href: '/admin/apps', icon: AppWindow },
  { title: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { divider: true },
  { title: 'Demos', href: '/admin/demos', icon: Presentation },
  { title: 'Content', href: '/admin/content', icon: FileText },
  { title: 'Support', href: '/admin/support', icon: Headphones },
  { title: 'AI & Automation', href: '/admin/ai', icon: Bot },
  { title: 'Billing', href: '/admin/billing', icon: CreditCard },
  { title: 'Credits', href: '/admin/credits', icon: Coins },
  { title: 'Integrations', href: '/admin/integrations', icon: Plug2 },
  { title: 'System', href: '/admin/system', icon: Server },
  { divider: true },
  { title: 'Roadmap', href: '/admin/roadmap', icon: Map },
  { title: 'Structural Tests', href: '/admin/structural-tests', icon: ShieldCheck },
  { title: 'Feature Flags', href: '/admin/feature-flags', icon: Flag },
  { title: 'Settings', href: '/admin/settings', icon: Settings },
  { title: 'Audit Logs', href: '/admin/audit-logs', icon: ScrollText },
];

function NavItem({ item, isActive }) {
  if (item.divider) {
    return <div className="h-px bg-zinc-800 my-2" />;
  }

  const Icon = item.icon;

  return (
    <Link to={item.href}>
      <motion.div

        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
          isActive
            ? "bg-red-500/20 text-red-400 border border-red-500/30"
            : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
        )}
      >
        <Icon className="w-5 h-5" />
        <span className="font-medium">{item.title}</span>
        {item.badge && (
          <Badge className="ml-auto text-[10px] bg-red-500/20 text-red-400 border-red-500/30">
            {item.badge}
          </Badge>
        )}
      </motion.div>
    </Link>
  );
}

export default function AdminSidebar() {
  const location = useLocation();
  const { adminRole } = useAdmin();

  const getRoleBadge = (role) => {
    const badges = {
      super_admin: { label: 'Super Admin', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
      admin: { label: 'Admin', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
      support: { label: 'Support', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      analyst: { label: 'Analyst', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    };
    return badges[role] || badges.analyst;
  };

  const roleBadge = getRoleBadge(adminRole);

  return (
    <div className="w-64 h-screen bg-zinc-950 border-r border-zinc-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="font-bold text-white">Admin Panel</h1>
            <Badge className={cn("text-[10px]", roleBadge.color)}>
              {roleBadge.label}
            </Badge>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {adminNavItems.map((item, index) => (
          <NavItem
            key={item.href || index}
            item={item}
            isActive={
              item.href === '/admin'
                ? location.pathname === '/admin'
                : location.pathname.startsWith(item.href)
            }
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-800">
        <Link to="/dashboard">
          <motion.div

            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="font-medium">Exit Admin</span>
          </motion.div>
        </Link>
      </div>
    </div>
  );
}
