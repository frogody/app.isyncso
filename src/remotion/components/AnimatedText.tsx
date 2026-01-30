import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

interface AnimatedTextProps {
  text: string;
  delay?: number;
  style?: React.CSSProperties;
  fontSize?: number;
  fontWeight?: number | string;
  color?: string;
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  delay = 0,
  style,
  fontSize = 48,
  fontWeight = "bold",
  color = "#ffffff",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const delayedFrame = Math.max(0, frame - delay);

  const opacity = interpolate(delayedFrame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const translateY = interpolate(
    spring({ frame: delayedFrame, fps, config: { damping: 12, stiffness: 100 } }),
    [0, 1],
    [20, 0]
  );

  return (
    <div
      style={{
        fontSize,
        fontWeight,
        color,
        opacity,
        transform: `translateY(${translateY}px)`,
        fontFamily: "Inter, sans-serif",
        ...style,
      }}
    >
      {text}
    </div>
  );
};
