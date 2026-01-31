import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { DynamicBackground } from "../components/DynamicBackground";
import { AnimatedNavbar } from "../components/AnimatedNavbar";
import { AnimatedSidebar } from "../components/AnimatedSidebar";
import { AnimatedMetricCard } from "../components/AnimatedMetricCard";
import { AnimatedChart } from "../components/AnimatedChart";
import { AnimatedTable } from "../components/AnimatedTable";
import { AnimatedCard } from "../components/AnimatedCard";
import { AnimatedButton } from "../components/AnimatedButton";

const { fontFamily } = loadFont();

interface Feature {
  title: string;
  description: string;
  icon: string;
}

interface Metric {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
}

interface DesignAnalysis {
  colorPalette?: { primary: string; secondary: string; background: string; text: string; accent: string };
  uiStyle?: { cardStyle: string; borderRadius: string; shadowStyle: string };
  layoutPattern?: string;
}

interface KeynoteShowcaseProps {
  productName: string;
  tagline: string;
  features?: Feature[];
  screenshots?: string[];
  designAnalysis?: DesignAnalysis;
  metrics?: Metric[];
}

const DEFAULT_METRICS: Metric[] = [
  { label: "Revenue", value: 284500, prefix: "\u20AC" },
  { label: "Users", value: 12847 },
  { label: "Growth", value: 23, suffix: "%" },
  { label: "NPS Score", value: 72 },
];

const BORDER_RADIUS_MAP: Record<string, number> = {
  none: 0, small: 6, medium: 12, large: 18, full: 9999,
};

export const KeynoteShowcase: React.FC<KeynoteShowcaseProps> = ({
  productName,
  tagline,
  features = [],
  designAnalysis,
  metrics,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const colors = {
    primary: designAnalysis?.colorPalette?.primary || "#0f0f0f",
    secondary: designAnalysis?.colorPalette?.secondary || "#1a1a2e",
    background: designAnalysis?.colorPalette?.background || "#0a0a0a",
    text: designAnalysis?.colorPalette?.text || "#ffffff",
    accent: designAnalysis?.colorPalette?.accent || "#06b6d4",
  };

  const borderRadius = BORDER_RADIUS_MAP[designAnalysis?.uiStyle?.borderRadius || "medium"] || 12;
  const cardStyle = (designAnalysis?.uiStyle?.cardStyle || "elevated") as "flat" | "elevated" | "bordered" | "glass";
  const displayMetrics = metrics || DEFAULT_METRICS;
  const displayFeatures = features.length > 0 ? features : [
    { title: "AI Automation", description: "Smart workflows that save hours", icon: "\u26A1" },
    { title: "Analytics", description: "Real-time insights at a glance", icon: "\uD83D\uDCCA" },
    { title: "Collaboration", description: "Built for modern teams", icon: "\uD83D\uDC65" },
    { title: "Integrations", description: "Connect your entire stack", icon: "\uD83D\uDD17" },
  ];

  // Phase 1: Title (30-65)
  const titleOpacity = interpolate(frame, [30, 42], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleScale = interpolate(
    spring({ frame: Math.max(0, frame - 30), fps, config: { damping: 15, mass: 0.5 } }),
    [0, 1], [1.15, 1]
  );
  const titleOut = interpolate(frame, [55, 65], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Phase 2-3: Dashboard (60-210)
  const dashboardOpacity = interpolate(frame, [200, 215], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Phase 4: Features (210-270)
  const featurePhaseOpacity = interpolate(frame, [210, 225], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const featurePhaseOut = interpolate(frame, [270, 280], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Phase 5: Social proof (270-330)
  const socialOpacity = interpolate(frame, [270, 285], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const socialOut = interpolate(frame, [325, 335], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Phase 6: CTA (330-360)
  const ctaOpacity = interpolate(frame, [330, 345], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      {/* Always-on animated background */}
      <DynamicBackground primaryColor={colors.primary} secondaryColor={colors.secondary} accentColor={colors.accent} />

      {/* Phase 1: Title + Tagline */}
      <AbsoluteFill style={{
        justifyContent: "center", alignItems: "center",
        opacity: titleOpacity * titleOut,
        flexDirection: "column", gap: 16,
      }}>
        <div style={{
          fontSize: 80, fontWeight: 800, color: colors.text,
          fontFamily, textRendering: "optimizeLegibility",
          WebkitFontSmoothing: "antialiased",
          letterSpacing: "-0.03em",
          transform: `scale(${titleScale})`,
        }}>{productName}</div>
        <div style={{
          fontSize: 32, fontWeight: 400, color: colors.text,
          opacity: 0.6, fontFamily, letterSpacing: "-0.01em",
          transform: `scale(${titleScale})`,
        }}>{tagline}</div>
      </AbsoluteFill>

      {/* Phase 2-3: Dashboard assembly */}
      <div style={{ opacity: dashboardOpacity }}>
        <AnimatedNavbar
          accentColor={colors.accent}
          backgroundColor={`${colors.secondary}f0`}
          textColor={colors.text}
          delay={60}
          productName={productName}
        />

        <AnimatedSidebar
          accentColor={colors.accent}
          backgroundColor={`${colors.secondary}f0`}
          textColor={colors.text}
          delay={90}
        />

        {/* Metric cards row */}
        <div style={{
          position: "absolute", top: 84, left: 260, right: 20,
          display: "flex", gap: 16,
        }}>
          {displayMetrics.slice(0, 4).map((m, i) => (
            <AnimatedMetricCard
              key={i}
              label={m.label}
              value={m.value}
              prefix={m.prefix}
              suffix={m.suffix}
              accentColor={colors.accent}
              textColor={colors.text}
              delay={100 + i * 5}
              width={0}
            />
          ))}
        </div>

        {/* Chart + Table */}
        <div style={{
          position: "absolute", top: 230, left: 260, right: 20, bottom: 20,
          display: "flex", gap: 16,
        }}>
          <AnimatedChart
            type="bar"
            accentColor={colors.accent}
            delay={150}
            width={700}
            height={300}
          />
          <AnimatedTable
            accentColor={colors.accent}
            textColor={colors.text}
            delay={160}
            width={600}
          />
        </div>
      </div>

      {/* Phase 4: Feature Cards */}
      <AbsoluteFill style={{
        opacity: featurePhaseOpacity * featurePhaseOut,
        justifyContent: "center", alignItems: "center",
        padding: 80,
      }}>
        <div style={{
          fontSize: 40, fontWeight: 700, color: colors.text,
          fontFamily, textAlign: "center" as const, marginBottom: 40,
          opacity: interpolate(frame, [212, 222], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}>Key Features</div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" as const, justifyContent: "center" }}>
          {displayFeatures.slice(0, 4).map((f, i) => (
            <AnimatedCard
              key={i}
              title={f.title}
              description={f.description}
              icon={f.icon}
              delay={220 + i * 5}
              tokens={{
                accentColor: colors.accent,
                textColor: colors.text,
                borderRadius,
                cardStyle,
              }}
              width={380}
              height={180}
            />
          ))}
        </div>
      </AbsoluteFill>

      {/* Phase 5: Social Proof */}
      <AbsoluteFill style={{
        opacity: socialOpacity * socialOut,
        justifyContent: "center", alignItems: "center",
        flexDirection: "column", gap: 30,
      }}>
        <div style={{
          fontSize: 36, fontWeight: 700, color: colors.text,
          fontFamily, opacity: 0.9,
        }}>Trusted by teams worldwide</div>
        <div style={{ display: "flex", gap: 40, alignItems: "center" }}>
          {["Google", "Stripe", "Slack", "Notion", "Figma"].map((name, i) => {
            const logoDelay = 278 + i * 4;
            const logoProgress = spring({ frame: frame - logoDelay, fps, config: { damping: 15, mass: 0.4 } });
            const logoScale = interpolate(logoProgress, [0, 1], [0.7, 1]);
            const logoOpacity = interpolate(frame, [logoDelay, logoDelay + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={name} style={{
                padding: "12px 28px", borderRadius: 10,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
                opacity: logoOpacity,
                transform: `scale(${logoScale})`,
              }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: colors.text, opacity: 0.6, fontFamily }}>{name}</span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      {/* Phase 6: CTA End Card */}
      <AbsoluteFill style={{
        opacity: ctaOpacity,
        justifyContent: "center", alignItems: "center",
        flexDirection: "column", gap: 24,
        background: `linear-gradient(135deg, ${colors.background} 0%, ${colors.secondary} 100%)`,
      }}>
        <div style={{
          fontSize: 64, fontWeight: 800, color: colors.text,
          fontFamily, letterSpacing: "-0.03em",
          textRendering: "optimizeLegibility",
        }}>{productName}</div>
        <div style={{
          fontSize: 24, fontWeight: 400, color: colors.text,
          opacity: 0.6, fontFamily, marginBottom: 16,
        }}>{tagline}</div>
        <AnimatedButton text="Get Started" accentColor={colors.accent} delay={338} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
