import { useState } from 'react';
import NavigationEditor from './NavigationEditor';
import FooterEditor from './FooterEditor';
import CatalogSettingsEditor from './CatalogSettingsEditor';
import {
  GripVertical,
  Image,
  Package,
  Grid3x3,
  Info,
  Quote,
  Megaphone,
  HelpCircle,
  Mail,
  Flag,
  BarChart3,
  FileText,
  Layers,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  ChevronUp,
  ChevronDown,
  Sun,
  Moon,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Section type -> icon mapping
// ---------------------------------------------------------------------------

const SECTION_ICONS = {
  hero: Image,
  featured_products: Package,
  category_grid: Grid3x3,
  about: Info,
  testimonials: Quote,
  cta: Megaphone,
  faq: HelpCircle,
  contact: Mail,
  banner: Flag,
  stats: BarChart3,
  rich_text: FileText,
  logo_grid: Layers,
};

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

const TABS = [
  { id: 'sections', label: 'Sections' },
  { id: 'theme', label: 'Theme' },
  { id: 'navigation', label: 'Navigation' },
  { id: 'footer', label: 'Footer' },
  { id: 'catalog', label: 'Catalog' },
];

// ---------------------------------------------------------------------------
// Theme editor helpers
// ---------------------------------------------------------------------------

const BORDER_RADIUS_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'Extra Large' },
  { value: 'full', label: 'Full' },
];

const BUTTON_STYLE_OPTIONS = [
  { value: 'filled', label: 'Filled' },
  { value: 'outline', label: 'Outline' },
  { value: 'ghost', label: 'Ghost' },
  { value: 'pill', label: 'Pill' },
];

const CARD_STYLE_OPTIONS = [
  { value: 'flat', label: 'Flat' },
  { value: 'raised', label: 'Raised' },
  { value: 'bordered', label: 'Bordered' },
  { value: 'glass', label: 'Glass' },
];

const SPACING_OPTIONS = [
  { value: 'compact', label: 'Compact' },
  { value: 'normal', label: 'Normal' },
  { value: 'spacious', label: 'Spacious' },
];

const THEME_COLORS = [
  { key: 'primaryColor', label: 'Primary' },
  { key: 'secondaryColor', label: 'Secondary' },
  { key: 'accentColor', label: 'Accent' },
  { key: 'backgroundColor', label: 'Background' },
  { key: 'surfaceColor', label: 'Surface' },
  { key: 'textColor', label: 'Text' },
];

// ---------------------------------------------------------------------------
// Utility: prettify section type names
// ---------------------------------------------------------------------------

function prettifySectionType(type) {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TabBar({ activePanel, onActivePanel }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2.5 overflow-x-auto scrollbar-none border-b border-zinc-800/60">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onActivePanel(tab.id)}
          className={`
            shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors
            ${
              activePanel === tab.id
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
            }
          `}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function SectionRow({
  section,
  index,
  totalCount,
  isSelected,
  onSelect,
  onMoveUp,
  onMoveDown,
  onToggleVisibility,
  onRemove,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const Icon = SECTION_ICONS[section.type] || FileText;

  return (
    <div
      onClick={() => onSelect(section.id)}
      className={`
        group flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors
        ${
          isSelected
            ? 'bg-cyan-500/10 border-l-2 border-cyan-500'
            : 'border-l-2 border-transparent hover:bg-zinc-800/40'
        }
      `}
    >
      {/* Reorder arrows */}
      <div className="flex flex-col gap-0.5 shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp(index);
          }}
          disabled={index === 0}
          className="p-0.5 rounded text-zinc-600 hover:text-zinc-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          title="Move up"
        >
          <ChevronUp className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown(index);
          }}
          disabled={index === totalCount - 1}
          className="p-0.5 rounded text-zinc-600 hover:text-zinc-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          title="Move down"
        >
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {/* Grip handle (visual only) */}
      <GripVertical className="w-4 h-4 text-zinc-700 shrink-0" />

      {/* Section icon */}
      <Icon
        className={`w-4 h-4 shrink-0 ${isSelected ? 'text-cyan-400' : 'text-zinc-500'}`}
      />

      {/* Section name */}
      <span
        className={`flex-1 text-sm truncate ${
          isSelected ? 'text-cyan-300 font-medium' : 'text-zinc-300'
        } ${!section.visible ? 'opacity-50' : ''}`}
      >
        {prettifySectionType(section.type)}
      </span>

      {/* Visibility toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleVisibility(section.id);
        }}
        className="p-1 rounded text-zinc-600 hover:text-zinc-300 transition-colors"
        title={section.visible ? 'Hide section' : 'Show section'}
      >
        {section.visible ? (
          <Eye className="w-3.5 h-3.5" />
        ) : (
          <EyeOff className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Delete */}
      {confirmDelete ? (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              onRemove(section.id);
              setConfirmDelete(false);
            }}
            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
          >
            Delete
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="px-1.5 py-0.5 rounded text-[10px] font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setConfirmDelete(true);
          }}
          className="p-1 rounded text-zinc-700 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
          title="Remove section"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function SectionsPanel({
  config,
  selectedSectionId,
  onSelectSection,
  onAddSection,
  onRemoveSection,
  onReorderSections,
  onToggleVisibility,
}) {
  const sections = config?.sections || [];

  function handleMoveUp(index) {
    if (index === 0) return;
    const ids = sections.map((s) => s.id);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    onReorderSections(ids);
  }

  function handleMoveDown(index) {
    if (index >= sections.length - 1) return;
    const ids = sections.map((s) => s.id);
    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    onReorderSections(ids);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Section list */}
      <div className="flex-1 overflow-y-auto">
        {sections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Layers className="w-8 h-8 text-zinc-700 mb-2" />
            <p className="text-sm text-zinc-500">No sections yet</p>
            <p className="text-xs text-zinc-600 mt-1">
              Add a section to start building your store
            </p>
          </div>
        ) : (
          sections.map((section, idx) => (
            <SectionRow
              key={section.id}
              section={section}
              index={idx}
              totalCount={sections.length}
              isSelected={selectedSectionId === section.id}
              onSelect={onSelectSection}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onToggleVisibility={onToggleVisibility}
              onRemove={onRemoveSection}
            />
          ))
        )}
      </div>

      {/* Add Section button */}
      <div className="p-3 border-t border-zinc-800/60">
        <button
          onClick={onAddSection}
          className="
            w-full flex items-center justify-center gap-2 py-2.5 rounded-lg
            border border-dashed border-zinc-700 text-zinc-400
            hover:border-cyan-500/40 hover:text-cyan-400 hover:bg-cyan-500/5
            transition-colors
          "
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">Add Section</span>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Color picker row
// ---------------------------------------------------------------------------

function ColorRow({ label, value, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-xs text-zinc-400 w-20 shrink-0">{label}</label>
      <div className="flex items-center gap-2 flex-1">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded-md border border-zinc-700 bg-transparent cursor-pointer shrink-0 [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded"
        />
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1 px-2.5 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/40"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Select row
// ---------------------------------------------------------------------------

function SelectRow({ label, value, options, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-xs text-zinc-400 w-20 shrink-0">{label}</label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-2.5 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500/40 appearance-none cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toggle switch
// ---------------------------------------------------------------------------

function ToggleSwitch({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-xs text-zinc-400">{label}</label>
      <button
        onClick={() => onChange(!checked)}
        className={`
          relative w-9 h-5 rounded-full transition-colors
          ${checked ? 'bg-cyan-500' : 'bg-zinc-700'}
        `}
      >
        <span
          className={`
            absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform
            ${checked ? 'translate-x-4' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Theme Panel (inline ThemeEditor)
// ---------------------------------------------------------------------------

function ThemePanel({ config, onUpdateTheme }) {
  const theme = config?.theme || {};

  function update(key, value) {
    onUpdateTheme({ [key]: value });
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-5">
      {/* Section header */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-3">
          Colors
        </h3>
        <div className="space-y-3">
          {THEME_COLORS.map(({ key, label }) => (
            <ColorRow
              key={key}
              label={label}
              value={theme[key]}
              onChange={(v) => update(key, v)}
            />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-zinc-800/60" />

      {/* Mode */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-3">
          Mode
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => update('mode', 'dark')}
            className={`
              flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors
              ${
                theme.mode === 'dark'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'bg-zinc-900 text-zinc-500 border border-zinc-800 hover:text-zinc-300'
              }
            `}
          >
            <Moon className="w-3.5 h-3.5" />
            Dark
          </button>
          <button
            onClick={() => update('mode', 'light')}
            className={`
              flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors
              ${
                theme.mode === 'light'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'bg-zinc-900 text-zinc-500 border border-zinc-800 hover:text-zinc-300'
              }
            `}
          >
            <Sun className="w-3.5 h-3.5" />
            Light
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-zinc-800/60" />

      {/* Typography */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-3">
          Typography
        </h3>
        <div className="flex items-center gap-3">
          <label className="text-xs text-zinc-400 w-20 shrink-0">Font</label>
          <input
            type="text"
            value={theme.font || ''}
            onChange={(e) => update('font', e.target.value)}
            placeholder="Inter"
            className="flex-1 px-2.5 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/40"
          />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-zinc-800/60" />

      {/* Appearance */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-3">
          Appearance
        </h3>
        <div className="space-y-3">
          <SelectRow
            label="Radius"
            value={theme.borderRadius}
            options={BORDER_RADIUS_OPTIONS}
            onChange={(v) => update('borderRadius', v)}
          />
          <SelectRow
            label="Buttons"
            value={theme.buttonStyle}
            options={BUTTON_STYLE_OPTIONS}
            onChange={(v) => update('buttonStyle', v)}
          />
          <SelectRow
            label="Cards"
            value={theme.cardStyle}
            options={CARD_STYLE_OPTIONS}
            onChange={(v) => update('cardStyle', v)}
          />
          <SelectRow
            label="Spacing"
            value={theme.spacing}
            options={SPACING_OPTIONS}
            onChange={(v) => update('spacing', v)}
          />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-zinc-800/60" />

      {/* Animations */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-3">
          Behavior
        </h3>
        <ToggleSwitch
          label="Animations"
          checked={theme.animations !== false}
          onChange={(v) => update('animations', v)}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Placeholder panels
// ---------------------------------------------------------------------------

function PlaceholderPanel({ title }) {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-10 h-10 rounded-lg bg-zinc-800/60 flex items-center justify-center mx-auto mb-3">
          <FileText className="w-5 h-5 text-zinc-600" />
        </div>
        <p className="text-sm text-zinc-400 font-medium">{title}</p>
        <p className="text-xs text-zinc-600 mt-1">Coming soon</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main BuilderSidebar component
// ---------------------------------------------------------------------------

export default function BuilderSidebar({
  config,
  selectedSectionId,
  activePanel,
  onSelectSection,
  onAddSection,
  onRemoveSection,
  onReorderSections,
  onToggleVisibility,
  onActivePanel,
  onUpdateTheme,
  onUpdateNavigation,
  onUpdateFooter,
  onUpdateCatalog,
}) {
  return (
    <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800/60">
      {/* Tab bar */}
      <TabBar activePanel={activePanel} onActivePanel={onActivePanel} />

      {/* Panel content */}
      {activePanel === 'sections' && (
        <SectionsPanel
          config={config}
          selectedSectionId={selectedSectionId}
          onSelectSection={onSelectSection}
          onAddSection={onAddSection}
          onRemoveSection={onRemoveSection}
          onReorderSections={onReorderSections}
          onToggleVisibility={onToggleVisibility}
        />
      )}

      {activePanel === 'theme' && (
        <ThemePanel config={config} onUpdateTheme={onUpdateTheme} />
      )}

      {activePanel === 'navigation' && (
        <div className="flex-1 overflow-y-auto p-4">
          <NavigationEditor
            navigation={config?.navigation || {}}
            onUpdate={onUpdateNavigation}
          />
        </div>
      )}

      {activePanel === 'footer' && (
        <div className="flex-1 overflow-y-auto p-4">
          <FooterEditor
            footer={config?.footer || {}}
            onUpdate={onUpdateFooter}
          />
        </div>
      )}

      {activePanel === 'catalog' && (
        <div className="flex-1 overflow-y-auto p-4">
          <CatalogSettingsEditor
            catalog={config?.catalog || {}}
            onUpdate={onUpdateCatalog}
          />
        </div>
      )}
    </div>
  );
}
