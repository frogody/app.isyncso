import { interpolate, useCurrentFrame, spring, useVideoConfig } from "remotion";

interface MockCardProps {
  cardStyle: "flat" | "elevated" | "bordered" | "glass";
  borderRadius: "none" | "small" | "medium" | "large" | "full";
  backgroundColor: string;
  accentColor: string;
  textColor: string;
  delay: number;
  width?: number | string;
  height?: number | string;
  children?: React.ReactNode;
}

const RADIUS_MAP: Record<string, number> = {
  none: 0,
  small: 4,
  medium: 8,
  large: 16,
  full: 9999,
};

export const MockCard: React.FC<MockCardProps> = ({
  cardStyle,
  borderRadius,
  backgroundColor,
  accentColor,
  textColor,
  delay,
  width = 300,
  height = 200,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 120 } });
  const opacity = interpolate(frame, [delay, delay + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const radius = RADIUS_MAP[borderRadius] || 8;

  const getCardStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      width,
      height,
      borderRadius: radius,
      padding: 20,
      opacity,
      transform: `scale(${Math.min(scale, 1)})`,
    };

    switch (cardStyle) {
      case "flat":
        return { ...base, backgroundColor, border: "none" };
      case "elevated":
        return { ...base, backgroundColor, boxShadow: "0 4px 24px rgba(0,0,0,0.3)" };
      case "bordered":
        return { ...base, backgroundColor: "transparent", border: "1px solid rgba(255,255,255,0.15)" };
      case "glass":
        return { ...base, backgroundColor: "rgba(255,255,255,0.05)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)" };
      default:
        return { ...base, backgroundColor };
    }
  };

  return (
    <div style={getCardStyles()}>
      {children || (
        <>
          <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: accentColor, marginBottom: 12, opacity: 0.9 }} />
          <div style={{ width: "70%", height: 14, borderRadius: 4, backgroundColor: textColor, opacity: 0.8, marginBottom: 8 }} />
          <div style={{ width: "90%", height: 10, borderRadius: 4, backgroundColor: textColor, opacity: 0.3, marginBottom: 4 }} />
          <div style={{ width: "60%", height: 10, borderRadius: 4, backgroundColor: textColor, opacity: 0.3, marginBottom: 16 }} />
          <div style={{ fontSize: 28, fontWeight: "bold", color: accentColor, fontFamily: "Inter, sans-serif" }} />
        </>
      )}
    </div>
  );
};
