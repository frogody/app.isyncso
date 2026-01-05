import { useState, useMemo } from 'react';

/**
 * usePagination - Client-side pagination hook
 * 
 * @param {Array} items - Full array of items to paginate
 * @param {number} pageSize - Items per page (default: 12)
 * 
 * @returns {Object} Pagination state and controls:
 *   - items: Current page's items
 *   - currentPage: Current page number (1-indexed)
 *   - totalPages: Total number of pages
 *   - goToPage: Navigate to specific page
 *   - nextPage: Go to next page
 *   - prevPage: Go to previous page
 *   - resetPage: Reset to page 1
 *   - hasNext: Boolean, can go forward
 *   - hasPrev: Boolean, can go back
 * 
 * Note: Automatically memoizes paginated items to avoid recalculation
 */
export function usePagination(items, pageSize = 12) {
  const [currentPage, setCurrentPage] = useState(1);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }, [items, currentPage, pageSize]);

  const totalPages = Math.ceil(items.length / pageSize);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const nextPage = () => goToPage(currentPage + 1);
  const prevPage = () => goToPage(currentPage - 1);
  const resetPage = () => setCurrentPage(1);

  return {
    items: paginatedItems,
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
    resetPage,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1
  };
}