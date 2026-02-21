import React, { useCallback } from 'react';
import { Plus, Trash2, Facebook, Twitter, Instagram, Linkedin, Youtube } from 'lucide-react';

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

const labelClasses = 'block text-xs font-medium text-zinc-400 mb-1';
const inputClasses =
  'bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none w-full transition-colors';

function SectionHeading({ label }) {
  return (
    <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-3">{label}</h3>
  );
}

function Divider() {
  return <div className="border-t border-zinc-800/60" />;
}

function TextInput({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className={labelClasses}>{label}</label>
      <input
        type="text"
        className={inputClasses}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
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

// ---------------------------------------------------------------------------
// Social media config
// ---------------------------------------------------------------------------

const SOCIAL_PLATFORMS = [
  { key: 'facebook', label: 'Facebook', Icon: Facebook, placeholder: 'https://facebook.com/...' },
  { key: 'twitter', label: 'Twitter / X', Icon: Twitter, placeholder: 'https://x.com/...' },
  { key: 'instagram', label: 'Instagram', Icon: Instagram, placeholder: 'https://instagram.com/...' },
  { key: 'linkedin', label: 'LinkedIn', Icon: Linkedin, placeholder: 'https://linkedin.com/company/...' },
  { key: 'youtube', label: 'YouTube', Icon: Youtube, placeholder: 'https://youtube.com/@...' },
];

function SocialInput({ platform, value, onChange }) {
  const { Icon, label, placeholder } = platform;
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-zinc-400" />
      </div>
      <input
        type="text"
        className={inputClasses}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        title={label}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Footer link row
// ---------------------------------------------------------------------------

function FooterLinkRow({ link, index, onChange, onRemove }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500">Link {index + 1}</span>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-0.5 text-zinc-600 hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <input
        type="text"
        className={inputClasses}
        value={link.label ?? ''}
        onChange={(e) => onChange(index, 'label', e.target.value)}
        placeholder="Label"
      />
      <input
        type="text"
        className={inputClasses}
        value={link.href ?? ''}
        onChange={(e) => onChange(index, 'href', e.target.value)}
        placeholder="/page-url"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function FooterEditor({ footer, onUpdate }) {
  const f = footer || {};
  const links = Array.isArray(f.links) ? f.links : [];
  const social = f.social || {};

  const update = useCallback(
    (key, value) => onUpdate({ [key]: value }),
    [onUpdate],
  );

  const handleLinkChange = useCallback(
    (index, field, value) => {
      const next = links.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      );
      update('links', next);
    },
    [links, update],
  );

  const handleRemoveLink = useCallback(
    (index) => {
      update('links', links.filter((_, i) => i !== index));
    },
    [links, update],
  );

  const handleAddLink = useCallback(() => {
    update('links', [...links, { label: '', href: '/' }]);
  }, [links, update]);

  const handleSocialChange = useCallback(
    (key, value) => {
      update('social', { ...social, [key]: value });
    },
    [social, update],
  );

  return (
    <div className="space-y-4 p-4 overflow-y-auto">
      {/* Style */}
      <div>
        <SectionHeading label="Footer Style" />
        <SelectInput
          label="Style"
          value={f.style}
          onChange={(v) => update('style', v)}
          options={[
            { value: 'simple', label: 'Simple' },
            { value: 'columns', label: 'Columns' },
            { value: 'minimal', label: 'Minimal' },
            { value: 'detailed', label: 'Detailed' },
          ]}
        />
      </div>

      {/* Column count for columns style */}
      {f.style === 'columns' && (
        <SelectInput
          label="Column Count"
          value={String(f.columnCount ?? 3)}
          onChange={(v) => update('columnCount', Number(v))}
          options={[
            { value: '2', label: '2 Columns' },
            { value: '3', label: '3 Columns' },
            { value: '4', label: '4 Columns' },
          ]}
        />
      )}

      {/* Copyright */}
      <TextInput
        label="Copyright Text"
        value={f.copyright}
        onChange={(v) => update('copyright', v)}
        placeholder="&copy; 2026 Company Name"
      />

      <Divider />

      {/* Footer links */}
      <div>
        <SectionHeading label="Footer Links" />
        <div className="space-y-2">
          {links.map((link, index) => (
            <FooterLinkRow
              key={index}
              link={link}
              index={index}
              onChange={handleLinkChange}
              onRemove={handleRemoveLink}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={handleAddLink}
          className="mt-3 flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors w-full justify-center py-2 border border-dashed border-zinc-800 rounded-lg hover:border-cyan-500/40"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Link
        </button>
      </div>

      <Divider />

      {/* Social media */}
      <div>
        <SectionHeading label="Social Media" />
        <div className="space-y-2.5">
          {SOCIAL_PLATFORMS.map((platform) => (
            <SocialInput
              key={platform.key}
              platform={platform}
              value={social[platform.key]}
              onChange={(v) => handleSocialChange(platform.key, v)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
