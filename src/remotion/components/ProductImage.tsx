import { useCurrentFrame, useVideoConfig, interpolate, Img } from "remotion";

interface ProductImageProps {
  src: string;
  startScale?: number;
  endScale?: number;
  delay?: number;
  width?: number;
  height?: number;
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  startScale = 0.9,
  endScale = 1.05,
  delay = 0,
  width = 1300,
  height = 750,
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
        boxShadow: "0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.3)",
      }}
    >
      {/* Device frame mockup */}
      <div
        style={{
          width,
          height,
          borderRadius: 12,
          overflow: "hidden",
          border: "3px solid rgba(255,255,255,0.12)",
          position: "relative",
        }}
      >
        {/* Browser bar */}
        <div
          style={{
            height: 32,
            background: "rgba(30,30,30,0.95)",
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            gap: 6,
          }}
        >
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
          <div
            style={{
              flex: 1,
              height: 18,
              background: "rgba(255,255,255,0.08)",
              borderRadius: 4,
              marginLeft: 12,
            }}
          />
        </div>
        <Img
          src={src}
          style={{
            width: "100%",
            height: height - 32,
            objectFit: "contain",
            imageRendering: "high-quality" as any,
            transform: `scale(${scale})`,
            transformOrigin: "center center",
          }}
        />
      </div>
    </div>
  );
};
