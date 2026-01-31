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
import { ease, springs, hexToRgb } from "../lib/animations";

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

// Animated ring element behind product image
const AnimatedRing: React.FC<{ accentColor: string }> = ({ accentColor }) => {
  const frame = useCurrentFrame();
  const rotation = frame * 0.8;
  const scale = 1 + Math.sin(frame * 0.06) * 0.05;
  const opacity = interpolate(frame, [0, 15], [0, 0.3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        width: 480,
        height: 480,
        borderRadius: "50%",
        border: `2px solid ${accentColor}`,
        opacity,
        transform: `rotate(${rotation}deg) scale(${scale})`,
        background: `conic-gradient(from ${rotation}deg, ${accentColor}00, ${accentColor}30, ${accentColor}00)`,
      }}
    />
  );
};

const ShimmerOverlay: React.FC<{ primaryColor: string }> = ({ primaryColor }) => {
  const frame = useCurrentFrame();
  const position = interpolate(frame, [0, 90], [-100, 200], {
    extrapolateRight: "clamp",
    easing: ease.inOutCubic,
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(105deg, transparent ${position - 30}%, rgba(255,255,255,0.05) ${position}%, transparent ${position + 30}%)`,
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

  const rgb = hexToRgb(brandColors.accent);

  // Headline: dramatic scale from 2x with blur
  const headlineProgress = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100, mass: 0.8 },
  });
  const headlineScale = interpolate(headlineProgress, [0, 1], [1.8, 1]);
  const headlineBlur = interpolate(headlineProgress, [0, 1], [10, 0]);
  const headlineOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Product image: 3D perspective tilt entrance
  const imgFrame = Math.max(0, frame - 15);
  const imgProgress = spring({
    frame: imgFrame,
    fps,
    config: springs.smooth,
  });
  const imgScale = interpolate(imgProgress, [0, 1], [0.3, 1]);
  const imgRotateY = interpolate(imgProgress, [0, 1], [25, 0]);
  const imgRotateX = interpolate(imgProgress, [0, 1], [-10, 0]);
  const imgOpacity = interpolate(imgFrame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const imgGlow = interpolate(imgFrame, [0, 20, 35], [0, 35, 18], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Subheadline: slide from bottom with blur
  const subFrame = Math.max(0, frame - 45);
  const subProgress = interpolate(subFrame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.outCubic,
  });
  const subOpacity = interpolate(subFrame, [0, 14], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  const subTranslateY = interpolate(subProgress, [0, 1], [50, 0]);
  const subBlur = interpolate(subProgress, [0, 1], [5, 0]);

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
        {/* Headline */}
        <Sequence from={0} durationInFrames={90}>
          <div
            style={{
              opacity: headlineOpacity,
              transform: `scale(${headlineScale})`,
              filter: `blur(${headlineBlur}px)`,
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
                textShadow: `0 0 40px rgba(${rgb}, 0.3)`,
                letterSpacing: "-0.03em",
              }}
            >
              {headline}
            </div>
          </div>
        </Sequence>

        {/* Product image with 3D entrance + ring */}
        <Sequence from={15} durationInFrames={75}>
          <div
            style={{
              position: "relative",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              perspective: 800,
            }}
          >
            <AnimatedRing accentColor={brandColors.accent} />
            <div
              style={{
                opacity: imgOpacity,
                transform: `scale(${imgScale}) rotateY(${imgRotateY}deg) rotateX(${imgRotateX}deg)`,
                borderRadius: 24,
                overflow: "hidden",
                boxShadow: `0 0 ${imgGlow}px ${imgGlow / 2}px rgba(${rgb}, 0.35), 0 20px 40px rgba(0,0,0,0.4)`,
              }}
            >
              <Img
                src={productImage}
                style={{
                  width: 380,
                  height: 380,
                  objectFit: "cover",
                }}
              />
            </div>
          </div>
        </Sequence>

        {/* Subheadline */}
        <Sequence from={45} durationInFrames={45}>
          <div
            style={{
              opacity: subOpacity,
              transform: `translateY(${subTranslateY}px)`,
              filter: `blur(${subBlur}px)`,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 30,
                fontWeight: 500,
                color: "#e4e4e7",
                fontFamily: "Inter, sans-serif",
                letterSpacing: "-0.01em",
              }}
            >
              {subheadline}
            </div>
          </div>
        </Sequence>

        {/* CTA */}
        <Sequence from={68} durationInFrames={22}>
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
