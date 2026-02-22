// ---------------------------------------------------------------------------
// subdomain.js -- Detect store subdomain from the current hostname.
// Used to route *.isyncso.com traffic to the public storefront.
// ---------------------------------------------------------------------------

const RESERVED = new Set([
  'app', 'www', 'api', 'admin', 'staging', 'preview', 'mail', 'smtp',
  'imap', 'pop', 'ftp', 'cdn', 'status', 'docs', 'help', 'support',
]);

/**
 * Returns the store subdomain if the current hostname matches
 * `{subdomain}.isyncso.com` and the subdomain is not reserved.
 * Returns null for the main app, localhost, and reserved subdomains.
 */
export function getStoreSubdomain() {
  const hostname = window.location.hostname;

  // Local development — no subdomain detection
  if (hostname === 'localhost' || hostname === '127.0.0.1') return null;

  // Must be a subdomain of isyncso.com
  if (!hostname.endsWith('.isyncso.com')) return null;

  // Extract the prefix before .isyncso.com
  const prefix = hostname.slice(0, -'.isyncso.com'.length);

  // Only support single-level subdomains (no nested like a.b.isyncso.com)
  if (!prefix || prefix.includes('.')) return null;

  const sub = prefix.toLowerCase();
  if (RESERVED.has(sub)) return null;

  return sub;
}
