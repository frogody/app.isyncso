// ---------------------------------------------------------------------------
// StoreBuilder.jsx -- Three-zone B2B Store Builder (Base44-inspired)
//
// Layout:
// ┌──────────┬──────────────┬──────────────────────────────────┐
// │  Chat    │  Nav Sidebar  │  Content (Preview OR Settings)   │
// │  (fixed) │  (fixed)      │  (flex-1)                        │
// │  ~320px  │  ~200px       │                                  │
// └──────────┴──────────────┴──────────────────────────────────┘
// ---------------------------------------------------------------------------

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ArrowUp,
  Loader2,
  Monitor,
  Palette,
  LayoutGrid,
  Navigation,
  PanelBottom,
  Search,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Save,
  Globe,
  Check,
  Undo2,
  Redo2,
  Smartphone,
  Tablet,
  ArrowLeft,
  Info,
} from 'lucide-react';

import BuilderCanvas from './BuilderCanvas';

import { useStoreBuilder } from './hooks/useStoreBuilder';
import { useBuilderHistory } from './hooks/useBuilderHistory';
import { useBuilderPreview } from './hooks/useBuilderPreview';
import { useBuilderAI } from './hooks/useBuilderAI';

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

function Bubble({ message }) {
  const isUser = message.role === 'user';
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
        {message.timestamp && (
          <span className="text-[10px] text-zinc-600 mt-0.5 px-1 select-none">{timeAgo(message.timestamp)}</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Nav Sidebar
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  { key: 'preview', icon: Monitor, label: 'Preview' },
  { key: 'theme', icon: Palette, label: 'Theme' },
  { key: 'sections', icon: LayoutGrid, label: 'Sections' },
  { key: 'navigation', icon: Navigation, label: 'Navigation' },
  { key: 'footer', icon: PanelBottom, label: 'Footer' },
];

function NavSidebar({ activeView, onChangeView, sectionCount }) {
  const [search, setSearch] = useState('');
  const filtered = search
    ? NAV_ITEMS.filter((n) => n.label.toLowerCase().includes(search.toLowerCase()))
    : NAV_ITEMS;

  return (
    <div className="w-[200px] flex-shrink-0 bg-zinc-950 border-r border-zinc-800/60 flex flex-col h-full">
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
        {filtered.map(({ key, icon: Icon, label }) => {
          const isActive = activeView === key;
          return (
            <button
              key={key}
              onClick={() => onChangeView(key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left truncate">{label}</span>
              {key === 'sections' && sectionCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-zinc-800 text-zinc-500'}`}>
                  {sectionCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings Pages
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

function ColorInput({ label, value, onChange }) {
  return (
    <label className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded-lg border border-zinc-700 cursor-pointer bg-transparent shrink-0"
      />
      <div className="flex-1 min-w-0">
        <span className="text-sm text-zinc-300 block">{label}</span>
        <span className="text-[11px] text-zinc-600 font-mono">{value}</span>
      </div>
    </label>
  );
}

function TextInput({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="text-xs text-zinc-500 mb-1.5 block">{label}</span>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
      />
    </label>
  );
}

// -- Theme Page --

function ThemePage({ config, onUpdateTheme }) {
  const theme = config?.theme || {};
  const COLORS = [
    { key: 'primaryColor', label: 'Primary Color', default: '#06b6d4' },
    { key: 'backgroundColor', label: 'Background', default: '#09090b' },
    { key: 'textColor', label: 'Text Color', default: '#fafafa' },
    { key: 'surfaceColor', label: 'Surface', default: '#18181b' },
    { key: 'borderColor', label: 'Border', default: '#27272a' },
    { key: 'mutedTextColor', label: 'Muted Text', default: '#a1a1aa' },
  ];

  return (
    <div>
      <PageHeader title="Theme" description="Customize the look and feel of your store." />

      <SettingsCard title="Colors">
        <div className="grid grid-cols-2 gap-4">
          {COLORS.map(({ key, label, default: def }) => (
            <ColorInput
              key={key}
              label={label}
              value={theme[key] || def}
              onChange={(val) => onUpdateTheme({ [key]: val })}
            />
          ))}
        </div>
      </SettingsCard>

      <SettingsCard title="Typography">
        <div className="space-y-4">
          <TextInput
            label="Body Font"
            value={theme.font}
            onChange={(val) => onUpdateTheme({ font: val })}
            placeholder="Inter, system-ui, sans-serif"
          />
          <TextInput
            label="Heading Font"
            value={theme.headingFont}
            onChange={(val) => onUpdateTheme({ headingFont: val })}
            placeholder="Inter, system-ui, sans-serif"
          />
        </div>
      </SettingsCard>
    </div>
  );
}

// -- Sections Page --

const SECTION_TYPES = [
  { type: 'hero', label: 'Hero' },
  { type: 'featured_products', label: 'Featured Products' },
  { type: 'category_grid', label: 'Category Grid' },
  { type: 'about', label: 'About' },
  { type: 'testimonials', label: 'Testimonials' },
  { type: 'cta', label: 'Call to Action' },
  { type: 'faq', label: 'FAQ' },
  { type: 'contact', label: 'Contact' },
  { type: 'banner', label: 'Banner' },
  { type: 'stats', label: 'Stats' },
  { type: 'rich_text', label: 'Rich Text' },
  { type: 'logo_grid', label: 'Logo Grid' },
];

function SectionsPage({ config, onAddSection, onRemoveSection, onToggleVisibility, onMoveSection }) {
  const [showAdd, setShowAdd] = useState(false);
  const sections = config?.sections || [];

  return (
    <div>
      <PageHeader title="Sections" description="Add, remove, and reorder your store sections." />

      {/* Section list */}
      <SettingsCard>
        {sections.length === 0 ? (
          <div className="text-center py-8">
            <LayoutGrid className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">No sections yet.</p>
            <p className="text-xs text-zinc-600 mt-1">Add a section to get started, or ask AI in the chat.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {sections.map((section, idx) => (
              <div
                key={section.id}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/40 group"
              >
                <GripVertical className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-zinc-300 capitalize truncate block">
                    {section.type?.replace(/_/g, ' ') || 'Unknown'}
                  </span>
                </div>

                {/* Move up/down */}
                <button
                  onClick={() => onMoveSection(idx, idx - 1)}
                  disabled={idx === 0}
                  className="p-1 text-zinc-600 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onMoveSection(idx, idx + 1)}
                  disabled={idx === sections.length - 1}
                  className="p-1 text-zinc-600 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {/* Toggle visibility */}
                <button
                  onClick={() => onToggleVisibility(section.id)}
                  className="p-1 text-zinc-600 hover:text-white transition-colors"
                  title={section.visible === false ? 'Show section' : 'Hide section'}
                >
                  {section.visible === false ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>

                {/* Remove */}
                <button
                  onClick={() => onRemoveSection(section.id)}
                  className="p-1 text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add section */}
        <div className="mt-3">
          {showAdd ? (
            <div className="bg-zinc-950 border border-zinc-800/60 rounded-xl p-3">
              <p className="text-xs text-zinc-500 mb-2 font-medium">Choose a section type</p>
              <div className="grid grid-cols-2 gap-1.5">
                {SECTION_TYPES.map(({ type, label }) => (
                  <button
                    key={type}
                    onClick={() => { onAddSection(type); setShowAdd(false); }}
                    className="text-left px-3 py-2 rounded-lg text-xs text-zinc-400 border border-zinc-800/40 hover:bg-zinc-800/40 hover:text-white hover:border-zinc-700 transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowAdd(false)}
                className="mt-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-zinc-700 text-sm text-zinc-500 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Section
            </button>
          )}
        </div>
      </SettingsCard>

      <div className="flex items-start gap-2 px-1 text-xs text-zinc-600">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>You can also ask the AI to add, remove, or reorder sections from the chat.</span>
      </div>
    </div>
  );
}

// -- Navigation Page --

function NavigationPage({ config, onUpdateNavigation }) {
  const navItems = config?.navigation || [];

  const handleAdd = () => {
    onUpdateNavigation([...navItems, { label: 'New Link', href: '#' }]);
  };

  const handleRemove = (idx) => {
    onUpdateNavigation(navItems.filter((_, i) => i !== idx));
  };

  const handleUpdate = (idx, field, value) => {
    const updated = navItems.map((item, i) => (i === idx ? { ...item, [field]: value } : item));
    onUpdateNavigation(updated);
  };

  return (
    <div>
      <PageHeader title="Navigation" description="Configure the links in your store's navigation bar." />

      <SettingsCard>
        {navItems.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-4">No navigation links configured.</p>
        ) : (
          <div className="space-y-3">
            {navItems.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={item.label || ''}
                    onChange={(e) => handleUpdate(idx, 'label', e.target.value)}
                    placeholder="Label"
                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
                  />
                  <input
                    type="text"
                    value={item.href || ''}
                    onChange={(e) => handleUpdate(idx, 'href', e.target.value)}
                    placeholder="/page or #section"
                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
                  />
                </div>
                <button
                  onClick={() => handleRemove(idx)}
                  className="p-2 text-zinc-600 hover:text-red-400 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleAdd}
          className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-zinc-700 text-sm text-zinc-500 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Link
        </button>
      </SettingsCard>
    </div>
  );
}

// -- Footer Page --

function FooterPage({ config, onUpdateFooter }) {
  const footer = config?.footer || {};

  const update = (field, value) => {
    onUpdateFooter({ ...footer, [field]: value });
  };

  return (
    <div>
      <PageHeader title="Footer" description="Configure your store's footer content." />

      <SettingsCard title="Company Info">
        <div className="space-y-4">
          <TextInput label="Company Name" value={footer.companyName} onChange={(v) => update('companyName', v)} placeholder="Your Company" />
          <TextInput label="Tagline" value={footer.tagline} onChange={(v) => update('tagline', v)} placeholder="Your company tagline" />
          <TextInput label="Copyright Text" value={footer.copyright} onChange={(v) => update('copyright', v)} placeholder="© 2026 Company. All rights reserved." />
        </div>
      </SettingsCard>

      <SettingsCard title="Contact">
        <div className="space-y-4">
          <TextInput label="Email" value={footer.email} onChange={(v) => update('email', v)} placeholder="info@company.com" />
          <TextInput label="Phone" value={footer.phone} onChange={(v) => update('phone', v)} placeholder="+1 (555) 000-0000" />
          <TextInput label="Address" value={footer.address} onChange={(v) => update('address', v)} placeholder="123 Business St" />
        </div>
      </SettingsCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toolbar (simplified inline)
// ---------------------------------------------------------------------------

const DEVICES = [
  { key: 'desktop', icon: Monitor, label: 'Desktop' },
  { key: 'tablet', icon: Tablet, label: 'Tablet' },
  { key: 'mobile', icon: Smartphone, label: 'Mobile' },
];

function Toolbar({ onBack, storeName, isDirty, saving, onSave, onPublish, isPublished, canUndo, canRedo, onUndo, onRedo, previewDevice, onDeviceChange, activeView }) {
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

      <div className="flex-1" />

      {/* Center: undo/redo + device (only in preview) */}
      <div className="flex items-center gap-0.5">
        <button onClick={onUndo} disabled={!canUndo} className={`p-1.5 rounded-lg transition-colors ${canUndo ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-700 cursor-not-allowed'}`}>
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={onRedo} disabled={!canRedo} className={`p-1.5 rounded-lg transition-colors ${canRedo ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-700 cursor-not-allowed'}`}>
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        {activeView === 'preview' && (
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
          </>
        )}
      </div>

      <div className="flex-1" />

      {/* Right: save + publish */}
      <div className="flex items-center gap-1.5">
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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600/25 rounded-lg text-xs font-medium transition-colors"
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
  const history = useBuilderHistory(builder.config, builder.updateConfig);
  const preview = useBuilderPreview();
  const ai = useBuilderAI();

  const [activeView, setActiveView] = useState('preview');
  const [saveError, setSaveError] = useState(null);
  const [chatValue, setChatValue] = useState('');
  const messagesEndRef = useRef(null);
  const chatInputRef = useRef(null);

  const canSend = chatValue.trim().length > 0 && !ai.isProcessing;
  const sectionCount = builder.config?.sections?.length || 0;

  // Sync config to preview
  const prevConfigRef = useRef(null);
  useEffect(() => {
    if (builder.config && builder.config !== prevConfigRef.current) {
      prevConfigRef.current = builder.config;
      preview.sendConfigToPreview(builder.config);
    }
  }, [builder.config, preview.sendConfigToPreview]);

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

  const handleUpdateTheme = useCallback((u) => { history.pushState(); builder.updateTheme(u); }, [history.pushState, builder.updateTheme]);

  const handleAddSection = useCallback((type) => { history.pushState(); builder.addSection(type); }, [history.pushState, builder.addSection]);
  const handleRemoveSection = useCallback((id) => { history.pushState(); builder.removeSection(id); }, [history.pushState, builder.removeSection]);
  const handleToggleVisibility = useCallback((id) => { history.pushState(); builder.toggleSectionVisibility(id); }, [history.pushState, builder.toggleSectionVisibility]);

  const handleMoveSection = useCallback((fromIdx, toIdx) => {
    const sections = builder.config?.sections;
    if (!sections || toIdx < 0 || toIdx >= sections.length) return;
    history.pushState();
    const ids = sections.map((s) => s.id);
    const [moved] = ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, moved);
    builder.reorderSections(ids);
  }, [builder.config?.sections, history.pushState, builder.reorderSections]);

  const handleUpdateNavigation = useCallback((nav) => { history.pushState(); builder.updateNavigation(nav); }, [history.pushState, builder.updateNavigation]);
  const handleUpdateFooter = useCallback((f) => { history.pushState(); builder.updateFooter(f); }, [history.pushState, builder.updateFooter]);

  const handleAIPrompt = useCallback(async (prompt) => {
    try {
      const ctx = { storeName: storeName || 'B2B Store', organizationId };
      const result = await ai.sendPrompt(prompt, builder.config, ctx);
      if (result?.updatedConfig) { history.pushState(); builder.updateConfig(result.updatedConfig); }
    } catch (err) { console.error('AI failed:', err); }
  }, [ai.sendPrompt, builder.config, builder.updateConfig, history.pushState, storeName, organizationId]);

  const handleSend = useCallback(async () => {
    const p = chatValue.trim();
    if (!p || ai.isProcessing) return;
    setChatValue('');
    await handleAIPrompt(p);
  }, [chatValue, ai.isProcessing, handleAIPrompt]);

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
      case 'theme':
        return (
          <div className="flex-1 overflow-y-auto p-8 max-w-2xl">
            <ThemePage config={builder.config} onUpdateTheme={handleUpdateTheme} />
          </div>
        );
      case 'sections':
        return (
          <div className="flex-1 overflow-y-auto p-8 max-w-2xl">
            <SectionsPage
              config={builder.config}
              onAddSection={handleAddSection}
              onRemoveSection={handleRemoveSection}
              onToggleVisibility={handleToggleVisibility}
              onMoveSection={handleMoveSection}
            />
          </div>
        );
      case 'navigation':
        return (
          <div className="flex-1 overflow-y-auto p-8 max-w-2xl">
            <NavigationPage config={builder.config} onUpdateNavigation={handleUpdateNavigation} />
          </div>
        );
      case 'footer':
        return (
          <div className="flex-1 overflow-y-auto p-8 max-w-2xl">
            <FooterPage config={builder.config} onUpdateFooter={handleUpdateFooter} />
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
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={history.undo}
        onRedo={history.redo}
        previewDevice={preview.previewDevice}
        onDeviceChange={preview.setPreviewDevice}
        activeView={activeView}
      />

      {/* Three-zone main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Zone 1: Chat */}
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
              <Bubble key={msg.id || i} message={msg} />
            ))}

            {ai.isProcessing && <TypingDots />}

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

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-zinc-800/60 p-2.5">
            <div className="flex items-center gap-2">
              <textarea
                ref={chatInputRef}
                value={chatValue}
                onChange={(e) => setChatValue(e.target.value)}
                onKeyDown={handleChatKey}
                disabled={ai.isProcessing}
                placeholder="What would you like to change?"
                rows={1}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/30 transition-all disabled:opacity-50 resize-none min-h-[36px] max-h-[100px]"
                style={{ fieldSizing: 'content' }}
              />
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

        {/* Zone 2: Nav Sidebar */}
        <NavSidebar activeView={activeView} onChangeView={setActiveView} sectionCount={sectionCount} />

        {/* Zone 3: Content */}
        <div className="flex-1 flex overflow-hidden bg-zinc-950/50">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
