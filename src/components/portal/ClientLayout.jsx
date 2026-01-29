import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { usePortalClientContext, usePortalSettings } from './ClientProvider';
import NotificationBell from './notifications/NotificationBell';

export default function ClientLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { org: orgSlug } = useParams();
  const { client, signOut, isAuthenticated, loading } = usePortalClientContext();
  const settings = usePortalSettings();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Determine the base path for navigation links
  const basePath = `/portal/${orgSlug || client?.organization?.slug || ''}`;

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!loading && !isAuthenticated) {
      const loginPath = orgSlug ? `/portal/${orgSlug}/login` : '/portal/login';
      navigate(loginPath);
    }
  }, [loading, isAuthenticated, navigate, orgSlug]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: settings.background_color }}
      >
        <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const navigation = [
    { name: 'Dashboard', href: basePath, icon: LayoutDashboard },
    { name: 'Projects', href: `${basePath}/projects`, icon: FolderKanban },
    { name: 'Approvals', href: `${basePath}/approvals`, icon: CheckCircle2 },
    { name: 'Activity', href: `${basePath}/activity`, icon: Clock },
  ];

  const isActive = (href) => {
    if (href === basePath) {
      return location.pathname === basePath;
    }
    return location.pathname.startsWith(href);
  };

  const handleSignOut = async () => {
    await signOut();
    const loginPath = orgSlug ? `/portal/${orgSlug}/login` : '/portal/login';
    navigate(loginPath);
  };

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: settings.background_color }}
    >
      {/* Header */}
      <header className="sticky top-0 z-50 bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-800/60 shadow-lg shadow-black/10">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <Link to={basePath} className="flex items-center gap-3">
                {settings.logo_url ? (
                  <img
                    src={settings.logo_url}
                    alt={settings.portal_name}
                    className="h-8 w-auto"
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${settings.primary_color}, ${settings.accent_color})`,
                    }}
                  >
                    <span className="text-white font-bold text-sm">
                      {settings.portal_name?.charAt(0) || 'P'}
                    </span>
                  </div>
                )}
                <span className="text-white font-semibold hidden sm:block">
                  {settings.portal_name}
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                      active
                        ? 'bg-white/[0.08] text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <NotificationBell
                clientId={client?.id}
                organizationId={client?.organization_id}
                orgSlug={orgSlug}
              />

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 pr-3 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center ring-2 ring-zinc-700" style={{ background: `linear-gradient(135deg, ${settings.primary_color || '#06b6d4'}, ${settings.accent_color || '#10b981'})` }}>
                    <span className="text-white text-sm font-medium">
                      {client?.full_name?.charAt(0) || client?.email?.charAt(0) || '?'}
                    </span>
                  </div>
                  <span className="text-sm text-zinc-300 hidden sm:block">
                    {client?.full_name || client?.email?.split('@')[0]}
                  </span>
                  <ChevronDown className="w-4 h-4 text-zinc-500" />
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-20">
                      <div className="p-3 border-b border-zinc-800">
                        <p className="text-sm font-medium text-white">{client?.full_name}</p>
                        <p className="text-xs text-zinc-500">{client?.email}</p>
                        {client?.company_name && (
                          <p className="text-xs text-zinc-400 mt-1">{client.company_name}</p>
                        )}
                      </div>
                      <div className="p-1.5">
                        <Link
                          to={`${basePath}/settings`}
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          Settings
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-zinc-400 hover:text-white rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-800 bg-zinc-900">
            <nav className="px-4 py-3 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-white/10 text-white'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      {settings.footer_text && (
        <footer className="border-t border-zinc-800 py-6">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <p className="text-center text-sm text-zinc-500">{settings.footer_text}</p>
          </div>
        </footer>
      )}
    </div>
  );
}
