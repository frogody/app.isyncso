/**
 * Read-only specification table showing all 15 type levels.
 */

const LEVEL_ORDER = [
  'display_1', 'display_2', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'body_large', 'body', 'body_small', 'caption', 'overline', 'button', 'code',
];

const LEVEL_LABELS = {
  display_1: 'Display 1',
  display_2: 'Display 2',
  h1: 'H1', h2: 'H2', h3: 'H3', h4: 'H4', h5: 'H5', h6: 'H6',
  body_large: 'Body Lg',
  body: 'Body',
  body_small: 'Body Sm',
  caption: 'Caption',
  overline: 'Overline',
  button: 'Button',
  code: 'Code',
};

export default function TypeSpecTable({ scale }) {
  if (!scale) return null;

  return (
    <div className="rounded-[16px] bg-zinc-900/40 border border-white/[0.06] p-4 space-y-3">
      <h3 className="text-sm font-semibold text-white">Type Scale Specifications</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-[10px] text-zinc-400">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left py-1.5 px-1 text-zinc-500 font-medium">Level</th>
              <th className="text-left py-1.5 px-1 text-zinc-500 font-medium">Font</th>
              <th className="text-right py-1.5 px-1 text-zinc-500 font-medium">Weight</th>
              <th className="text-right py-1.5 px-1 text-zinc-500 font-medium">Size</th>
              <th className="text-right py-1.5 px-1 text-zinc-500 font-medium">Rem</th>
              <th className="text-right py-1.5 px-1 text-zinc-500 font-medium">LH</th>
              <th className="text-right py-1.5 px-1 text-zinc-500 font-medium">LS</th>
              <th className="text-right py-1.5 px-1 text-zinc-500 font-medium">Mobile</th>
              <th className="text-right py-1.5 px-1 text-zinc-500 font-medium">Tablet</th>
            </tr>
          </thead>
          <tbody>
            {LEVEL_ORDER.map((key) => {
              const spec = scale[key];
              if (!spec) return null;
              return (
                <tr key={key} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="py-1.5 px-1 text-zinc-300 font-medium">{LEVEL_LABELS[key]}</td>
                  <td className="py-1.5 px-1 text-zinc-400 truncate max-w-[80px]">{spec.font_family}</td>
                  <td className="py-1.5 px-1 text-right">{spec.font_weight}</td>
                  <td className="py-1.5 px-1 text-right text-zinc-300">{spec.font_size_px}px</td>
                  <td className="py-1.5 px-1 text-right">{spec.font_size_rem}</td>
                  <td className="py-1.5 px-1 text-right">{spec.line_height}</td>
                  <td className="py-1.5 px-1 text-right">{spec.letter_spacing}</td>
                  <td className="py-1.5 px-1 text-right">{spec.responsive?.mobile_size_px}px</td>
                  <td className="py-1.5 px-1 text-right">{spec.responsive?.tablet_size_px}px</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
