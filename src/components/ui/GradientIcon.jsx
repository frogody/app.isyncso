import React from "react";

export default function GradientIcon({ 
  icon: Icon, 
  size = 20, 
  className = "",
  variant = "default" // default, accent, muted
}) {
  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;
  
  const variants = {
    default: {
      gradient: [
        { color: '#EF4444', opacity: 1, offset: '0%' },
        { color: '#DC2626', opacity: 0.9, offset: '50%' },
        { color: '#B91C1C', opacity: 0.7, offset: '100%' }
      ],
      glow: 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.3))'
    },
    accent: {
      gradient: [
        { color: '#EF4444', opacity: 1, offset: '0%' },
        { color: '#DC2626', opacity: 0.95, offset: '100%' }
      ],
      glow: 'drop-shadow(0 0 12px rgba(239, 68, 68, 0.4))'
    },
    muted: {
      gradient: [
        { color: '#B5C0C4', opacity: 0.9, offset: '0%' },
        { color: '#8B9599', opacity: 0.6, offset: '100%' }
      ],
      glow: 'drop-shadow(0 0 4px rgba(181, 192, 196, 0.2))'
    }
  };

  const currentVariant = variants[variant] || variants.default;

  return (
    <div 
      className={`inline-flex ${className}`}
      style={{ 
        width: size, 
        height: size,
        filter: currentVariant.glow
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            {currentVariant.gradient.map((stop, idx) => (
              <stop 
                key={idx}
                offset={stop.offset} 
                stopColor={stop.color} 
                stopOpacity={stop.opacity} 
              />
            ))}
          </linearGradient>
        </defs>
        <g fill={`url(#${gradientId})`}>
          <Icon size={size} />
        </g>
      </svg>
    </div>
  );
}