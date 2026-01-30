import { useCurrentFrame, useVideoConfig, spring } from "remotion";

interface AnimatedScaleProps {
  children: React.ReactNode;
  delay?: number;
  springConfig?: {
    damping?: number;
    stiffness?: number;
    mass?: number;
  };
}

export const AnimatedScale: React.FC<AnimatedScaleProps> = ({
  children,
  delay = 0,
  springConfig = { damping: 12, stiffness: 100, mass: 1 },
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const delayedFrame = Math.max(0, frame - delay);

  const scale = spring({
    frame: delayedFrame,
    fps,
    config: {
      damping: springConfig.damping ?? 12,
      stiffness: springConfig.stiffness ?? 100,
      mass: springConfig.mass ?? 1,
    },
  });

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {children}
    </div>
  );
};
