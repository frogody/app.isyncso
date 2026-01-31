import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ease } from "../lib/animations";

interface DynamicBackgroundProps {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}

export const DynamicBackground: React.FC<DynamicBackgroundProps> = ({
  primaryColor = "#0f0f0f",
  secondaryColor = "#1a1a2e",
  accentColor = "#06b6d4",
}) => {
  const frame = useCurrentFrame();

  // Slowly rotating gradient
  const gradientAngle = interpolate(frame, [0, 360], [135, 225], {
    extrapolateRight: "clamp",
  });

  // Three floating gradient orbs
  const orbs = [
    {
      x: 30 + Math.sin(frame * 0.008) * 25,
      y: 30 + Math.cos(frame * 0.006) * 20,
      size: 600,
      color: accentColor,
      opacity: 0.08,
    },
    {
      x: 70 + Math.sin(frame * 0.006 + 2) * 20,
      y: 60 + Math.cos(frame * 0.009 + 1) * 25,
      size: 500,
      color: secondaryColor,
      opacity: 0.12,
    },
    {
      x: 50 + Math.sin(frame * 0.01 + 4) * 15,
      y: 80 + Math.cos(frame * 0.007 + 3) * 15,
      size: 450,
      color: accentColor,
      opacity: 0.06,
    },
  ];

  // Grid line opacity (fades in, then pulses)
  const gridBase = interpolate(frame, [0, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.outCubic,
  });
  const gridOpacity = gridBase * 0.04;

  // Light streak that sweeps across periodically
  const streakCycle = frame % 180;
  const streakX = interpolate(streakCycle, [0, 180], [-20, 120], {
    extrapolateRight: "clamp",
  });
  const streakOpacity = interpolate(
    streakCycle,
    [0, 30, 90, 150, 180],
    [0, 0.06, 0.06, 0.03, 0],
    { extrapolateRight: "clamp" }
  );

  // Particles with varied sizes and speeds
  const particles = Array.from({ length: 30 }, (_, i) => {
    const seed = i * 137.508;
    const baseX = (seed * 7.3) % 100;
    const baseY = (seed * 13.1) % 100;
    const speed = 0.2 + (i % 7) * 0.1;
    const size = 1.5 + (i % 4) * 1.2;
    const x = baseX + Math.sin(frame * speed * 0.008 + i) * 10;
    const y = baseY + Math.cos(frame * speed * 0.01 + i * 0.7) * 8;
    const fadeIn = interpolate(frame, [i * 1.5, i * 1.5 + 20], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const pulse = 0.2 + Math.sin(frame * 0.05 + i * 0.8) * 0.15;
    const opacity = fadeIn * pulse;
    return { x, y, size, opacity };
  });

  // Subtle film grain via noise pattern
  const grainSeed = Math.floor(frame / 2); // Update every 2 frames for subtle flicker

  return (
    <AbsoluteFill>
      {/* Base gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(${gradientAngle}deg, ${primaryColor} 0%, ${secondaryColor} 50%, ${primaryColor} 100%)`,
        }}
      />

      {/* Floating orbs */}
      {orbs.map((orb, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${orb.x}%`,
            top: `${orb.y}%`,
            width: orb.size,
            height: orb.size,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
            opacity: orb.opacity,
            transform: "translate(-50%, -50%)",
            filter: "blur(80px)",
          }}
        />
      ))}

      {/* Light streak */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(105deg, transparent ${streakX - 15}%, rgba(255,255,255,${streakOpacity}) ${streakX}%, transparent ${streakX + 15}%)`,
          pointerEvents: "none",
        }}
      />

      {/* Grid lines */}
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: gridOpacity,
        }}
      >
        {Array.from({ length: 20 }, (_, i) => {
          const pulse = Math.sin(frame * 0.02 + i * 0.4) * 0.4 + 0.6;
          return (
            <g key={i}>
              <line
                x1={`${(i + 1) * 5}%`}
                y1="0"
                x2={`${(i + 1) * 5}%`}
                y2="100%"
                stroke={accentColor}
                strokeWidth={0.5}
                opacity={pulse * 0.4}
              />
              <line
                x1="0"
                y1={`${(i + 1) * 5}%`}
                x2="100%"
                y2={`${(i + 1) * 5}%`}
                stroke={accentColor}
                strokeWidth={0.5}
                opacity={pulse * 0.4}
              />
            </g>
          );
        })}
      </svg>

      {/* Particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            backgroundColor: i % 3 === 0 ? accentColor : "#ffffff",
            opacity: p.opacity,
            boxShadow: p.size > 3 ? `0 0 ${p.size * 2}px ${accentColor}40` : "none",
          }}
        />
      ))}

      {/* Subtle noise grain overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.03,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' seed='${grainSeed}' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: "256px 256px",
          pointerEvents: "none",
        }}
      />

      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
