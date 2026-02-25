/**
 * RegenerateButton — button with spin animation and cooldown.
 */
import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';

export default function RegenerateButton({
  onClick,
  isLoading = false,
  label = 'Regenerate',
  cooldownMs = 3000,
  size = 'sm',
  className = '',
}) {
  const [onCooldown, setOnCooldown] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleClick = () => {
    if (isLoading || onCooldown) return;
    onClick();
    setOnCooldown(true);
    timerRef.current = setTimeout(() => setOnCooldown(false), cooldownMs);
  };

  const disabled = isLoading || onCooldown;
  const sizeClasses = size === 'sm'
    ? 'px-3 py-1.5 text-xs gap-1.5'
    : 'px-4 py-2 text-sm gap-2';

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`inline-flex items-center ${sizeClasses} rounded-lg border transition-colors ${
        disabled
          ? 'border-white/5 text-zinc-600 cursor-not-allowed'
          : 'border-white/10 text-zinc-400 hover:text-white hover:border-white/20 hover:bg-white/[0.05]'
      } ${className}`}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <RefreshCw className={`w-3.5 h-3.5 ${onCooldown ? 'animate-spin' : ''}`} />
      )}
      {label}
    </button>
  );
}
