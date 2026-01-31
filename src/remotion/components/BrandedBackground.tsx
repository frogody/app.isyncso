import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

interface BrandedBackgroundProps {
  primaryColor?: string;
  secondaryColor?: string;
  style?: "gradient" | "solid" | "radial";
  children?: React.ReactNode;
}

export const BrandedBackground: React.FC<BrandedBackgroundProps> = ({
  primaryColor = "#0f0f0f",
  secondaryColor = "#1a1a2e",
  style = "gradient",
  children,
}) => {
  const frame = useCurrentFrame();

  // Slowly animate gradient angle
  const angle = interpolate(frame, [0, 600], [135, 195], {
    extrapolateRight: "clamp",
  });

  // Subtle radial highlight that drifts
  const hlX = 50 + Math.sin(frame * 0.005) * 15;
  const hlY = 50 + Math.cos(frame * 0.004) * 10;

  const backgroundMap: Record<string, string> = {
    gradient: `linear-gradient(${angle}deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
    solid: primaryColor,
    radial: `radial-gradient(circle at center, ${secondaryColor} 0%, ${primaryColor} 100%)`,
  };

  return (
    <AbsoluteFill
      style={{
        background: backgroundMap[style],
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Subtle moving highlight */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at ${hlX}% ${hlY}%, ${secondaryColor}40 0%, transparent 50%)`,
          pointerEvents: "none",
        }}
      />
      {children}
    </AbsoluteFill>
  );
};
