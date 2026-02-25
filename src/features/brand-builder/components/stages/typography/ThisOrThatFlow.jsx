/**
 * Manages 3 binary choice rounds with progress dots.
 *
 * Round 0: Serif vs Sans-Serif
 * Round 1: Subclass (Traditional/Modern or Geometric/Humanist)
 * Round 2: Weight (Light/Airy vs Bold/Impactful)
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { loadGoogleFonts } from '../../../lib/type-engine/index.js';
import ThisOrThatRound from './ThisOrThatRound';

// Representative fonts for each option
const ROUND_0 = {
  left: {
    value: 'serif',
    label: 'Serif',
    description: 'Elegant strokes, traditional authority',
    headingFont: 'Playfair Display',
    bodyFont: 'Lora',
    isSerif: true,
    headingWeight: 700,
  },
  right: {
    value: 'sans-serif',
    label: 'Sans-Serif',
    description: 'Clean lines, modern clarity',
    headingFont: 'Montserrat',
    bodyFont: 'Inter',
    isSerif: false,
    headingWeight: 700,
  },
};

const ROUND_1_SERIF = {
  left: {
    value: 'traditional',
    label: 'Traditional',
    description: 'Classic proportions, timeless elegance',
    headingFont: 'Merriweather',
    bodyFont: 'Source Serif Pro',
    isSerif: true,
    headingWeight: 700,
  },
  right: {
    value: 'modern',
    label: 'Modern',
    description: 'High contrast, dramatic flair',
    headingFont: 'Playfair Display',
    bodyFont: 'Cormorant Garamond',
    isSerif: true,
    headingWeight: 700,
  },
};

const ROUND_1_SANS = {
  left: {
    value: 'geometric',
    label: 'Geometric',
    description: 'Precise shapes, technical feel',
    headingFont: 'Space Grotesk',
    bodyFont: 'DM Sans',
    isSerif: false,
    headingWeight: 600,
  },
  right: {
    value: 'humanist',
    label: 'Humanist',
    description: 'Warm strokes, approachable feel',
    headingFont: 'Raleway',
    bodyFont: 'Nunito',
    isSerif: false,
    headingWeight: 600,
  },
};

const ROUND_2 = {
  left: {
    value: 'light',
    label: 'Light & Airy',
    description: 'Delicate weight, breathing room',
    headingWeight: 300,
  },
  right: {
    value: 'bold',
    label: 'Bold & Impactful',
    description: 'Strong weight, commanding presence',
    headingWeight: 800,
  },
};

export default function ThisOrThatFlow({ brandDna, colorSystem, choices, onChoiceComplete }) {
  const [currentRound, setCurrentRound] = useState(0);
  const [localChoices, setLocalChoices] = useState(choices?.length ? [...choices] : []);

  const brandName = brandDna?.company_name || 'Your Brand';
  const bodyText = brandDna?.strategy?.brand_story?.slice(0, 80) || 'Building something extraordinary together.';
  const palette = colorSystem?.palette;

  // Get round config
  const roundConfig = useMemo(() => {
    if (currentRound === 0) return ROUND_0;

    if (currentRound === 1) {
      return localChoices[0] === 'serif' ? ROUND_1_SERIF : ROUND_1_SANS;
    }

    if (currentRound === 2) {
      // Round 2: reuse the fonts from round 1 with different weights
      const prevRound = localChoices[0] === 'serif' ? ROUND_1_SERIF : ROUND_1_SANS;
      const chosen = localChoices[1] === prevRound.left.value ? prevRound.left : prevRound.right;
      return {
        left: { ...ROUND_2.left, headingFont: chosen.headingFont, bodyFont: chosen.bodyFont, isSerif: localChoices[0] === 'serif' },
        right: { ...ROUND_2.right, headingFont: chosen.headingFont, bodyFont: chosen.bodyFont, isSerif: localChoices[0] === 'serif' },
      };
    }

    return ROUND_0;
  }, [currentRound, localChoices]);

  // Preload fonts for current round
  useEffect(() => {
    const fonts = new Set();
    if (roundConfig.left.headingFont) fonts.add(roundConfig.left.headingFont);
    if (roundConfig.left.bodyFont) fonts.add(roundConfig.left.bodyFont);
    if (roundConfig.right.headingFont) fonts.add(roundConfig.right.headingFont);
    if (roundConfig.right.bodyFont) fonts.add(roundConfig.right.bodyFont);
    loadGoogleFonts([...fonts]);
  }, [roundConfig]);

  const handleSelect = useCallback((value) => {
    const next = [...localChoices];
    next[currentRound] = value;
    setLocalChoices(next);

    // Auto-advance after short delay
    setTimeout(() => {
      if (currentRound < 2) {
        setCurrentRound(currentRound + 1);
      } else {
        // All 3 rounds complete
        onChoiceComplete(next);
      }
    }, 400);
  }, [currentRound, localChoices, onChoiceComplete]);

  const roundLabels = ['Heading Style', 'Character', 'Weight'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Choose Your Type Direction</h2>
        <p className="text-sm text-zinc-400">
          {currentRound === 0 && 'Start by choosing the overall feeling for your headings.'}
          {currentRound === 1 && 'Now refine the character of your typography.'}
          {currentRound === 2 && 'Finally, pick the weight that matches your brand energy.'}
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full transition-colors ${
              i < currentRound ? 'bg-yellow-400'
              : i === currentRound ? 'bg-yellow-400/60'
              : 'bg-zinc-700'
            }`} />
            <span className={`text-[10px] ${
              i === currentRound ? 'text-zinc-300' : 'text-zinc-600'
            }`}>
              {roundLabels[i]}
            </span>
            {i < 2 && <div className="w-6 h-px bg-zinc-800" />}
          </div>
        ))}
      </div>

      {/* Round content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentRound}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
        >
          <ThisOrThatRound
            leftOption={roundConfig.left}
            rightOption={roundConfig.right}
            selected={localChoices[currentRound] || null}
            onSelect={handleSelect}
            brandName={brandName}
            bodyText={bodyText}
            palette={palette}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
