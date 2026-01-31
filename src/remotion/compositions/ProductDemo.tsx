import { AbsoluteFill, Sequence } from "remotion";
import { AnimatedText } from "../components/AnimatedText";
import { AnimatedScale } from "../components/AnimatedScale";
import { BrandedBackground } from "../components/BrandedBackground";
import { ProductImage } from "../components/ProductImage";

interface ProductDemoProps {
  productName: string;
  productDescription: string;
  productImage: string;
  brandColors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  features: string[];
}

export const ProductDemo: React.FC<ProductDemoProps> = ({
  productName,
  productDescription,
  productImage,
  brandColors,
  features,
}) => {
  return (
    <AbsoluteFill>
      <BrandedBackground
        primaryColor={brandColors.primary}
        secondaryColor={brandColors.secondary}
      />

      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "flex-start",
          alignItems: "center",
          padding: "60px 100px",
        }}
      >
        {/* Title: frames 0-30 */}
        <Sequence from={0} durationInFrames={180}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <AnimatedText
              text={productName}
              fontSize={72}
              fontWeight={800}
              color={brandColors.accent}
            />
            <AnimatedText
              text={productDescription}
              fontSize={28}
              fontWeight={400}
              color="#a1a1aa"
              delay={10}
            />
          </div>
        </Sequence>

        {/* Product image: frames 30-90 */}
        <Sequence from={30} durationInFrames={150}>
          <div style={{ marginTop: 10, marginBottom: 20, display: "flex", justifyContent: "center", width: "100%" }}>
            <AnimatedScale delay={0} springConfig={{ damping: 14, stiffness: 80, mass: 1.2 }}>
              <ProductImage src={productImage} startScale={0.85} endScale={1.0} width={1400} height={720} />
            </AnimatedScale>
          </div>
        </Sequence>

        {/* Features: frames 90-150 */}
        <Sequence from={90} durationInFrames={90}>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: 40,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {features.map((feature, i) => (
              <AnimatedText
                key={feature}
                text={`${feature}`}
                fontSize={24}
                fontWeight={600}
                color="#e4e4e7"
                delay={i * 10}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  padding: "12px 28px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              />
            ))}
          </div>
        </Sequence>

        {/* CTA: frames 150-180 */}
        <Sequence from={150} durationInFrames={30}>
          <div style={{ marginTop: 40 }}>
            <AnimatedText
              text="Learn More"
              fontSize={32}
              fontWeight={700}
              color={brandColors.accent}
              style={{
                background: "rgba(6,182,212,0.15)",
                padding: "16px 48px",
                borderRadius: 16,
                border: `2px solid ${brandColors.accent}`,
              }}
            />
          </div>
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
