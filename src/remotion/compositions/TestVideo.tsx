import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export const TestVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #16213e 100%)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <h1
        style={{
          fontSize: 80,
          fontWeight: "bold",
          color: "#fff",
          opacity,
          fontFamily: "Inter, sans-serif",
        }}
      >
        Hello Remotion
      </h1>
    </AbsoluteFill>
  );
};
