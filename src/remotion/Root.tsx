import { Composition } from "remotion";
import { TestVideo } from "./compositions/TestVideo";
import { ProductDemo } from "./compositions/ProductDemo";
import { SocialAd } from "./compositions/SocialAd";
import { FeatureShowcase } from "./compositions/FeatureShowcase";
import { ProductShowcase } from "./compositions/ProductShowcase";
import { UIShowcase } from "./compositions/UIShowcase";
import { KeynoteShowcase } from "./compositions/KeynoteShowcase";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="TestVideo"
        component={TestVideo}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="ProductDemo"
        component={ProductDemo}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          productName: "iSyncSO Platform",
          productDescription: "The all-in-one business operating system",
          productImage: "https://placehold.co/800x600/1a1a2e/06b6d4?text=Product",
          brandColors: {
            primary: "#0f0f0f",
            secondary: "#1a1a2e",
            accent: "#06b6d4",
          },
          features: [
            "AI-Powered Automation",
            "Real-time Analytics",
            "Team Collaboration",
            "Smart Integrations",
          ],
        }}
      />
      <Composition
        id="SocialAd"
        component={SocialAd}
        durationInFrames={90}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={{
          headline: "Transform Your Workflow",
          subheadline: "The smartest way to run your business",
          productImage: "https://placehold.co/400x400/1a1a2e/06b6d4?text=Product",
          brandColors: {
            primary: "#0f0f0f",
            secondary: "#1a1a2e",
            accent: "#06b6d4",
          },
          ctaText: "Try Free",
        }}
      />
      <Composition
        id="FeatureShowcase"
        component={FeatureShowcase}
        durationInFrames={240}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          productName: "iSyncSO Platform",
          features: [
            {
              title: "AI Automation",
              description: "Automate repetitive tasks with intelligent AI agents that learn your workflows.",
              icon: "🤖",
            },
            {
              title: "Real-time Analytics",
              description: "Get instant insights into your business performance with live dashboards.",
              icon: "📊",
            },
            {
              title: "Team Collaboration",
              description: "Work together seamlessly with built-in messaging, tasks, and shared workspaces.",
              icon: "👥",
            },
            {
              title: "Smart Integrations",
              description: "Connect to 30+ tools you already use with one-click integrations.",
              icon: "🔗",
            },
          ],
          brandColors: {
            primary: "#0f0f0f",
            secondary: "#1a1a2e",
            accent: "#06b6d4",
          },
        }}
      />
      <Composition
        id="ProductShowcase"
        component={ProductShowcase}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          productName: "iSyncSO Platform",
          tagline: "The all-in-one business operating system",
          screenshots: [
            "https://placehold.co/1920x1080/1a1a2e/06b6d4?text=Dashboard",
            "https://placehold.co/1920x1080/1a1a2e/06b6d4?text=Analytics",
            "https://placehold.co/1920x1080/1a1a2e/06b6d4?text=Workflows",
          ],
          features: [
            { title: "AI-Powered Automation", description: "Automate repetitive tasks", icon: "Zap" },
            { title: "Real-time Analytics", description: "Track everything live", icon: "BarChart" },
            { title: "Team Collaboration", description: "Work together seamlessly", icon: "Users" },
            { title: "Smart Integrations", description: "Connect all your tools", icon: "Link" },
          ],
          brandColors: {
            primary: "#0f0f0f",
            secondary: "#1a1a2e",
            accent: "#06b6d4",
          },
          ctaText: "Start Free Trial",
        }}
      />
      <Composition
        id="UIShowcase"
        component={UIShowcase}
        durationInFrames={360}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          productName: "iSyncSO Platform",
          tagline: "The all-in-one business operating system",
          features: [
            { title: "AI-Powered Automation", description: "Automate repetitive tasks", icon: "Zap" },
            { title: "Real-time Analytics", description: "Track everything live", icon: "BarChart" },
            { title: "Team Collaboration", description: "Work together seamlessly", icon: "Users" },
            { title: "Smart Integrations", description: "Connect all your tools", icon: "Link" },
          ],
          screenshots: [
            "https://placehold.co/1920x1080/1a1a2e/06b6d4?text=Dashboard",
            "https://placehold.co/1920x1080/1a1a2e/06b6d4?text=Analytics",
          ],
          designAnalysis: undefined,
        }}
      />
      <Composition
        id="KeynoteShowcase"
        component={KeynoteShowcase}
        durationInFrames={360}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          productName: "iSyncSO Platform",
          tagline: "The all-in-one business operating system",
          features: [],
          screenshots: [],
          designAnalysis: undefined,
        }}
      />
    </>
  );
};
