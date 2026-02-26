import { useMemo } from 'react';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { RotateCcw } from 'lucide-react';
import PersonalityRadarChart from './PersonalityRadarChart';
import { getIndustryDefaults } from './IndustryData';

const SLIDERS = [
  { index: 0, left: 'Heritage', right: 'Futuristic', key: 'temporal' },
  { index: 1, left: 'Calm', right: 'Dynamic', key: 'energy' },
  { index: 2, left: 'Serious', right: 'Playful', key: 'tone' },
  { index: 3, left: 'Accessible', right: 'Premium', key: 'market' },
  { index: 4, left: 'Minimal', right: 'Rich', key: 'density' },
];

const ADJECTIVE_MAP = {
  temporal: { low: ['Heritage', 'Timeless', 'Classic'], high: ['Modern', 'Innovative', 'Forward-thinking'] },
  energy: { low: ['Calm', 'Composed', 'Steady'], high: ['Dynamic', 'Energetic', 'Bold'] },
  tone: { low: ['Serious', 'Professional', 'Authoritative'], high: ['Playful', 'Fun', 'Approachable'] },
  market: { low: ['Accessible', 'Friendly', 'Inclusive'], high: ['Premium', 'Exclusive', 'Sophisticated'] },
  density: { low: ['Minimal', 'Clean', 'Sleek'], high: ['Rich', 'Detailed', 'Elaborate'] },
};

function getAdjectives(vector) {
  const tags = [];
  SLIDERS.forEach(({ index, key }) => {
    const val = vector[index] ?? 50;
    if (val <= 30) tags.push(ADJECTIVE_MAP[key].low[0]);
    else if (val >= 70) tags.push(ADJECTIVE_MAP[key].high[0]);
  });
  if (tags.length === 0) tags.push('Balanced');
  return tags;
}

export default function BrandPersonality({ data, onChange }) {
  const vector = data.personality_vector || [50, 50, 50, 50, 50];
  const adjectives = useMemo(() => getAdjectives(vector), [vector]);
  const industryDefaults = useMemo(
    () => getIndustryDefaults(data.industry?.primary),
    [data.industry?.primary]
  );

  const handleSliderChange = (index, newValue) => {
    const updated = [...vector];
    updated[index] = newValue[0];
    onChange({ personality_vector: updated });
  };

  const applyDefaults = () => {
    onChange({ personality_vector: [...industryDefaults] });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Brand Personality</h2>
        <p className="text-sm text-zinc-400">
          Position your brand on each spectrum. These drive every design decision downstream.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left: Sliders */}
        <div className="lg:col-span-3 space-y-6">
          {SLIDERS.map(({ index, left, right, key }) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400">{left}</span>
                <span className="text-[11px] font-mono text-zinc-600">{vector[index]}</span>
                <span className="text-xs font-medium text-zinc-400">{right}</span>
              </div>
              <Slider
                value={[vector[index]]}
                min={0}
                max={100}
                step={1}
                onValueChange={(val) => handleSliderChange(index, val)}
                className="[&_[data-slot=track]]:bg-zinc-700 [&_[data-slot=range]]:bg-yellow-400 [&_[data-slot=thumb]]:bg-yellow-400 [&_[data-slot=thumb]]:border-yellow-500"
              />
            </div>
          ))}

          {data.industry?.primary && (
            <button
              onClick={applyDefaults}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-yellow-400 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset to {data.industry.primary} defaults
            </button>
          )}

          {/* Adjective tags */}
          <div className="flex flex-wrap gap-2 pt-2">
            {adjectives.map((adj) => (
              <span
                key={adj}
                className="px-3 py-1 text-xs font-medium rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400"
              >
                {adj}
              </span>
            ))}
          </div>
        </div>

        {/* Right: Radar chart */}
        <div className="lg:col-span-2 flex flex-col items-center">
          <div className="w-full rounded-[20px] bg-zinc-900/60 backdrop-blur-xl border border-white/10 p-4">
            <PersonalityRadarChart personalityVector={vector} />
          </div>
        </div>
      </div>

      {/* Brand description */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">Brand Description</label>
        <Textarea
          value={data.personality_description || ''}
          onChange={(e) => onChange({ personality_description: e.target.value.slice(0, 500) })}
          placeholder="If your brand walked into a room, how would people describe them? Write 1-2 sentences."
          className="bg-zinc-800/50 border-zinc-700/60 text-white placeholder:text-zinc-600 focus:border-yellow-400/40 rounded-xl min-h-[100px] resize-none"
          maxLength={500}
        />
        <div className="flex justify-end">
          <span className="text-xs text-zinc-600">{(data.personality_description || '').length}/500</span>
        </div>
      </div>
    </div>
  );
}
