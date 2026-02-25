import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Plus, X } from 'lucide-react';

function TagInput({ items = [], onAdd, onRemove, placeholder, maxItems = 10, variant = 'yellow' }) {
  const [val, setVal] = useState('');
  const colors = variant === 'red'
    ? 'bg-red-500/10 text-red-400 border-red-500/20'
    : 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20';

  const handleAdd = () => {
    const trimmed = val.trim();
    if (!trimmed || items.length >= maxItems) return;
    if (!items.includes(trimmed)) {
      onAdd(trimmed);
    }
    setVal('');
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
          placeholder={placeholder}
          disabled={items.length >= maxItems}
          className="bg-zinc-800/50 border-zinc-700/60 text-white placeholder:text-zinc-600 focus:border-yellow-400/40 rounded-xl text-sm"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={items.length >= maxItems}
          className="shrink-0 p-2.5 rounded-xl bg-zinc-800/50 border border-zinc-700/60 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span
              key={item}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border cursor-pointer hover:opacity-80 transition-opacity ${colors}`}
              onClick={() => onRemove(item)}
            >
              {item}
              <X className="w-3 h-3" />
            </span>
          ))}
        </div>
      )}
      {items.length >= maxItems && (
        <p className="text-xs text-zinc-600">Maximum {maxItems} items</p>
      )}
    </div>
  );
}

function FormField({ label, children, helper }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-300">{label}</label>
      {children}
      {helper && <p className="text-xs text-zinc-600">{helper}</p>}
    </div>
  );
}

export default function StrategicInputs({ data, onChange }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Strategic Inputs</h2>
        <p className="text-sm text-zinc-400">
          Help us understand your market position. All fields are optional — the more you provide, the sharper your brand strategy will be.
        </p>
      </div>

      <FormField
        label="What problem does your company solve?"
        helper='E.g., "Small businesses waste hours on manual invoicing"'
      >
        <Textarea
          value={data._problem || ''}
          onChange={(e) => onChange({ _problem: e.target.value.slice(0, 500) })}
          placeholder="Describe the core problem you solve..."
          className="bg-zinc-800/50 border-zinc-700/60 text-white placeholder:text-zinc-600 focus:border-yellow-400/40 rounded-xl min-h-[80px] resize-none"
          maxLength={500}
        />
      </FormField>

      <FormField
        label="Who is your ideal customer?"
        helper='E.g., "Marketing managers at mid-size B2B companies"'
      >
        <Textarea
          value={data._ideal_customer || ''}
          onChange={(e) => onChange({ _ideal_customer: e.target.value.slice(0, 500) })}
          placeholder="Describe your ideal customer..."
          className="bg-zinc-800/50 border-zinc-700/60 text-white placeholder:text-zinc-600 focus:border-yellow-400/40 rounded-xl min-h-[80px] resize-none"
          maxLength={500}
        />
      </FormField>

      <FormField
        label="What makes you different?"
        helper={`E.g., "We're the only platform that combines AI training with compliance automation"`}
      >
        <Textarea
          value={data._differentiator || ''}
          onChange={(e) => onChange({ _differentiator: e.target.value.slice(0, 500) })}
          placeholder="Describe your key differentiator..."
          className="bg-zinc-800/50 border-zinc-700/60 text-white placeholder:text-zinc-600 focus:border-yellow-400/40 rounded-xl min-h-[80px] resize-none"
          maxLength={500}
        />
      </FormField>

      <FormField label="Competitor Brands">
        <TagInput
          items={data.competitor_brands || []}
          onAdd={(item) => onChange({ competitor_brands: [...(data.competitor_brands || []), item] })}
          onRemove={(item) => onChange({ competitor_brands: (data.competitor_brands || []).filter(i => i !== item) })}
          placeholder="Type a competitor name and press Enter"
          maxItems={5}
        />
      </FormField>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FormField label="Words that MUST describe your brand">
          <TagInput
            items={data.must_words || []}
            onAdd={(item) => onChange({ must_words: [...(data.must_words || []), item] })}
            onRemove={(item) => onChange({ must_words: (data.must_words || []).filter(i => i !== item) })}
            placeholder="e.g. innovative, reliable"
            maxItems={10}
          />
        </FormField>

        <FormField label="Words that must NOT describe your brand">
          <TagInput
            items={data.must_not_words || []}
            onAdd={(item) => onChange({ must_not_words: [...(data.must_not_words || []), item] })}
            onRemove={(item) => onChange({ must_not_words: (data.must_not_words || []).filter(i => i !== item) })}
            placeholder="e.g. cheap, boring"
            maxItems={10}
            variant="red"
          />
        </FormField>
      </div>
    </div>
  );
}
