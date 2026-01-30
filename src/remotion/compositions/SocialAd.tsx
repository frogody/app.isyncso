import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Img,
} from "remotion";
import { BrandedBackground } from "../components/BrandedBackground";
import { PulsingButton } from "../components/PulsingButton";

interface SocialAdProps {
  headline: string;
  subheadline: string;
  productImage: string;
  brandColors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  ctaText: string;
}

const ShimmerOverlay: React.FC<{ primaryColor: string }> = ({ primaryColor }) => {
  const frame = useCurrentFrame();
  const position = interpolate(frame, [0, 90], [-100, 200], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${105}deg, transparent ${position - 30}%, rgba(255,255,255,0.06) ${position}%, transparent ${position + 30}%)`,
        pointerEvents: "none",
      }}
    />
  );
};

export const SocialAd: React.FC<SocialAdProps> = ({
  headline,
  subheadline,
  productImage,
  brandColors,
  ctaText,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Headline: 0-15, spring scale + slight rotation
  const headlineProgress = spring({
    frame: Math.max(0, frame),
    fps,
    config: { damping: 10, stiffness: 120, mass: 1 },
  });
  const headlineScale = interpolate(headlineProgress, [0, 1], [0.3, 1]);
  const headlineRotation = interpolate(headlineProgress, [0, 1], [-8, 0]);
  const headlineOpacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Product image: 15-45, dramatic zoom with glow
  const imgFrame = Math.max(0, frame - 15);
  const imgProgress = spring({
    frame: imgFrame,
    fps,
    config: { damping: 12, stiffness: 80, mass: 1.2 },
  });
  const imgScale = interpolate(imgProgress, [0, 1], [0.2, 1]);
  const imgOpacity = interpolate(imgFrame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const imgGlow = interpolate(imgFrame, [0, 20, 30], [0, 30, 15], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Subheadline: 45-70, slide from bottom
  const subFrame = Math.max(0, frame - 45);
  const subOpacity = interpolate(subFrame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const subTranslateY = interpolate(
    spring({ frame: subFrame, fps, config: { damping: 14, stiffness: 100 } }),
    [0, 1],
    [60, 0]
  );

  return (
    <AbsoluteFill>
      <BrandedBackground
        primaryColor={brandColors.primary}
        secondaryColor={brandColors.secondary}
      />
      <ShimmerOverlay primaryColor={brandColors.primary} />

      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: 60,
          gap: 30,
        }}
      >
        {/* Headline: 0-15 */}
        <Sequence from={0} durationInFrames={90}>
          <div
            style={{
              opacity: headlineOpacity,
              transform: `scale(${headlineScale}) rotate(${headlineRotation}deg)`,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 64,
                fontWeight: 900,
                color: brandColors.accent,
                fontFamily: "Inter, sans-serif",
                lineHeight: 1.1,
                textShadow: `0 0 40px rgba(${hexToRgb(brandColors.accent)}, 0.3)`,
              }}
            >
              {headline}
            </div>
          </div>
        </Sequence>

        {/* Product image: 15-45 */}
        <Sequence from={15} durationInFrames={75}>
          <div
            style={{
              opacity: imgOpacity,
              transform: `scale(${imgScale})`,
              borderRadius: 20,
              overflow: "hidden",
              boxShadow: `0 0 ${imgGlow}px ${imgGlow / 2}px rgba(${hexToRgb(brandColors.accent)}, 0.4)`,
            }}
          >
            <Img
              src={productImage}
              style={{
                width: 400,
                height: 400,
                objectFit: "cover",
              }}
            />
          </div>
        </Sequence>

        {/* Subheadline: 45-70 */}
        <Sequence from={45} durationInFrames={45}>
          <div
            style={{
              opacity: subOpacity,
              transform: `translateY(${subTranslateY}px)`,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 30,
                fontWeight: 500,
                color: "#e4e4e7",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {subheadline}
            </div>
          </div>
        </Sequence>

        {/* CTA: 70-90 */}
        <Sequence from={70} durationInFrames={20}>
          <PulsingButton
            text={ctaText}
            backgroundColor={brandColors.accent}
            textColor="#ffffff"
            delay={0}
          />
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

function hexToRgb(hex: string): string {
  const cleaned = hex.replace("#", "");
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}
