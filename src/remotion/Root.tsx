import { Composition } from "remotion";
import { TestVideo } from "./compositions/TestVideo";
import { ProductDemo } from "./compositions/ProductDemo";

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
    </>
  );
};
