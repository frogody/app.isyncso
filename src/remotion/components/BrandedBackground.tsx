import { AbsoluteFill } from "remotion";

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
  const backgroundMap: Record<string, string> = {
    gradient: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
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
      {children}
    </AbsoluteFill>
  );
};
