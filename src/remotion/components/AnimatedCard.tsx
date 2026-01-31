import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont();

interface DesignTokens {
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  borderRadius?: number;
  shadowStyle?: "none" | "subtle" | "medium" | "strong";
  cardStyle?: "flat" | "elevated" | "bordered" | "glass";
}

interface AnimatedCardProps {
  title: string;
  description?: string;
  icon?: string;
  delay?: number;
  tokens?: DesignTokens;
  width?: number;
  height?: number;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  title,
  description,
  icon,
  delay = 0,
  tokens = {},
  width = 380,
  height = 220,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const {
    backgroundColor = "rgba(255,255,255,0.05)",
    textColor = "#ffffff",
    accentColor = "#06b6d4",
    borderRadius = 16,
    shadowStyle = "medium",
    cardStyle = "elevated",
  } = tokens;

  const progress = spring({ frame: frame - delay, fps, config: { damping: 15, mass: 0.5, stiffness: 120 } });
  const scale = interpolate(progress, [0, 1], [0.85, 1]);
  const opacity = interpolate(frame, [delay, delay + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rotation = interpolate(progress, [0, 1], [-1.5, 0]);

  const shadowMap: Record<string, string> = {
    none: "none",
    subtle: "0 2px 8px rgba(0,0,0,0.2)",
    medium: "0 4px 24px rgba(0,0,0,0.3)",
    strong: "0 8px 40px rgba(0,0,0,0.5)",
  };

  const getBackground = () => {
    switch (cardStyle) {
      case "glass": return "rgba(255,255,255,0.06)";
      case "bordered": return "transparent";
      default: return backgroundColor;
    }
  };

  return (
    <div style={{
      width, height,
      borderRadius,
      background: getBackground(),
      border: cardStyle === "bordered" ? "1px solid rgba(255,255,255,0.15)" : cardStyle === "glass" ? "1px solid rgba(255,255,255,0.1)" : "none",
      boxShadow: cardStyle === "flat" ? "none" : shadowMap[shadowStyle],
      backdropFilter: cardStyle === "glass" ? "blur(12px)" : undefined,
      opacity,
      transform: `scale(${scale}) rotate(${rotation}deg)`,
      padding: 24,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      fontFamily,
    }}>
      {icon && (
        <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: `${accentColor}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
          {icon}
        </div>
      )}
      <div style={{ fontSize: 20, fontWeight: 700, color: textColor, textRendering: "optimizeLegibility" }}>{title}</div>
      {description && <div style={{ fontSize: 14, color: textColor, opacity: 0.6, lineHeight: 1.5 }}>{description}</div>}
    </div>
  );
};
