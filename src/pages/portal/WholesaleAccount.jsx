import { useEffect } from 'react';
import { WholesaleProvider } from '@/components/portal/wholesale/WholesaleProvider';
import WholesaleLayout from '@/components/portal/wholesale/WholesaleLayout';
import AccountPage from '@/components/portal/wholesale/account/AccountPage';

export default function WholesaleAccount() {
  useEffect(() => {
    document.title = 'My Account | Wholesale Portal';
  }, []);

  return (
    <WholesaleProvider>
      <WholesaleLayout>
        <AccountPage />
      </WholesaleLayout>
    </WholesaleProvider>
  );
}
