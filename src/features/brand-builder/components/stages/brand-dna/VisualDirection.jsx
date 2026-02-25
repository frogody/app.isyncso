import { useMemo } from 'react';
import { toast } from 'sonner';
import DirectionCard from './DirectionCard';
import { DIRECTION_CARDS, scoreCardAffinity } from './DirectionCardsData';

export default function VisualDirection({ data, onChange }) {
  const selected = data.selected_direction_ids || [];

  // Sort cards by affinity to user's industry + personality
  const sortedCards = useMemo(() => {
    return [...DIRECTION_CARDS]
      .map(card => ({
        ...card,
        score: scoreCardAffinity(card, data.industry?.primary, data.personality_vector),
      }))
      .sort((a, b) => b.score - a.score);
  }, [data.industry?.primary, data.personality_vector]);

  const handleToggle = (cardId) => {
    const current = [...selected];
    const idx = current.indexOf(cardId);

    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      if (current.length >= 3) {
        toast.error('Select 2-3 directions maximum', { duration: 3000 });
        return;
      }
      current.push(cardId);
    }

    onChange({ selected_direction_ids: current });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Visual Direction</h2>
        <p className="text-sm text-zinc-400">
          Select <span className="text-yellow-400 font-medium">2-3 directions</span> that resonate with your brand.
          Cards are sorted by relevance to your industry and personality.
        </p>
      </div>

      {selected.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className={`font-medium ${selected.length >= 2 ? 'text-yellow-400' : 'text-zinc-400'}`}>
            {selected.length}/3 selected
          </span>
          {selected.length < 2 && (
            <span className="text-zinc-600">— select at least 2</span>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedCards.map((card) => (
          <DirectionCard
            key={card.id}
            card={card}
            selected={selected.includes(card.id)}
            onToggle={() => handleToggle(card.id)}
          />
        ))}
      </div>
    </div>
  );
}
