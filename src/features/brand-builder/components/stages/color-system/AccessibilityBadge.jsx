/**
 * Small pill badge showing AA/AAA pass or Fail status.
 */
export default function AccessibilityBadge({ level = 'aa', passing = false }) {
  const label = level.toUpperCase();

  if (passing) {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-green-500/15 text-green-400 border border-green-500/20">
        {label} ✓
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-500/15 text-red-400 border border-red-500/20">
      {label} ✗
    </span>
  );
}
