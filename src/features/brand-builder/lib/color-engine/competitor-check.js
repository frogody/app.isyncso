/**
 * Check if brand primary is too visually similar to known competitor colors.
 * Uses perceptual color distance.
 */
import { parse, differenceEuclidean } from 'culori';

// ~50 well-known brand primary colors
const KNOWN_BRAND_COLORS = {
  'Google':       '#4285F4',
  'Facebook':     '#1877F2',
  'Twitter':      '#1DA1F2',
  'LinkedIn':     '#0A66C2',
  'Instagram':    '#E4405F',
  'YouTube':      '#FF0000',
  'Spotify':      '#1DB954',
  'Netflix':      '#E50914',
  'Amazon':       '#FF9900',
  'Apple':        '#000000',
  'Microsoft':    '#00A4EF',
  'Slack':        '#4A154B',
  'Dropbox':      '#0061FF',
  'Airbnb':       '#FF5A5F',
  'Uber':         '#000000',
  'Stripe':       '#635BFF',
  'Shopify':      '#96BF48',
  'Twitch':       '#9146FF',
  'Reddit':       '#FF4500',
  'Pinterest':    '#E60023',
  'Snapchat':     '#FFFC00',
  'TikTok':       '#000000',
  'WhatsApp':     '#25D366',
  'Telegram':     '#0088CC',
  'Discord':      '#5865F2',
  'Zoom':         '#2D8CFF',
  'Salesforce':   '#00A1E0',
  'HubSpot':      '#FF7A59',
  'Mailchimp':    '#FFE01B',
  'Notion':       '#000000',
  'Figma':        '#F24E1E',
  'Canva':        '#00C4CC',
  'Adobe':        '#FF0000',
  'Oracle':       '#F80000',
  'IBM':          '#0530AD',
  'Intel':        '#0071C5',
  'Samsung':      '#1428A0',
  'Sony':         '#000000',
  'Nike':         '#000000',
  'Adidas':       '#000000',
  'Coca-Cola':    '#F40009',
  'Pepsi':        '#004B93',
  'Starbucks':    '#00704A',
  'McDonald\'s':  '#FFC72C',
  'Tesla':        '#CC0000',
  'PayPal':       '#003087',
  'Visa':         '#1A1F71',
  'Mastercard':   '#EB001B',
  'Robinhood':    '#00C805',
  'Coinbase':     '#0052FF',
};

function perceptualDistance(hex1, hex2) {
  const c1 = parse(hex1);
  const c2 = parse(hex2);
  if (!c1 || !c2) return 100;
  const dist = differenceEuclidean('oklch');
  return dist(c1, c2) * 100;
}

/**
 * Check if the brand primary is too similar to competitor brands.
 * @param {string} primaryHex
 * @param {string[]} competitorNames - user-provided competitor names
 * @returns {{ tooSimilar: boolean, flags: { brand, color, distance }[] }}
 */
export function checkCompetitorDiff(primaryHex, competitorNames = []) {
  const flags = [];
  const threshold = 15;

  // Check against user-specified competitors first
  for (const name of competitorNames) {
    const key = Object.keys(KNOWN_BRAND_COLORS).find(
      k => k.toLowerCase() === name.toLowerCase()
    );
    if (key) {
      const dist = perceptualDistance(primaryHex, KNOWN_BRAND_COLORS[key]);
      if (dist < threshold) {
        flags.push({ brand: key, color: KNOWN_BRAND_COLORS[key], distance: Math.round(dist * 10) / 10 });
      }
    }
  }

  // Also scan all known brands for close matches
  for (const [brand, color] of Object.entries(KNOWN_BRAND_COLORS)) {
    // Skip already-checked competitors and skip pure black (too many matches)
    if (color === '#000000') continue;
    if (flags.some(f => f.brand === brand)) continue;
    const dist = perceptualDistance(primaryHex, color);
    if (dist < threshold) {
      flags.push({ brand, color, distance: Math.round(dist * 10) / 10 });
    }
  }

  return { tooSimilar: flags.length > 0, flags };
}
