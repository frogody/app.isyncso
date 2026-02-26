/**
 * Sanitize search input to prevent injection and trim whitespace.
 */
export function sanitizeSearchInput(input) {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/[<>"'`;]/g, '');
}
