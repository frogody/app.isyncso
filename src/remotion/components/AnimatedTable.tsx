import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont();

interface AnimatedTableProps {
  headers?: string[];
  rows?: string[][];
  accentColor?: string;
  textColor?: string;
  backgroundColor?: string;
  delay?: number;
  width?: number;
}

export const AnimatedTable: React.FC<AnimatedTableProps> = ({
  headers = ["Name", "Status", "Revenue", "Growth"],
  rows = [
    ["Acme Corp", "Active", "\u20AC124,500", "+12.3%"],
    ["Globex Inc", "Active", "\u20AC98,200", "+8.7%"],
    ["Initech", "Pending", "\u20AC76,800", "+15.1%"],
    ["Umbrella Co", "Active", "\u20AC145,000", "+22.5%"],
    ["Stark Ind", "Active", "\u20AC203,400", "+18.9%"],
  ],
  accentColor = "#06b6d4",
  textColor = "#ffffff",
  backgroundColor = "rgba(255,255,255,0.03)",
  delay = 0,
  width = 600,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const containerOpacity = interpolate(frame, [delay, delay + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{
      width, borderRadius: 14,
      background: backgroundColor,
      border: "1px solid rgba(255,255,255,0.06)",
      opacity: containerOpacity,
      overflow: "hidden",
      fontFamily,
    }}>
      {(() => {
        const hDelay = delay + 5;
        const hOpacity = interpolate(frame, [hDelay, hDelay + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div style={{
            display: "flex", padding: "12px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.02)",
            opacity: hOpacity,
          }}>
            {headers.map((h, i) => (
              <div key={i} style={{ flex: 1, fontSize: 12, fontWeight: 600, color: textColor, opacity: 0.5, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>{h}</div>
            ))}
          </div>
        );
      })()}

      {rows.map((row, i) => {
        const rowDelay = delay + 12 + i * 5;
        const rowProgress = spring({ frame: frame - rowDelay, fps, config: { damping: 15, mass: 0.4 } });
        const rowX = interpolate(rowProgress, [0, 1], [30, 0]);
        const rowOpacity = interpolate(frame, [rowDelay, rowDelay + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

        return (
          <div key={i} style={{
            display: "flex", padding: "11px 20px",
            borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
            opacity: rowOpacity,
            transform: `translateX(${rowX}px)`,
          }}>
            {row.map((cell, j) => (
              <div key={j} style={{
                flex: 1, fontSize: 13, fontWeight: j === 0 ? 500 : 400,
                color: cell.startsWith("+") ? "#4ade80" : cell === "Pending" ? "#fbbf24" : textColor,
                opacity: j === 0 ? 0.9 : 0.7,
              }}>{cell}</div>
            ))}
          </div>
        );
      })}
    </div>
  );
};
