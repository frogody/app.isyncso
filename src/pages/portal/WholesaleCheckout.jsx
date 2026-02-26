import { useEffect } from 'react';
import { WholesaleProvider } from '@/components/portal/wholesale/WholesaleProvider';
import WholesaleLayout from '@/components/portal/wholesale/WholesaleLayout';
import CheckoutPage from '@/components/portal/wholesale/cart/CheckoutPage';

export default function WholesaleCheckout() {
  useEffect(() => {
    document.title = 'Checkout | Wholesale Portal';
  }, []);

  return (
    <WholesaleProvider>
      <WholesaleLayout>
        <CheckoutPage />
      </WholesaleLayout>
    </WholesaleProvider>
  );
}
