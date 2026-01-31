import { Easing, interpolate, spring } from "remotion";

// ─── Easing presets ───────────────────────────────────────────
export const ease = {
  outCubic: Easing.bezier(0.33, 1, 0.68, 1),
  inOutCubic: Easing.bezier(0.65, 0, 0.35, 1),
  outBack: Easing.bezier(0.34, 1.56, 0.64, 1),
  outQuart: Easing.bezier(0.25, 1, 0.5, 1),
  inOutQuint: Easing.bezier(0.83, 0, 0.17, 1),
  outExpo: Easing.bezier(0.16, 1, 0.3, 1),
};

// ─── Spring presets ───────────────────────────────────────────
export const springs = {
  snappy: { damping: 20, stiffness: 200, mass: 0.5 },
  smooth: { damping: 28, stiffness: 120, mass: 0.8 },
  bouncy: { damping: 8, stiffness: 150, mass: 0.6 },
  gentle: { damping: 30, stiffness: 80, mass: 1.0 },
  heavy: { damping: 25, stiffness: 60, mass: 1.5 },
};

// ─── Stagger helper ───────────────────────────────────────────
export function stagger(index: number, delayPerItem: number, startFrame = 0): number {
  return startFrame + index * delayPerItem;
}

// ─── Crossfade between two phases ─────────────────────────────
export function crossfade(
  frame: number,
  inStart: number,
  inEnd: number,
  outStart: number,
  outEnd: number,
): number {
  const fadeIn = interpolate(frame, [inStart, inEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.outCubic,
  });
  const fadeOut = interpolate(frame, [outStart, outEnd], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.inOutCubic,
  });
  return fadeIn * fadeOut;
}

// ─── Split text into words with per-word animation progress ───
export function splitTextProgress(
  frame: number,
  fps: number,
  wordCount: number,
  startFrame: number,
  framesPerWord = 6,
): number[] {
  return Array.from({ length: wordCount }, (_, i) => {
    const wordStart = startFrame + i * framesPerWord;
    const localFrame = Math.max(0, frame - wordStart);
    return spring({
      frame: localFrame,
      fps,
      config: springs.snappy,
    });
  });
}

// ─── Counter animation (numbers counting up) ─────────────────
export function counterValue(
  frame: number,
  target: number,
  startFrame: number,
  duration: number,
): number {
  const progress = interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.outQuart,
  });
  return Math.round(target * progress);
}

// ─── Blur-to-sharp animation value ───────────────────────────
export function blurReveal(
  frame: number,
  startFrame: number,
  duration = 20,
): number {
  return interpolate(frame, [startFrame, startFrame + duration], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.outCubic,
  });
}

// ─── Scale with optional overshoot ───────────────────────────
export function scaleReveal(
  frame: number,
  fps: number,
  startFrame: number,
  from = 1.15,
  to = 1,
  config = springs.smooth,
): number {
  const localFrame = Math.max(0, frame - startFrame);
  const progress = spring({ frame: localFrame, fps, config });
  return interpolate(progress, [0, 1], [from, to]);
}

// ─── Slide animation with easing ─────────────────────────────
export function slideIn(
  frame: number,
  startFrame: number,
  duration: number,
  distance: number,
  direction: "up" | "down" | "left" | "right" = "up",
): { x: number; y: number; opacity: number } {
  const progress = interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.outCubic,
  });
  const offset = interpolate(progress, [0, 1], [distance, 0]);
  const opacity = interpolate(frame, [startFrame, startFrame + Math.min(duration, 15)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dirMap = {
    up: { x: 0, y: offset },
    down: { x: 0, y: -offset },
    left: { x: offset, y: 0 },
    right: { x: -offset, y: 0 },
  };
  return { ...dirMap[direction], opacity };
}

// ─── Hex to RGB helper ───────────────────────────────────────
export function hexToRgb(hex: string): string {
  const cleaned = hex.replace("#", "");
  if (cleaned.length < 6) return "0, 0, 0";
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

// ─── Shimmer position (for card/button shimmer effects) ──────
export function shimmerPosition(
  frame: number,
  startFrame: number,
  duration = 40,
): number {
  return interpolate(frame, [startFrame, startFrame + duration], [-100, 200], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.inOutCubic,
  });
}
