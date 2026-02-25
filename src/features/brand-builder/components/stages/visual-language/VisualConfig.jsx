/**
 * Sub-step 1: Visual Configuration.
 * Quick preferences for photography, illustration, and iconography before generation.
 */
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ICON_LIBRARY } from '../../../lib/logo-engine/icon-library.js';

const PHOTO_MOODS = [
  'Bright', 'Dark / Moody', 'Warm', 'Cool', 'Natural',
  'Studio', 'Cinematic', 'Minimal',
];

const PHOTO_SUBJECTS = [
  'People', 'Products', 'Workspaces', 'Architecture',
  'Nature', 'Abstract', 'Lifestyle', 'Flat Lay',
];

const ILLUSTRATION_STYLES = [
  { id: 'flat', label: 'Flat', desc: 'Clean, bold shapes with minimal depth' },
  { id: 'line-art', label: 'Line Art', desc: 'Elegant outlines with subtle detail' },
  { id: 'geometric', label: 'Geometric', desc: 'Structured shapes, precise angles' },
  { id: 'hand-drawn', label: 'Hand-Drawn', desc: 'Organic, personal, imperfect charm' },
  { id: '3d-isometric', label: '3D Isometric', desc: 'Dimensional, modern, technical feel' },
];

const ICON_STYLES = [
  { id: 'outlined', label: 'Outlined', desc: 'Clean strokes, open feel' },
  { id: 'filled', label: 'Filled', desc: 'Solid shapes, bold presence' },
  { id: 'duotone', label: 'Duotone', desc: 'Two-tone depth, modern look' },
];

// Grab 3 sample icons for preview
const PREVIEW_ICONS = ICON_LIBRARY.slice(0, 3);

function renderMiniIcon(icon, style, color = '#FDE68A') {
  const vb = icon.viewBox || '0 0 100 100';
  if (style === 'outlined') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="24" height="24"><path d="${icon.svgPath}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  if (style === 'duotone') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="24" height="24"><path d="${icon.svgPath}" fill="${color}" fill-opacity="0.3" fill-rule="evenodd"/><path d="${icon.svgPath}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="24" height="24"><path d="${icon.svgPath}" fill="${color}" fill-rule="evenodd"/></svg>`;
}

export default function VisualConfig({ brandDna, colorSystem, onChange }) {
  const photoMoods = brandDna?._photoMoodPrefs || [];
  const photoSubjects = brandDna?._photoSubjectPrefs || [];
  const illustrationStyle = brandDna?._illustrationStylePref || null;
  const iconStyle = brandDna?._iconStylePref || null;

  const primaryColor = colorSystem?.palette?.primary?.base || '#FDE68A';

  const toggleChip = useCallback((list, item, key, max = 4) => {
    const updated = list.includes(item)
      ? list.filter(i => i !== item)
      : list.length < max ? [...list, item] : list;
    onChange({ [key]: updated });
  }, [onChange]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Define Your Visual Language</h2>
        <p className="text-sm text-zinc-400">
          Set preferences for photography, illustration, and iconography.
        </p>
      </div>

      {/* Brand Context Summary */}
      <div className="rounded-[20px] bg-white/[0.03] border border-white/10 p-6 space-y-3">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Brand Context</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-zinc-500">Company</span>
            <p className="text-sm text-white">{brandDna?.company_name || 'Unnamed'}</p>
          </div>
          <div>
            <span className="text-xs text-zinc-500">Industry</span>
            <p className="text-sm text-white">{brandDna?.industry?.primary || 'General'}</p>
          </div>
        </div>
        {brandDna?._voiceToneWords?.length > 0 && (
          <div>
            <span className="text-xs text-zinc-500">Voice Tone</span>
            <p className="text-sm text-zinc-300">{brandDna._voiceToneWords.join(', ')}</p>
          </div>
        )}
        {colorSystem?.palette?.primary?.base && (
          <div>
            <span className="text-xs text-zinc-500">Primary Color</span>
            <div className="flex items-center gap-2 mt-1">
              <div
                className="w-6 h-6 rounded-md border border-white/10"
                style={{ backgroundColor: colorSystem.palette.primary.base }}
              />
              <span className="text-xs text-zinc-400 font-mono">{colorSystem.palette.primary.base}</span>
            </div>
          </div>
        )}
      </div>

      {/* Photography Mood */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">Photography Mood</h3>
        <p className="text-xs text-zinc-500 mb-4">
          Select 2-4 moods that describe your ideal brand photography.
          {photoMoods.length > 0 && (
            <span className="ml-2 text-yellow-400">{photoMoods.length}/4 selected</span>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          {PHOTO_MOODS.map((mood) => {
            const selected = photoMoods.includes(mood);
            const disabled = !selected && photoMoods.length >= 4;
            return (
              <motion.button
                key={mood}
                whileHover={!disabled ? { scale: 1.03 } : undefined}
                whileTap={!disabled ? { scale: 0.97 } : undefined}
                onClick={() => !disabled && toggleChip(photoMoods, mood, '_photoMoodPrefs', 4)}
                disabled={disabled}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selected
                    ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/40'
                    : disabled
                    ? 'bg-zinc-800/30 text-zinc-600 border border-white/[0.04] cursor-not-allowed'
                    : 'bg-zinc-800/60 text-zinc-400 border border-white/[0.06] hover:border-white/20 hover:text-zinc-300'
                }`}
              >
                {mood}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Subject Preferences */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">Subject Preferences</h3>
        <p className="text-xs text-zinc-500 mb-4">
          What should your brand photography focus on? Select 1-4.
          {photoSubjects.length > 0 && (
            <span className="ml-2 text-yellow-400">{photoSubjects.length}/4 selected</span>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          {PHOTO_SUBJECTS.map((subject) => {
            const selected = photoSubjects.includes(subject);
            const disabled = !selected && photoSubjects.length >= 4;
            return (
              <motion.button
                key={subject}
                whileHover={!disabled ? { scale: 1.03 } : undefined}
                whileTap={!disabled ? { scale: 0.97 } : undefined}
                onClick={() => !disabled && toggleChip(photoSubjects, subject, '_photoSubjectPrefs', 4)}
                disabled={disabled}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selected
                    ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/40'
                    : disabled
                    ? 'bg-zinc-800/30 text-zinc-600 border border-white/[0.04] cursor-not-allowed'
                    : 'bg-zinc-800/60 text-zinc-400 border border-white/[0.06] hover:border-white/20 hover:text-zinc-300'
                }`}
              >
                {subject}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Illustration Style */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">Illustration Style</h3>
        <p className="text-xs text-zinc-500 mb-4">Choose the illustration approach for your brand.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ILLUSTRATION_STYLES.map(({ id, label, desc }) => (
            <motion.button
              key={id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onChange({ _illustrationStylePref: id })}
              className={`text-left p-4 rounded-[16px] border transition-colors ${
                illustrationStyle === id
                  ? 'bg-yellow-400/10 border-yellow-400/40'
                  : 'bg-white/[0.03] border-white/[0.06] hover:border-white/20'
              }`}
            >
              <p className={`text-sm font-semibold ${illustrationStyle === id ? 'text-yellow-400' : 'text-white'}`}>
                {label}
              </p>
              <p className="text-xs text-zinc-500 mt-1">{desc}</p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Icon Style */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">Icon Style</h3>
        <p className="text-xs text-zinc-500 mb-4">How should your brand icons look?</p>
        <div className="grid grid-cols-3 gap-3">
          {ICON_STYLES.map(({ id, label, desc }) => (
            <motion.button
              key={id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onChange({ _iconStylePref: id })}
              className={`text-left p-4 rounded-[16px] border transition-colors ${
                iconStyle === id
                  ? 'bg-yellow-400/10 border-yellow-400/40'
                  : 'bg-white/[0.03] border-white/[0.06] hover:border-white/20'
              }`}
            >
              <p className={`text-sm font-semibold mb-3 ${iconStyle === id ? 'text-yellow-400' : 'text-white'}`}>
                {label}
              </p>
              {/* Mini icon preview */}
              <div className="flex gap-2 mb-2">
                {PREVIEW_ICONS.map((icon) => (
                  <div
                    key={icon.id}
                    dangerouslySetInnerHTML={{ __html: renderMiniIcon(icon, id, iconStyle === id ? primaryColor : '#a1a1aa') }}
                  />
                ))}
              </div>
              <p className="text-xs text-zinc-500">{desc}</p>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
