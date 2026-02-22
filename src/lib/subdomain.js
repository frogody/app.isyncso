// ---------------------------------------------------------------------------
// subdomain.js -- Detect store subdomain from the current hostname.
// Used to route *.syncstore.business traffic to the public storefront.
// ---------------------------------------------------------------------------

const STORE_DOMAIN = '.syncstore.business';

const RESERVED = new Set([
  'app', 'www', 'api', 'admin', 'staging', 'preview', 'mail', 'smtp',
  'imap', 'pop', 'ftp', 'cdn', 'status', 'docs', 'help', 'support',
]);

/**
 * Returns the store subdomain if the current hostname matches
 * `{subdomain}.syncstore.business` and the subdomain is not reserved.
 * Returns null for the main app, localhost, and reserved subdomains.
 */
export function getStoreSubdomain() {
  const hostname = window.location.hostname;

  // Local development — no subdomain detection
  if (hostname === 'localhost' || hostname === '127.0.0.1') return null;

  // Must be a subdomain of syncstore.business
  if (!hostname.endsWith(STORE_DOMAIN)) return null;

  // Extract the prefix before .syncstore.business
  const prefix = hostname.slice(0, -STORE_DOMAIN.length);

  // Only support single-level subdomains
  if (!prefix || prefix.includes('.')) return null;

  const sub = prefix.toLowerCase();
  if (RESERVED.has(sub)) return null;

  return sub;
}
