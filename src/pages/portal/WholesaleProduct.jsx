import { useEffect } from "react";
import { WholesaleProvider } from "@/components/portal/wholesale/WholesaleProvider";
import WholesaleLayout from "@/components/portal/wholesale/WholesaleLayout";
import ProductDetailPage from "@/components/portal/wholesale/catalog/ProductDetailPage";

export default function WholesaleProduct() {
  useEffect(() => {
    document.title = "Product | Wholesale Portal";
  }, []);

  return (
    <WholesaleProvider>
      <WholesaleLayout>
        <ProductDetailPage />
      </WholesaleLayout>
    </WholesaleProvider>
  );
}
