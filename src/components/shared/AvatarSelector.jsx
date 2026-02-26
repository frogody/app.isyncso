import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Shuffle } from "lucide-react";

const DICEBEAR_STYLES = [
  { id: 'bottts', label: 'Robots' },
  { id: 'adventurer', label: 'Adventurer' },
  { id: 'fun-emoji', label: 'Emoji' },
  { id: 'pixel-art', label: 'Pixel Art' },
  { id: 'notionists', label: 'Notionists' },
  { id: 'big-smile', label: 'Big Smile' },
  { id: 'lorelei', label: 'Lorelei' },
  { id: 'thumbs', label: 'Thumbs' },
];

const generateSeeds = () =>
  Array.from({ length: 8 }, () => Math.random().toString(36).slice(2, 10));

const buildAvatarUrl = (style, seed) =>
  `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}`;

export default function AvatarSelector({ selected, onSelect, allowUpload = false }) {
  const [activeStyle, setActiveStyle] = useState(DICEBEAR_STYLES[0].id);
  const [seeds, setSeeds] = useState(() => generateSeeds());

  const handleShuffle = useCallback(() => {
    setSeeds(generateSeeds());
  }, []);

  const handleStyleChange = useCallback((styleId) => {
    setActiveStyle(styleId);
  }, []);

  const handleSelect = useCallback((url) => {
    onSelect({ id: url, url });
  }, [onSelect]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        onSelect({
          id: 'custom-upload',
          category: 'uploaded',
          url: ev.target.result,
          file,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const selectedUrl = selected?.url || selected?.id || null;

  return (
    <div className="space-y-4">
      {/* Style tabs */}
      <div className="flex flex-wrap gap-1.5">
        {DICEBEAR_STYLES.map((style) => (
          <button
            key={style.id}
            onClick={() => handleStyleChange(style.id)}
            className={`
              px-3 py-1.5 rounded-lg text-xs font-medium transition-all
              ${activeStyle === style.id
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/50 hover:border-zinc-600 hover:text-zinc-300'
              }
            `}
          >
            {style.label}
          </button>
        ))}
      </div>

      {/* Avatar grid */}
      <div className="grid grid-cols-4 gap-3 max-w-md">
        {seeds.map((seed) => {
          const url = buildAvatarUrl(activeStyle, seed);
          const isSelected = selectedUrl === url;

          return (
            <button
              key={seed}
              onClick={() => handleSelect(url)}
              className={`
                w-[72px] h-[72px] rounded-full overflow-hidden transition-all duration-200
                border-2 flex items-center justify-center bg-zinc-800/40
                ${isSelected
                  ? 'border-cyan-500 ring-4 ring-cyan-500/30 scale-105 shadow-lg shadow-cyan-500/30'
                  : 'border-zinc-700 hover:border-cyan-400/50'
                }
              `}
            >
              <img
                src={url}
                alt={`${activeStyle} avatar`}
                className="w-full h-full object-cover rounded-full"
                loading="lazy"
                decoding="async"
              />
            </button>
          );
        })}
      </div>

      {/* Shuffle + Upload row */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleShuffle}
          className="border-zinc-700 hover:border-zinc-600 text-zinc-300 hover:text-white"
        >
          <Shuffle className="w-3.5 h-3.5 mr-1.5" />
          Shuffle
        </Button>

        {allowUpload && (
          <>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              id="avatar-upload"
            />
            <label htmlFor="avatar-upload">
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer border-zinc-700 hover:border-zinc-600 text-zinc-300 hover:text-white"
                asChild
              >
                <span className="flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  Upload photo
                </span>
              </Button>
            </label>
          </>
        )}
      </div>
    </div>
  );
}

// Legacy exports — kept for UserAvatar compatibility
// PRESET_AVATARS is now empty so UserAvatar never matches a "preset"
// and always falls through to the <img> branch for DiceBear URLs.
export const PRESET_AVATARS = [];
export function AvatarIcon() { return null; }
