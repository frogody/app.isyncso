import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Pencil, Check, Plus, X, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import PersonalityRadarChart from './PersonalityRadarChart';

function InlineEdit({ value, onChange, multiline = false, placeholder = '' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const save = () => {
    onChange(draft);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="space-y-2">
        {multiline ? (
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="bg-zinc-800/50 border-zinc-700/60 text-white placeholder:text-zinc-600 focus:border-yellow-400/40 rounded-xl min-h-[80px] resize-none text-sm"
            placeholder={placeholder}
            autoFocus
          />
        ) : (
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="bg-zinc-800/50 border-zinc-700/60 text-white placeholder:text-zinc-600 focus:border-yellow-400/40 rounded-xl text-sm"
            placeholder={placeholder}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
        )}
        <div className="flex gap-2">
          <button onClick={save} className="px-3 py-1 text-xs font-medium rounded-lg bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20 transition-colors">
            Save
          </button>
          <button onClick={cancel} className="px-3 py-1 text-xs font-medium rounded-lg bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group cursor-pointer p-3 rounded-xl hover:bg-white/[0.03] transition-colors"
      onClick={() => { setDraft(value); setEditing(true); }}
    >
      <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
        {value || <span className="text-zinc-600 italic">{placeholder || 'Click to edit...'}</span>}
      </p>
      <Pencil className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
    </div>
  );
}

function ValueCard({ value, index, onUpdate, onRemove }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl bg-zinc-800/40 border border-zinc-700/40 p-4 space-y-2">
      <div className="flex items-start justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-left flex-1"
        >
          <span className="w-6 h-6 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-xs font-bold flex items-center justify-center shrink-0">
            {index + 1}
          </span>
          <span className="text-sm font-medium text-white">{value.name || 'Untitled Value'}</span>
          {expanded ? <ChevronUp className="w-3 h-3 text-zinc-500" /> : <ChevronDown className="w-3 h-3 text-zinc-500" />}
        </button>
        <button
          onClick={onRemove}
          className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="space-y-3 pl-8">
          <div>
            <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Name</label>
            <Input
              value={value.name || ''}
              onChange={(e) => onUpdate({ ...value, name: e.target.value })}
              className="bg-zinc-900/50 border-zinc-700/40 text-white text-sm rounded-lg mt-1"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Description</label>
            <Textarea
              value={value.description || ''}
              onChange={(e) => onUpdate({ ...value, description: e.target.value })}
              className="bg-zinc-900/50 border-zinc-700/40 text-white text-sm rounded-lg mt-1 min-h-[60px] resize-none"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Behavioral Example</label>
            <Textarea
              value={value.behavioral_example || ''}
              onChange={(e) => onUpdate({ ...value, behavioral_example: e.target.value })}
              className="bg-zinc-900/50 border-zinc-700/40 text-white text-sm rounded-lg mt-1 min-h-[60px] resize-none"
            />
          </div>
        </div>
      )}

      {!expanded && value.description && (
        <p className="text-xs text-zinc-500 pl-8 line-clamp-1">{value.description}</p>
      )}
    </div>
  );
}

function Section({ title, children, badge }) {
  return (
    <div className="rounded-[16px] bg-zinc-900/40 border border-white/[0.06] p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {badge}
      </div>
      {children}
    </div>
  );
}

export default function BrandDNAReview({ data, onChange, onEditPersonality }) {
  const strategy = data.strategy || {};
  const values = strategy.values || [];

  const updateStrategy = (patch) => {
    onChange({ strategy: { ...strategy, ...patch } });
  };

  const updatePositioning = (patch) => {
    updateStrategy({
      positioning: { ...(strategy.positioning || {}), ...patch },
    });
  };

  const addValue = () => {
    updateStrategy({
      values: [...values, { name: '', description: '', behavioral_example: '' }],
    });
  };

  const removeValue = (idx) => {
    updateStrategy({ values: values.filter((_, i) => i !== idx) });
  };

  const updateValue = (idx, updated) => {
    const next = [...values];
    next[idx] = updated;
    updateStrategy({ values: next });
  };

  const selectTagline = (tagline) => {
    onChange({ tagline });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Brand DNA Review</h2>
        <p className="text-sm text-zinc-400">
          Review and refine your brand strategy. Click any text to edit. All fields must pass validation to continue.
        </p>
      </div>

      {/* Personality radar + edit link */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <div className="rounded-[16px] bg-zinc-900/40 border border-white/[0.06] p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-white">Personality</h3>
              <button
                onClick={onEditPersonality}
                className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors flex items-center gap-1"
              >
                <Pencil className="w-3 h-3" /> Edit
              </button>
            </div>
            <PersonalityRadarChart personalityVector={data.personality_vector || [50, 50, 50, 50, 50]} />
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {/* Mission */}
          <Section title="Mission">
            <InlineEdit
              value={strategy.mission || ''}
              onChange={(v) => updateStrategy({ mission: v })}
              placeholder="What you do and for whom (one sentence)"
            />
          </Section>

          {/* Vision */}
          <Section title="Vision">
            <InlineEdit
              value={strategy.vision || ''}
              onChange={(v) => updateStrategy({ vision: v })}
              placeholder="The world you're building toward (one sentence)"
            />
          </Section>
        </div>
      </div>

      {/* Values */}
      <Section
        title="Brand Values"
        badge={
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${values.length >= 2 ? 'bg-yellow-400/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}`}>
            {values.length} value{values.length !== 1 ? 's' : ''} {values.length < 2 ? '(min 2)' : ''}
          </span>
        }
      >
        <div className="space-y-2">
          {values.map((val, i) => (
            <ValueCard
              key={i}
              value={val}
              index={i}
              onUpdate={(v) => updateValue(i, v)}
              onRemove={() => removeValue(i)}
            />
          ))}
        </div>
        {values.length < 7 && (
          <button
            onClick={addValue}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-yellow-400 transition-colors mt-2"
          >
            <Plus className="w-3.5 h-3.5" /> Add value
          </button>
        )}
      </Section>

      {/* Positioning */}
      <Section title="Positioning Statement">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Target Audience</label>
            <InlineEdit
              value={strategy.positioning?.target || ''}
              onChange={(v) => updatePositioning({ target: v })}
              placeholder="Who you serve"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Category</label>
            <InlineEdit
              value={strategy.positioning?.category || ''}
              onChange={(v) => updatePositioning({ category: v })}
              placeholder="Market category"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Differentiation</label>
            <InlineEdit
              value={strategy.positioning?.differentiation || ''}
              onChange={(v) => updatePositioning({ differentiation: v })}
              placeholder="What makes you different"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Reason to Believe</label>
            <InlineEdit
              value={strategy.positioning?.reason_to_believe || ''}
              onChange={(v) => updatePositioning({ reason_to_believe: v })}
              placeholder="Why it's credible"
            />
          </div>
        </div>
        <div className="mt-3 p-3 rounded-xl bg-yellow-400/[0.04] border border-yellow-400/10">
          <p className="text-xs text-zinc-500 mb-1 font-medium">Full Statement</p>
          <InlineEdit
            value={strategy.positioning?.statement || ''}
            onChange={(v) => updatePositioning({ statement: v })}
            multiline
            placeholder="For [target], [brand] is the [category] that [differentiation] because [reason_to_believe]."
          />
        </div>
      </Section>

      {/* Brand Story */}
      <Section title="Brand Story">
        <InlineEdit
          value={strategy.brand_story || ''}
          onChange={(v) => updateStrategy({ brand_story: v })}
          multiline
          placeholder="150-250 word narrative with emotional arc"
        />
      </Section>

      {/* Tagline Options */}
      <Section
        title="Tagline"
        badge={
          data.tagline ? (
            <span className="flex items-center gap-1 text-xs text-yellow-400">
              <Check className="w-3 h-3" /> Selected
            </span>
          ) : (
            <span className="text-xs text-zinc-600">Click to select</span>
          )
        }
      >
        <div className="flex flex-wrap gap-2">
          {(strategy.tagline_options || []).map((tag) => (
            <button
              key={tag}
              onClick={() => selectTagline(tag)}
              className={`px-4 py-2 text-sm rounded-full border transition-all ${
                data.tagline === tag
                  ? 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400 font-medium'
                  : 'bg-zinc-800/50 border-zinc-700/40 text-zinc-400 hover:border-zinc-500 hover:text-white'
              }`}
            >
              {data.tagline === tag && <Sparkles className="w-3 h-3 inline mr-1.5" />}
              {tag}
            </button>
          ))}
        </div>
      </Section>

      {/* Elevator Pitch */}
      <Section title="Elevator Pitch">
        <InlineEdit
          value={strategy.elevator_pitch || ''}
          onChange={(v) => updateStrategy({ elevator_pitch: v })}
          multiline
          placeholder="30-second version, 3-4 sentences max"
        />
      </Section>
    </div>
  );
}
