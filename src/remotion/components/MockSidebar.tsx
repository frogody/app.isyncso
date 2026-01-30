import { interpolate, useCurrentFrame } from "remotion";

interface MockSidebarProps {
  backgroundColor: string;
  accentColor: string;
  textColor: string;
  width: number;
  delay: number;
  collapsed: boolean;
}

export const MockSidebar: React.FC<MockSidebarProps> = ({
  backgroundColor,
  accentColor,
  textColor,
  width,
  delay,
  collapsed,
}) => {
  const frame = useCurrentFrame();
  const translateX = interpolate(frame, [delay, delay + 20], [-width, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const opacity = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div
      style={{
        position: "absolute",
        top: 64,
        left: 0,
        bottom: 0,
        width,
        backgroundColor,
        opacity,
        transform: `translateX(${translateX}px)`,
        borderRight: "1px solid rgba(255,255,255,0.08)",
        padding: "20px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        zIndex: 5,
      }}
    >
      {/* Sidebar items */}
      {[1, 2, 3, 4, 5, 6, 7].map((_, i) => {
        const itemDelay = delay + 10 + i * 3;
        const itemOpacity = interpolate(frame, [itemDelay, itemDelay + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const isActive = i === 0;

        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: collapsed ? "8px" : "8px 12px",
              borderRadius: 8,
              backgroundColor: isActive ? `${accentColor}20` : "transparent",
              opacity: itemOpacity,
              justifyContent: collapsed ? "center" : "flex-start",
            }}
          >
            <div style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: isActive ? accentColor : textColor, opacity: isActive ? 1 : 0.3, flexShrink: 0 }} />
            {!collapsed && (
              <div style={{ width: 60 + (i * 10 % 40), height: 10, borderRadius: 4, backgroundColor: textColor, opacity: isActive ? 0.9 : 0.4 }} />
            )}
          </div>
        );
      })}
    </div>
  );
};
