import { useEffect } from "react";
import { WholesaleProvider } from "@/components/portal/wholesale/WholesaleProvider";
import WholesaleLayout from "@/components/portal/wholesale/WholesaleLayout";
import CatalogPage from "@/components/portal/wholesale/catalog/CatalogPage";

export default function WholesaleCatalog() {
  useEffect(() => {
    document.title = "Catalog | Wholesale Portal";
  }, []);

  return (
    <WholesaleProvider>
      <WholesaleLayout>
        <CatalogPage />
      </WholesaleLayout>
    </WholesaleProvider>
  );
}
