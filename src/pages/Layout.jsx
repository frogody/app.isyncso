

import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useTranslation } from "@/components/utils/translations";
import { Users, User as UserIcon, LogOut, Sparkles, Building2, Brain, MessageSquare, CheckSquare, Briefcase, Activity, RefreshCw, Menu, X, ChevronRight, ChevronLeft, Megaphone, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import SyncAvatar from "../components/ui/SyncAvatar";
import IconWrapper from "../components/ui/IconWrapper";
import { haptics } from "@/components/utils/haptics";
import { useIsMobile } from "@/components/utils/useIsMobile";
import { motion, AnimatePresence } from "framer-motion";

// Navigation items
const navigationItems = [
  {
    title: "SYNC",
    icon: Sparkles,
    url: createPageUrl("Chat"),
    group: "discovery",
    useSyncAvatar: true
  },
  {
    title: "Kandidaten",
    icon: Users,
    url: createPageUrl("Candidates"),
    group: "discovery"
  },
  {
    title: "Campagnes",
    icon: Megaphone,
    url: createPageUrl("Campaigns"),
    group: "pipeline"
  },
  {
    title: "Projecten",
    icon: Briefcase,
    url: createPageUrl("Projects"),
    group: "pipeline"
  },
  {
    title: "Taken",
    icon: CheckSquare,
    url: createPageUrl("Tasks"),
    group: "pipeline"
  },
  {
    title: "Dashboard",
    icon: Activity,
    url: createPageUrl("Dashboard"),
    group: "pipeline"
  }
];

// Fallback logo component
const FallbackLogo = ({ size = 40 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '8px',
      background: 'linear-gradient(135deg, #EF4444, #DC2626)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      fontSize: size * 0.4,
      color: 'white',
      boxShadow: '0 0 20px rgba(239,68,68,0.3)'
    }}
  >
    T
  </div>
);

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [hasCheckedOrganization, setHasCheckedOrganization] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const isMobile = useIsMobile();

  const { t } = useTranslation(user?.language || 'nl');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);

        if (!userData.organization_id && !hasCheckedOrganization) {
          setHasCheckedOrganization(true);
          try {
            const response = await base44.functions.invoke('assignUserToOrganization');

            if (response.data?.success && response.data?.organization_id) {
              const updatedUserData = await base44.auth.me();
              setUser(updatedUserData);
            }
          } catch (error) {
            console.error("Error assigning user to organization:", error);
          }
        }
      } catch (error) {
        console.error("Error loading user:", error);
        setUser(null);
      } finally {
        setIsInitialized(true);
      }
    };

    loadUser();
  }, [hasCheckedOrganization]);

  const handleChatClick = useCallback((e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }

    haptics.medium();

    // Navigate to SYNC chat page
    window.location.href = createPageUrl("Chat");

    return false;
  }, []);

  useEffect(() => {
    document.title = "TALENT";
  }, []);

  const toggleMobileMenu = () => {
    haptics.light();
    setShowMobileMenu(!showMobileMenu);
  };

  const handleLogout = async () => {
    if (confirm(t('confirm_logout'))) {
      haptics.medium();
      await base44.auth.logout();
    }
  };

  const groupedNavItems = {
    discovery: navigationItems.filter(item => item.group === "discovery"),
    pipeline: navigationItems.filter(item => item.group === "pipeline")
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <style jsx>{`
          :root {
            --bg: #151A1F;
            --surface: #1A2026;
            --txt: #E9F0F1;
            --muted: #B5C0C4;
            --accent: #EF4444;
            --accent2: #DC2626;
          }
          body {
            background: var(--bg) !important;
            color: var(--txt) !important;
          }
        `}</style>
        <div className="flex flex-col items-center gap-4">
          <SyncAvatar size={48} />
          <p className="text-lg font-medium" style={{ color: 'var(--txt)' }}>{t('loading_talent')}</p>
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <style jsx>{`
          :root {
            --bg: #151A1F;
            --surface: #1A2026;
            --txt: #E9F0F1;
            --muted: #B5C0C4;
            --accent: #EF4444;
            --accent2: #DC2626;
          }
          body {
            background: var(--bg) !important;
            color: var(--txt) !important;
          }
          .menu-overlay {
            position: fixed;
            top: 0;
            right: 0;
            bottom: 0;
            width: 280px;
            background: linear-gradient(180deg, rgba(26,32,38,.98), rgba(21,26,31,.98));
            backdrop-filter: blur(20px);
            border-left: 1px solid rgba(255,255,255,.08);
            box-shadow: -4px 0 24px rgba(0,0,0,.4);
            z-index: 100;
          }
          .menu-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,.6);
            backdrop-filter: blur(4px);
            z-index: 99;
          }
        `}</style>

        <div className="fixed top-0 left-0 right-0 z-50 px-4 py-3 flex items-center justify-between"
             style={{
               background: 'linear-gradient(180deg, rgba(21,26,31,.98), rgba(21,26,31,.95))',
               borderBottom: '1px solid rgba(255,255,255,.06)',
               backdropFilter: 'blur(20px)'
             }}>
          <div className="flex items-center gap-3">
            {!logoError ? (
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d43cf2c324ccd03de6bce5/9821df82f_isyncsotalentredtransparantlogo.png"
                alt="TALENT logo"
                className="w-8 h-8 object-contain flex-shrink-0"
                style={{ background: 'transparent' }}
                onError={() => setLogoError(true)}
              />
            ) : (
              <FallbackLogo size={32} />
            )}
            <h1 className="text-xl font-bold" style={{ color: 'var(--txt)' }}>TALENT</h1>
          </div>
          <Button
            onClick={toggleMobileMenu}
            size="icon"
            variant="ghost"
            className="h-10 w-10 rounded-lg"
            style={{
              background: 'rgba(255,255,255,.04)',
              border: '1px solid rgba(255,255,255,.08)'
            }}
          >
            <Menu className="w-5 h-5" style={{ color: 'var(--txt)' }} />
          </Button>
        </div>

        <AnimatePresence>
          {showMobileMenu && (
            <>
              <motion.div
                className="menu-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={toggleMobileMenu}
              />

              <motion.div
                className="menu-overlay"
                initial={{ x: 280 }}
                animate={{ x: 0 }}
                exit={{ x: 280 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
              >
                <div className="p-6 border-b" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold" style={{ color: 'var(--txt)' }}>{t('settings')}</h2>
                    <Button
                      onClick={toggleMobileMenu}
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                    >
                      <X className="w-5 h-5" style={{ color: 'var(--muted)' }} />
                    </Button>
                  </div>

                  {user && (
                    <Link
                      to={createPageUrl("Profile")}
                      onClick={() => {
                        haptics.light();
                        setShowMobileMenu(false);
                      }}
                      className="flex items-center gap-3 p-3 rounded-lg transition-all hover:bg-white/[0.02]"
                      style={{ background: 'rgba(255,255,255,.04)' }}
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center flex-shrink-0">
                        {user.profile_picture ? (
                          <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-6 h-6" style={{ color: 'var(--muted)' }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate" style={{ color: 'var(--txt)' }}>
                          {user.full_name}
                        </p>
                        <p className="text-sm truncate" style={{ color: 'var(--muted)' }}>
                          {user.job_title || t('default_job_title')}
                        </p>
                      </div>
                    </Link>
                  )}
                </div>

                <div className="p-4 space-y-2">
                  {/* Replaced WhatsApp button with SYNC Chat Link */}
                  <Link
                    to={createPageUrl("Chat")}
                    onClick={(e) => {
                      setShowMobileMenu(false); // Close mobile menu after clicking
                      handleChatClick(e); // Use the new handler
                    }}
                    className="w-full flex items-center gap-3 p-4 rounded-lg transition-all"
                    style={{
                      background: 'rgba(239, 68, 68, .08)', // Accent red background
                      border: '1px solid rgba(239, 68, 68, .25)' // Accent red border
                    }}
                  >
                    <Sparkles className="w-5 h-5" style={{ color: 'var(--accent)' }} /> {/* SYNC icon */}
                    <span className="font-medium" style={{ color: 'var(--accent)' }}>
                      {t('SYNC')}
                    </span>
                  </Link>

                  <Link
                    to={createPageUrl("OrganizationSettings")}
                    onClick={() => {
                      haptics.light();
                      setShowMobileMenu(false);
                    }}
                    className="flex items-center gap-3 p-4 rounded-lg transition-all"
                    style={{
                      background: 'rgba(255,255,255,.04)',
                      border: '1px solid rgba(255,255,255,.08)'
                    }}
                  >
                    <IconWrapper icon={Building2} size={20} variant="default" glow={true} />
                    <span className="font-medium" style={{ color: 'var(--txt)' }}>{t('nav_organization')}</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileMenu(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-3 p-4 rounded-lg transition-all"
                    style={{
                      background: 'rgba(239,68,68,.08)',
                      border: '1px solid rgba(239,68,68,.25)'
                    }}
                  >
                    <IconWrapper icon={LogOut} size={20} variant="accent" glow={true} />
                    <span className="font-medium" style={{ color: '#FCA5A5' }}>{t('nav_logout')}</span>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div style={{ paddingTop: '60px' }}>
          {children}
        </div>

        {currentPageName !== 'Chat' && (
          <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-inset-bottom" style={{
            background: 'var(--surface)',
            borderTop: '1px solid rgba(255,255,255,.06)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)'
          }}>
            <div className="flex items-center justify-around px-2 py-2">
              {navigationItems.filter(item => item.group === "discovery").map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    onClick={() => haptics.light()}
                    className="flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-all"
                    style={{
                      background: isActive ? 'rgba(239, 68, 68, .08)' : 'transparent',
                      color: isActive ? 'var(--accent)' : 'var(--muted)'
                    }}
                  >
                    {item.useSyncAvatar ? (
                      <SyncAvatar size={20} variant={isActive ? "default" : "grey"} />
                    ) : (
                      <IconWrapper
                        icon={item.icon}
                        size={20}
                        variant={isActive ? "accent" : "default"}
                        glow={false}
                      />
                    )}
                    <span className="text-xs mt-1">{item.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop/Tablet layout with sidebar
  return (
    <div className="min-h-screen flex w-full" style={{ background: 'var(--bg)' }}>
      <style jsx>{`
        :root {
          --bg: #151A1F;
          --surface: #1A2026;
          --txt: #E9F0F1;
          --muted: #B5C0C4;
          --accent: #EF4444;
          --accent2: #DC2626;
        }

        body {
          background: var(--bg) !important;
          color: var(--txt) !important;
        }

        .sidebar-toggle {
          position: fixed;
          left: 0px;
          top: 65%;
          transform: translateY(-50%);
          z-index: 55;
          width: 12px;
          height: 80px;
          background: linear-gradient(135deg, rgba(239,68,68,.15), rgba(220,38,38,.12));
          border: 1px solid rgba(239,68,68,.3);
          border-left: none;
          border-radius: 0 12px 12px 0;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all .2s ease;
          box-shadow: 2px 0 12px rgba(239,68,68,.2);
        }
        .sidebar-toggle:hover {
          width: 16px;
          background: linear-gradient(135deg, rgba(239,68,68,.25), rgba(220,38,38,.2));
          border-color: rgba(239,68,68,.4);
          box-shadow: 3px 0 16px rgba(239,68,68,.3);
        }
        .sidebar-toggle-icon {
          color: #EF4444;
          filter: drop-shadow(0 0 4px rgba(239,68,68,.4));
        }

        .glass-card {
          background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.015)), rgba(26,32,38,.35);
          border: 1px solid rgba(255,255,255,.06);
          box-shadow: 0 4px 12px rgba(0,0,0,.15), inset 0 1px 0 rgba(255,255,255,.04);
          backdrop-filter: blur(8px);
          border-radius: 16px;
        }

        .btn-primary {
          background: rgba(239,68,68,.08) !important;
          color: #FFCCCB !important;
          border: 1px solid rgba(239,68,68,.25) !important;
          border-radius: 12px !important;
          transition: all .2s ease !important;
        }

        .btn-primary:hover {
          background: rgba(239,68,68,.12) !important;
          transform: translateY(-0.5px) !important;
          border-color: rgba(239,68,68,.35) !important;
          color: #E9F0F1 !important;
          box-shadow: 0 2px 8px rgba(239,68,68,.15) !important;
        }

        .btn-outline {
          background: transparent !important;
          color: var(--muted) !important;
          border: 1px solid rgba(255,255,255,.08) !important;
          border-radius: 12px !important;
        }
        .btn-outline:hover {
          background: rgba(255,255,255,.03) !important;
          color: var(--txt) !important;
        }

        main input,
        main textarea,
        main select,
        main [role="combobox"],
        main .select-trigger,
        .glass-card input,
        .glass-card textarea,
        .glass-card select {
          background: transparent !important;
          color: var(--txt) !important;
          border-color: rgba(255,255,255,.08) !important;
        }
        main input::placeholder,
        main textarea::placeholder {
          color: var(--muted) !important;
        }
        main .hover\\:bg-gray-800\\/50:hover {
          background: rgba(255,255,255,.03) !important;
        }

        .glass-card .popover,
        .glass-card .dropdown-menu,
        [role="menu"],
        .radix-themes {
          background: rgba(26,32,38,.9) !important;
          border-color: rgba(255,255,255,.04) !important;
          color: var(--txt) !important;
        }

        .glass-card table thead,
        main table thead {
          background: linear-gradient(180deg, rgba(239,68,68,0.08), rgba(239,68,68,0.04)) !important;
          backdrop-filter: blur(4px);
          border-bottom: 1px solid rgba(239,68,68,0.15) !important;
          border-top-left-radius: 12px;
          border-top-right-radius: 12px;
          overflow: hidden;
        }
        .glass-card table thead th,
        main table thead th {
          color: var(--txt) !important;
        }

        main .shadow-sm,
        main .rounded-lg.border {
          background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.015)), rgba(26,32,38,.35) !important;
          border: 1px solid rgba(255,255,255,.06) !important;
          box-shadow: 0 4px 12px rgba(0,0,0,.15), inset 0 1px 0 rgba(255,255,255,.04) !important;
          backdrop-filter: blur(8px) !important;
          border-radius: 16px !important;
        }

        .badge,
        .badge-variant-outline {
          border-color: rgba(255,255,255,.08) !important;
          background: rgba(255,255,255,.025) !important;
          color: var(--txt) !important;
        }

        .glass-divider,
        main .border-t,
        main .border-b {
          border-color: rgba(255,255,255,.04) !important;
        }

        .switch-accent span {
          background-color: var(--accent) !important;
        }
        .switch-accent:disabled span {
          opacity: 0.5;
        }

        html {
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.05) transparent;
        }
        *::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        *::-webkit-scrollbar-track {
          background: transparent;
        }
        *::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.04);
          border-radius: 8px;
          border: 1px solid transparent;
          background-clip: padding-box;
        }
        *::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.08);
        }
        *::-webkit-scrollbar-corner {
          background: transparent;
        }
      `}</style>

      {/* Fixed minimal sidebar */}
      <div
        className="fixed top-0 left-0 h-full z-50"
        style={{
          width: '80px',
          background: 'var(--surface)',
          borderRight: '1px solid rgba(255,255,255,.06)',
        }}
      >
        <div className="flex flex-col h-full justify-between">
          <div className="flex-shrink-0">
            <div className="border-b p-4 h-20 flex items-center justify-center" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
              {!logoError ? (
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d43cf2c324ccd03de6bce5/9821df82f_isyncsotalentredtransparantlogo.png"
                  alt="TALENT logo"
                  className="w-10 h-10 object-contain"
                  style={{ background: 'transparent' }}
                  onError={() => setLogoError(true)}
                />
              ) : (
                <FallbackLogo size={40} />
              )}
            </div>

            <div className="p-3 mt-4">
              <div className="h-5 mb-2" />
              {groupedNavItems.discovery.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    onClick={() => haptics.light()}
                    className={`nav-item relative transition-all duration-200 rounded-lg mb-1 flex items-center h-12 group ${isActive ? 'active' : ''}`}
                    style={{
                      background: isActive ? 'rgba(239, 68, 68, .08)' : 'transparent',
                      color: isActive ? 'var(--accent)' : 'var(--muted)'
                    }}
                    title={item.title}
                  >
                    <div className="w-full flex-shrink-0 flex items-center justify-center">
                      {item.useSyncAvatar ? (
                        <SyncAvatar size={28} variant={isActive ? "default" : "grey"} />
                      ) : (
                        <IconWrapper
                          icon={item.icon}
                          size={22}
                          variant={isActive ? "accent" : "default"}
                          glow={true}
                        />
                      )}
                    </div>
                    {isActive && (
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          height: '60%',
                          width: '3px',
                          borderRadius: '3px',
                          background: '#EF4444',
                          boxShadow: '0 0 8px rgba(239,68,68,.3)'
                        }}
                      />
                    )}
                  </Link>
                );
              })}

              <div className="my-4 border-t" style={{ borderColor: 'rgba(255,255,255,.04)' }} />

              <div className="h-5 mb-2" />
              {groupedNavItems.pipeline.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    onClick={() => haptics.light()}
                    className={`nav-item relative transition-all duration-200 rounded-lg mb-1 flex items-center h-12 group ${isActive ? 'active' : ''}`}
                    style={{
                      background: isActive ? 'rgba(239, 68, 68, .08)' : 'transparent',
                      color: isActive ? 'var(--accent)' : 'var(--muted)'
                    }}
                    title={item.title}
                  >
                    <div className="w-full flex-shrink-0 flex items-center justify-center">
                      <IconWrapper
                        icon={item.icon}
                        size={22}
                        variant={isActive ? "accent" : "default"}
                        glow={true}
                      />
                    </div>
                    {isActive && (
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          height: '60%',
                          width: '3px',
                          borderRadius: '3px',
                          background: '#EF4444',
                          boxShadow: '0 0 8px rgba(239,68,68,.3)'
                        }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex-shrink-0">
            <div className="p-3">
              {/* Replaced WhatsApp button with SYNC Chat Link */}
              <Link
                to={createPageUrl("Chat")}
                onClick={handleChatClick}
                className="nav-item relative transition-all duration-200 rounded-lg mb-1 flex items-center h-12 group w-full"
                style={{
                  background: 'rgba(239, 68, 68, .08)',
                  border: '1px solid rgba(239, 68, 68, .25)'
                }}
                title={t('SYNC')}
              >
                <div className="w-full flex-shrink-0 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                </div>
              </Link>

              <Link
                to={createPageUrl("OrganizationSettings")}
                onClick={() => haptics.light()}
                className={`nav-item relative transition-all duration-200 rounded-lg mb-1 flex items-center h-12 group ${location.pathname === createPageUrl("OrganizationSettings") ? 'active' : ''}`}
                style={{
                  background: location.pathname === createPageUrl("OrganizationSettings") ? "rgba(239, 68, 68, .08)" : "transparent",
                  color: location.pathname === createPageUrl("OrganizationSettings") ? "var(--accent)" : "var(--muted)"
                }}
                title={t('nav_organization')}
              >
                <div className="w-full h-full flex-shrink-0 flex items-center justify-center">
                  <IconWrapper
                    icon={Building2}
                    size={22}
                    variant={location.pathname === createPageUrl("OrganizationSettings") ? "accent" : "default"}
                    glow={true}
                  />
                </div>
                {location.pathname === createPageUrl("OrganizationSettings") && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      height: '60%',
                      width: '3px',
                      borderRadius: '3px',
                      background: '#EF4444',
                      boxShadow: '0 0 8px rgba(239,68,68,.3)'
                    }}
                  />
                )}
              </Link>
            </div>

            <div className="border-t p-3" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
              {user && (
                <Link
                  to={createPageUrl("Profile")}
                  onClick={() => haptics.light()}
                  className="flex justify-center p-2 h-14 items-center rounded-lg transition-all hover:bg-white/[0.02]"
                  title={user.full_name}
                >
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                    {user.profile_picture ? (
                      <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                    )}
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toggle button for expanded sidebar */}
      <AnimatePresence mode="wait">
        {!sidebarExpanded && (
          <motion.button
            key="collapsed-toggle"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              haptics.light();
              setSidebarExpanded(true);
            }}
            className="sidebar-toggle"
          >
            <ChevronRight className="w-4 h-4 sidebar-toggle-icon" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Expanded sidebar overlay */}
      <AnimatePresence>
        {sidebarExpanded && (
          <motion.div
            initial={{ x: -256, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -256, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 left-20 h-full z-40"
            style={{
              width: '176px',
              background: 'var(--surface)',
              borderRight: '1px solid rgba(255,255,255,.06)',
            }}
          >
            <div className="flex flex-col h-full justify-between">
              <div className="flex-shrink-0">
                <div className="border-b p-4 h-20 flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
                  <h2 className="text-xl font-bold" style={{ color: 'var(--txt)' }}>TALENT</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      haptics.light();
                      setSidebarExpanded(false);
                    }}
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="w-5 h-5" style={{ color: 'var(--muted)' }} />
                  </Button>
                </div>

                <div className="p-3 mt-4">
                  <div className="text-xs font-semibold uppercase tracking-wider mb-2 px-3 h-5" style={{ color: 'var(--muted)', opacity: 0.5 }}>
                    {t('group_discovery')}
                  </div>
                  {groupedNavItems.discovery.map((item) => {
                    const isActive = location.pathname === item.url;
                    return (
                      <Link
                        key={item.title}
                        to={item.url}
                        onClick={() => {
                          haptics.light();
                          setSidebarExpanded(false);
                        }}
                        className={`nav-item relative transition-all duration-200 rounded-lg mb-1 flex items-center h-12 group px-3 ${isActive ? 'active' : ''}`}
                        style={{
                          background: isActive ? 'rgba(239, 68, 68, .08)' : 'transparent',
                          color: isActive ? 'var(--accent)' : 'var(--muted)'
                        }}
                      >
                        <span className="font-semibold text-sm">
                          {item.title}
                        </span>
                        {isActive && (
                          <div
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              height: '60%',
                              width: '3px',
                              borderRadius: '3px',
                              background: '#EF4444',
                              boxShadow: '0 0 8px rgba(239,68,68,.3)'
                            }}
                          />
                        )}
                      </Link>
                    );
                  })}

                  <div className="my-4 border-t" style={{ borderColor: 'rgba(255,255,255,.04)' }} />

                  <div className="text-xs font-semibold uppercase tracking-wider mb-2 px-3 h-5" style={{ color: 'var(--muted)', opacity: 0.5 }}>
                    {t('group_pipeline')}
                  </div>
                  {groupedNavItems.pipeline.map((item) => {
                    const isActive = location.pathname === item.url;
                    return (
                      <Link
                        key={item.title}
                        to={item.url}
                        onClick={() => {
                          haptics.light();
                          setSidebarExpanded(false);
                        }}
                        className={`nav-item relative transition-all duration-200 rounded-lg mb-1 flex items-center h-12 group px-3 ${isActive ? 'active' : ''}`}
                        style={{
                          background: isActive ? 'rgba(239, 68, 68, .08)' : 'transparent',
                          color: isActive ? 'var(--accent)' : 'var(--muted)'
                        }}
                      >
                        <span className="font-semibold text-sm">
                          {item.title}
                        </span>
                        {isActive && (
                          <div
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              height: '60%',
                              width: '3px',
                              borderRadius: '3px',
                              background: '#EF4444',
                              boxShadow: '0 0 8px rgba(239,68,68,.3)'
                            }}
                          />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="flex-shrink-0">
                <div className="p-3">
                  {/* Replaced WhatsApp button with SYNC Chat Link */}
                  <Link
                    to={createPageUrl("Chat")}
                    onClick={(e) => {
                      setSidebarExpanded(false); // Close sidebar after clicking
                      handleChatClick(e); // Use the new handler
                    }}
                    className="nav-item relative transition-all duration-200 rounded-lg mb-1 flex items-center h-12 group px-3 gap-2 w-full"
                    style={{
                      background: 'rgba(239, 68, 68, .08)',
                      border: '1px solid rgba(239, 68, 68, .25)',
                      color: 'var(--accent)'
                    }}
                  >
                    <Sparkles className="w-4 h-4 flex-shrink-0" /> {/* SYNC icon */}
                    <span className="font-semibold text-sm">
                      {t('SYNC')}
                    </span>
                  </Link>

                  <Link
                    to={createPageUrl("OrganizationSettings")}
                    onClick={() => {
                      haptics.light();
                      setSidebarExpanded(false);
                    }}
                    className={`nav-item relative transition-all duration-200 rounded-lg mb-1 flex items-center h-12 group px-3 ${location.pathname === createPageUrl("OrganizationSettings") ? 'active' : ''}`}
                    style={{
                      background: location.pathname === createPageUrl("OrganizationSettings") ? "rgba(239, 68, 68, .08)" : "transparent",
                      color: location.pathname === createPageUrl("OrganizationSettings") ? "var(--accent)" : "var(--muted)"
                    }}
                  >
                    <span className="font-semibold text-sm">{t('nav_organization')}</span>
                  </Link>
                </div>

                <div className="border-t p-3" style={{ borderColor: 'rgba(255,255,255,.06)' }}>
                  {user && (
                    <Link
                      to={createPageUrl("Profile")}
                      onClick={() => {
                        haptics.light();
                        setSidebarExpanded(false);
                      }}
                      className="flex items-center gap-3 p-2 rounded-lg h-14 transition-all hover:bg-white/[0.02]"
                    >
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center flex-shrink-0">
                        {user.profile_picture ? (
                          <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: 'var(--txt)' }}>
                          {user.full_name}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                          {user.job_title || t('default_job_title')}
                        </p>
                      </div>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col transition-all duration-300 ease-in-out" style={{ marginLeft: '80px' }}>
        <div className="flex-1 overflow-auto" style={{ background: 'var(--bg)' }}>
          {children}
        </div>
      </main>
    </div>
  );
}

