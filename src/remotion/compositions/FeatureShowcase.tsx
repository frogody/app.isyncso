import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { BrandedBackground } from "../components/BrandedBackground";
import { AnimatedText } from "../components/AnimatedText";
import { PulsingButton } from "../components/PulsingButton";

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

const FeatureSlide: React.FC<{
  feature: Feature;
  accentColor: string;
}> = ({ feature, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Icon pops in
  const iconScale = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 120, mass: 0.8 },
  });

  // Title slides in from left
  const titleProgress = spring({
    frame: Math.max(0, frame - 5),
    fps,
    config: { damping: 14, stiffness: 100 },
  });
  const titleX = interpolate(titleProgress, [0, 1], [-40, 0]);
  const titleOpacity = interpolate(frame, [3, 15], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Description fades in
  const descOpacity = interpolate(frame, [12, 25], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const descY = interpolate(
    spring({
      frame: Math.max(0, frame - 12),
      fps,
      config: { damping: 14, stiffness: 80 },
    }),
    [0, 1],
    [15, 0]
  );

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
      {/* Icon */}
      <div
        style={{
          transform: `scale(${iconScale})`,
          fontSize: 80,
          width: 140,
          height: 140,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: `rgba(255,255,255,0.05)`,
          borderRadius: 28,
          border: `2px solid rgba(255,255,255,0.1)`,
          flexShrink: 0,
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
            fontSize: 48,
            fontWeight: 800,
            color: accentColor,
            fontFamily: "Inter, sans-serif",
            marginBottom: 16,
          }}
        >
          {feature.title}
        </div>
        <div
          style={{
            opacity: descOpacity,
            transform: `translateY(${descY}px)`,
            fontSize: 26,
            fontWeight: 400,
            color: "#a1a1aa",
            fontFamily: "Inter, sans-serif",
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
  features: Feature[];
  accentColor: string;
}> = ({ features, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 40,
        opacity: cardOpacity,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 32,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {features.map((feature, i) => {
          const itemDelay = i * 4;
          const itemFrame = Math.max(0, frame - itemDelay);
          const itemScale = spring({
            frame: itemFrame,
            fps,
            config: { damping: 12, stiffness: 120 },
          });

          return (
            <div
              key={feature.title}
              style={{
                transform: `scale(${itemScale})`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                background: "rgba(255,255,255,0.04)",
                padding: "24px 32px",
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.08)",
                minWidth: 160,
              }}
            >
              <div style={{ fontSize: 40 }}>{feature.icon}</div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#e4e4e7",
                  fontFamily: "Inter, sans-serif",
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
        delay={10}
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

  // Intro: product name fade in
  const introOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const introScale = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 80 },
  });

  const featureFrames = 45; // frames per feature
  const featuresStart = 30;
  const featuresEnd = featuresStart + features.length * featureFrames;

  return (
    <AbsoluteFill>
      <BrandedBackground
        primaryColor={brandColors.primary}
        secondaryColor={brandColors.secondary}
      />

      {/* Intro: 0-30 */}
      <Sequence from={0} durationInFrames={30}>
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
          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              color: brandColors.accent,
              fontFamily: "Inter, sans-serif",
              textAlign: "center",
            }}
          >
            {productName}
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Features: each gets ~45 frames */}
      {features.map((feature, i) => (
        <Sequence
          key={feature.title}
          from={featuresStart + i * featureFrames}
          durationInFrames={featureFrames}
        >
          <FeatureSlide feature={feature} accentColor={brandColors.accent} />
        </Sequence>
      ))}

      {/* End card: last 30 frames */}
      <Sequence from={210} durationInFrames={30}>
        <EndCard features={features} accentColor={brandColors.accent} />
      </Sequence>
    </AbsoluteFill>
  );
};
