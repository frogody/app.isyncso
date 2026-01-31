import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

interface DynamicBackgroundProps {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}

export const DynamicBackground: React.FC<DynamicBackgroundProps> = ({
  primaryColor = "#0f0f0f",
  secondaryColor = "#1a1a2e",
  accentColor = "#06b6d4",
}) => {
  const frame = useCurrentFrame();

  const gradientAngle = interpolate(frame, [0, 360], [135, 225], { extrapolateRight: "clamp" });
  const meshX = 50 + Math.sin(frame * 0.02) * 20;
  const meshY = 50 + Math.cos(frame * 0.015) * 20;

  const gridOpacity = interpolate(frame, [0, 30], [0, 0.06], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const particles = Array.from({ length: 20 }, (_, i) => {
    const seed = i * 137.508;
    const baseX = (seed * 7.3) % 100;
    const baseY = (seed * 13.1) % 100;
    const speed = 0.3 + (i % 5) * 0.15;
    const size = 2 + (i % 3) * 1.5;
    const x = baseX + Math.sin(frame * speed * 0.01 + i) * 8;
    const y = baseY + Math.cos(frame * speed * 0.012 + i * 0.7) * 6;
    const opacity = interpolate(frame, [0, 20 + i * 2, 340, 360], [0, 0.3 + (i % 3) * 0.1, 0.3, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return { x, y, size, opacity };
  });

  return (
    <AbsoluteFill>
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(${gradientAngle}deg, ${primaryColor} 0%, ${secondaryColor} 50%, ${primaryColor} 100%)`,
      }} />

      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse at ${meshX}% ${meshY}%, ${accentColor}15 0%, transparent 50%)`,
      }} />

      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse at ${100 - meshX}% ${100 - meshY}%, ${accentColor}0a 0%, transparent 40%)`,
      }} />

      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: gridOpacity }}>
        {Array.from({ length: 20 }, (_, i) => {
          const pulse = Math.sin(frame * 0.03 + i * 0.5) * 0.3 + 0.7;
          return (
            <g key={i}>
              <line x1={`${(i + 1) * 5}%`} y1="0" x2={`${(i + 1) * 5}%`} y2="100%" stroke={accentColor} strokeWidth={0.5} opacity={pulse * 0.5} />
              <line x1="0" y1={`${(i + 1) * 5}%`} x2="100%" y2={`${(i + 1) * 5}%`} stroke={accentColor} strokeWidth={0.5} opacity={pulse * 0.5} />
            </g>
          );
        })}
      </svg>

      {particles.map((p, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${p.x}%`,
          top: `${p.y}%`,
          width: p.size,
          height: p.size,
          borderRadius: "50%",
          backgroundColor: accentColor,
          opacity: p.opacity,
          filter: `blur(${p.size > 3 ? 1 : 0}px)`,
        }} />
      ))}
    </AbsoluteFill>
  );
};
