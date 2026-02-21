import React, { useCallback } from 'react';
import { LayoutGrid, Search, Filter, ArrowUpDown, Package, DollarSign } from 'lucide-react';

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

const labelClasses = 'block text-xs font-medium text-zinc-400 mb-1';
const inputClasses =
  'bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none w-full transition-colors';

function SectionHeading({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {Icon && <Icon className="w-4 h-4 text-cyan-400" />}
      <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">{label}</h3>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-zinc-800/60" />;
}

function SelectInput({ label, value, onChange, options }) {
  return (
    <div>
      <label className={labelClasses}>{label}</label>
      <select
        className={`${inputClasses} appearance-none cursor-pointer`}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => {
          const v = typeof opt === 'string' ? opt : opt.value;
          const l = typeof opt === 'string' ? opt : opt.label;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
    </div>
  );
}

function ToggleSwitch({ label, checked, onChange, description }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <span className="text-sm text-zinc-300">{label}</span>
        {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={!!checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 mt-0.5 ${
          checked ? 'bg-cyan-500' : 'bg-zinc-700'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
          }`}
        />
      </button>
    </div>
  );
}

function OptionButton({ label, value, currentValue, onChange }) {
  const active = currentValue === value;
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        active
          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
          : 'bg-zinc-800 text-zinc-500 border border-zinc-700 hover:text-zinc-300'
      }`}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Sort options
// ---------------------------------------------------------------------------

const SORT_OPTIONS = [
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
  { value: 'price_asc', label: 'Price (Low to High)' },
  { value: 'price_desc', label: 'Price (High to Low)' },
  { value: 'newest', label: 'Newest First' },
];

function SortOptionsCheckboxes({ selectedOptions, onChange }) {
  const selected = Array.isArray(selectedOptions) ? selectedOptions : SORT_OPTIONS.map((o) => o.value);

  function handleToggle(optValue) {
    const isSelected = selected.includes(optValue);
    if (isSelected) {
      if (selected.length <= 1) return;
      onChange(selected.filter((v) => v !== optValue));
    } else {
      onChange([...selected, optValue]);
    }
  }

  return (
    <div>
      <label className={labelClasses}>Available Sort Options</label>
      <div className="space-y-1.5 mt-1">
        {SORT_OPTIONS.map((opt) => {
          const isChecked = selected.includes(opt.value);
          return (
            <label
              key={opt.value}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                  isChecked
                    ? 'bg-cyan-500 border-cyan-500'
                    : 'bg-zinc-800 border-zinc-600 group-hover:border-zinc-500'
                }`}
              >
                {isChecked && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-zinc-300">{opt.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function CatalogSettingsEditor({ catalog, onUpdate }) {
  const c = catalog || {};

  const update = useCallback(
    (key, value) => onUpdate({ [key]: value }),
    [onUpdate],
  );

  const availableSortOptions = Array.isArray(c.sortOptions) ? c.sortOptions : SORT_OPTIONS.map((o) => o.value);

  return (
    <div className="space-y-4 p-4 overflow-y-auto">
      {/* Layout */}
      <div>
        <SectionHeading icon={LayoutGrid} label="Layout" />
        <div className="space-y-3">
          <div>
            <label className={labelClasses}>Display Mode</label>
            <div className="flex gap-2">
              <OptionButton label="Grid" value="grid" currentValue={c.layout ?? 'grid'} onChange={(v) => update('layout', v)} />
              <OptionButton label="List" value="list" currentValue={c.layout ?? 'grid'} onChange={(v) => update('layout', v)} />
            </div>
          </div>

          <div>
            <label className={labelClasses}>Columns</label>
            <div className="flex gap-2">
              {[2, 3, 4].map((num) => (
                <OptionButton
                  key={num}
                  label={String(num)}
                  value={num}
                  currentValue={c.columns ?? 3}
                  onChange={(v) => update('columns', v)}
                />
              ))}
            </div>
          </div>

          <SelectInput
            label="Card Style"
            value={c.cardStyle}
            onChange={(v) => update('cardStyle', v)}
            options={[
              { value: 'minimal', label: 'Minimal' },
              { value: 'detailed', label: 'Detailed' },
              { value: 'image-first', label: 'Image First' },
            ]}
          />

          <SelectInput
            label="Products Per Page"
            value={String(c.productsPerPage ?? 12)}
            onChange={(v) => update('productsPerPage', Number(v))}
            options={[
              { value: '12', label: '12' },
              { value: '24', label: '24' },
              { value: '48', label: '48' },
            ]}
          />
        </div>
      </div>

      <Divider />

      {/* Search & filters */}
      <div>
        <SectionHeading icon={Filter} label="Filtering & Search" />
        <div className="space-y-3">
          <ToggleSwitch
            label="Show Filters"
            checked={c.showFilters !== false}
            onChange={(v) => update('showFilters', v)}
            description="Category, price range, and attribute filters"
          />
          <ToggleSwitch
            label="Show Search"
            checked={c.showSearch !== false}
            onChange={(v) => update('showSearch', v)}
            description="Search bar in the catalog header"
          />
          <ToggleSwitch
            label="Show Sort"
            checked={c.showSort !== false}
            onChange={(v) => update('showSort', v)}
            description="Sort dropdown for products"
          />
        </div>
      </div>

      <Divider />

      {/* Sort options */}
      <div>
        <SectionHeading icon={ArrowUpDown} label="Sorting" />
        <div className="space-y-3">
          <SortOptionsCheckboxes
            selectedOptions={c.sortOptions}
            onChange={(v) => update('sortOptions', v)}
          />
          <SelectInput
            label="Default Sort"
            value={c.defaultSort}
            onChange={(v) => update('defaultSort', v)}
            options={SORT_OPTIONS.filter((opt) => availableSortOptions.includes(opt.value))}
          />
        </div>
      </div>

      <Divider />

      {/* Display options */}
      <div>
        <SectionHeading icon={Package} label="Display" />
        <div className="space-y-3">
          <ToggleSwitch
            label="Show Stock Status"
            checked={c.showStock !== false}
            onChange={(v) => update('showStock', v)}
            description="Display in-stock / out-of-stock badges"
          />
          <ToggleSwitch
            label="Show Pricing"
            checked={c.showPricing !== false}
            onChange={(v) => update('showPricing', v)}
            description="Show product prices in the catalog"
          />
        </div>
      </div>
    </div>
  );
}
