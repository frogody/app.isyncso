/**
 * WholesaleInquiries - Route wrapper for the client-facing inquiry list.
 *
 * Imports WholesaleProvider + WholesaleLayout + InquiryListPage, sets document.title.
 */

import { useEffect } from 'react';
import { WholesaleProvider } from '@/components/portal/wholesale/WholesaleProvider';
import WholesaleLayout from '@/components/portal/wholesale/WholesaleLayout';
import InquiryListPage from '@/components/portal/wholesale/inquiry/InquiryListPage';

export default function WholesaleInquiries() {
  useEffect(() => {
    document.title = 'Inquiries | Wholesale Portal';
  }, []);

  return (
    <WholesaleProvider>
      <WholesaleLayout>
        <InquiryListPage />
      </WholesaleLayout>
    </WholesaleProvider>
  );
}
