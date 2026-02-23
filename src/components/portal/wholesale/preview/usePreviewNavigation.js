// ---------------------------------------------------------------------------
// usePreviewNavigation.js -- Navigation helper for the store builder preview.
// Wraps the state-based page switching used by StorePreview.jsx, providing
// named navigation functions that all preview page components can use.
// ---------------------------------------------------------------------------

import { useCallback, useRef } from 'react';

export default function usePreviewNavigation(setCurrentPage, setPageData) {
  const historyRef = useRef([]);

  const navigateTo = useCallback(
    (page, data = null) => {
      setCurrentPage((prev) => {
        historyRef.current.push(prev);
        return page;
      });
      setPageData(data);
      // Scroll the preview container to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setCurrentPage, setPageData],
  );

  const goBack = useCallback(() => {
    const prev = historyRef.current.pop();
    if (prev) {
      setCurrentPage(prev);
      setPageData(null);
    }
  }, [setCurrentPage, setPageData]);

  return {
    goToHome: useCallback(() => navigateTo('home'), [navigateTo]),
    goToCatalog: useCallback(() => navigateTo('catalog'), [navigateTo]),
    goToProduct: useCallback((productId) => navigateTo('product', { productId }), [navigateTo]),
    goToCart: useCallback(() => navigateTo('cart'), [navigateTo]),
    goToCheckout: useCallback(() => navigateTo('checkout'), [navigateTo]),
    goToOrders: useCallback(() => navigateTo('orders'), [navigateTo]),
    goToOrderDetail: useCallback((orderId) => navigateTo('order-detail', { orderId }), [navigateTo]),
    goToAccount: useCallback(() => navigateTo('account'), [navigateTo]),
    goToInquiries: useCallback(() => navigateTo('inquiries'), [navigateTo]),
    goToSettings: useCallback(() => navigateTo('settings'), [navigateTo]),
    goBack,
    navigateTo,
  };
}
