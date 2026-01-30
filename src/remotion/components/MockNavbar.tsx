import { interpolate, useCurrentFrame } from "remotion";

interface MockNavbarProps {
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  style: "dark" | "light";
  delay: number;
}

export const MockNavbar: React.FC<MockNavbarProps> = ({
  backgroundColor,
  textColor,
  accentColor,
  style,
  delay,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const translateY = interpolate(frame, [delay, delay + 15], [-40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 64,
        backgroundColor: style === "dark" ? backgroundColor : "#ffffff",
        opacity,
        transform: `translateY(${translateY}px)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px",
        borderBottom: `1px solid ${style === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
        zIndex: 10,
      }}
    >
      {/* Logo placeholder */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: accentColor }} />
        <div style={{ width: 100, height: 14, borderRadius: 4, backgroundColor: textColor, opacity: 0.7 }} />
      </div>
      {/* Nav items */}
      <div style={{ display: "flex", gap: 24 }}>
        {[80, 60, 70, 50].map((w, i) => (
          <div key={i} style={{ width: w, height: 12, borderRadius: 4, backgroundColor: textColor, opacity: i === 0 ? 0.9 : 0.4 }} />
        ))}
      </div>
      {/* CTA button */}
      <div style={{ padding: "8px 20px", borderRadius: 8, backgroundColor: accentColor }}>
        <div style={{ width: 60, height: 12, borderRadius: 4, backgroundColor: "#fff" }} />
      </div>
    </div>
  );
};
