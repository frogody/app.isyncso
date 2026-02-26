/**
 * 2x2 grid of 4 filtered font pairings.
 */
import { useEffect } from 'react';
import { loadGoogleFonts } from '../../../lib/type-engine/index.js';
import PairingCard from './PairingCard';

export default function PairingSelectionGrid({
  pairings,
  selectedIndex,
  onSelect,
  brandName,
  bodyText,
  palette,
}) {
  // Preload all pairing fonts
  useEffect(() => {
    if (!pairings?.length) return;
    const families = new Set();
    for (const p of pairings) {
      families.add(p.heading.family);
      families.add(p.body.family);
    }
    loadGoogleFonts([...families]);
  }, [pairings]);

  if (!pairings?.length) return null;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Choose Your Font Pairing</h2>
        <p className="text-sm text-zinc-400">
          Based on your preferences, here are the top 4 pairings. Select the one that feels right.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pairings.map((pairing, i) => (
          <PairingCard
            key={`${pairing.heading.family}-${pairing.body.family}`}
            pairing={pairing}
            selected={selectedIndex === i}
            onSelect={() => onSelect(i)}
            brandName={brandName}
            bodyText={bodyText}
            palette={palette}
          />
        ))}
      </div>
    </div>
  );
}
