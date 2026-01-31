import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { springs, hexToRgb } from "../lib/animations";

interface PulsingButtonProps {
  text: string;
  backgroundColor?: string;
  textColor?: string;
  delay?: number;
}

export const PulsingButton: React.FC<PulsingButtonProps> = ({
  text,
  backgroundColor = "#06b6d4",
  textColor = "#ffffff",
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const delayedFrame = Math.max(0, frame - delay);

  // Spring entrance
  const entrance = spring({ frame: delayedFrame, fps, config: springs.bouncy });
  const entranceScale = interpolate(entrance, [0, 1], [0.6, 1]);
  const opacity = interpolate(delayedFrame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Smooth pulse loop (sinusoidal, not linear keyframes)
  const pulsePhase = delayedFrame * 0.18;
  const pulseScale = delayedFrame > 20 ? 1 + Math.sin(pulsePhase) * 0.04 : entranceScale;

  // Glow that breathes
  const glowIntensity = delayedFrame > 20 ? 0.35 + Math.sin(pulsePhase) * 0.2 : 0;
  const glowSpread = delayedFrame > 20 ? 15 + Math.sin(pulsePhase) * 10 : 0;

  const rgb = hexToRgb(backgroundColor);

  return (
    <div
      style={{
        opacity,
        transform: `scale(${pulseScale})`,
        display: "inline-flex",
        justifyContent: "center",
        alignItems: "center",
        willChange: "transform, opacity",
      }}
    >
      <div
        style={{
          background: `linear-gradient(135deg, ${backgroundColor}, ${backgroundColor}dd)`,
          color: textColor,
          padding: "18px 56px",
          borderRadius: 14,
          fontSize: 26,
          fontWeight: 700,
          fontFamily: "Inter, sans-serif",
          boxShadow: `0 4px 20px rgba(${rgb}, 0.25), 0 0 ${glowSpread}px rgba(${rgb}, ${glowIntensity})`,
          letterSpacing: "0.01em",
          border: `1px solid rgba(255,255,255,0.1)`,
        }}
      >
        {text}
      </div>
    </div>
  );
};
