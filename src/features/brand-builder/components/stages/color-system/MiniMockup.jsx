/**
 * ~200px tall mini website mockup using palette colors.
 * All styles are inline, driven entirely by the palette prop.
 */
export default function MiniMockup({ palette, compact = false }) {
  if (!palette) return null;

  const p = palette.primary?.base || '#333';
  const s = palette.secondary?.base || '#666';
  const a = palette.accent?.base || '#FF6B35';
  const nb = palette.neutrals?.near_black || '#1a1a1a';
  const lg = palette.neutrals?.light_gray || '#f5f5f5';
  const wh = palette.neutrals?.white || '#ffffff';
  const mg = palette.neutrals?.mid_gray || '#888';

  const h = compact ? 120 : 200;

  return (
    <div
      style={{ background: lg, borderRadius: 8, overflow: 'hidden', height: h }}
      className="w-full relative select-none"
    >
      {/* Header bar */}
      <div style={{ background: p, height: compact ? 18 : 28 }} className="flex items-center px-2 gap-1">
        <div style={{ width: compact ? 4 : 6, height: compact ? 4 : 6, borderRadius: '50%', background: wh, opacity: 0.6 }} />
        <div style={{ width: compact ? 20 : 40, height: compact ? 3 : 4, borderRadius: 2, background: wh, opacity: 0.4 }} />
      </div>

      <div className="p-2 space-y-1.5" style={{ padding: compact ? 6 : 10 }}>
        {/* Heading */}
        <div
          style={{
            width: '70%',
            height: compact ? 6 : 10,
            borderRadius: 3,
            background: nb,
          }}
        />
        {/* Subtext */}
        <div
          style={{
            width: '50%',
            height: compact ? 4 : 6,
            borderRadius: 2,
            background: mg,
            opacity: 0.6,
          }}
        />

        {/* CTA button */}
        <div
          style={{
            display: 'inline-block',
            padding: compact ? '3px 8px' : '4px 14px',
            borderRadius: 4,
            background: a,
            marginTop: compact ? 4 : 8,
          }}
        >
          <div
            style={{
              width: compact ? 20 : 35,
              height: compact ? 4 : 5,
              borderRadius: 2,
              background: wh,
            }}
          />
        </div>

        {/* Small card */}
        <div
          style={{
            background: wh,
            border: `1px solid ${lg}`,
            borderRadius: 4,
            padding: compact ? 4 : 8,
            marginTop: compact ? 4 : 10,
          }}
        >
          <div style={{ width: '60%', height: compact ? 3 : 5, borderRadius: 2, background: s, opacity: 0.7 }} />
          <div style={{ width: '40%', height: compact ? 2 : 4, borderRadius: 2, background: mg, opacity: 0.4, marginTop: 3 }} />
        </div>
      </div>
    </div>
  );
}
