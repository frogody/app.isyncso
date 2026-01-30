import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";

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
  const relativeFrame = frame - startFrame;

  if (screenshots.length === 0) return null;

  const totalDuration = screenshots.length * durationPerImage;

  return (
    <AbsoluteFill>
      {screenshots.map((url, i) => {
        const imageStart = i * durationPerImage;
        const imageEnd = imageStart + durationPerImage;
        const localFrame = relativeFrame - imageStart;

        if (relativeFrame < imageStart - 10 || relativeFrame > imageEnd + 10) {
          return null;
        }

        const opacity = interpolate(
          localFrame,
          [-10, 0, durationPerImage - 10, durationPerImage],
          [0, 1, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        const scale = interpolate(
          localFrame,
          [0, durationPerImage],
          [1.0, 1.1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        const panX = interpolate(
          localFrame,
          [0, durationPerImage],
          i % 2 === 0 ? [0, -20] : [-20, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        const panY = interpolate(
          localFrame,
          [0, durationPerImage],
          i % 2 === 0 ? [0, -10] : [-10, 0],
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
            }}
          >
            <Img
              src={url}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `scale(${scale}) translate(${panX}px, ${panY}px)`,
              }}
            />
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};
