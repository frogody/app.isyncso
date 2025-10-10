import React from "react";

/**
 * Wraps Lucide icons with a subtle grey glow effect
 */
export default function IconWrapper({ 
  icon: Icon, 
  size = 20, 
  className = "",
  variant = "default", // default, accent, muted
  glow = true
}) {
  const styles = {
    default: {
      color: '#E9F0F1',
      filter: glow ? 'drop-shadow(0 0 8px rgba(233, 240, 241, 0.3))' : 'none'
    },
    accent: {
      color: '#EF4444',
      filter: glow ? 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.4))' : 'none'
    },
    muted: {
      color: '#B5C0C4',
      filter: glow ? 'drop-shadow(0 0 6px rgba(181, 192, 196, 0.2))' : 'none'
    }
  };

  const currentStyle = styles[variant] || styles.default;

  return (
    <Icon 
      size={size}
      className={className}
      style={{
        color: currentStyle.color,
        filter: currentStyle.filter
      }}
    />
  );
}