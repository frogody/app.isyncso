import { useCurrentFrame, useVideoConfig, interpolate, Img } from "remotion";

interface ProductImageProps {
  src: string;
  startScale?: number;
  endScale?: number;
  delay?: number;
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  startScale = 0.9,
  endScale = 1.05,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const delayedFrame = Math.max(0, frame - delay);
  const remainingDuration = Math.max(1, durationInFrames - delay);

  const scale = interpolate(delayedFrame, [0, remainingDuration], [startScale, endScale], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  return (
    <div
      style={{
        overflow: "hidden",
        borderRadius: 16,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Img
        src={src}
        style={{
          width: 800,
          height: 600,
          objectFit: "cover",
          transform: `scale(${scale})`,
        }}
      />
    </div>
  );
};
