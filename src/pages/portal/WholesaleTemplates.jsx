import { useEffect } from 'react';
import { WholesaleProvider } from '@/components/portal/wholesale/WholesaleProvider';
import WholesaleLayout from '@/components/portal/wholesale/WholesaleLayout';
import OrderTemplatesPage from '@/components/portal/wholesale/templates/OrderTemplatesPage';

export default function WholesaleTemplates() {
  useEffect(() => {
    document.title = 'Order Templates | Wholesale Portal';
  }, []);

  return (
    <WholesaleProvider>
      <WholesaleLayout>
        <OrderTemplatesPage />
      </WholesaleLayout>
    </WholesaleProvider>
  );
}
