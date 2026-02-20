import { useEffect } from 'react';
import { WholesaleProvider } from '@/components/portal/wholesale/WholesaleProvider';
import WholesaleLayout from '@/components/portal/wholesale/WholesaleLayout';
import OrderHistoryPage from '@/components/portal/wholesale/orders/OrderHistoryPage';

export default function WholesaleOrders() {
  useEffect(() => {
    document.title = 'Orders | Wholesale Portal';
  }, []);

  return (
    <WholesaleProvider>
      <WholesaleLayout>
        <OrderHistoryPage />
      </WholesaleLayout>
    </WholesaleProvider>
  );
}
