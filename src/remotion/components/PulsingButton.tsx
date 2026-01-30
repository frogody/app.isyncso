import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

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

  // Fade in
  const opacity = interpolate(delayedFrame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Looping pulse: cycle every 30 frames
  const cycleFrame = delayedFrame % 30;
  const pulseScale = interpolate(cycleFrame, [0, 15, 30], [1, 1.08, 1], {
    extrapolateRight: "clamp",
  });

  // Looping glow shadow
  const glowIntensity = interpolate(cycleFrame, [0, 15, 30], [0.3, 0.7, 0.3], {
    extrapolateRight: "clamp",
  });

  const glowSpread = interpolate(cycleFrame, [0, 15, 30], [10, 25, 10], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        opacity,
        transform: `scale(${pulseScale})`,
        display: "inline-flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          backgroundColor,
          color: textColor,
          padding: "18px 56px",
          borderRadius: 16,
          fontSize: 28,
          fontWeight: 700,
          fontFamily: "Inter, sans-serif",
          boxShadow: `0 0 ${glowSpread}px ${glowSpread / 2}px rgba(${hexToRgb(backgroundColor)}, ${glowIntensity})`,
          letterSpacing: "0.02em",
        }}
      >
        {text}
      </div>
    </div>
  );
};

function hexToRgb(hex: string): string {
  const cleaned = hex.replace("#", "");
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}
