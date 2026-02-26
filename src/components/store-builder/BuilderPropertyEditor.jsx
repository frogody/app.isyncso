import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Star,
  MessageSquare,
  HelpCircle,
  BarChart3,
  Type,
  Image,
  Megaphone,
  Layout,
  ShoppingBag,
  Grid3X3,
  Info,
  Users,
  Phone,
  Flag,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Reusable inline input primitives
// ---------------------------------------------------------------------------

const labelClasses = 'block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1';
const inputClasses =
  'bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none w-full transition-colors';

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

function TextArea({ label, value, onChange, rows = 3, placeholder }) {
  return (
    <div>
      <label className={labelClasses}>{label}</label>
      <textarea
        className={`${inputClasses} resize-none`}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
      />
    </div>
  );
}

function NumberInput({ label, value, onChange, min, max, step }) {
  return (
    <div>
      <label className={labelClasses}>{label}</label>
      <input
        type="number"
        className={inputClasses}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        min={min}
        max={max}
        step={step}
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
          const optValue = typeof opt === 'string' ? opt : opt.value;
          const optLabel = typeof opt === 'string' ? opt : opt.label;
          return (
            <option key={optValue} value={optValue}>
              {optLabel}
            </option>
          );
        })}
      </select>
    </div>
  );
}

function ToggleInput({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-zinc-300">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={!!checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
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

function ColorInput({ label, value, onChange }) {
  return (
    <div>
      <label className={labelClasses}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          className="h-9 w-9 rounded-lg border border-zinc-800 bg-zinc-900 cursor-pointer p-0.5"
          value={value ?? '#000000'}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          className={inputClasses}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section divider
// ---------------------------------------------------------------------------

function SectionDivider() {
  return <div className="border-t border-zinc-800/60 pt-4 mt-4" />;
}

// ---------------------------------------------------------------------------
// Section icon map
// ---------------------------------------------------------------------------

const SECTION_ICONS = {
  hero: Layout,
  featured_products: ShoppingBag,
  category_grid: Grid3X3,
  about: Info,
  testimonials: MessageSquare,
  cta: Megaphone,
  faq: HelpCircle,
  contact: Phone,
  banner: Flag,
  stats: BarChart3,
  rich_text: Type,
  logo_grid: Image,
};

// ---------------------------------------------------------------------------
// Array item editors (testimonials, FAQ, stats, logos)
// ---------------------------------------------------------------------------

function ArrayItemEditor({ items, onUpdate, renderItem, addLabel, createDefault }) {
  const handleItemChange = useCallback(
    (index, field, value) => {
      const next = items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      );
      onUpdate(next);
    },
    [items, onUpdate],
  );

  const handleRemove = useCallback(
    (index) => {
      onUpdate(items.filter((_, i) => i !== index));
    },
    [items, onUpdate],
  );

  const handleAdd = useCallback(() => {
    onUpdate([...items, createDefault()]);
  }, [items, onUpdate, createDefault]);

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="bg-zinc-900/50 border border-zinc-800/60 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-zinc-500">#{index + 1}</span>
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="text-zinc-600 hover:text-red-400 transition-colors p-0.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          {renderItem(item, index, (field, value) => handleItemChange(index, field, value))}
        </div>
      ))}
      <button
        type="button"
        onClick={handleAdd}
        className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors w-full justify-center py-2 border border-dashed border-zinc-800 rounded-lg hover:border-cyan-500/40"
      >
        <Plus className="w-3.5 h-3.5" />
        {addLabel}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section-specific editors
// ---------------------------------------------------------------------------

function HeroEditor({ props, onChange }) {
  return (
    <div className="space-y-3">
      <TextArea label="Headline" value={props.headline ?? props.heading} onChange={(v) => onChange('headline', v)} rows={2} />
      <TextArea label="Subheadline" value={props.subheadline ?? props.subheading} onChange={(v) => onChange('subheadline', v)} rows={2} />
      <TextInput label="CTA Text" value={props.ctaText} onChange={(v) => onChange('ctaText', v)} />
      <TextInput label="CTA Link" value={props.ctaLink} onChange={(v) => onChange('ctaLink', v)} placeholder="/products" />
      <TextInput label="Secondary CTA Text" value={props.secondaryCtaText} onChange={(v) => onChange('secondaryCtaText', v)} />
      <TextInput label="Secondary CTA Link" value={props.secondaryCtaLink} onChange={(v) => onChange('secondaryCtaLink', v)} />
      <SelectInput
        label="Alignment"
        value={props.alignment}
        onChange={(v) => onChange('alignment', v)}
        options={['left', 'center', 'right']}
      />
      <SelectInput
        label="Size"
        value={props.size}
        onChange={(v) => onChange('size', v)}
        options={['sm', 'md', 'lg', 'xl']}
      />
      <TextInput label="Background Image URL" value={props.backgroundImage} onChange={(v) => onChange('backgroundImage', v)} placeholder="https://..." />
      <ToggleInput label="Overlay" checked={props.overlay} onChange={(v) => onChange('overlay', v)} />
      {props.overlay && (
        <NumberInput label="Overlay Opacity (%)" value={props.overlayOpacity != null ? Math.round(props.overlayOpacity * 100) : 60} onChange={(v) => onChange('overlayOpacity', v === '' ? 0.6 : v / 100)} min={0} max={100} />
      )}
    </div>
  );
}

function FeaturedProductsEditor({ props, onChange }) {
  return (
    <div className="space-y-3">
      <TextInput label="Title" value={props.title ?? props.heading} onChange={(v) => onChange('title', v)} />
      <TextInput label="Subtitle" value={props.subtitle ?? props.subheading} onChange={(v) => onChange('subtitle', v)} />
      <SelectInput
        label="Display Style"
        value={props.displayStyle ?? props.cardStyle}
        onChange={(v) => onChange('displayStyle', v)}
        options={['carousel', 'grid']}
      />
      <SelectInput
        label="Columns"
        value={String(props.columns ?? 4)}
        onChange={(v) => onChange('columns', Number(v))}
        options={['2', '3', '4']}
      />
      <ToggleInput label="Show Pricing" checked={props.showPricing} onChange={(v) => onChange('showPricing', v)} />
      <NumberInput label="Max Products" value={props.maxProducts ?? props.maxItems} onChange={(v) => onChange('maxProducts', v)} min={1} max={24} />
    </div>
  );
}

function CategoryGridEditor({ props, onChange }) {
  return (
    <div className="space-y-3">
      <TextInput label="Title" value={props.title ?? props.heading} onChange={(v) => onChange('title', v)} />
      <TextInput label="Subtitle" value={props.subtitle ?? props.subheading} onChange={(v) => onChange('subtitle', v)} />
      <SelectInput
        label="Columns"
        value={String(props.columns ?? 3)}
        onChange={(v) => onChange('columns', Number(v))}
        options={['2', '3', '4']}
      />
      <ToggleInput label="Show Count" checked={props.showCount} onChange={(v) => onChange('showCount', v)} />
      <SelectInput
        label="Style"
        value={props.style}
        onChange={(v) => onChange('style', v)}
        options={['cards', 'pills', 'icons']}
      />
    </div>
  );
}

function AboutEditor({ props, onChange }) {
  return (
    <div className="space-y-3">
      <TextInput label="Title" value={props.title ?? props.heading} onChange={(v) => onChange('title', v)} />
      <TextArea label="Body" value={props.body ?? props.content} onChange={(v) => onChange('body', v)} rows={6} />
      <TextInput label="Image URL" value={props.image} onChange={(v) => onChange('image', v)} placeholder="https://..." />
      <SelectInput
        label="Image Position"
        value={props.imagePosition}
        onChange={(v) => onChange('imagePosition', v)}
        options={['left', 'right']}
      />
      <ToggleInput label="Show CTA" checked={props.showCta} onChange={(v) => onChange('showCta', v)} />
      {props.showCta && (
        <>
          <TextInput label="CTA Text" value={props.ctaText} onChange={(v) => onChange('ctaText', v)} />
          <TextInput label="CTA Link" value={props.ctaLink} onChange={(v) => onChange('ctaLink', v)} />
        </>
      )}
    </div>
  );
}

function TestimonialsEditor({ props, onChange }) {
  const items = Array.isArray(props.items) ? props.items : [];

  return (
    <div className="space-y-3">
      <TextInput label="Title" value={props.title ?? props.heading} onChange={(v) => onChange('title', v)} />
      <SelectInput
        label="Display Style"
        value={props.displayStyle ?? props.style}
        onChange={(v) => onChange('displayStyle', v)}
        options={['carousel', 'grid', 'masonry']}
      />
      <SelectInput
        label="Columns"
        value={String(props.columns ?? 3)}
        onChange={(v) => onChange('columns', Number(v))}
        options={['1', '2', '3']}
      />
      <SectionDivider />
      <ArrayItemEditor
        items={items}
        onUpdate={(next) => onChange('items', next)}
        addLabel="Add Testimonial"
        createDefault={() => ({ quote: '', author: '', company: '', rating: 5 })}
        renderItem={(item, _index, change) => (
          <>
            <TextArea label="Quote" value={item.quote} onChange={(v) => change('quote', v)} rows={2} />
            <TextInput label="Author" value={item.author} onChange={(v) => change('author', v)} />
            <TextInput label="Company" value={item.company} onChange={(v) => change('company', v)} />
            <NumberInput label="Rating" value={item.rating} onChange={(v) => change('rating', v)} min={1} max={5} />
          </>
        )}
      />
    </div>
  );
}

function CtaEditor({ props, onChange }) {
  return (
    <div className="space-y-3">
      <TextInput label="Headline" value={props.headline ?? props.heading} onChange={(v) => onChange('headline', v)} />
      <TextInput label="Subheadline" value={props.subheadline ?? props.subheading} onChange={(v) => onChange('subheadline', v)} />
      <TextInput label="CTA Text" value={props.ctaText} onChange={(v) => onChange('ctaText', v)} />
      <TextInput label="CTA Link" value={props.ctaLink} onChange={(v) => onChange('ctaLink', v)} />
      <SelectInput
        label="Style"
        value={props.style}
        onChange={(v) => onChange('style', v)}
        options={['banner', 'card', 'minimal']}
      />
    </div>
  );
}

function FaqEditor({ props, onChange }) {
  const items = Array.isArray(props.items) ? props.items : [];

  return (
    <div className="space-y-3">
      <TextInput label="Title" value={props.title ?? props.heading} onChange={(v) => onChange('title', v)} />
      <SelectInput
        label="Style"
        value={props.style}
        onChange={(v) => onChange('style', v)}
        options={['accordion', 'two_column', 'cards']}
      />
      <SectionDivider />
      <ArrayItemEditor
        items={items}
        onUpdate={(next) => onChange('items', next)}
        addLabel="Add FAQ"
        createDefault={() => ({ question: '', answer: '' })}
        renderItem={(item, _index, change) => (
          <>
            <TextInput label="Question" value={item.question} onChange={(v) => change('question', v)} />
            <TextArea label="Answer" value={item.answer} onChange={(v) => change('answer', v)} rows={3} />
          </>
        )}
      />
    </div>
  );
}

function ContactEditor({ props, onChange }) {
  return (
    <div className="space-y-3">
      <TextInput label="Title" value={props.title ?? props.heading} onChange={(v) => onChange('title', v)} />
      <TextInput label="Subtitle" value={props.subtitle ?? props.subheading} onChange={(v) => onChange('subtitle', v)} />
      <TextInput label="Email" value={props.email} onChange={(v) => onChange('email', v)} placeholder="sales@example.com" />
      <TextInput label="Phone" value={props.phone} onChange={(v) => onChange('phone', v)} placeholder="+1 (555) 000-0000" />
      <TextArea label="Address" value={props.address} onChange={(v) => onChange('address', v)} rows={2} />
      <ToggleInput label="Show Contact Form" checked={props.showForm} onChange={(v) => onChange('showForm', v)} />
      <ToggleInput label="Show Map" checked={props.showMap} onChange={(v) => onChange('showMap', v)} />
    </div>
  );
}

function BannerEditor({ props, onChange }) {
  return (
    <div className="space-y-3">
      <TextArea label="Text" value={props.text} onChange={(v) => onChange('text', v)} rows={2} />
      <TextInput label="Link" value={props.link} onChange={(v) => onChange('link', v)} placeholder="https://..." />
      <TextInput label="Icon" value={props.icon} onChange={(v) => onChange('icon', v)} placeholder="e.g. truck, tag, info" />
      <ToggleInput label="Dismissible" checked={props.dismissible} onChange={(v) => onChange('dismissible', v)} />
      <SelectInput
        label="Style"
        value={props.style}
        onChange={(v) => onChange('style', v)}
        options={['info', 'promo', 'warning', 'accent']}
      />
    </div>
  );
}

function StatsEditor({ props, onChange }) {
  const items = Array.isArray(props.items) ? props.items : [];

  return (
    <div className="space-y-3">
      <TextInput label="Title" value={props.title ?? props.heading} onChange={(v) => onChange('title', v)} />
      <SelectInput
        label="Columns"
        value={String(props.columns ?? 4)}
        onChange={(v) => onChange('columns', Number(v))}
        options={['2', '3', '4']}
      />
      <SelectInput
        label="Style"
        value={props.style}
        onChange={(v) => onChange('style', v)}
        options={['cards', 'inline', 'large']}
      />
      <SectionDivider />
      <ArrayItemEditor
        items={items}
        onUpdate={(next) => onChange('items', next)}
        addLabel="Add Stat"
        createDefault={() => ({ value: '0', label: '', icon: '' })}
        renderItem={(item, _index, change) => (
          <>
            <TextInput label="Value" value={item.value} onChange={(v) => change('value', v)} placeholder="e.g. 99%" />
            <TextInput label="Label" value={item.label} onChange={(v) => change('label', v)} placeholder="e.g. Uptime" />
            <TextInput label="Icon" value={item.icon} onChange={(v) => change('icon', v)} placeholder="e.g. zap" />
          </>
        )}
      />
    </div>
  );
}

function RichTextEditor({ props, onChange }) {
  return (
    <div className="space-y-3">
      <TextArea label="Content" value={props.content} onChange={(v) => onChange('content', v)} rows={10} placeholder="HTML or plain text content..." />
      <SelectInput
        label="Max Width"
        value={props.maxWidth}
        onChange={(v) => onChange('maxWidth', v)}
        options={[
          { value: 'sm', label: 'Small (640px)' },
          { value: 'md', label: 'Medium (768px)' },
          { value: 'lg', label: 'Large (1024px)' },
          { value: 'full', label: 'Full Width' },
        ]}
      />
    </div>
  );
}

function LogoGridEditor({ props, onChange }) {
  const logos = Array.isArray(props.logos) ? props.logos : [];

  return (
    <div className="space-y-3">
      <TextInput label="Title" value={props.title ?? props.heading} onChange={(v) => onChange('title', v)} />
      <SelectInput
        label="Style"
        value={props.style}
        onChange={(v) => onChange('style', v)}
        options={['grid', 'carousel']}
      />
      <ToggleInput label="Grayscale" checked={props.grayscale} onChange={(v) => onChange('grayscale', v)} />
      <SectionDivider />
      <ArrayItemEditor
        items={logos}
        onUpdate={(next) => onChange('logos', next)}
        addLabel="Add Logo"
        createDefault={() => ({ url: '', alt: '', link: '' })}
        renderItem={(item, _index, change) => (
          <>
            <TextInput label="Image URL" value={item.url} onChange={(v) => change('url', v)} placeholder="https://..." />
            <TextInput label="Alt Text" value={item.alt} onChange={(v) => change('alt', v)} />
            <TextInput label="Link" value={item.link} onChange={(v) => change('link', v)} placeholder="https://..." />
          </>
        )}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section type editor router
// ---------------------------------------------------------------------------

function SectionTypeEditor({ section, onUpdateSectionProps }) {
  const props = section.props || {};

  const handleChange = useCallback(
    (field, value) => {
      onUpdateSectionProps(section.id, { [field]: value });
    },
    [section.id, onUpdateSectionProps],
  );

  switch (section.type) {
    case 'hero':
      return <HeroEditor props={props} onChange={handleChange} />;
    case 'featured_products':
      return <FeaturedProductsEditor props={props} onChange={handleChange} />;
    case 'category_grid':
      return <CategoryGridEditor props={props} onChange={handleChange} />;
    case 'about':
      return <AboutEditor props={props} onChange={handleChange} />;
    case 'testimonials':
      return <TestimonialsEditor props={props} onChange={handleChange} />;
    case 'cta':
      return <CtaEditor props={props} onChange={handleChange} />;
    case 'faq':
      return <FaqEditor props={props} onChange={handleChange} />;
    case 'contact':
      return <ContactEditor props={props} onChange={handleChange} />;
    case 'banner':
      return <BannerEditor props={props} onChange={handleChange} />;
    case 'stats':
      return <StatsEditor props={props} onChange={handleChange} />;
    case 'rich_text':
      return <RichTextEditor props={props} onChange={handleChange} />;
    case 'logo_grid':
      return <LogoGridEditor props={props} onChange={handleChange} />;
    default:
      return (
        <p className="text-sm text-zinc-500 italic">
          No editor available for section type "{section.type}".
        </p>
      );
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const PADDING_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'Extra Large' },
];

const BACKGROUND_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'surface', label: 'Surface' },
  { value: 'accent', label: 'Accent' },
  { value: 'gradient', label: 'Gradient' },
  { value: 'image', label: 'Image' },
  { value: 'transparent', label: 'Transparent' },
];

function formatSectionType(type) {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function BuilderPropertyEditor({
  section,
  onUpdateSection,
  onUpdateSectionProps,
  onClose,
}) {
  if (!section) return null;

  const Icon = SECTION_ICONS[section.type] || Layout;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={section.id}
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 20, opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="h-full flex flex-col bg-zinc-950 border-l border-zinc-800/60 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-cyan-400" />
            </div>
            <h3 className="text-sm font-semibold text-white truncate">
              {formatSectionType(section.type)}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-zinc-800/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Divider */}
        <div className="border-t border-zinc-800/60" />

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {/* Common controls */}
          <SelectInput
            label="Padding"
            value={section.padding ?? 'lg'}
            onChange={(v) => onUpdateSection(section.id, { padding: v })}
            options={PADDING_OPTIONS}
          />

          <SelectInput
            label="Background"
            value={section.background ?? 'default'}
            onChange={(v) => onUpdateSection(section.id, { background: v })}
            options={BACKGROUND_OPTIONS}
          />

          {section.background === 'image' && (
            <TextInput
              label="Background Image URL"
              value={section.backgroundImage}
              onChange={(v) => onUpdateSection(section.id, { backgroundImage: v })}
              placeholder="https://images.unsplash.com/..."
            />
          )}

          {section.background === 'gradient' && (
            <TextInput
              label="Background Gradient CSS"
              value={section.backgroundGradient}
              onChange={(v) => onUpdateSection(section.id, { backgroundGradient: v })}
              placeholder="linear-gradient(135deg, #06b6d4, #8b5cf6)"
            />
          )}

          <TextInput
            label="Custom Classes"
            value={section.customClasses ?? section.customClass}
            onChange={(v) => onUpdateSection(section.id, { customClasses: v })}
            placeholder="e.g. border-b border-zinc-800"
          />

          {/* Divider before section-specific */}
          <SectionDivider />

          {/* Section-specific controls */}
          <div className="pb-2">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">
              Section Properties
            </p>
            <SectionTypeEditor
              section={section}
              onUpdateSectionProps={onUpdateSectionProps}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
