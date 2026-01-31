import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont();

interface AnimatedTextProps {
  text: string;
  delay?: number;
  style?: React.CSSProperties;
  fontSize?: number;
  fontWeight?: number | string;
  color?: string;
  kinetic?: boolean;
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  delay = 0,
  style,
  fontSize = 48,
  fontWeight = "bold",
  color = "#ffffff",
  kinetic = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const delayedFrame = Math.max(0, frame - delay);

  const opacity = interpolate(delayedFrame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const springProgress = spring({ frame: delayedFrame, fps, config: { damping: 12, stiffness: 100 } });

  const translateY = kinetic ? 0 : interpolate(springProgress, [0, 1], [20, 0]);
  const scale = kinetic ? interpolate(springProgress, [0, 1], [1.2, 1]) : 1;

  return (
    <div
      style={{
        fontSize,
        fontWeight,
        color,
        opacity,
        transform: kinetic ? `scale(${scale})` : `translateY(${translateY}px)`,
        fontFamily,
        textRendering: "optimizeLegibility",
        WebkitFontSmoothing: "antialiased",
        letterSpacing: "-0.02em",
        lineHeight: 1.2,
        ...style,
      }}
    >
      {text}
    </div>
  );
};
