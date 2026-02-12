import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { ease, springs, blurReveal, splitTextProgress } from "../lib/animations";

const { fontFamily } = loadFont("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });

type TextVariant = "fade" | "slideUp" | "splitWords" | "scaleBlur" | "typewriter";

interface AnimatedTextProps {
  text: string;
  delay?: number;
  style?: React.CSSProperties;
  fontSize?: number;
  fontWeight?: number | string;
  color?: string;
  kinetic?: boolean;
  variant?: TextVariant;
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  delay = 0,
  style,
  fontSize = 48,
  fontWeight = "bold",
  color = "#ffffff",
  kinetic = false,
  variant = "fade",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const delayedFrame = Math.max(0, frame - delay);

  const baseStyle: React.CSSProperties = {
    fontSize,
    fontWeight,
    color,
    fontFamily,
    textRendering: "optimizeLegibility",
    WebkitFontSmoothing: "antialiased",
    letterSpacing: "-0.02em",
    lineHeight: 1.2,
    ...style,
  };

  // ─── Split Words variant ──────────────────────────────────
  if (variant === "splitWords") {
    const words = text.split(" ");
    const wordProgress = splitTextProgress(frame, fps, words.length, delay, 5);

    return (
      <div
        style={{
          ...baseStyle,
          display: "flex",
          flexWrap: "wrap",
          gap: `0 ${fontSize * 0.28}px`,
          justifyContent: (style?.textAlign as string) === "center" ? "center" : "flex-start",
        }}
      >
        {words.map((word, i) => {
          const p = wordProgress[i];
          const y = interpolate(p, [0, 1], [30, 0]);
          const opacity = interpolate(p, [0, 0.4, 1], [0, 1, 1]);
          const blur = interpolate(p, [0, 1], [6, 0]);

          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                opacity,
                transform: `translateY(${y}px)`,
                filter: `blur(${blur}px)`,
                willChange: "transform, opacity, filter",
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    );
  }

  // ─── Scale + Blur variant ─────────────────────────────────
  if (variant === "scaleBlur") {
    const progress = spring({ frame: delayedFrame, fps, config: springs.smooth });
    const scale = interpolate(progress, [0, 1], [1.3, 1]);
    const blur = blurReveal(frame, delay, 25);
    const opacity = interpolate(delayedFrame, [0, 12], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    return (
      <div
        style={{
          ...baseStyle,
          opacity,
          transform: `scale(${scale})`,
          filter: `blur(${blur}px)`,
          willChange: "transform, opacity, filter",
        }}
      >
        {text}
      </div>
    );
  }

  // ─── Typewriter variant ───────────────────────────────────
  if (variant === "typewriter") {
    const charCount = Math.floor(
      interpolate(delayedFrame, [0, text.length * 2], [0, text.length], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    );
    const cursorOpacity = delayedFrame % 16 < 10 ? 1 : 0;

    return (
      <div style={{ ...baseStyle, opacity: frame >= delay ? 1 : 0 }}>
        {text.slice(0, charCount)}
        <span style={{ opacity: cursorOpacity, color: baseStyle.color }}>|</span>
      </div>
    );
  }

  // ─── Slide Up variant ─────────────────────────────────────
  if (variant === "slideUp") {
    const progress = interpolate(delayedFrame, [0, 20], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: ease.outCubic,
    });
    const translateY = interpolate(progress, [0, 1], [60, 0]);
    const opacity = interpolate(delayedFrame, [0, 12], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    return (
      <div
        style={{
          ...baseStyle,
          opacity,
          transform: `translateY(${translateY}px)`,
          willChange: "transform, opacity",
        }}
      >
        {text}
      </div>
    );
  }

  // ─── Default fade variant (backwards compatible) ──────────
  const opacity = interpolate(delayedFrame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const springProgress = spring({
    frame: delayedFrame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const translateY = kinetic ? 0 : interpolate(springProgress, [0, 1], [20, 0]);
  const scale = kinetic ? interpolate(springProgress, [0, 1], [1.2, 1]) : 1;

  return (
    <div
      style={{
        ...baseStyle,
        opacity,
        transform: kinetic ? `scale(${scale})` : `translateY(${translateY}px)`,
      }}
    >
      {text}
    </div>
  );
};
