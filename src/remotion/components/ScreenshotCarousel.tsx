import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ease } from "../lib/animations";

interface ScreenshotCarouselProps {
  screenshots: string[];
  startFrame: number;
  durationPerImage: number;
}

export const ScreenshotCarousel: React.FC<ScreenshotCarouselProps> = ({
  screenshots,
  startFrame,
  durationPerImage,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const relativeFrame = frame - startFrame;

  if (screenshots.length === 0) return null;

  return (
    <AbsoluteFill>
      {/* Vignette around screenshots */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)",
          zIndex: 10,
          pointerEvents: "none",
        }}
      />

      {screenshots.map((url, i) => {
        const imageStart = i * durationPerImage;
        const imageEnd = imageStart + durationPerImage;
        const localFrame = relativeFrame - imageStart;

        // Skip rendering off-screen images
        if (relativeFrame < imageStart - 15 || relativeFrame > imageEnd + 15) {
          return null;
        }

        // Crossfade with easing
        const opacity = interpolate(
          localFrame,
          [-15, 0, durationPerImage - 15, durationPerImage],
          [0, 1, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.outCubic }
        );

        // Ken Burns zoom with spring feel
        const scale = interpolate(
          localFrame,
          [0, durationPerImage],
          [1.0, 1.08],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.inOutCubic }
        );

        // Spring-based pan
        const panProgress = spring({
          frame: Math.max(0, localFrame),
          fps,
          config: { damping: 40, stiffness: 30, mass: 1.5 },
        });
        const panX = interpolate(panProgress, [0, 1], i % 2 === 0 ? [8, -8] : [-8, 8]);
        const panY = interpolate(panProgress, [0, 1], i % 2 === 0 ? [4, -4] : [-4, 4]);

        // Subtle 3D perspective tilt
        const tiltY = interpolate(
          localFrame,
          [0, durationPerImage],
          i % 2 === 0 ? [1.5, -1.5] : [-1.5, 1.5],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        return (
          <AbsoluteFill
            key={i}
            style={{
              opacity,
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
              perspective: 1200,
            }}
          >
            <div
              style={{
                width: "92%",
                height: "88%",
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)",
                transform: `rotateY(${tiltY}deg)`,
              }}
            >
              <Img
                src={url}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  imageRendering: "high-quality" as any,
                  transform: `scale(${scale}) translate(${panX}px, ${panY}px)`,
                }}
              />
            </div>

            {/* Reflection shadow beneath */}
            <div
              style={{
                position: "absolute",
                bottom: "2%",
                width: "80%",
                height: 40,
                background: "radial-gradient(ellipse, rgba(0,0,0,0.3), transparent 70%)",
                filter: "blur(12px)",
              }}
            />
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
