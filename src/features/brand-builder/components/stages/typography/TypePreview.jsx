/**
 * Live type hierarchy preview — renders all 15 scale levels with actual styles.
 */

const PREVIEW_LEVELS = [
  { key: 'display_1', label: 'Display 1' },
  { key: 'display_2', label: 'Display 2' },
  { key: 'h1', label: 'H1' },
  { key: 'h2', label: 'H2' },
  { key: 'h3', label: 'H3' },
  { key: 'h4', label: 'H4' },
  { key: 'h5', label: 'H5' },
  { key: 'h6', label: 'H6' },
  { key: 'body_large', label: 'Body Large' },
  { key: 'body', label: 'Body' },
  { key: 'body_small', label: 'Body Small' },
  { key: 'caption', label: 'Caption' },
  { key: 'overline', label: 'Overline' },
  { key: 'button', label: 'Button' },
  { key: 'code', label: 'Code' },
];

export default function TypePreview({ scale, palette }) {
  if (!scale) return null;

  const bg = palette?.neutrals?.white || '#FAFAFA';
  const textColor = palette?.neutrals?.near_black || '#1a1a1a';
  const primary = palette?.primary?.base || '#333';

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: bg }}>
      <div className="p-4 space-y-1">
        {PREVIEW_LEVELS.map(({ key, label }) => {
          const spec = scale[key];
          if (!spec) return null;

          const isHeading = ['display_1', 'display_2', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(key);

          return (
            <div key={key} className="flex items-baseline gap-3">
              <span
                className="text-[8px] w-14 text-right shrink-0 leading-none"
                style={{ color: textColor, opacity: 0.3 }}
              >
                {label}
              </span>
              <span
                style={{
                  fontFamily: `'${spec.font_family}', sans-serif`,
                  fontSize: Math.min(spec.font_size_px, 48), // cap display sizes for preview
                  fontWeight: spec.font_weight,
                  lineHeight: spec.line_height,
                  letterSpacing: spec.letter_spacing,
                  textTransform: spec.text_transform,
                  color: isHeading ? primary : textColor,
                }}
              >
                {key === 'code' ? 'const brand = true;' : 'The quick brown fox'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
