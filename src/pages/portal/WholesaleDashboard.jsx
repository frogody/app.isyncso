import { useEffect } from 'react';
import { WholesaleProvider } from '@/components/portal/wholesale/WholesaleProvider';
import WholesaleLayout from '@/components/portal/wholesale/WholesaleLayout';
import ClientDashboardPage from '@/components/portal/wholesale/dashboard/ClientDashboardPage';

export default function WholesaleDashboard() {
  useEffect(() => {
    document.title = 'Dashboard | Wholesale Portal';
  }, []);

  return (
    <WholesaleProvider>
      <WholesaleLayout>
        <ClientDashboardPage />
      </WholesaleLayout>
    </WholesaleProvider>
  );
}
