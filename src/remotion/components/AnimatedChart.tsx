import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

interface AnimatedChartProps {
  type?: "bar" | "line";
  accentColor?: string;
  backgroundColor?: string;
  delay?: number;
  width?: number;
  height?: number;
  dataPoints?: number[];
}

export const AnimatedChart: React.FC<AnimatedChartProps> = ({
  type = "bar",
  accentColor = "#06b6d4",
  backgroundColor = "rgba(255,255,255,0.04)",
  delay = 0,
  width = 500,
  height = 280,
  dataPoints = [30, 55, 42, 70, 58, 85, 65, 90, 75, 95, 80, 88],
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const containerOpacity = interpolate(frame, [delay, delay + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const maxVal = Math.max(...dataPoints);
  const barWidth = (width - 40) / dataPoints.length - 4;
  const chartHeight = height - 60;

  if (type === "line") {
    const drawProgress = interpolate(frame, [delay + 10, delay + 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const points = dataPoints.map((v, i) => {
      const x = 30 + (i / (dataPoints.length - 1)) * (width - 60);
      const y = 20 + chartHeight - (v / maxVal) * chartHeight;
      return `${x},${y}`;
    });
    const visiblePoints = Math.ceil(drawProgress * points.length);
    const pathData = points.slice(0, visiblePoints).join(" L ");

    return (
      <div style={{ width, height, borderRadius: 14, background: backgroundColor, border: "1px solid rgba(255,255,255,0.06)", opacity: containerOpacity, padding: 10, position: "relative" }}>
        <svg width={width - 20} height={height - 20} viewBox={`0 0 ${width - 20} ${height - 20}`}>
          {[0.25, 0.5, 0.75].map(p => (
            <line key={p} x1="30" y1={20 + chartHeight * (1 - p)} x2={width - 30} y2={20 + chartHeight * (1 - p)} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          ))}
          {pathData && <path d={`M ${pathData}`} fill="none" stroke={accentColor} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />}
          {pathData && visiblePoints > 1 && (
            <path d={`M ${points[0].split(",")[0]},${20 + chartHeight} L ${pathData} L ${points[visiblePoints - 1].split(",")[0]},${20 + chartHeight} Z`} fill={`${accentColor}15`} />
          )}
          {points.slice(0, visiblePoints).map((p, i) => {
            const [cx, cy] = p.split(",").map(Number);
            const dotProgress = spring({ frame: frame - (delay + 10 + i * 3), fps, config: { damping: 12, mass: 0.3 } });
            return <circle key={i} cx={cx} cy={cy} r={4 * Math.min(dotProgress, 1)} fill={accentColor} />;
          })}
        </svg>
      </div>
    );
  }

  return (
    <div style={{ width, height, borderRadius: 14, background: backgroundColor, border: "1px solid rgba(255,255,255,0.06)", opacity: containerOpacity, padding: "20px 20px 10px", display: "flex", alignItems: "flex-end", gap: 4 }}>
      {dataPoints.map((v, i) => {
        const barDelay = delay + 10 + i * 3;
        const barProgress = spring({ frame: frame - barDelay, fps, config: { damping: 15, mass: 0.4 } });
        const barH = (v / maxVal) * chartHeight * Math.min(barProgress, 1);

        return (
          <div key={i} style={{
            width: barWidth,
            height: barH,
            borderRadius: 4,
            background: `linear-gradient(to top, ${accentColor}90, ${accentColor})`,
            opacity: interpolate(frame, [barDelay, barDelay + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          }} />
        );
      })}
    </div>
  );
};
