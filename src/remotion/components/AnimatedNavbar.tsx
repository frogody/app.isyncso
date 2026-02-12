import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });

interface AnimatedNavbarProps {
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  delay?: number;
  productName?: string;
  navItems?: string[];
}

export const AnimatedNavbar: React.FC<AnimatedNavbarProps> = ({
  accentColor = "#06b6d4",
  backgroundColor = "rgba(15,15,15,0.95)",
  textColor = "#ffffff",
  delay = 0,
  productName = "Product",
  navItems = ["Dashboard", "Analytics", "Settings", "Team"],
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const barProgress = spring({ frame: frame - delay, fps, config: { damping: 18, mass: 0.6 } });
  const barY = interpolate(barProgress, [0, 1], [-70, 0]);
  const barOpacity = interpolate(frame, [delay, delay + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, height: 64,
      backgroundColor,
      transform: `translateY(${barY}px)`,
      opacity: barOpacity,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 40px",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      fontFamily,
      zIndex: 20,
    }}>
      {(() => {
        const logoDelay = delay + 8;
        const logoProgress = spring({ frame: frame - logoDelay, fps, config: { damping: 15, mass: 0.5 } });
        const logoScale = interpolate(logoProgress, [0, 1], [0.5, 1]);
        const logoOpacity = interpolate(frame, [logoDelay, logoDelay + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 12, opacity: logoOpacity, transform: `scale(${logoScale})` }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${accentColor}, ${accentColor}80)` }} />
            <span style={{ fontSize: 18, fontWeight: 700, color: textColor, letterSpacing: "-0.02em" }}>{productName}</span>
          </div>
        );
      })()}

      <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
        {navItems.map((item, i) => {
          const itemDelay = delay + 14 + i * 4;
          const itemOpacity = interpolate(frame, [itemDelay, itemDelay + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const itemY = interpolate(
            spring({ frame: frame - itemDelay, fps, config: { damping: 15, mass: 0.4 } }),
            [0, 1], [8, 0]
          );
          return (
            <span key={i} style={{
              fontSize: 14, fontWeight: i === 0 ? 600 : 400,
              color: i === 0 ? accentColor : textColor,
              opacity: itemOpacity * (i === 0 ? 1 : 0.6),
              transform: `translateY(${itemY}px)`,
            }}>{item}</span>
          );
        })}
      </div>

      {(() => {
        const ctaDelay = delay + 14 + navItems.length * 4;
        const ctaProgress = spring({ frame: frame - ctaDelay, fps, config: { damping: 12, mass: 0.5 } });
        const ctaScale = interpolate(ctaProgress, [0, 1], [0.8, 1]);
        const ctaOpacity = interpolate(frame, [ctaDelay, ctaDelay + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div style={{
            padding: "8px 20px", borderRadius: 8,
            background: accentColor,
            opacity: ctaOpacity,
            transform: `scale(${ctaScale})`,
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Get Started</span>
          </div>
        );
      })()}
    </div>
  );
};
