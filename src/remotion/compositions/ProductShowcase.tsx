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
import { ScreenshotCarousel } from "../components/ScreenshotCarousel";

interface Feature {
  title: string;
  description: string;
  icon: string;
}

interface ProductShowcaseProps {
  productName: string;
  tagline: string;
  screenshots: string[];
  features: Feature[];
  brandColors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  ctaText: string;
}

const FeatureOverlay: React.FC<{
  features: Feature[];
  accentColor: string;
}> = ({ features, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const framesPerFeature = Math.floor(120 / Math.max(features.length, 1));

  return (
    <AbsoluteFill
      style={{
        background: "rgba(0, 0, 0, 0.75)",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "60px 120px",
        gap: 24,
      }}
    >
      {features.map((feature, i) => {
        const featureStart = i * framesPerFeature;
        const localFrame = Math.max(0, frame - featureStart);

        const opacity = interpolate(localFrame, [0, 12], [0, 1], {
          extrapolateRight: "clamp",
          extrapolateLeft: "clamp",
        });

        const translateX = interpolate(
          spring({
            frame: localFrame,
            fps,
            config: { damping: 14, stiffness: 100 },
          }),
          [0, 1],
          [-40, 0]
        );

        return (
          <div
            key={feature.title}
            style={{
              opacity,
              transform: `translateX(${translateX}px)`,
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 24,
              background: "rgba(255,255,255,0.05)",
              padding: "20px 36px",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.1)",
              width: "100%",
              maxWidth: 900,
            }}
          >
            <div
              style={{
                fontSize: 36,
                width: 56,
                height: 56,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                background: `rgba(255,255,255,0.06)`,
                borderRadius: 12,
                flexShrink: 0,
              }}
            >
              {feature.icon === "Zap"
                ? "\u26A1"
                : feature.icon === "BarChart"
                  ? "\uD83D\uDCCA"
                  : feature.icon === "Users"
                    ? "\uD83D\uDC65"
                    : feature.icon === "Link"
                      ? "\uD83D\uDD17"
                      : feature.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: accentColor,
                  fontFamily: "Inter, sans-serif",
                  marginBottom: 4,
                }}
              >
                {feature.title}
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 400,
                  color: "#a1a1aa",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {feature.description}
              </div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const ProductShowcase: React.FC<ProductShowcaseProps> = ({
  productName,
  tagline,
  screenshots,
  features,
  brandColors,
  ctaText,
}) => {
  const colors = {
    primary: brandColors?.primary || "#0f0f0f",
    secondary: brandColors?.secondary || "#1a1a2e",
    accent: brandColors?.accent || "#06b6d4",
  };

  const safeScreenshots = screenshots?.length ? screenshots : [];
  const safeFeatures = features?.length ? features : [];
  const hasScreenshots = safeScreenshots.length > 0;

  return (
    <AbsoluteFill>
      <BrandedBackground
        primaryColor={colors.primary}
        secondaryColor={colors.secondary}
      />

      {/* Intro: 0-30 frames - Product name + tagline */}
      <Sequence from={0} durationInFrames={30}>
        <AbsoluteFill
          style={{
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 16,
          }}
        >
          <AnimatedText
            text={productName}
            fontSize={72}
            fontWeight={800}
            color={colors.accent}
          />
          <AnimatedText
            text={tagline}
            fontSize={30}
            fontWeight={400}
            color="#a1a1aa"
            delay={8}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Screenshots: 30-120 frames */}
      {hasScreenshots ? (
        <Sequence from={30} durationInFrames={90}>
          <ScreenshotCarousel
            screenshots={safeScreenshots}
            startFrame={0}
            durationPerImage={Math.floor(90 / safeScreenshots.length)}
          />
        </Sequence>
      ) : (
        <Sequence from={30} durationInFrames={90}>
          <BrandedBackground
            primaryColor={colors.secondary}
            secondaryColor={colors.primary}
            style="radial"
          />
          <AbsoluteFill
            style={{
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <AnimatedText
              text={productName}
              fontSize={56}
              fontWeight={700}
              color={colors.accent}
            />
          </AbsoluteFill>
        </Sequence>
      )}

      {/* Features: 120-240 frames */}
      {safeFeatures.length > 0 && (
        <Sequence from={120} durationInFrames={120}>
          <FeatureOverlay
            features={safeFeatures}
            accentColor={colors.accent}
          />
        </Sequence>
      )}

      {/* End card: 240-300 frames */}
      <Sequence from={240} durationInFrames={60}>
        <AbsoluteFill
          style={{
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 32,
          }}
        >
          <AnimatedText
            text={productName}
            fontSize={56}
            fontWeight={800}
            color={colors.accent}
          />
          <PulsingButton
            text={ctaText || "Get Started"}
            backgroundColor={colors.accent}
            textColor="#ffffff"
            delay={10}
          />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
