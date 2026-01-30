import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { AnimatedText } from "../components/AnimatedText";
import { PulsingButton } from "../components/PulsingButton";
import { ScreenshotCarousel } from "../components/ScreenshotCarousel";
import { MockNavbar } from "../components/MockNavbar";
import { MockSidebar } from "../components/MockSidebar";
import { MockCard } from "../components/MockCard";

const DEFAULT_ANALYSIS = {
  colorPalette: { primary: "#06b6d4", secondary: "#1a1a2e", background: "#0f0f0f", text: "#ffffff", accent: "#06b6d4" },
  typography: { style: "modern" as const, hasRoundedFonts: true },
  uiStyle: { cardStyle: "elevated" as const, borderRadius: "medium" as const, density: "comfortable" as const },
  components: [] as Array<{ type: string; position?: string; style?: string; count?: number; types?: string[] }>,
  layoutPattern: "dashboard" as const,
  overallVibe: "professional" as const,
};

interface Feature {
  title: string;
  description: string;
  icon: string;
}

interface DesignAnalysis {
  colorPalette: { primary: string; secondary: string; background: string; text: string; accent: string };
  typography: { style: string; hasRoundedFonts: boolean };
  uiStyle: { cardStyle: "flat" | "elevated" | "bordered" | "glass"; borderRadius: "none" | "small" | "medium" | "large" | "full"; density: string };
  components: Array<{ type: string; position?: string; style?: string; count?: number; types?: string[] }>;
  layoutPattern: string;
  overallVibe: string;
}

interface UIShowcaseProps {
  designAnalysis?: DesignAnalysis;
  productName: string;
  tagline: string;
  features: Feature[];
  screenshots: string[];
}

export const UIShowcase: React.FC<UIShowcaseProps> = ({
  designAnalysis,
  productName,
  tagline,
  features = [],
  screenshots = [],
}) => {
  const frame = useCurrentFrame();
  const analysis = designAnalysis || DEFAULT_ANALYSIS;
  const { colorPalette, uiStyle, components } = analysis;
  const isDashboard = analysis.layoutPattern === "dashboard" || analysis.layoutPattern === "data-heavy";

  const hasNavbar = components?.some(c => c.type === "navbar") !== false;
  const hasSidebar = components?.some(c => c.type === "sidebar") !== false;
  const sidebarComp = components?.find(c => c.type === "sidebar");
  const navbarComp = components?.find(c => c.type === "navbar");
  const cardsCount = components?.find(c => c.type === "cards")?.count || 4;

  if (isDashboard) {
    return <DashboardLayout
      frame={frame}
      colorPalette={colorPalette}
      uiStyle={uiStyle}
      hasNavbar={hasNavbar}
      hasSidebar={hasSidebar}
      sidebarCollapsed={sidebarComp?.style === "collapsed"}
      navbarStyle={(navbarComp?.style as "dark" | "light") || "dark"}
      cardsCount={cardsCount}
      productName={productName}
      tagline={tagline}
      features={features}
      screenshots={screenshots}
    />;
  }

  return <LandingLayout
    frame={frame}
    colorPalette={colorPalette}
    uiStyle={uiStyle}
    productName={productName}
    tagline={tagline}
    features={features}
    screenshots={screenshots}
  />;
};

// ---- DASHBOARD LAYOUT ----
function DashboardLayout({
  frame, colorPalette, uiStyle, hasNavbar, hasSidebar, sidebarCollapsed,
  navbarStyle, cardsCount, productName, tagline, features, screenshots,
}: {
  frame: number;
  colorPalette: DesignAnalysis["colorPalette"];
  uiStyle: DesignAnalysis["uiStyle"];
  hasNavbar: boolean;
  hasSidebar: boolean;
  sidebarCollapsed: boolean;
  navbarStyle: "dark" | "light";
  cardsCount: number;
  productName: string;
  tagline: string;
  features: Feature[];
  screenshots: string[];
}) {
  const sidebarWidth = sidebarCollapsed ? 64 : 220;
  const contentLeft = hasSidebar ? sidebarWidth : 0;
  const contentTop = hasNavbar ? 64 : 0;

  const featureOverlayOpacity = interpolate(frame, [150, 165], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const screenshotPhaseOpacity = interpolate(frame, [240, 255], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const endCardOpacity = interpolate(frame, [300, 315], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const uiPhaseOpacity = interpolate(frame, [240, 255], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: colorPalette.background }}>
      {/* Phase 1-3: Mock UI (frames 0-240) */}
      <div style={{ opacity: frame < 300 ? uiPhaseOpacity : 0 }}>
        {hasNavbar && (
          <MockNavbar
            backgroundColor={colorPalette.secondary}
            textColor={colorPalette.text}
            accentColor={colorPalette.accent}
            style={navbarStyle}
            delay={0}
          />
        )}

        {hasSidebar && (
          <MockSidebar
            backgroundColor={colorPalette.secondary}
            accentColor={colorPalette.accent}
            textColor={colorPalette.text}
            width={sidebarWidth}
            delay={30}
            collapsed={sidebarCollapsed}
          />
        )}

        {/* Cards Grid */}
        <div
          style={{
            position: "absolute",
            top: contentTop + 20,
            left: contentLeft + 20,
            right: 20,
            bottom: 20,
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            alignContent: "flex-start",
          }}
        >
          {Array.from({ length: Math.min(cardsCount, 6) }).map((_, i) => (
            <MockCard
              key={i}
              cardStyle={uiStyle.cardStyle}
              borderRadius={uiStyle.borderRadius}
              backgroundColor={colorPalette.secondary}
              accentColor={colorPalette.accent}
              textColor={colorPalette.text}
              delay={60 + i * 12}
              width={i < 2 ? "calc(50% - 8px)" : "calc(33.33% - 11px)"}
              height={i < 2 ? 220 : 180}
            />
          ))}
        </div>

        {/* Feature overlay (frames 150-240) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            opacity: featureOverlayOpacity * (1 - screenshotPhaseOpacity),
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 20,
            padding: 60,
          }}
        >
          {features.slice(0, 4).map((f, i) => {
            const fDelay = 155 + i * 18;
            const fOpacity = interpolate(frame, [fDelay, fDelay + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const fSlide = interpolate(frame, [fDelay, fDelay + 12], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={i} style={{ opacity: fOpacity, transform: `translateY(${fSlide}px)`, display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: colorPalette.accent, opacity: 0.9, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 28, fontWeight: "bold", color: colorPalette.text, fontFamily: "Inter, sans-serif" }}>{f.title}</div>
                  <div style={{ fontSize: 18, color: colorPalette.text, opacity: 0.6, fontFamily: "Inter, sans-serif" }}>{f.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Phase 4: Screenshots (frames 240-300) */}
      {screenshots.length > 0 && (
        <div style={{ position: "absolute", inset: 0, opacity: screenshotPhaseOpacity * (1 - endCardOpacity) }}>
          <ScreenshotCarousel screenshots={screenshots} startFrame={240} durationPerImage={20} />
        </div>
      )}

      {/* Phase 5: End Card (frames 300-360) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: endCardOpacity,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: `linear-gradient(135deg, ${colorPalette.background} 0%, ${colorPalette.secondary} 100%)`,
        }}
      >
        <AnimatedText text={productName} fontSize={72} color={colorPalette.text} delay={305} />
        <div style={{ height: 16 }} />
        <AnimatedText text={tagline} fontSize={32} color={colorPalette.text} delay={315} />
        <div style={{ height: 40 }} />
        <PulsingButton text="Get Started" backgroundColor={colorPalette.accent} textColor="#fff" delay={325} />
      </div>
    </AbsoluteFill>
  );
}

// ---- LANDING LAYOUT ----
function LandingLayout({
  frame, colorPalette, uiStyle, productName, tagline, features, screenshots,
}: {
  frame: number;
  colorPalette: DesignAnalysis["colorPalette"];
  uiStyle: DesignAnalysis["uiStyle"];
  productName: string;
  tagline: string;
  features: Feature[];
  screenshots: string[];
}) {
  const heroOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const screenshotOpacity = interpolate(frame, [45, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const featuresOpacity = interpolate(frame, [120, 135], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const endOpacity = interpolate(frame, [240, 255], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: colorPalette.background }}>
      {/* Hero (0-45) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: heroOpacity * (1 - interpolate(frame, [40, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })),
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: `linear-gradient(135deg, ${colorPalette.background} 0%, ${colorPalette.secondary} 100%)`,
        }}
      >
        <AnimatedText text={productName} fontSize={80} color={colorPalette.text} delay={0} />
        <div style={{ height: 16 }} />
        <AnimatedText text={tagline} fontSize={36} color={colorPalette.text} delay={10} />
      </div>

      {/* Screenshots (45-120) */}
      {screenshots.length > 0 && (
        <div style={{ position: "absolute", inset: 0, opacity: screenshotOpacity * (1 - featuresOpacity) }}>
          <ScreenshotCarousel screenshots={screenshots} startFrame={45} durationPerImage={25} />
          <div style={{
            position: "absolute", inset: 0,
            background: `radial-gradient(circle at ${50 + Math.sin(frame * 0.05) * 20}% ${50 + Math.cos(frame * 0.05) * 20}%, ${colorPalette.accent}30 0%, transparent 50%)`,
          }} />
        </div>
      )}

      {/* Features (120-240) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: featuresOpacity * (1 - endOpacity),
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 24,
          background: `linear-gradient(135deg, ${colorPalette.background} 0%, ${colorPalette.secondary} 100%)`,
          padding: 80,
        }}
      >
        {features.slice(0, 4).map((f, i) => {
          const fDelay = 125 + i * 25;
          const fOpacity = interpolate(frame, [fDelay, fDelay + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const fSlide = interpolate(frame, [fDelay, fDelay + 15], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={i} style={{ opacity: fOpacity, transform: `translateX(${fSlide}px)`, display: "flex", alignItems: "center", gap: 20, width: "100%", maxWidth: 900 }}>
              <div style={{ width: 56, height: 56, borderRadius: uiStyle.borderRadius === "full" ? 9999 : 12, backgroundColor: colorPalette.accent, opacity: 0.9, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 30, fontWeight: "bold", color: colorPalette.text, fontFamily: "Inter, sans-serif" }}>{f.title}</div>
                <div style={{ fontSize: 20, color: colorPalette.text, opacity: 0.6, fontFamily: "Inter, sans-serif", marginTop: 4 }}>{f.description}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* End Card (240-360) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: endOpacity,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: `linear-gradient(135deg, ${colorPalette.background} 0%, ${colorPalette.secondary} 100%)`,
        }}
      >
        <AnimatedText text={productName} fontSize={72} color={colorPalette.text} delay={245} />
        <div style={{ height: 16 }} />
        <AnimatedText text={tagline} fontSize={32} color={colorPalette.text} delay={255} />
        <div style={{ height: 40 }} />
        <PulsingButton text="Get Started" backgroundColor={colorPalette.accent} textColor="#fff" delay={265} />
      </div>
    </AbsoluteFill>
  );
}
