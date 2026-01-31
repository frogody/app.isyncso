import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont();

interface AnimatedMetricCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  delay?: number;
  width?: number;
}

export const AnimatedMetricCard: React.FC<AnimatedMetricCardProps> = ({
  label,
  value,
  prefix = "",
  suffix = "",
  accentColor = "#06b6d4",
  backgroundColor = "rgba(255,255,255,0.04)",
  textColor = "#ffffff",
  delay = 0,
  width = 240,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({ frame: frame - delay, fps, config: { damping: 15, mass: 0.5, stiffness: 120 } });
  const scale = interpolate(progress, [0, 1], [0.85, 1]);
  const opacity = interpolate(frame, [delay, delay + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rotation = interpolate(progress, [0, 1], [1.5, 0]);

  const countProgress = interpolate(frame, [delay + 8, delay + 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const displayValue = Math.round(value * countProgress);

  const glowOpacity = frame > delay + 30 ? 0.15 + Math.sin((frame - delay) * 0.08) * 0.05 : 0;
  const glowHex = Math.round(glowOpacity * 255).toString(16).padStart(2, "0");

  const containerStyle: React.CSSProperties = {
    padding: 20, borderRadius: 14,
    background: backgroundColor,
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: `0 4px 20px rgba(0,0,0,0.2), 0 0 30px ${accentColor}${glowHex}`,
    opacity,
    transform: `scale(${scale}) rotate(${rotation}deg)`,
    fontFamily,
    flex: 1,
  };

  if (width > 0) {
    containerStyle.width = width;
  }

  return (
    <div style={containerStyle}>
      <div style={{ fontSize: 12, fontWeight: 500, color: textColor, opacity: 0.5, textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 36, fontWeight: 800, color: accentColor, letterSpacing: "-0.03em", lineHeight: 1 }}>
        {prefix}{displayValue.toLocaleString()}{suffix}
      </div>
    </div>
  );
};
