/**
 * Sub-step 4: Logo System Preview.
 * Shows all 6 variations × 7 color modes, clear space, min sizes, don'ts, construction grid.
 */
import { useState } from 'react';
import { X } from 'lucide-react';

const COLOR_MODE_GROUPS = {
  full_color: {
    label: 'Full Color',
    modes: ['full_color_light', 'full_color_dark', 'full_color_on_brand'],
  },
  mono: {
    label: 'Mono',
    modes: ['mono_black', 'mono_white', 'reversed'],
  },
  grayscale: {
    label: 'Grayscale',
    modes: ['grayscale'],
  },
};

const VARIATION_LABELS = {
  primary: 'Primary',
  secondary: 'Secondary',
  submark: 'Submark',
  wordmark: 'Wordmark',
  favicon: 'Favicon',
  social_avatar: 'Social Avatar',
};

const MODE_LABELS = {
  full_color_light: 'Light',
  full_color_dark: 'Dark',
  full_color_on_brand: 'On Brand',
  reversed: 'Reversed',
  mono_black: 'Black',
  mono_white: 'White',
  grayscale: 'Grayscale',
};

const MODE_BG = {
  full_color_light: 'bg-white',
  full_color_dark: 'bg-zinc-900',
  full_color_on_brand: '', // use brand color
  reversed: 'bg-zinc-800',
  mono_black: 'bg-white',
  mono_white: 'bg-zinc-900',
  grayscale: 'bg-white',
};

export default function LogoSystemPreview({ logoSystem, palette }) {
  const [colorModeTab, setColorModeTab] = useState('full_color');

  if (!logoSystem) return null;

  const { variations, rules, grid } = logoSystem;
  const currentGroup = COLOR_MODE_GROUPS[colorModeTab];
  const brandBg = palette?.primary?.base || '#3B82F6';

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Your Complete Logo System</h2>
        <p className="text-sm text-zinc-400">All variations and usage guidelines in one place.</p>
      </div>

      {/* Variation Grid with Color Mode Tabs */}
      <section>
        <div className="flex gap-2 mb-5">
          {Object.entries(COLOR_MODE_GROUPS).map(([key, group]) => (
            <button
              key={key}
              onClick={() => setColorModeTab(key)}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
                colorModeTab === key
                  ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/40'
                  : 'bg-zinc-800/60 text-zinc-500 border border-white/[0.06] hover:border-white/20'
              }`}
            >
              {group.label}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {Object.entries(variations).map(([varName, variation]) => (
            <div key={varName}>
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
                {VARIATION_LABELS[varName] || varName}
              </h3>
              <div className={`grid gap-3 ${
                currentGroup.modes.length === 1 ? 'grid-cols-1 max-w-xs'
                : currentGroup.modes.length === 2 ? 'grid-cols-2'
                : 'grid-cols-3'
              }`}>
                {currentGroup.modes.map((mode) => (
                  <ColorModeCard
                    key={mode}
                    mode={mode}
                    svg={variation.color_modes?.[mode] || ''}
                    brandBg={brandBg}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Clear Space Rules */}
      {rules && (
        <Section title="Clear Space Rules">
          <div className="rounded-[20px] bg-white/[0.03] border border-white/10 p-8 flex items-center justify-center">
            <div className="relative inline-block">
              {/* Logo */}
              <div
                dangerouslySetInnerHTML={{ __html: variations?.primary?.color_modes?.full_color_light || '' }}
                className="[&>svg]:w-48 [&>svg]:h-auto"
              />
              {/* Clear space overlay */}
              <div
                className="absolute border-2 border-dashed border-yellow-400/50 pointer-events-none"
                style={{
                  top: `-${rules.clear_space.value * 20}px`,
                  left: `-${rules.clear_space.value * 20}px`,
                  right: `-${rules.clear_space.value * 20}px`,
                  bottom: `-${rules.clear_space.value * 20}px`,
                }}
              />
            </div>
          </div>
          <p className="text-xs text-zinc-400 mt-3">{rules.clear_space.description}</p>
        </Section>
      )}

      {/* Minimum Sizes */}
      {rules?.minimum_size && (
        <Section title="Minimum Sizes">
          <div className="flex gap-8">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center p-3">
                <div
                  dangerouslySetInnerHTML={{ __html: variations?.primary?.color_modes?.full_color_light || '' }}
                  className="[&>svg]:max-w-full [&>svg]:max-h-full"
                />
              </div>
              <div>
                <div className="text-lg font-semibold text-white">{rules.minimum_size.digital_px}px</div>
                <div className="text-xs text-zinc-500">Digital minimum</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center p-3">
                <div
                  dangerouslySetInnerHTML={{ __html: variations?.primary?.color_modes?.mono_black || '' }}
                  className="[&>svg]:max-w-full [&>svg]:max-h-full"
                />
              </div>
              <div>
                <div className="text-lg font-semibold text-white">{rules.minimum_size.print_mm}mm</div>
                <div className="text-xs text-zinc-500">Print minimum</div>
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* Usage Don'ts */}
      {rules?.donts?.length > 0 && (
        <Section title="Usage Don'ts">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {rules.donts.map((dont) => (
              <DontCard key={dont.rule_id} dont={dont} />
            ))}
          </div>
        </Section>
      )}

      {/* Construction Grid */}
      {grid && (
        <Section title="Construction Grid">
          <div className="rounded-[20px] bg-white/[0.03] border border-white/10 p-8 flex items-center justify-center">
            <div
              dangerouslySetInnerHTML={{ __html: grid.svg }}
              className="[&>svg]:w-full [&>svg]:max-w-lg [&>svg]:h-auto"
            />
          </div>
          <p className="text-xs text-zinc-400 mt-3">{grid.description}</p>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-white mb-4">{title}</h3>
      {children}
    </section>
  );
}

function ColorModeCard({ mode, svg, brandBg }) {
  const bgClass = MODE_BG[mode];
  const isOnBrand = mode === 'full_color_on_brand';

  return (
    <div className="space-y-1.5">
      <div
        className={`aspect-[3/2] rounded-xl p-4 flex items-center justify-center overflow-hidden ${bgClass} ${
          !bgClass && !isOnBrand ? 'bg-white' : ''
        }`}
        style={isOnBrand ? { backgroundColor: brandBg } : undefined}
      >
        <div
          dangerouslySetInnerHTML={{ __html: svg }}
          className="w-full h-full [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto"
        />
      </div>
      <div className="text-[10px] text-zinc-500 text-center">
        {MODE_LABELS[mode] || mode}
      </div>
    </div>
  );
}

function DontCard({ dont }) {
  return (
    <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 space-y-2">
      <div className="aspect-square bg-white rounded-lg p-2 flex items-center justify-center relative overflow-hidden">
        <div
          dangerouslySetInnerHTML={{ __html: dont.example_svg }}
          className="w-full h-full [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto"
        />
        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
          <X className="w-3 h-3 text-white" />
        </div>
      </div>
      <p className="text-[10px] text-zinc-400 leading-tight">{dont.description}</p>
    </div>
  );
}
