import { useEffect } from 'react';
import { WholesaleProvider } from '@/components/portal/wholesale/WholesaleProvider';
import WholesaleLayout from '@/components/portal/wholesale/WholesaleLayout';
import CartPage from '@/components/portal/wholesale/cart/CartPage';

export default function WholesaleCart() {
  useEffect(() => {
    document.title = 'Cart | Wholesale Portal';
  }, []);

  return (
    <WholesaleProvider>
      <WholesaleLayout>
        <CartPage />
      </WholesaleLayout>
    </WholesaleProvider>
  );
}
