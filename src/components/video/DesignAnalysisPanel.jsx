import { useState } from 'react';
import { ChevronDown, ChevronUp, Palette, Type, Eye, Layers, Info, Paintbrush } from 'lucide-react';

export default function DesignAnalysisPanel({ analysis, isLoading, onApplyColors }) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (isLoading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 mt-4">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-zinc-400">Analyzing product design...</span>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const { colorPalette, typography, uiStyle, components, layoutPattern, overallVibe } = analysis;

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl mt-4 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-white">Design Analysis</span>
          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">AI-Detected</span>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Color Palette */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Palette className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Color Palette</span>
              <div className="group relative">
                <Info className="w-3 h-3 text-zinc-600 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-zinc-800 text-xs text-zinc-300 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Colors extracted from your product screenshots
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {colorPalette && Object.entries(colorPalette).map(([name, color]) => (
                <div key={name} className="flex flex-col items-center gap-1">
                  <div
                    className="w-8 h-8 rounded-lg border border-zinc-700"
                    style={{ backgroundColor: color }}
                    title={`${name}: ${color}`}
                  />
                  <span className="text-[10px] text-zinc-500 capitalize">{name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Style Badges */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Type className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Style</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: `Typography: ${typography?.style || 'unknown'}`, cls: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
                { label: `Cards: ${uiStyle?.cardStyle || 'unknown'}`, cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
                { label: `Radius: ${uiStyle?.borderRadius || 'unknown'}`, cls: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
                { label: `Layout: ${layoutPattern || 'unknown'}`, cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
                { label: `Vibe: ${overallVibe || 'unknown'}`, cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
                { label: `Density: ${uiStyle?.density || 'unknown'}`, cls: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
              ].map(({ label, cls }) => (
                <span
                  key={label}
                  className={`text-xs px-2 py-0.5 rounded-full border ${cls}`}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Detected Components */}
          {components?.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Layers className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Detected Components</span>
                <div className="group relative">
                  <Info className="w-3 h-3 text-zinc-600 cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-zinc-800 text-xs text-zinc-300 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    UI elements detected in your screenshots
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {components.map((comp, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                    {comp.type}
                    {comp.style && <span className="text-zinc-500 ml-1">({comp.style})</span>}
                    {comp.count && <span className="text-zinc-500 ml-1">&times;{comp.count}</span>}
                    {comp.types && <span className="text-zinc-500 ml-1">[{comp.types.join(', ')}]</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Apply Button */}
          {onApplyColors && (
            <button
              onClick={() => onApplyColors(colorPalette)}
              className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-sm text-cyan-400 transition-colors"
            >
              <Paintbrush className="w-3.5 h-3.5" />
              Apply Colors to Video
            </button>
          )}
        </div>
      )}
    </div>
  );
}
