/**
 * Centralized API Configuration
 *
 * All API endpoint URLs and auth helpers should be imported from this file.
 * NEVER hardcode Supabase URLs or anon keys directly in components.
 *
 * Environment variables required in .env:
 *   VITE_SUPABASE_URL        - Supabase project URL
 *   VITE_SUPABASE_ANON_KEY   - Supabase anonymous/public key
 *   VITE_MAPBOX_ACCESS_TOKEN - Mapbox token (optional, for maps)
 *   VITE_GOOGLE_CLIENT_ID    - Google OAuth client ID
 */

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------

export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL ?? '';

export const SUPABASE_ANON_KEY: string =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_URL) {
  console.warn('[api config] VITE_SUPABASE_URL is not set.');
}
if (!SUPABASE_ANON_KEY) {
  console.warn('[api config] VITE_SUPABASE_ANON_KEY is not set.');
}

// ---------------------------------------------------------------------------
// Supabase Edge Function URL builder
// ---------------------------------------------------------------------------

export function edgeFunctionUrl(
  functionName: string,
  queryParams?: Record<string, string>,
): string {
  const base = `${SUPABASE_URL}/functions/v1/${functionName}`;
  if (!queryParams) return base;
  const qs = new URLSearchParams(queryParams).toString();
  return qs ? `${base}?${qs}` : base;
}

// ---------------------------------------------------------------------------
// Supabase Storage URL builder
// ---------------------------------------------------------------------------

export function storagePublicUrl(bucket: string, path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

// ---------------------------------------------------------------------------
// Auth header helpers
// ---------------------------------------------------------------------------

export function anonHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    apikey: SUPABASE_ANON_KEY,
  };
}

export function authHeaders(accessToken: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
    apikey: SUPABASE_ANON_KEY,
  };
}

// ---------------------------------------------------------------------------
// Frontend-safe keys
// ---------------------------------------------------------------------------

export const FRONTEND_KEYS = {
  MAPBOX_TOKEN: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ?? '',
  GOOGLE_OAUTH_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
} as const;
