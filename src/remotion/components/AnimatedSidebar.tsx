import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });

interface AnimatedSidebarProps {
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  delay?: number;
  items?: string[];
  width?: number;
}

export const AnimatedSidebar: React.FC<AnimatedSidebarProps> = ({
  accentColor = "#06b6d4",
  backgroundColor = "rgba(20,20,30,0.95)",
  textColor = "#ffffff",
  delay = 0,
  items = ["Overview", "Analytics", "Reports", "Transactions", "Settings", "Team", "Help"],
  width = 240,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slideProgress = spring({ frame: frame - delay, fps, config: { damping: 18, mass: 0.6 } });
  const slideX = interpolate(slideProgress, [0, 1], [-width, 0]);
  const barOpacity = interpolate(frame, [delay, delay + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", top: 64, left: 0, bottom: 0, width,
      backgroundColor,
      transform: `translateX(${slideX}px)`,
      opacity: barOpacity,
      borderRight: "1px solid rgba(255,255,255,0.06)",
      padding: "24px 16px",
      display: "flex", flexDirection: "column", gap: 4,
      fontFamily,
      zIndex: 10,
    }}>
      {items.map((item, i) => {
        const itemDelay = delay + 10 + i * 4;
        const itemProgress = spring({ frame: frame - itemDelay, fps, config: { damping: 15, mass: 0.4 } });
        const itemX = interpolate(itemProgress, [0, 1], [-20, 0]);
        const itemOpacity = interpolate(frame, [itemDelay, itemDelay + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const isActive = i === 0;

        return (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 14px", borderRadius: 10,
            backgroundColor: isActive ? `${accentColor}18` : "transparent",
            opacity: itemOpacity,
            transform: `translateX(${itemX}px)`,
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: 6,
              backgroundColor: isActive ? accentColor : `${textColor}30`,
            }} />
            <span style={{
              fontSize: 14, fontWeight: isActive ? 600 : 400,
              color: isActive ? accentColor : textColor,
              opacity: isActive ? 1 : 0.5,
            }}>{item}</span>
          </div>
        );
      })}
    </div>
  );
};
