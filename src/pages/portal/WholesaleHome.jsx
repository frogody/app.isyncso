import { useEffect } from "react";
import { WholesaleProvider } from "@/components/portal/wholesale/WholesaleProvider";
import WholesaleLayout from "@/components/portal/wholesale/WholesaleLayout";
import StorefrontRenderer from "@/components/portal/wholesale/StorefrontRenderer";

export default function WholesaleHome() {
  useEffect(() => {
    document.title = "Shop | Wholesale Portal";
  }, []);

  return (
    <WholesaleProvider>
      <WholesaleLayout>
        <StorefrontRenderer />
      </WholesaleLayout>
    </WholesaleProvider>
  );
}
