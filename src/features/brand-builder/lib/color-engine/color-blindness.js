/**
 * Color vision deficiency (CVD) simulation using culori's deficiency module.
 * Plus deltaE2000 for pair safety checking.
 */
import { parse, formatHex, differenceEuclidean } from 'culori';
import { filterDeficiencyProt, filterDeficiencyDeuter, filterDeficiencyTrit } from 'culori/fn';

const CVD_FILTERS = {
  protanopia:   filterDeficiencyProt(1),
  deuteranopia: filterDeficiencyDeuter(1),
  tritanopia:   filterDeficiencyTrit(1),
};

/**
 * Simulate how a hex color looks under a specific CVD type.
 */
export function simulateCVD(hex, type = 'deuteranopia') {
  const c = parse(hex);
  if (!c) return hex;
  const filter = CVD_FILTERS[type];
  if (!filter) return hex;
  return formatHex(filter(c)) || hex;
}

/**
 * Simple Euclidean distance in oklch (approximation of perceptual difference).
 * Returns a number — higher = more distinguishable.
 */
function colorDistance(hex1, hex2) {
  const c1 = parse(hex1);
  const c2 = parse(hex2);
  if (!c1 || !c2) return 100;
  const dist = differenceEuclidean('oklch');
  return dist(c1, c2) * 100; // scale to ~0-100
}

/**
 * Check if brand colors remain distinguishable under all CVD types.
 * Returns { safe: boolean, flaggedPairs: [] }.
 *
 * @param {Record<string, string>} brandColors  e.g. { primary: '#xxx', secondary: '#yyy', accent: '#zzz' }
 */
export function checkCVDSafety(brandColors) {
  const names = Object.keys(brandColors);
  const flaggedPairs = [];
  const threshold = 10; // colors closer than this under CVD are hard to distinguish

  const types = ['protanopia', 'deuteranopia', 'tritanopia'];

  for (const type of types) {
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const a = names[i], b = names[j];
        const simA = simulateCVD(brandColors[a], type);
        const simB = simulateCVD(brandColors[b], type);
        const dist = colorDistance(simA, simB);

        if (dist < threshold) {
          flaggedPairs.push({ a, b, type, distance: Math.round(dist * 10) / 10 });
        }
      }
    }
  }

  return { safe: flaggedPairs.length === 0, flaggedPairs };
}
