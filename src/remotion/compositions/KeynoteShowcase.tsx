import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { DynamicBackground } from "../components/DynamicBackground";
import { AnimatedCard } from "../components/AnimatedCard";
import { AnimatedButton } from "../components/AnimatedButton";

const { fontFamily } = loadFont();

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

  // Semantic data from analysis
  const understanding = designAnalysis?.productUnderstanding;
  const extractedFeatures = designAnalysis?.extractedFeatures || [];

  // Build feature list: prefer extracted features from screenshots, fall back to prop features
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

  // Use value proposition or tagline as the hook
  const hookText = understanding?.valueProposition || tagline;
  const audienceText = understanding?.targetAudience || "";

  // === PHASE 1: Product name + tagline (0-90 frames = 0-3s) ===
  const p1In = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const p1Scale = interpolate(
    spring({ frame, fps, config: { damping: 14, mass: 0.5 } }),
    [0, 1], [1.12, 1]
  );
  const p1Out = interpolate(frame, [75, 90], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // === PHASE 2: Value proposition hook (90-150 = 3-5s) ===
  const p2In = interpolate(frame, [90, 105], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const p2Scale = interpolate(
    spring({ frame: Math.max(0, frame - 90), fps, config: { damping: 15, mass: 0.5 } }),
    [0, 1], [1.08, 1]
  );
  const p2Out = interpolate(frame, [135, 150], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // === PHASE 3: Feature cards (150-330 = 5-11s) ===
  const p3In = interpolate(frame, [150, 165], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const p3Out = interpolate(frame, [315, 330], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const p3HeadingIn = interpolate(frame, [150, 162], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // === PHASE 4: CTA (330-360 = 11-12s) ===
  const p4In = interpolate(frame, [330, 345], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Grid layout: 2 cols for <=4 features, 3 cols for 5-6
  const cols = displayFeatures.length > 4 ? 3 : 2;
  const cardWidth = cols === 3 ? 520 : 720;
  const cardHeight = cols === 3 ? 180 : 200;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      <DynamicBackground primaryColor={colors.primary} secondaryColor={colors.secondary} accentColor={colors.accent} />

      {/* Phase 1: Product name + tagline */}
      <AbsoluteFill style={{
        justifyContent: "center", alignItems: "center",
        opacity: p1In * p1Out,
        flexDirection: "column", gap: 20,
      }}>
        <div style={{
          fontSize: 88, fontWeight: 800, color: colors.text,
          fontFamily, textRendering: "optimizeLegibility",
          WebkitFontSmoothing: "antialiased",
          letterSpacing: "-0.03em",
          transform: `scale(${p1Scale})`,
          textAlign: "center" as const,
          padding: "0 80px",
        }}>{productName}</div>
        <div style={{
          fontSize: 34, fontWeight: 400, color: colors.text,
          opacity: 0.55, fontFamily, letterSpacing: "-0.01em",
          transform: `scale(${p1Scale})`,
          textAlign: "center" as const,
          padding: "0 120px",
          lineHeight: 1.3,
        }}>{tagline}</div>
      </AbsoluteFill>

      {/* Phase 2: Value proposition hook */}
      <AbsoluteFill style={{
        justifyContent: "center", alignItems: "center",
        opacity: p2In * p2Out,
        flexDirection: "column", gap: 24,
        padding: "0 140px",
      }}>
        <div style={{
          fontSize: 52, fontWeight: 700, color: colors.text,
          fontFamily, textRendering: "optimizeLegibility",
          WebkitFontSmoothing: "antialiased",
          letterSpacing: "-0.02em",
          textAlign: "center" as const,
          lineHeight: 1.25,
          transform: `scale(${p2Scale})`,
        }}>{hookText}</div>
        {audienceText && (
          <div style={{
            fontSize: 24, fontWeight: 400, color: colors.accent,
            fontFamily, opacity: 0.8,
            textAlign: "center" as const,
          }}>Built for {audienceText}</div>
        )}
      </AbsoluteFill>

      {/* Phase 3: Feature cards */}
      <AbsoluteFill style={{
        opacity: p3In * p3Out,
        justifyContent: "center", alignItems: "center",
        padding: 60,
        flexDirection: "column",
      }}>
        <div style={{
          fontSize: 42, fontWeight: 700, color: colors.text,
          fontFamily, textAlign: "center" as const, marginBottom: 40,
          opacity: p3HeadingIn,
          letterSpacing: "-0.02em",
        }}>What's Inside</div>
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
              delay={165 + i * 8}
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

      {/* Phase 4: CTA end card */}
      <AbsoluteFill style={{
        opacity: p4In,
        justifyContent: "center", alignItems: "center",
        flexDirection: "column", gap: 24,
        background: `linear-gradient(135deg, ${colors.background} 0%, ${colors.secondary} 100%)`,
      }}>
        <div style={{
          fontSize: 68, fontWeight: 800, color: colors.text,
          fontFamily, letterSpacing: "-0.03em",
          textRendering: "optimizeLegibility",
        }}>{productName}</div>
        <div style={{
          fontSize: 26, fontWeight: 400, color: colors.text,
          opacity: 0.55, fontFamily, marginBottom: 16,
          textAlign: "center" as const,
          padding: "0 200px",
          lineHeight: 1.3,
        }}>{hookText}</div>
        <AnimatedButton text="Get Started" accentColor={colors.accent} delay={338} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
