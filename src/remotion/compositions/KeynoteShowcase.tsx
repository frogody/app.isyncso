import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { DynamicBackground } from "../components/DynamicBackground";
import { AnimatedCard } from "../components/AnimatedCard";
import { AnimatedButton } from "../components/AnimatedButton";
import { ease, springs, crossfade, stagger, hexToRgb, blurReveal, splitTextProgress } from "../lib/animations";

const { fontFamily } = loadFont("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });

interface ExtractedFeature {
  name: string;
  description?: string;
}

interface ProductUnderstanding {
  purpose?: string;
  targetAudience?: string;
  valueProposition?: string;
  productCategory?: string;
}

interface DesignAnalysis {
  colorPalette?: { primary: string; secondary: string; background: string; text: string; accent: string };
  uiStyle?: { cardStyle: string; borderRadius: string; shadowStyle: string };
  layoutPattern?: string;
  productUnderstanding?: ProductUnderstanding;
  extractedFeatures?: ExtractedFeature[];
}

interface KeynoteShowcaseProps {
  productName: string;
  tagline: string;
  features?: { title: string; description: string; icon: string }[];
  screenshots?: string[];
  designAnalysis?: DesignAnalysis;
  metrics?: { label: string; value: number; prefix?: string; suffix?: string }[];
}

const BORDER_RADIUS_MAP: Record<string, number> = {
  none: 0, small: 6, medium: 12, large: 18, full: 9999,
};

const FEATURE_ICONS = ["◆", "●", "▲", "■", "⬟", "★"];

export const KeynoteShowcase: React.FC<KeynoteShowcaseProps> = ({
  productName,
  tagline,
  features = [],
  designAnalysis,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const colors = {
    primary: designAnalysis?.colorPalette?.primary || "#06b6d4",
    secondary: designAnalysis?.colorPalette?.secondary || "#1a1a2e",
    background: designAnalysis?.colorPalette?.background || "#0a0a0a",
    text: designAnalysis?.colorPalette?.text || "#ffffff",
    accent: designAnalysis?.colorPalette?.accent || "#06b6d4",
  };

  const borderRadius = BORDER_RADIUS_MAP[designAnalysis?.uiStyle?.borderRadius || "medium"] || 12;
  const cardStyle = (designAnalysis?.uiStyle?.cardStyle || "elevated") as "flat" | "elevated" | "bordered" | "glass";

  const understanding = designAnalysis?.productUnderstanding;
  const extractedFeatures = designAnalysis?.extractedFeatures || [];

  const displayFeatures = extractedFeatures.length > 0
    ? extractedFeatures.slice(0, 6).map((f, i) => ({
        title: f.name,
        description: f.description || "",
        icon: FEATURE_ICONS[i % FEATURE_ICONS.length],
      }))
    : features.length > 0
      ? features.slice(0, 6)
      : [
          { title: "Feature 1", description: "", icon: "◆" },
          { title: "Feature 2", description: "", icon: "●" },
          { title: "Feature 3", description: "", icon: "▲" },
        ];

  const hookText = understanding?.valueProposition || tagline;
  const audienceText = understanding?.targetAudience || "";

  // ═══ PHASE 1: Product name (0-100) with crossfade overlap ═══
  const p1Opacity = crossfade(frame, 0, 18, 80, 100);
  const p1Words = productName.split(" ");
  const p1WordProgress = splitTextProgress(frame, fps, p1Words.length, 0, 6);
  const p1TaglineBlur = blurReveal(frame, 12, 20);
  const p1TaglineOpacity = interpolate(frame, [12, 28], [0, 0.55], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.outCubic,
  });
  const p1Scale = interpolate(
    spring({ frame, fps, config: { damping: 30, mass: 0.8, stiffness: 80 } }),
    [0, 1], [1.08, 1]
  );

  // ═══ PHASE 2: Value proposition (85-160) ═══
  const p2Opacity = crossfade(frame, 85, 105, 145, 160);
  const p2Y = interpolate(
    interpolate(frame, [85, 115], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: ease.outBack,
    }),
    [0, 1], [50, 0]
  );
  const p2Blur = blurReveal(frame, 90, 20);

  // ═══ PHASE 3: Feature cards (150-325) ═══
  const p3Opacity = crossfade(frame, 150, 168, 310, 325);
  const p3HeadingWords = "What's Inside".split(" ");
  const p3HeadingProgress = splitTextProgress(frame, fps, p3HeadingWords.length, 152, 5);

  // ═══ PHASE 4: CTA end card (318-360) ═══
  const p4Opacity = interpolate(frame, [318, 335], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.outCubic,
  });
  const p4Scale = interpolate(
    spring({ frame: Math.max(0, frame - 318), fps, config: springs.bouncy }),
    [0, 1], [0.85, 1]
  );
  // Light burst on CTA
  const burstSize = interpolate(frame, [320, 345], [0, 800], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease.outExpo,
  });
  const burstOpacity = interpolate(frame, [320, 340, 360], [0.15, 0.08, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cols = displayFeatures.length > 4 ? 3 : 2;
  const cardWidth = cols === 3 ? 520 : 720;
  const cardHeight = cols === 3 ? 180 : 200;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      <DynamicBackground primaryColor={colors.primary} secondaryColor={colors.secondary} accentColor={colors.accent} />

      {/* Phase 1: Product name — split-word reveal */}
      <AbsoluteFill style={{
        justifyContent: "center", alignItems: "center",
        opacity: p1Opacity,
        flexDirection: "column", gap: 24,
        transform: `scale(${p1Scale})`,
      }}>
        <div style={{
          display: "flex", flexWrap: "wrap", justifyContent: "center",
          gap: `0 ${88 * 0.3}px`, padding: "0 80px",
        }}>
          {p1Words.map((word, i) => {
            const p = p1WordProgress[i];
            const y = interpolate(p, [0, 1], [40, 0]);
            const opacity = interpolate(p, [0, 0.3, 1], [0, 1, 1]);
            const blur = interpolate(p, [0, 1], [8, 0]);
            return (
              <span key={i} style={{
                display: "inline-block",
                fontSize: 88, fontWeight: 800, color: colors.text,
                fontFamily, textRendering: "optimizeLegibility",
                WebkitFontSmoothing: "antialiased",
                letterSpacing: "-0.03em",
                opacity, transform: `translateY(${y}px)`,
                filter: `blur(${blur}px)`,
              }}>{word}</span>
            );
          })}
        </div>
        <div style={{
          fontSize: 34, fontWeight: 400, color: colors.text,
          opacity: p1TaglineOpacity, fontFamily, letterSpacing: "-0.01em",
          textAlign: "center" as const, padding: "0 120px", lineHeight: 1.3,
          filter: `blur(${p1TaglineBlur}px)`,
        }}>{tagline}</div>
      </AbsoluteFill>

      {/* Phase 2: Value proposition hook — slide up + blur reveal */}
      <AbsoluteFill style={{
        justifyContent: "center", alignItems: "center",
        opacity: p2Opacity,
        flexDirection: "column", gap: 24, padding: "0 140px",
      }}>
        <div style={{
          fontSize: 52, fontWeight: 700, color: colors.text,
          fontFamily, textRendering: "optimizeLegibility",
          WebkitFontSmoothing: "antialiased",
          letterSpacing: "-0.02em", textAlign: "center" as const, lineHeight: 1.25,
          transform: `translateY(${p2Y}px)`,
          filter: `blur(${p2Blur}px)`,
        }}>{hookText}</div>
        {audienceText && (
          <div style={{
            fontSize: 24, fontWeight: 400, color: colors.accent,
            fontFamily, opacity: interpolate(frame, [100, 115], [0, 0.8], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            textAlign: "center" as const,
            transform: `translateY(${interpolate(frame, [100, 118], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.outCubic })})px)`,
          }}>Built for {audienceText}</div>
        )}
      </AbsoluteFill>

      {/* Phase 3: Feature cards — word-by-word heading + staggered cards */}
      <AbsoluteFill style={{
        opacity: p3Opacity,
        justifyContent: "center", alignItems: "center",
        padding: 60, flexDirection: "column",
      }}>
        <div style={{
          display: "flex", flexWrap: "wrap", justifyContent: "center",
          gap: `0 ${42 * 0.3}px`, marginBottom: 40,
        }}>
          {p3HeadingWords.map((word, i) => {
            const p = p3HeadingProgress[i];
            const y = interpolate(p, [0, 1], [25, 0]);
            const opacity = interpolate(p, [0, 0.4, 1], [0, 1, 1]);
            return (
              <span key={i} style={{
                display: "inline-block",
                fontSize: 42, fontWeight: 700, color: colors.text,
                fontFamily, letterSpacing: "-0.02em",
                opacity, transform: `translateY(${y}px)`,
              }}>{word}</span>
            );
          })}
        </div>
        <div style={{
          display: "flex", gap: 20, flexWrap: "wrap" as const,
          justifyContent: "center", maxWidth: cols === 3 ? 1680 : 1500,
        }}>
          {displayFeatures.map((f, i) => (
            <AnimatedCard
              key={i}
              title={f.title}
              description={f.description}
              icon={f.icon}
              delay={stagger(i, 10, 168)}
              variant="slideUp"
              tokens={{
                accentColor: colors.accent,
                textColor: colors.text,
                borderRadius,
                cardStyle,
              }}
              width={cardWidth}
              height={cardHeight}
            />
          ))}
        </div>
      </AbsoluteFill>

      {/* Phase 4: CTA end card — light burst + bounce in */}
      <AbsoluteFill style={{
        opacity: p4Opacity,
        justifyContent: "center", alignItems: "center",
        flexDirection: "column", gap: 24,
        background: `linear-gradient(135deg, ${colors.background} 0%, ${colors.secondary} 100%)`,
      }}>
        {/* Light burst */}
        <div style={{
          position: "absolute",
          width: burstSize, height: burstSize,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(${hexToRgb(colors.accent)}, ${burstOpacity}) 0%, transparent 70%)`,
        }} />

        <div style={{
          fontSize: 68, fontWeight: 800, color: colors.text,
          fontFamily, letterSpacing: "-0.03em",
          textRendering: "optimizeLegibility",
          transform: `scale(${p4Scale})`,
        }}>{productName}</div>
        <div style={{
          fontSize: 26, fontWeight: 400, color: colors.text,
          opacity: 0.55, fontFamily, marginBottom: 16,
          textAlign: "center" as const, padding: "0 200px", lineHeight: 1.3,
          transform: `scale(${p4Scale})`,
        }}>{hookText}</div>
        <AnimatedButton text="Get Started" accentColor={colors.accent} delay={325} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
