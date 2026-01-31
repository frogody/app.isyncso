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
import { ScreenshotCarousel } from "../components/ScreenshotCarousel";
import { ease, springs, crossfade, hexToRgb, stagger } from "../lib/animations";

const { fontFamily } = loadFont();

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

const ICON_MAP: Record<string, string> = {
  Zap: "\u26A1",
  BarChart: "\uD83D\uDCCA",
  Users: "\uD83D\uDC65",
  Link: "\uD83D\uDD17",
};

// Sliding glass panel from right with feature cards
const FeaturePanel: React.FC<{
  features: Feature[];
  accentColor: string;
}> = ({ features, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Panel slides in from right
  const panelProgress = interpolate(frame, [0, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.outCubic,
  });
  const panelX = interpolate(panelProgress, [0, 1], [400, 0]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "flex-end",
        padding: "60px 80px",
      }}
    >
      <div
        style={{
          transform: `translateX(${panelX}px)`,
          background: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(20px)",
          borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.08)",
          padding: "40px 36px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          width: 520,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        {features.map((feature, i) => {
          const itemDelay = 12 + i * 8;
          const progress = spring({
            frame: Math.max(0, frame - itemDelay),
            fps,
            config: springs.snappy,
          });
          const y = interpolate(progress, [0, 1], [25, 0]);
          const opacity = interpolate(frame, [itemDelay, itemDelay + 10], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          const iconChar = ICON_MAP[feature.icon] || feature.icon;

          return (
            <div
              key={feature.title}
              style={{
                opacity,
                transform: `translateY(${y}px)`,
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 16,
                background: "rgba(255,255,255,0.04)",
                padding: "16px 20px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  width: 44,
                  height: 44,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  background: `rgba(${hexToRgb(accentColor)}, 0.1)`,
                  borderRadius: 10,
                  flexShrink: 0,
                }}
              >
                {iconChar}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: accentColor,
                    fontFamily,
                    marginBottom: 2,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {feature.title}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 400,
                    color: "#a1a1aa",
                    fontFamily,
                  }}
                >
                  {feature.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
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
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const colors = {
    primary: brandColors?.primary || "#0f0f0f",
    secondary: brandColors?.secondary || "#1a1a2e",
    accent: brandColors?.accent || "#06b6d4",
  };

  const safeScreenshots = screenshots?.length ? screenshots : [];
  const safeFeatures = features?.length ? features : [];
  const hasScreenshots = safeScreenshots.length > 0;

  // Phase opacities with crossfades
  const introOpacity = crossfade(frame, 0, 12, 28, 38);
  const screenshotOpacity = crossfade(frame, 30, 42, 118, 130);
  const featureOpacity = crossfade(frame, 120, 135, 235, 248);
  const endOpacity = interpolate(frame, [240, 255], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.outCubic,
  });

  return (
    <AbsoluteFill>
      <BrandedBackground
        primaryColor={colors.primary}
        secondaryColor={colors.secondary}
      />

      {/* Intro: 0-38 — split-word product name */}
      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 16,
          opacity: introOpacity,
        }}
      >
        <AnimatedText
          text={productName}
          fontSize={72}
          fontWeight={800}
          color={colors.accent}
          variant="splitWords"
          style={{ textAlign: "center", justifyContent: "center" }}
        />
        <AnimatedText
          text={tagline}
          fontSize={30}
          fontWeight={400}
          color="#a1a1aa"
          delay={10}
          variant="slideUp"
        />
      </AbsoluteFill>

      {/* Screenshots: 30-130 */}
      {hasScreenshots ? (
        <AbsoluteFill style={{ opacity: screenshotOpacity }}>
          <ScreenshotCarousel
            screenshots={safeScreenshots}
            startFrame={0}
            durationPerImage={Math.floor(90 / safeScreenshots.length)}
          />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ opacity: screenshotOpacity }}>
          <BrandedBackground
            primaryColor={colors.secondary}
            secondaryColor={colors.primary}
            style="radial"
          />
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
            <AnimatedText
              text={productName}
              fontSize={56}
              fontWeight={700}
              color={colors.accent}
              variant="scaleBlur"
            />
          </AbsoluteFill>
        </AbsoluteFill>
      )}

      {/* Features: 120-248 — glass panel from right */}
      {safeFeatures.length > 0 && (
        <AbsoluteFill style={{ opacity: featureOpacity }}>
          <FeaturePanel
            features={safeFeatures}
            accentColor={colors.accent}
          />
        </AbsoluteFill>
      )}

      {/* End card: 240-300 */}
      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 32,
          opacity: endOpacity,
        }}
      >
        <AnimatedText
          text={productName}
          fontSize={56}
          fontWeight={800}
          color={colors.accent}
          variant="scaleBlur"
          delay={242}
        />
        <PulsingButton
          text={ctaText || "Get Started"}
          backgroundColor={colors.accent}
          textColor="#ffffff"
          delay={250}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
