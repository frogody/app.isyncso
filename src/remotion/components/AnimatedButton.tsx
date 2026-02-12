import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });

interface AnimatedButtonProps {
  text: string;
  accentColor?: string;
  textColor?: string;
  delay?: number;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  text,
  accentColor = "#06b6d4",
  textColor = "#ffffff",
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({ frame: frame - delay, fps, config: { damping: 12, mass: 0.5 } });
  const scale = interpolate(progress, [0, 1], [0.7, 1]);
  const opacity = interpolate(frame, [delay, delay + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const pulse = frame > delay + 20 ? 1 + Math.sin((frame - delay) * 0.1) * 0.03 : scale;
  const glowSize = frame > delay + 20 ? 15 + Math.sin((frame - delay) * 0.1) * 8 : 0;

  return (
    <div style={{
      padding: "16px 48px", borderRadius: 12,
      background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
      boxShadow: `0 4px 20px ${accentColor}50, 0 0 ${glowSize}px ${accentColor}30`,
      opacity,
      transform: `scale(${pulse})`,
      fontFamily,
    }}>
      <span style={{ fontSize: 18, fontWeight: 700, color: textColor, letterSpacing: "-0.01em" }}>{text}</span>
    </div>
  );
};
