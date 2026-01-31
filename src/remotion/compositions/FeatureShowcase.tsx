import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { BrandedBackground } from "../components/BrandedBackground";
import { AnimatedText } from "../components/AnimatedText";
import { PulsingButton } from "../components/PulsingButton";
import { ease, springs, crossfade, hexToRgb, blurReveal, stagger } from "../lib/animations";

const { fontFamily } = loadFont();

interface Feature {
  title: string;
  description: string;
  icon: string;
}

interface FeatureShowcaseProps {
  productName: string;
  features: Feature[];
  brandColors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  logoUrl?: string;
}

// Each feature crossfades with the next (overlap window)
const FeatureSlide: React.FC<{
  feature: Feature;
  accentColor: string;
  index: number;
}> = ({ feature, accentColor, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Icon: bouncy spring with overshoot
  const iconProgress = spring({
    frame: Math.max(0, frame - 3),
    fps,
    config: springs.bouncy,
  });
  const iconScale = interpolate(iconProgress, [0, 1], [0, 1]);
  const iconRotation = interpolate(iconProgress, [0, 0.5, 1], [0, -8, 0]);

  // Title: slide from left with blur
  const titleProgress = interpolate(frame, [5, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.outCubic,
  });
  const titleX = interpolate(titleProgress, [0, 1], [-60, 0]);
  const titleBlur = interpolate(titleProgress, [0, 1], [6, 0]);
  const titleOpacity = interpolate(frame, [5, 18], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Description: fade up with delay
  const descProgress = interpolate(frame, [14, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.outCubic,
  });
  const descY = interpolate(descProgress, [0, 1], [20, 0]);
  const descOpacity = interpolate(frame, [14, 28], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Accent line that grows
  const lineWidth = interpolate(frame, [8, 25], [0, 120], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.outCubic,
  });

  return (
    <AbsoluteFill
      style={{
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 60,
        padding: "0 120px",
      }}
    >
      {/* Icon with glow */}
      <div
        style={{
          transform: `scale(${iconScale}) rotate(${iconRotation}deg)`,
          fontSize: 72,
          width: 140,
          height: 140,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: `rgba(${hexToRgb(accentColor)}, 0.08)`,
          borderRadius: 28,
          border: `1px solid rgba(${hexToRgb(accentColor)}, 0.15)`,
          flexShrink: 0,
          boxShadow: `0 0 ${30 * iconScale}px rgba(${hexToRgb(accentColor)}, ${0.15 * iconScale})`,
        }}
      >
        {feature.icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1, maxWidth: 800 }}>
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateX(${titleX}px)`,
            filter: `blur(${titleBlur}px)`,
            fontSize: 48,
            fontWeight: 800,
            color: accentColor,
            fontFamily,
            marginBottom: 8,
            letterSpacing: "-0.02em",
          }}
        >
          {feature.title}
        </div>
        {/* Accent underline */}
        <div
          style={{
            width: lineWidth,
            height: 3,
            backgroundColor: accentColor,
            borderRadius: 2,
            marginBottom: 16,
            opacity: 0.6,
          }}
        />
        <div
          style={{
            opacity: descOpacity,
            transform: `translateY(${descY}px)`,
            fontSize: 26,
            fontWeight: 400,
            color: "#a1a1aa",
            fontFamily,
            lineHeight: 1.5,
          }}
        >
          {feature.description}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const EndCard: React.FC<{
  productName: string;
  features: Feature[];
  accentColor: string;
}> = ({ productName, features, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: ease.outCubic,
  });

  return (
    <AbsoluteFill
      style={{
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 36,
      }}
    >
      <div
        style={{
          fontSize: 56,
          fontWeight: 800,
          color: accentColor,
          fontFamily,
          opacity: titleOpacity,
          letterSpacing: "-0.03em",
          marginBottom: 8,
        }}
      >
        {productName}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 24,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {features.map((feature, i) => {
          const itemDelay = 8 + i * 5;
          const progress = spring({
            frame: Math.max(0, frame - itemDelay),
            fps,
            config: springs.snappy,
          });
          const y = interpolate(progress, [0, 1], [30, 0]);
          const opacity = interpolate(frame, [itemDelay, itemDelay + 10], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={feature.title}
              style={{
                transform: `translateY(${y}px)`,
                opacity,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                background: "rgba(255,255,255,0.04)",
                padding: "24px 32px",
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.06)",
                minWidth: 160,
              }}
            >
              <div style={{ fontSize: 36 }}>{feature.icon}</div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#e4e4e7",
                  fontFamily,
                  textAlign: "center",
                }}
              >
                {feature.title}
              </div>
            </div>
          );
        })}
      </div>

      <PulsingButton
        text="Get Started"
        backgroundColor={accentColor}
        textColor="#ffffff"
        delay={18}
      />
    </AbsoluteFill>
  );
};

export const FeatureShowcase: React.FC<FeatureShowcaseProps> = ({
  productName,
  features,
  brandColors,
  logoUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const featureFrames = 48;
  const featuresStart = 35;
  const overlapFrames = 12;

  // Progress indicator
  const totalFeatureDuration = features.length * featureFrames;
  const progressWidth = interpolate(
    frame,
    [featuresStart, featuresStart + totalFeatureDuration],
    [0, 100],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Intro (0-40): split-word product name
  const introOpacity = crossfade(frame, 0, 12, 30, 40);
  const introScale = interpolate(
    spring({ frame, fps, config: springs.smooth }),
    [0, 1], [1.1, 1]
  );

  // End card starts after all features
  const endCardStart = featuresStart + features.length * featureFrames - overlapFrames;

  return (
    <AbsoluteFill>
      <BrandedBackground
        primaryColor={brandColors.primary}
        secondaryColor={brandColors.secondary}
      />

      {/* Intro: 0-40 */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          opacity: introOpacity,
          transform: `scale(${introScale})`,
          flexDirection: "column",
          gap: 16,
        }}
      >
        {logoUrl && (
          <img
            src={logoUrl}
            style={{
              width: 80,
              height: 80,
              borderRadius: 16,
              objectFit: "contain",
              marginBottom: 8,
            }}
          />
        )}
        <AnimatedText
          text={productName}
          fontSize={64}
          fontWeight={900}
          color={brandColors.accent}
          variant="splitWords"
          style={{ textAlign: "center", justifyContent: "center" }}
        />
      </AbsoluteFill>

      {/* Features: crossfading slides */}
      {features.map((feature, i) => {
        const slideStart = featuresStart + i * featureFrames;
        const slideEnd = slideStart + featureFrames;
        const fadeIn = interpolate(frame, [slideStart, slideStart + overlapFrames], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: ease.outCubic,
        });
        const fadeOut = interpolate(frame, [slideEnd - overlapFrames, slideEnd], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: ease.inOutCubic,
        });

        if (frame < slideStart - 5 || frame > slideEnd + 5) return null;

        return (
          <AbsoluteFill key={feature.title} style={{ opacity: fadeIn * fadeOut }}>
            <FeatureSlide
              feature={feature}
              accentColor={brandColors.accent}
              index={i}
            />
          </AbsoluteFill>
        );
      })}

      {/* Progress indicator */}
      {frame >= featuresStart && frame <= featuresStart + totalFeatureDuration && (
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: "50%",
            transform: "translateX(-50%)",
            width: 200,
            height: 3,
            background: "rgba(255,255,255,0.08)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progressWidth}%`,
              height: "100%",
              backgroundColor: brandColors.accent,
              borderRadius: 2,
            }}
          />
        </div>
      )}

      {/* End card */}
      {frame >= endCardStart && (
        <AbsoluteFill
          style={{
            opacity: interpolate(frame, [endCardStart, endCardStart + 12], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: ease.outCubic,
            }),
          }}
        >
          <EndCard productName={productName} features={features} accentColor={brandColors.accent} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
