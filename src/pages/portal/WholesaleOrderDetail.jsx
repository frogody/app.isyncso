import { useEffect } from 'react';
import { WholesaleProvider } from '@/components/portal/wholesale/WholesaleProvider';
import WholesaleLayout from '@/components/portal/wholesale/WholesaleLayout';
import OrderDetailPage from '@/components/portal/wholesale/orders/OrderDetailPage';

export default function WholesaleOrderDetail() {
  useEffect(() => {
    document.title = 'Order Details | Wholesale Portal';
  }, []);

  return (
    <WholesaleProvider>
      <WholesaleLayout>
        <OrderDetailPage />
      </WholesaleLayout>
    </WholesaleProvider>
  );
}
