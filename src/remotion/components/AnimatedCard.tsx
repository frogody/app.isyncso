import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { ease, springs, hexToRgb, shimmerPosition } from "../lib/animations";

const { fontFamily } = loadFont();

interface DesignTokens {
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  borderRadius?: number;
  shadowStyle?: "none" | "subtle" | "medium" | "strong";
  cardStyle?: "flat" | "elevated" | "bordered" | "glass";
}

type CardVariant = "pop" | "slideUp" | "fadeGlow";

interface AnimatedCardProps {
  title: string;
  description?: string;
  icon?: string;
  delay?: number;
  tokens?: DesignTokens;
  width?: number;
  height?: number;
  variant?: CardVariant;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  title,
  description,
  icon,
  delay = 0,
  tokens = {},
  width = 380,
  height = 220,
  variant = "slideUp",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const {
    textColor = "#ffffff",
    accentColor = "#06b6d4",
    borderRadius = 16,
    shadowStyle = "medium",
    cardStyle = "elevated",
  } = tokens;

  const localFrame = Math.max(0, frame - delay);
  const progress = spring({ frame: localFrame, fps, config: springs.snappy });

  // Opacity
  const opacity = interpolate(frame, [delay, delay + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Variant-specific transforms
  let transform = "";
  if (variant === "slideUp") {
    const y = interpolate(progress, [0, 1], [40, 0]);
    const scale = interpolate(progress, [0, 1], [0.95, 1]);
    transform = `translateY(${y}px) scale(${scale})`;
  } else if (variant === "pop") {
    const scale = interpolate(progress, [0, 1], [0.85, 1]);
    const rotation = interpolate(progress, [0, 1], [-1.5, 0]);
    transform = `scale(${scale}) rotate(${rotation}deg)`;
  } else {
    // fadeGlow — just opacity + slight scale
    const scale = interpolate(progress, [0, 1], [0.98, 1]);
    transform = `scale(${scale})`;
  }

  // Glow border entrance
  const glowIntensity = interpolate(localFrame, [0, 15, 40], [0, 0.6, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const glowBorder = `0 0 ${20 * glowIntensity}px rgba(${hexToRgb(accentColor)}, ${glowIntensity * 0.4})`;

  // Shimmer sweep
  const shimmer = shimmerPosition(frame, delay + 5, 35);

  const shadowMap: Record<string, string> = {
    none: "none",
    subtle: `0 2px 12px rgba(0,0,0,0.2)`,
    medium: `0 4px 30px rgba(0,0,0,0.3)`,
    strong: `0 8px 50px rgba(0,0,0,0.5)`,
  };

  const getBackground = () => {
    switch (cardStyle) {
      case "glass":
        return "rgba(255,255,255,0.06)";
      case "bordered":
        return "rgba(255,255,255,0.02)";
      default:
        return "rgba(255,255,255,0.05)";
    }
  };

  const combinedShadow = [
    cardStyle !== "flat" ? shadowMap[shadowStyle] : "",
    glowBorder,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: getBackground(),
        border:
          cardStyle === "bordered" || cardStyle === "glass"
            ? `1px solid rgba(${hexToRgb(accentColor)}, ${0.1 + glowIntensity * 0.2})`
            : `1px solid rgba(255,255,255,${0.04 + glowIntensity * 0.1})`,
        boxShadow: combinedShadow || "none",
        backdropFilter: cardStyle === "glass" ? "blur(16px)" : undefined,
        opacity,
        transform,
        padding: 28,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        fontFamily,
        overflow: "hidden",
        position: "relative",
        willChange: "transform, opacity",
      }}
    >
      {/* Shimmer overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(105deg, transparent ${shimmer - 20}%, rgba(255,255,255,0.04) ${shimmer}%, transparent ${shimmer + 20}%)`,
          pointerEvents: "none",
          borderRadius,
        }}
      />

      {icon && (
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: `rgba(${hexToRgb(accentColor)}, 0.15)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            border: `1px solid rgba(${hexToRgb(accentColor)}, 0.2)`,
          }}
        >
          {icon}
        </div>
      )}
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: textColor,
          textRendering: "optimizeLegibility",
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </div>
      {description && (
        <div
          style={{
            fontSize: 14,
            color: textColor,
            opacity: 0.55,
            lineHeight: 1.6,
          }}
        >
          {description}
        </div>
      )}
    </div>
  );
};
