// ---------------------------------------------------------------------------
// StoreBuilder.jsx -- B2B Store Builder with AI chat
//
// Preview mode:  Chat (320px) | Content (full width)
// Settings mode: Chat (320px) | Nav (220px) | Content
// ---------------------------------------------------------------------------

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ArrowUp,
  Loader2,
  Monitor,
  Search,
  Eye,
  ChevronRight,
  ChevronDown,
  Save,
  Globe,
  Check,
  Undo2,
  Redo2,
  Smartphone,
  Tablet,
  ArrowLeft,
  Settings,
  Image as ImageIcon,
  Paperclip,
  FileText,
  ShoppingBag,
  Code,
  X,
  Crosshair,
  RefreshCw,
} from 'lucide-react';

import BuilderCanvas from './BuilderCanvas';
import CodeViewer from './CodeViewer';
import BuildPlan from './BuildPlan';
import VersionHistory from './VersionHistory';

import { useStoreBuilder } from './hooks/useStoreBuilder';
import { useBuilderHistory } from './hooks/useBuilderHistory';
import { useBuilderPreview } from './hooks/useBuilderPreview';
import { useBuilderAI } from './hooks/useBuilderAI';

// ---------------------------------------------------------------------------
// Deep merge for partial AI config patches
// ---------------------------------------------------------------------------

function deepMerge(target, source) {
  if (!source || typeof source !== 'object') return target;
  if (!target || typeof target !== 'object') return source;
  if (Array.isArray(source)) return source; // Arrays are replaced, not merged

  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Time helper
// ---------------------------------------------------------------------------

function timeAgo(date) {
  if (!date) return '';
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ---------------------------------------------------------------------------
// Chat Components
// ---------------------------------------------------------------------------

function TypingDots() {
  return (
    <div className="flex items-start gap-2 px-4 pb-3">
      <div className="w-6 h-6 rounded-full bg-cyan-500/15 flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles className="w-3 h-3 text-cyan-400" />
      </div>
      <div className="bg-zinc-800/60 rounded-2xl rounded-tl-md px-3.5 py-2.5">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="block w-1.5 h-1.5 rounded-full bg-zinc-400"
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.12 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Bubble({ message, onShowChanges }) {
  const isUser = message.role === 'user';

  // Streaming state: show explanation text + "Building..." indicator when JSON is being written
  if (message.building && message.streaming) {
    const isBuilding = message.buildPhase === 'building';
    return (
      <div className="flex items-start gap-2 px-4 pb-2.5">
        <div className="w-6 h-6 rounded-full bg-cyan-500/15 flex items-center justify-center shrink-0 mt-0.5">
          <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
        </div>
        <div className="max-w-[88%] flex flex-col gap-1.5">
          {/* Streaming explanation text */}
          {message.content ? (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-800/60 rounded-2xl rounded-tl-md px-3 py-2 text-[13px] leading-relaxed text-zinc-300 whitespace-pre-wrap break-words"
            >
              {message.content}
              {!isBuilding && (
                <motion.span
                  className="inline-block w-1 h-3 ml-0.5 bg-cyan-400/60 rounded-sm align-middle"
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                />
              )}
            </motion.div>
          ) : (
            <div className="bg-zinc-800/60 rounded-2xl rounded-tl-md px-3 py-2.5 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              <span className="text-[12px] text-zinc-400">Thinking...</span>
            </div>
          )}
          {/* Building indicator once JSON config is being generated */}
          {isBuilding && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-cyan-500/5 border border-cyan-500/15 rounded-xl px-3 py-2 flex items-center gap-2.5"
            >
              <div className="relative w-4 h-4 shrink-0">
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin absolute" />
              </div>
              <span className="text-[12px] text-cyan-400 font-medium">Building your changes...</span>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} px-4 pb-2.5`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-cyan-500/15 flex items-center justify-center shrink-0 mt-0.5 mr-2">
          <Sparkles className="w-3 h-3 text-cyan-400" />
        </div>
      )}
      <div className={`max-w-[88%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap break-words ${
            isUser
              ? 'bg-cyan-500/15 text-white rounded-2xl rounded-tr-md'
              : 'bg-zinc-800/60 text-zinc-300 rounded-2xl rounded-tl-md'
          }`}
        >
          {message.content}
        </div>
        <div className="flex items-center gap-2 mt-1 px-1">
          {message.timestamp && !message.streaming && (
            <span className="text-[10px] text-zinc-600 select-none">{timeAgo(message.timestamp)}</span>
          )}
          {message.hasChanges && !message.streaming && onShowChanges && (
            <button
              onClick={() => onShowChanges(message._id)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/15 hover:border-cyan-500/30 transition-colors"
            >
              <Code className="w-3 h-3" />
              Show changes
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Nav Sidebar with categories
// ---------------------------------------------------------------------------

const NAV_SECTIONS = [
  {
    label: 'Settings',
    items: [
      { key: 'store-settings', icon: Settings, label: 'Store Config' },
      { key: 'domain', icon: Globe, label: 'Domain' },
      { key: 'code', icon: Code, label: 'Code' },
    ],
  },
];

function NavSidebar({ activeView, onChangeView }) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState({});

  const allItems = NAV_SECTIONS.flatMap((s) => s.items);
  const filtered = search
    ? allItems.filter((n) => n.label.toLowerCase().includes(search.toLowerCase()))
    : null;

  const toggleCollapse = (label) => {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const renderNavButton = ({ key, icon: Icon, label }) => {
    const isActive = activeView === key;
    return (
      <button
        key={key}
        onClick={() => onChangeView(key)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors mb-0.5 ${
          isActive
            ? 'bg-cyan-500/10 text-cyan-400'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
        }`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-left truncate">{label}</span>
      </button>
    );
  };

  return (
    <div className="w-[220px] flex-shrink-0 bg-zinc-950 border-r border-zinc-800/60 flex flex-col h-full">
      {/* Search */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full bg-zinc-900 border border-zinc-800/60 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
          />
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {filtered ? (
          // Search mode: flat list
          filtered.map(renderNavButton)
        ) : (
          // Normal mode: grouped with headers
          NAV_SECTIONS.map((section, sIdx) => {
            const isCollapsed = section.collapsible && collapsed[section.label];

            return (
              <div key={sIdx} className={sIdx > 0 ? 'mt-3' : ''}>
                {section.label && (
                  <div
                    className={`flex items-center gap-1 px-3 mb-1 ${section.collapsible ? 'cursor-pointer hover:text-zinc-300' : ''}`}
                    onClick={section.collapsible ? () => toggleCollapse(section.label) : undefined}
                  >
                    {section.collapsible && (
                      <ChevronRight className={`w-3 h-3 text-zinc-600 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} />
                    )}
                    <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium select-none">
                      {section.label}
                    </span>
                  </div>
                )}
                {!isCollapsed && section.items.map(renderNavButton)}
              </div>
            );
          })
        )}
      </nav>
    </div>
  );
}

// (Section picker is now click-to-select in the preview iframe — no dropdown needed)

// ---------------------------------------------------------------------------
// Settings Pages (Design)
// ---------------------------------------------------------------------------

function PageHeader({ title, description }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {description && <p className="text-sm text-zinc-500 mt-1">{description}</p>}
    </div>
  );
}

function SettingsCard({ title, children }) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-5 mb-4">
      {title && <h3 className="text-sm font-medium text-zinc-300 mb-4">{title}</h3>}
      {children}
    </div>
  );
}


function TextInput({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <label className="block">
      <span className="text-xs text-zinc-500 mb-1.5 block">{label}</span>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
      />
    </label>
  );
}

function SelectInput({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="text-xs text-zinc-500 mb-1.5 block">{label}</span>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
      >
        {options.map(({ value: v, label: l }) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  );
}

function ToggleInput({ label, description, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <span className="text-sm text-zinc-300 block">{label}</span>
        {description && <span className="text-[11px] text-zinc-600 block mt-0.5">{description}</span>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${value ? 'bg-cyan-500' : 'bg-zinc-700'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${value ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}


// -- Store Settings Page --

function StoreSettingsPage({ config, onUpdateConfig }) {
  const settings = config?.storeSettings || {};

  const update = (field, value) => {
    onUpdateConfig({
      ...config,
      storeSettings: { ...settings, [field]: value },
    });
  };

  return (
    <div>
      <PageHeader title="Store Configuration" description="Control how your B2B store operates." />

      <SettingsCard title="Visibility & Access">
        <div className="space-y-5">
          <SelectInput
            label="Catalog Visibility"
            value={settings.catalog_visibility || 'all'}
            onChange={(v) => update('catalog_visibility', v)}
            options={[
              { value: 'all', label: 'Public - Anyone can browse' },
              { value: 'authenticated', label: 'Authenticated - Login required' },
            ]}
          />
          <ToggleInput
            label="Order Approval Required"
            description="New orders need manual approval before processing."
            value={settings.order_requires_approval ?? false}
            onChange={(v) => update('order_requires_approval', v)}
          />
          <ToggleInput
            label="Enable Pre-orders"
            description="Allow customers to order out-of-stock products."
            value={settings.enable_preorders ?? false}
            onChange={(v) => update('enable_preorders', v)}
          />
          <ToggleInput
            label="Enable Inquiries"
            description="Let customers send product inquiries."
            value={settings.enable_inquiries ?? true}
            onChange={(v) => update('enable_inquiries', v)}
          />
          <ToggleInput
            label="Enable Chat"
            description="Live chat widget on your storefront."
            value={settings.enable_chat ?? false}
            onChange={(v) => update('enable_chat', v)}
          />
        </div>
      </SettingsCard>

      <SettingsCard title="Orders & Pricing">
        <div className="space-y-4">
          <TextInput
            label="Minimum Order Amount"
            value={settings.min_order_amount}
            onChange={(v) => update('min_order_amount', v)}
            placeholder="0"
            type="number"
          />
          <SelectInput
            label="Default Currency"
            value={settings.default_currency || 'EUR'}
            onChange={(v) => update('default_currency', v)}
            options={[
              { value: 'EUR', label: 'EUR - Euro' },
              { value: 'USD', label: 'USD - US Dollar' },
              { value: 'GBP', label: 'GBP - British Pound' },
            ]}
          />
        </div>
      </SettingsCard>
    </div>
  );
}

// -- Domain Page --

function DomainPage({ config, onUpdateConfig }) {
  const settings = config?.storeSettings || {};

  const update = (field, value) => {
    onUpdateConfig({
      ...config,
      storeSettings: { ...settings, [field]: value },
    });
  };

  return (
    <div>
      <PageHeader title="Domain" description="Configure your store's web address." />

      <SettingsCard title="Subdomain">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={settings.store_subdomain || ''}
              onChange={(e) => update('store_subdomain', e.target.value)}
              placeholder="your-store"
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
            />
            <span className="text-sm text-zinc-500 shrink-0">.isyncso.com</span>
          </div>
          <p className="text-[11px] text-zinc-600">Your store will be accessible at this subdomain.</p>
        </div>
      </SettingsCard>

      <SettingsCard title="Custom Domain">
        <div className="space-y-4">
          <TextInput
            label="Domain Name"
            value={settings.custom_domain}
            onChange={(v) => update('custom_domain', v)}
            placeholder="store.yourcompany.com"
          />
          {settings.custom_domain && (
            <div className="bg-zinc-950 border border-zinc-800/60 rounded-lg p-3">
              <p className="text-xs text-zinc-500 mb-2">DNS Configuration</p>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-600 w-12">Type:</span>
                  <span className="text-zinc-300 font-mono">CNAME</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-600 w-12">Host:</span>
                  <span className="text-zinc-300 font-mono">{settings.custom_domain?.split('.')[0] || 'store'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-600 w-12">Value:</span>
                  <span className="text-zinc-300 font-mono">cname.isyncso.com</span>
                </div>
              </div>
              {settings.custom_domain_verified ? (
                <div className="flex items-center gap-1.5 mt-3 text-xs text-cyan-400">
                  <Check className="w-3.5 h-3.5" />
                  Domain verified
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mt-3 text-xs text-zinc-500">
                  <Loader2 className="w-3.5 h-3.5" />
                  Awaiting DNS verification
                </div>
              )}
            </div>
          )}
        </div>
      </SettingsCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Store Pages
// ---------------------------------------------------------------------------

const STORE_PAGES = [
  { id: 'home', label: 'Homepage', icon: Globe },
  { id: 'catalog', label: 'Catalog', icon: ShoppingBag },
  { id: 'product', label: 'Product Detail', icon: FileText },
];

// ---------------------------------------------------------------------------
// Page Navigation Dropdown
// ---------------------------------------------------------------------------

function PageNavigationDropdown({ currentPage = 'home', onNavigate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const current = STORE_PAGES.find((p) => p.id === currentPage) || STORE_PAGES[0];

  const handleSelect = (pageId) => {
    setOpen(false);
    onNavigate?.(pageId);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors border border-zinc-800/60"
      >
        <current.icon className="w-3 h-3" />
        <span className="max-w-[100px] truncate">{current.label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-full mt-1.5 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50 min-w-[180px] py-1"
          >
            {STORE_PAGES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleSelect(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors ${
                  currentPage === id
                    ? 'bg-cyan-500/10 text-cyan-400'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

const DEVICES = [
  { key: 'desktop', icon: Monitor, label: 'Desktop' },
  { key: 'tablet', icon: Tablet, label: 'Tablet' },
  { key: 'mobile', icon: Smartphone, label: 'Mobile' },
];

function Toolbar({ onBack, storeName, isDirty, saving, onSave, onPublish, isPublished, storeUrl, onViewStore, canUndo, canRedo, onUndo, onRedo, previewDevice, onDeviceChange, isPreviewMode, onToggleMode, currentPage, onNavigateToPage, onRefresh }) {
  return (
    <div className="h-12 border-b border-zinc-800/60 bg-zinc-950 flex items-center px-3 shrink-0 gap-2">
      {/* Left */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-zinc-400 hover:text-white rounded-lg px-2 py-1 hover:bg-zinc-800/60 text-sm transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
        <span className="hidden sm:inline text-xs">Back</span>
      </button>
      <div className="hidden sm:block w-px h-4 bg-zinc-800" />
      <span className="text-xs font-medium text-white truncate max-w-[160px]">{storeName}</span>
      {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" title="Unsaved changes" />}

      {/* Mode toggle */}
      <div className="hidden sm:block w-px h-4 bg-zinc-800 ml-1" />
      <div className="flex items-center gap-0.5 bg-zinc-900 rounded-lg p-0.5">
        <button
          onClick={() => onToggleMode(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            isPreviewMode ? 'bg-zinc-800 text-cyan-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          Preview
        </button>
        <button
          onClick={() => onToggleMode(false)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            !isPreviewMode ? 'bg-zinc-800 text-cyan-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          Settings
        </button>
      </div>

      {/* Page navigator */}
      {isPreviewMode && (
        <>
          <div className="hidden sm:block w-px h-4 bg-zinc-800 ml-1" />
          <PageNavigationDropdown currentPage={currentPage} onNavigate={onNavigateToPage} />
        </>
      )}

      <div className="flex-1" />

      {/* Center: undo/redo + device (only in preview) */}
      <div className="flex items-center gap-0.5">
        <button onClick={onUndo} disabled={!canUndo} className={`p-1.5 rounded-lg transition-colors ${canUndo ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-700 cursor-not-allowed'}`}>
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={onRedo} disabled={!canRedo} className={`p-1.5 rounded-lg transition-colors ${canRedo ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-700 cursor-not-allowed'}`}>
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        {isPreviewMode && (
          <>
            <div className="w-px h-4 bg-zinc-800 mx-1" />
            <div className="flex items-center gap-0.5 bg-zinc-900 rounded-lg p-0.5">
              {DEVICES.map(({ key, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => onDeviceChange?.(key)}
                  className={`p-1.5 rounded-md transition-colors ${previewDevice === key ? 'bg-zinc-800 text-cyan-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Refresh preview"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      <div className="flex-1" />

      {/* Right: save + publish + view */}
      <div className="flex items-center gap-1.5">
        {/* Published URL pill */}
        {isPublished && storeUrl && (
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-zinc-400 hover:text-cyan-400 bg-zinc-800/60 border border-zinc-800 hover:border-cyan-500/30 transition-colors font-mono truncate max-w-[200px]"
            title={storeUrl}
          >
            <Globe className="w-3 h-3 shrink-0" />
            {storeUrl.replace('https://', '')}
          </a>
        )}

        {/* Eye icon — quick nav to published store */}
        {isPublished && onViewStore && (
          <button
            onClick={onViewStore}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800/60 transition-colors"
            title="View published store"
          >
            <Eye className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 text-white hover:bg-zinc-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save
        </button>

        {isPublished ? (
          <button
            onClick={onPublish}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600/15 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-600/25 rounded-lg text-xs font-medium transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Published
          </button>
        ) : (
          <button
            onClick={onPublish}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 text-white hover:bg-cyan-500 rounded-lg text-xs font-medium transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            Publish
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main StoreBuilder
// ---------------------------------------------------------------------------

export default function StoreBuilder({ organizationId, storeName, onBack }) {
  const builder = useStoreBuilder(organizationId);
  const history = useBuilderHistory(builder.config, builder.updateConfig, {
    initialEntries: builder.versionHistory,
    onSave: builder.saveVersionHistory,
  });
  const preview = useBuilderPreview();
  const ai = useBuilderAI(builder.chatHistory);

  const [activeView, setActiveView] = useState('preview');
  const [lastSettingsView, setLastSettingsView] = useState('store-settings');
  const [currentPage, setCurrentPage] = useState('home');
  const [saveError, setSaveError] = useState(null);
  const [chatValue, setChatValue] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [pickerActive, setPickerActive] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null); // { id, type, label }
  const messagesEndRef = useRef(null);
  const chatInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const isPreviewMode = activeView === 'preview';

  // Toggle between preview and settings mode
  const handleToggleMode = useCallback((wantPreview) => {
    if (wantPreview) {
      setActiveView('preview');
    } else {
      setActiveView(lastSettingsView);
    }
  }, [lastSettingsView]);

  // When navigating within settings, remember last view
  const handleChangeView = useCallback((key) => {
    setActiveView(key);
    if (key !== 'preview') setLastSettingsView(key);
  }, []);

  const canSend = (chatValue.trim().length > 0 || attachments.length > 0) && !ai.isProcessing;

  // Page navigation — tell preview iframe to switch page view
  const handleNavigateToPage = useCallback((pageId) => {
    setCurrentPage(pageId);
    preview.navigateToPage(pageId);
  }, [preview.navigateToPage]);

  // Sync config to preview
  const prevConfigRef = useRef(null);
  useEffect(() => {
    if (builder.config && builder.config !== prevConfigRef.current) {
      prevConfigRef.current = builder.config;
      preview.sendConfigToPreview(builder.config, organizationId);
    }
  }, [builder.config, preview.sendConfigToPreview, organizationId]);

  // Resend config when preview finishes loading (iframe may have missed initial send)
  const prevPreviewLoading = useRef(true);
  useEffect(() => {
    if (prevPreviewLoading.current && !preview.previewLoading && builder.config) {
      preview.sendConfigToPreview(builder.config, organizationId);
    }
    prevPreviewLoading.current = preview.previewLoading;
  }, [preview.previewLoading, builder.config, preview.sendConfigToPreview, organizationId]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ai.messages, ai.isProcessing]);

  // Focus input on mount
  useEffect(() => {
    const t = setTimeout(() => chatInputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      const m = e.metaKey || e.ctrlKey;
      if (m && e.key === 's') { e.preventDefault(); handleSave(); }
      else if (m && e.shiftKey && e.key === 'z') { e.preventDefault(); history.redo(); }
      else if (m && e.key === 'z') { e.preventDefault(); history.undo(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [history.undo, history.redo]);

  // Listen for section clicks from the preview iframe
  useEffect(() => {
    const handler = (e) => {
      const { sectionId, sectionType, sectionLabel } = e.detail;
      if (sectionId) {
        setSelectedSection({ id: sectionId, type: sectionType, label: sectionLabel });
        setPickerActive(false);
        chatInputRef.current?.focus();
      }
    };
    window.addEventListener('builder:section-click', handler);
    return () => window.removeEventListener('builder:section-click', handler);
  }, []);

  // Attachment handlers
  const handleAddFiles = useCallback((files) => {
    const newAttachments = Array.from(files).map((file) => ({
      id: Math.random().toString(36).slice(2, 10),
      file,
      name: file.name,
      type: file.type,
      size: file.size,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
  }, []);

  const handleRemoveAttachment = useCallback((id) => {
    setAttachments((prev) => {
      const item = prev.find((a) => a.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const handleImageSelect = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handlePickerToggle = useCallback(() => {
    setPickerActive((p) => !p);
    if (selectedSection) setSelectedSection(null);
  }, [selectedSection]);

  // Handlers
  const handleSave = useCallback(async () => {
    setSaveError(null);
    try { await builder.saveConfig(); }
    catch (err) { setSaveError(err.message || 'Failed to save.'); }
  }, [builder.saveConfig]);

  const handlePublish = useCallback(async () => {
    setSaveError(null);
    try {
      if (builder.isPublished) { await builder.unpublishStore(); }
      else { await builder.saveConfig(); await builder.publishStore(); }
    } catch (err) { console.error('Publish failed:', err); }
  }, [builder.isPublished, builder.saveConfig, builder.publishStore, builder.unpublishStore]);

  const handleUpdateConfig = useCallback((newConfig) => {
    history.pushState('Settings change');
    builder.updateConfig(newConfig);
  }, [history.pushState, builder.updateConfig]);

  const handleAIPrompt = useCallback(async (prompt) => {
    try {
      const ctx = { storeName: storeName || 'B2B Store', organizationId };
      const beforeLines = JSON.stringify(builder.config, null, 2).split('\n');
      const result = await ai.sendPrompt(prompt, builder.config, ctx);
      let applied = false;
      let newConfig = null;
      if (result?.updatedConfig) {
        history.pushState('AI: full config update');
        builder.updateConfig(result.updatedConfig);
        newConfig = result.updatedConfig;
        applied = true;
      } else if (result?.configPatch) {
        history.pushState('AI: config patch');
        const merged = deepMerge(builder.config, result.configPatch);
        builder.updateConfig(merged);
        newConfig = merged;
        applied = true;
      }
      // Mark the most recent assistant message with hasChanges + diff stats
      if (applied) {
        let diffStats = null;
        if (newConfig) {
          const afterLines = JSON.stringify(newConfig, null, 2).split('\n');
          const beforeSet = new Set(beforeLines);
          const afterSet = new Set(afterLines);
          const added = afterLines.filter((l) => !beforeSet.has(l)).length;
          const removed = beforeLines.filter((l) => !afterSet.has(l)).length;
          diffStats = { added, removed };
        }
        ai.markLastMessageWithChanges(diffStats);
        // Auto-refresh preview with the NEW config (builder.config is stale in this closure)
        preview.sendConfigToPreview(newConfig, organizationId);
      }
      // Persist chat history after each exchange
      try {
        const serialized = ai.getSerializableMessages();
        builder.saveChatHistory(serialized);
      } catch (_) { /* non-critical */ }
    } catch (err) { console.error('AI failed:', err); }
  }, [ai.sendPrompt, builder.config, builder.updateConfig, history.pushState, storeName, organizationId, ai.markLastMessageWithChanges, ai.getSerializableMessages, builder.saveChatHistory, preview.sendConfigToPreview]);

  // Handle "Show changes" button click — instantly switch to code view
  const handleShowChanges = useCallback(() => {
    setActiveView('code');
    setLastSettingsView('code');
  }, []);

  const handleSend = useCallback(async () => {
    const p = chatValue.trim();
    if ((!p && attachments.length === 0) || ai.isProcessing) return;
    const currentAttachments = [...attachments];
    const currentSection = selectedSection;
    setChatValue('');
    setAttachments([]);
    setSelectedSection(null);
    // Clean up previews
    currentAttachments.forEach((a) => { if (a.preview) URL.revokeObjectURL(a.preview); });
    // Build prompt with section target + attachment context
    let fullPrompt = p;
    if (currentSection) {
      const ref = `[Section: ${currentSection.type} "${currentSection.label}" (${currentSection.id})]`;
      fullPrompt = `${ref}\n${fullPrompt}`;
    }
    if (currentAttachments.length > 0) {
      const fileNames = currentAttachments.map((a) => a.name).join(', ');
      fullPrompt = fullPrompt ? `${fullPrompt}\n\n[Attached files: ${fileNames}]` : `[Attached files: ${fileNames}]`;
    }
    await handleAIPrompt(fullPrompt);
  }, [chatValue, attachments, selectedSection, ai.isProcessing, handleAIPrompt]);

  const handleChatKey = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  // Loading
  if (builder.loading) {
    return (
      <div className="flex flex-col h-screen bg-[#09090b] items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
        <p className="text-sm text-zinc-400">Loading store builder...</p>
      </div>
    );
  }

  // Content area render
  const renderContent = () => {
    switch (activeView) {
      // -- Preview --
      case 'preview':
        return (
          <BuilderCanvas
            config={builder.config}
            organizationId={organizationId}
            previewDevice={preview.previewDevice}
            iframeRef={preview.iframeRef}
            previewLoading={preview.previewLoading}
            onIframeLoad={preview.onIframeLoad}
          />
        );

      // -- Settings pages --
      case 'store-settings':
        return (
          <div className="flex-1 overflow-y-auto p-8 max-w-2xl">
            <StoreSettingsPage config={builder.config} onUpdateConfig={handleUpdateConfig} />
          </div>
        );
      case 'domain':
        return (
          <div className="flex-1 overflow-y-auto p-8 max-w-2xl">
            <DomainPage config={builder.config} onUpdateConfig={handleUpdateConfig} />
          </div>
        );

      case 'code':
        return (
          <div className="flex-1 overflow-hidden">
            <CodeViewer config={builder.config} />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#09090b] overflow-hidden">
      {/* Error banner */}
      {saveError && (
        <div className="flex items-center gap-3 px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs">
          <span className="flex-1">{saveError}</span>
          <button onClick={() => setSaveError(null)} className="text-red-400 hover:text-red-300 font-medium">Dismiss</button>
        </div>
      )}

      {/* Toolbar */}
      <Toolbar
        onBack={onBack}
        storeName={storeName || 'B2B Store'}
        isDirty={builder.isDirty}
        saving={builder.saving}
        onSave={handleSave}
        onPublish={handlePublish}
        isPublished={builder.isPublished}
        storeUrl={builder.storeSubdomain ? `https://${builder.storeSubdomain}.isyncso.com` : null}
        onViewStore={builder.isPublished ? () => window.open(`/store-preview/${organizationId}`, '_blank') : null}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={history.undo}
        onRedo={history.redo}
        previewDevice={preview.previewDevice}
        onDeviceChange={preview.setPreviewDevice}
        isPreviewMode={isPreviewMode}
        onToggleMode={handleToggleMode}
        currentPage={currentPage}
        onNavigateToPage={handleNavigateToPage}
        onRefresh={preview.refreshPreview}
      />

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Zone 1: AI Chat (left side) */}
        <div className="w-[320px] flex-shrink-0 flex flex-col bg-zinc-900 border-r border-zinc-800/60">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto py-3 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
            {ai.messages.length === 0 && !ai.isProcessing && (
              <div className="flex flex-col items-center px-5 pt-10 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-3">
                  <Sparkles className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">AI Store Builder</h3>
                <p className="text-[11px] text-zinc-500 text-center leading-relaxed mb-5 max-w-[240px]">
                  Describe what you want and I'll build it. Change colors, add sections, update text, and more.
                </p>
                <div className="w-full space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium px-1">Try asking</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ai.suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => !ai.isProcessing && handleAIPrompt(s)}
                        className="px-2.5 py-1 rounded-full text-[11px] text-zinc-400 border border-zinc-800 hover:border-cyan-500/30 hover:text-cyan-400 hover:bg-cyan-500/5 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {ai.messages.map((msg, i) => (
              <React.Fragment key={msg._id || i}>
                <Bubble message={msg} onShowChanges={handleShowChanges} />
                {msg.buildPlan && !msg.streaming && (
                  <BuildPlan plan={msg.buildPlan} animate={msg.hasChanges} diffStats={msg.diffStats} />
                )}
              </React.Fragment>
            ))}

            {ai.messages.length > 0 && !ai.isProcessing && (
              <div className="px-4 pb-2">
                <div className="flex flex-wrap gap-1">
                  {ai.suggestions.slice(0, 3).map((s) => (
                    <button
                      key={s}
                      onClick={() => !ai.isProcessing && handleAIPrompt(s)}
                      className="px-2 py-0.5 rounded-full text-[10px] text-zinc-500 border border-zinc-800/60 hover:border-cyan-500/30 hover:text-cyan-400 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {history.historyEntries.length > 0 && !ai.isProcessing && (
              <VersionHistory
                entries={history.historyEntries}
                onRestore={history.restoreToIndex}
                canUndo={history.canUndo}
                onUndo={history.undo}
              />
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-zinc-800/60 p-2.5">
            {/* Hidden file inputs */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files?.length) handleAddFiles(e.target.files); e.target.value = ''; }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.csv,.json,.svg"
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files?.length) handleAddFiles(e.target.files); e.target.value = ''; }}
            />

            {/* Attachment previews */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="relative group flex items-center gap-1.5 bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-2 py-1.5"
                  >
                    {att.preview ? (
                      <img src={att.preview} alt={att.name} className="w-8 h-8 rounded object-cover" />
                    ) : (
                      <Paperclip className="w-3.5 h-3.5 text-zinc-500" />
                    )}
                    <span className="text-[11px] text-zinc-400 max-w-[100px] truncate">{att.name}</span>
                    <button
                      onClick={() => handleRemoveAttachment(att.id)}
                      className="w-4 h-4 rounded-full bg-zinc-700 hover:bg-red-500/80 flex items-center justify-center text-zinc-400 hover:text-white transition-colors ml-0.5"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Textarea */}
            <div className={`bg-zinc-950 border rounded-xl transition-all ${pickerActive ? 'border-cyan-500/60 ring-2 ring-cyan-500/20' : 'border-zinc-800 focus-within:ring-2 focus-within:ring-cyan-500/30 focus-within:border-cyan-500/30'}`}>
              {/* Selected section pill */}
              <AnimatePresence>
                {selectedSection && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-3 pt-2"
                  >
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                      <Crosshair className="w-3 h-3 text-cyan-400" />
                      <span className="text-[11px] text-cyan-300 capitalize">{selectedSection.type.replace(/_/g, ' ')}</span>
                      {selectedSection.label && (
                        <span className="text-[10px] text-cyan-500/60 truncate max-w-[140px]">"{selectedSection.label}"</span>
                      )}
                      <button
                        onClick={() => setSelectedSection(null)}
                        className="ml-0.5 text-cyan-500/40 hover:text-cyan-300 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Picker active hint */}
              <AnimatePresence>
                {pickerActive && !selectedSection && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-3 pt-2"
                  >
                    <div className="flex items-center gap-2 text-[11px] text-cyan-400">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                      </span>
                      Click a section in the preview to target it
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <textarea
                ref={chatInputRef}
                value={chatValue}
                onChange={(e) => setChatValue(e.target.value)}
                onKeyDown={handleChatKey}
                disabled={ai.isProcessing}
                placeholder={pickerActive ? 'Click a section in the preview, then type your request...' : "Describe what you want to build or change..."}
                rows={4}
                className="w-full bg-transparent px-3 pt-2.5 pb-1 text-sm text-white placeholder-zinc-500 focus:outline-none disabled:opacity-50 resize-none"
                style={{ minHeight: '100px', maxHeight: '200px' }}
              />

              {/* Bottom bar: attach + pick + send */}
              <div className="flex items-center justify-between px-2 pb-2">
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={handleImageSelect}
                    disabled={ai.isProcessing}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Attach image"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span className="text-[11px]">Image</span>
                  </button>
                  <button
                    onClick={handleFileSelect}
                    disabled={ai.isProcessing}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Attach file"
                  >
                    <Paperclip className="w-4 h-4" />
                    <span className="text-[11px]">File</span>
                  </button>
                  <button
                    onClick={handlePickerToggle}
                    disabled={ai.isProcessing}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      pickerActive || selectedSection
                        ? 'text-cyan-400 bg-cyan-500/10'
                        : 'text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800/60'
                    }`}
                    title={pickerActive ? 'Cancel section picker' : 'Pick a section from preview'}
                  >
                    <Crosshair className="w-4 h-4" />
                    <span className="text-[11px]">{selectedSection ? 'Targeted' : 'Pick'}</span>
                  </button>
                </div>

                {ai.isProcessing ? (
                  <div className="w-8 h-8 rounded-full bg-cyan-500/15 flex items-center justify-center shrink-0">
                    <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                  </div>
                ) : (
                  <button
                    onClick={handleSend}
                    disabled={!canSend}
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      canSend ? 'bg-cyan-500 text-white hover:bg-cyan-400' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                    }`}
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Zone 2: Nav Sidebar (hidden in preview mode for max space) */}
        {!isPreviewMode && (
          <NavSidebar activeView={activeView} onChangeView={handleChangeView} />
        )}

        {/* Zone 3: Content / Preview */}
        <div className="flex-1 flex overflow-hidden bg-zinc-950/50">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
