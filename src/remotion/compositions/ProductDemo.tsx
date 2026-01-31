import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Img,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { DynamicBackground } from "../components/DynamicBackground";
import { AnimatedText } from "../components/AnimatedText";
import { PulsingButton } from "../components/PulsingButton";
import { ease, springs, crossfade, hexToRgb, stagger } from "../lib/animations";

const { fontFamily } = loadFont();

interface ProductDemoProps {
  productName: string;
  productDescription: string;
  productImage: string;
  brandColors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  features: string[];
}

// Floating product image with growing shadow
const FloatingProductImage: React.FC<{
  src: string;
  accentColor: string;
}> = ({ src, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame,
    fps,
    config: springs.smooth,
  });

  const y = interpolate(progress, [0, 1], [80, 0]);
  const scale = interpolate(progress, [0, 1], [0.85, 1]);
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Shadow grows as image floats up
  const shadowBlur = interpolate(progress, [0, 1], [5, 40]);
  const shadowY = interpolate(progress, [0, 1], [5, 25]);
  const shadowOpacity = interpolate(progress, [0, 1], [0.1, 0.5]);

  // Subtle float after entrance
  const floatY = frame > 30 ? Math.sin((frame - 30) * 0.06) * 6 : 0;

  const rgb = hexToRgb(accentColor);

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y + floatY}px) scale(${scale})`,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: 0,
      }}
    >
      <div
        style={{
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: `0 ${shadowY}px ${shadowBlur}px rgba(0,0,0,${shadowOpacity}), 0 0 ${shadowBlur * 0.6}px rgba(${rgb}, 0.15)`,
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Img
          src={src}
          style={{
            width: 1200,
            height: 640,
            objectFit: "cover",
          }}
        />
      </div>
      {/* Reflection shadow */}
      <div
        style={{
          width: 900,
          height: 30,
          marginTop: 12,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, rgba(${rgb}, ${shadowOpacity * 0.3}) 0%, transparent 70%)`,
          filter: "blur(8px)",
        }}
      />
    </div>
  );
};

export const ProductDemo: React.FC<ProductDemoProps> = ({
  productName,
  productDescription,
  productImage,
  brandColors,
  features,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const colors = {
    primary: brandColors?.primary || "#0f0f0f",
    secondary: brandColors?.secondary || "#1a1a2e",
    accent: brandColors?.accent || "#06b6d4",
  };

  const safeFeatures = features?.length ? features : [];

  // Phase transitions with crossfade
  const introOpacity = crossfade(frame, 0, 12, 25, 35);
  const imageOpacity = crossfade(frame, 28, 40, 120, 135);
  const featuresOpacity = crossfade(frame, 90, 105, 150, 162);
  const ctaOpacity = interpolate(frame, [150, 165], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.outCubic,
  });

  return (
    <AbsoluteFill>
      <DynamicBackground
        primaryColor={colors.primary}
        secondaryColor={colors.secondary}
        accentColor={colors.accent}
      />

      {/* Phase 1: Intro — split-word product name + description */}
      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 20,
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
          text={productDescription}
          fontSize={28}
          fontWeight={400}
          color="#a1a1aa"
          delay={8}
          variant="slideUp"
        />
      </AbsoluteFill>

      {/* Phase 2: Product image — floating up with shadow */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          opacity: imageOpacity,
        }}
      >
        <FloatingProductImage
          src={productImage}
          accentColor={colors.accent}
        />
      </AbsoluteFill>

      {/* Phase 3: Features — staggered slide-up badges */}
      {safeFeatures.length > 0 && (
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            opacity: featuresOpacity,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: 20,
              flexWrap: "wrap",
              justifyContent: "center",
              maxWidth: 1400,
              padding: "0 80px",
            }}
          >
            {safeFeatures.map((feature, i) => {
              const itemDelay = stagger(i, 8, 0);
              const delayedFrame = Math.max(0, frame - 105 - itemDelay);
              const progress = spring({
                frame: delayedFrame,
                fps,
                config: springs.snappy,
              });
              const y = interpolate(progress, [0, 1], [30, 0]);
              const itemOpacity = interpolate(delayedFrame, [0, 10], [0, 1], {
                extrapolateRight: "clamp",
                extrapolateLeft: "clamp",
              });

              const rgb = hexToRgb(colors.accent);

              return (
                <div
                  key={feature}
                  style={{
                    opacity: itemOpacity,
                    transform: `translateY(${y}px)`,
                    background: `rgba(${rgb}, 0.08)`,
                    padding: "14px 32px",
                    borderRadius: 14,
                    border: `1px solid rgba(${rgb}, 0.15)`,
                    fontSize: 22,
                    fontWeight: 600,
                    color: "#e4e4e7",
                    fontFamily,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {feature}
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      )}

      {/* Phase 4: CTA end card */}
      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 28,
          opacity: ctaOpacity,
        }}
      >
        <AnimatedText
          text={productName}
          fontSize={56}
          fontWeight={800}
          color={colors.accent}
          variant="scaleBlur"
          delay={152}
        />
        <PulsingButton
          text="Learn More"
          backgroundColor={colors.accent}
          textColor="#ffffff"
          delay={160}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
