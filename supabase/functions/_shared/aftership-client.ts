/**
 * AfterShip API v4 Client
 * Shared utility for all AfterShip edge functions
 */

const AFTERSHIP_BASE = 'https://api.aftership.com/v4';

// Carrier slug mapping for common EU carriers
export const CARRIER_SLUGS: Record<string, string> = {
  postnl: 'postnl',
  dhl: 'dhl',
  dpd: 'dpd',
  ups: 'ups',
  fedex: 'fedex',
  gls: 'gls',
  bpost: 'bpost',
  tnt: 'tnt',
  'royal-mail': 'royal-mail',
  hermes: 'evri',
};

// Carrier detection from tracking number patterns
const CARRIER_PATTERNS: [RegExp, string][] = [
  [/^3S[A-Z0-9]{11,18}$/i, 'postnl'],
  [/^(JJNL|CD|EE|EH|LS|LT|RI|RS)[0-9]{9}NL$/i, 'postnl'],
  [/^[0-9]{13,14}$/, 'postnl'], // PostNL barcode
  [/^(JJD|JVGL)\d{16,20}$/i, 'dhl'],
  [/^[0-9]{10,22}$/, 'dhl'], // DHL numeric
  [/^0[0-9]{13}$/, 'dpd'],
  [/^1Z[A-Z0-9]{16}$/i, 'ups'],
  [/^[0-9]{18,22}$/, 'ups'],
  [/^[0-9]{12,15}$/, 'fedex'],
  [/^[A-Z]{4}[0-9]{8,12}$/i, 'gls'],
];

export interface AfterShipTracking {
  id: string;
  slug: string;
  tracking_number: string;
  tag: string;
  subtag: string;
  expected_delivery: string | null;
  checkpoints: AfterShipCheckpoint[];
  origin_city: string | null;
  origin_country_iso3: string | null;
  destination_city: string | null;
  destination_country_iso3: string | null;
}

export interface AfterShipCheckpoint {
  slug: string;
  city: string | null;
  state: string | null;
  country_iso3: string | null;
  country_name: string | null;
  zip: string | null;
  location: string | null;
  tag: string;
  subtag: string;
  subtag_message: string | null;
  message: string;
  checkpoint_time: string;
  raw_tag: string | null;
}

interface AfterShipResponse<T> {
  meta: { code: number; message: string };
  data: T;
}

function getApiKey(): string {
  const key = Deno.env.get('AFTERSHIP_API_KEY');
  if (!key) throw new Error('AFTERSHIP_API_KEY not configured');
  return key;
}

async function aftershipFetch<T>(
  path: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: unknown,
): Promise<T> {
  const resp = await fetch(`${AFTERSHIP_BASE}${path}`, {
    method,
    headers: {
      'aftership-api-key': getApiKey(),
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const json = (await resp.json()) as AfterShipResponse<T>;

  if (json.meta.code !== 200 && json.meta.code !== 201) {
    throw new Error(`AfterShip ${method} ${path}: ${json.meta.code} — ${json.meta.message}`);
  }

  return json.data;
}

/**
 * Detect carrier slug from tracking number pattern
 */
export function detectCarrier(trackingNumber: string): string | null {
  const normalized = trackingNumber.trim().replace(/\s/g, '');
  for (const [pattern, slug] of CARRIER_PATTERNS) {
    if (pattern.test(normalized)) return slug;
  }
  return null;
}

/**
 * Register a new tracking with AfterShip
 */
export async function createTracking(
  trackingNumber: string,
  slug?: string,
  title?: string,
): Promise<{ id: string; slug: string }> {
  const tracking: Record<string, unknown> = {
    tracking_number: trackingNumber,
  };

  if (slug) tracking.slug = slug;
  if (title) tracking.title = title;

  const result = await aftershipFetch<{ tracking: { id: string; slug: string } }>(
    '/trackings',
    'POST',
    { tracking },
  );

  return {
    id: result.tracking.id,
    slug: result.tracking.slug,
  };
}

/**
 * Get full tracking info including checkpoints
 */
export async function getTracking(
  slug: string,
  trackingNumber: string,
): Promise<AfterShipTracking> {
  const result = await aftershipFetch<{ tracking: AfterShipTracking }>(
    `/trackings/${slug}/${trackingNumber}`,
  );
  return result.tracking;
}

/**
 * Delete a tracking from AfterShip
 */
export async function deleteTracking(
  slug: string,
  trackingNumber: string,
): Promise<void> {
  await aftershipFetch(`/trackings/${slug}/${trackingNumber}`, 'DELETE');
}

/**
 * Auto-detect carrier using AfterShip API
 */
export async function detectCarrierApi(
  trackingNumber: string,
): Promise<string | null> {
  try {
    const result = await aftershipFetch<{ couriers: { slug: string }[] }>(
      '/couriers/detect',
      'POST',
      { tracking: { tracking_number: trackingNumber } },
    );
    return result.couriers?.[0]?.slug ?? null;
  } catch {
    return null;
  }
}

/**
 * Normalize carrier name to AfterShip slug
 */
export function normalizeCarrierSlug(carrier: string): string | null {
  if (!carrier) return null;
  const lower = carrier.toLowerCase().replace(/[^a-z0-9]/g, '');
  // Direct match
  if (CARRIER_SLUGS[lower]) return CARRIER_SLUGS[lower];
  // Partial match
  for (const [key, slug] of Object.entries(CARRIER_SLUGS)) {
    if (lower.includes(key) || key.includes(lower)) return slug;
  }
  return null;
}
