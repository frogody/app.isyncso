/**
 * TreeRoadmap - Growing tree visualization for the roadmap
 *
 * Root = iSyncSO Platform
 * Branches = Module categories
 * Leaves = Individual features (roadmap_items)
 *
 * Uses pure SVG + React (no d3 dependency).
 * Supports zoom/pan, hover tooltips, and responsive sizing.
 */

import React, { useMemo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  ChevronRight,
  ChevronDown,
  Circle,
  Loader2,
  CheckCircle2,
  Clock,
  Zap,
  Package,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Bot,
} from 'lucide-react';

const CATEGORY_COLORS = {
  platform: { bg: '#3b82f6', border: '#60a5fa', text: '#93c5fd' },
  crm: { bg: '#8b5cf6', border: '#a78bfa', text: '#c4b5fd' },
  finance: { bg: '#06b6d4', border: '#22d3ee', text: '#67e8f9' },
  products: { bg: '#f59e0b', border: '#fbbf24', text: '#fcd34d' },
  sync_agent: { bg: '#ef4444', border: '#f87171', text: '#fca5a5' },
  talent: { bg: '#ec4899', border: '#f472b6', text: '#f9a8d4' },
  growth: { bg: '#10b981', border: '#34d399', text: '#6ee7b7' },
  marketplace: { bg: '#f97316', border: '#fb923c', text: '#fdba74' },
  admin: { bg: '#6366f1', border: '#818cf8', text: '#a5b4fc' },
  sentinel: { bg: '#14b8a6', border: '#2dd4bf', text: '#5eead4' },
  integrations: { bg: '#84cc16', border: '#a3e635', text: '#bef264' },
  infrastructure: { bg: '#78716c', border: '#a8a29e', text: '#d6d3d1' },
  learn: { bg: '#06b6d4', border: '#22d3ee', text: '#67e8f9' },
  create: { bg: '#e879f9', border: '#f0abfc', text: '#f5d0fe' },
};

const MODULE_LABELS = {
  platform: 'Platform',
  crm: 'CRM',
  finance: 'Finance',
  products: 'Products',
  sync_agent: 'SYNC Agent',
  talent: 'Talent',
  growth: 'Growth',
  marketplace: 'Marketplace',
  admin: 'Admin',
  sentinel: 'Sentinel',
  integrations: 'Integrations',
  infrastructure: 'Infra',
  learn: 'Learn',
  create: 'Create',
};

const STATUS_COLORS = {
  done: '#22c55e',
  review: '#06b6d4',
  in_progress: '#eab308',
  planned: '#3b82f6',
  requested: '#71717a',
  cancelled: '#f87171',
};

const STATUS_LABELS = {
  done: 'Done',
  review: 'In Review',
  in_progress: 'Building',
  planned: 'Planned',
  requested: 'Requested',
  cancelled: 'Cancelled',
};

const PRIORITY_LABELS = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

// ─── Leaf Node (individual feature) ──────────────────────────
function LeafNode({ item, x, y, onSelect, onHover, onLeave }) {
  const color = STATUS_COLORS[item.status] || '#71717a';
  const isActive = item.status === 'in_progress';
  const r = item.auto_queued ? 10 : 8;

  return (
    <g
      onClick={(e) => { e.stopPropagation(); onSelect?.(item); }}
      onMouseEnter={(e) => onHover?.(item, e)}
      onMouseLeave={() => onLeave?.()}
      className="cursor-pointer"
    >
      {/* Hover hit area (larger invisible circle) */}
      <circle cx={x} cy={y} r={16} fill="transparent" />

      {/* Pulsing ring for active items */}
      {isActive && (
        <motion.circle
          cx={x} cy={y} r={12}
          fill="none" stroke={color} strokeWidth={1.5} opacity={0.4}
          animate={{ r: [12, 22], opacity: [0.4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      {/* Node */}
      <circle cx={x} cy={y} r={r}
        fill={color}
        stroke={item.auto_queued ? '#ef4444' : color}
        strokeWidth={item.auto_queued ? 2.5 : 1.5}
        opacity={0.9}
        className="transition-all"
      />

      {/* Label for done items - truncated name */}
      <text
        x={x} y={y + r + 14}
        textAnchor="middle" fill="#a1a1aa"
        fontSize={10} fontWeight="500"
        className="pointer-events-none"
      >
        {item.title.length > 18 ? item.title.slice(0, 16) + '…' : item.title}
      </text>
    </g>
  );
}

// ─── Branch (module category) ────────────────────────────────
function BranchNode({ category, items, startX, startY, angle, branchLength, expanded, onToggle, onSelectItem, onHoverItem, onLeaveItem }) {
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.platform;
  const label = MODULE_LABELS[category] || category;
  const itemCount = items.length;
  const shippedCount = items.filter(i => i.status === 'done').length;
  const progress = itemCount > 0 ? shippedCount / itemCount : 0;
  const pctText = Math.round(progress * 100);

  // Calculate branch endpoint
  const endX = startX + Math.cos(angle) * branchLength;
  const endY = startY + Math.sin(angle) * branchLength;

  // Control point for curved branch
  const ctrlX = startX + Math.cos(angle) * (branchLength * 0.55);
  const ctrlY = startY + Math.sin(angle) * (branchLength * 0.35);

  // Branch thickness based on item count
  const thickness = Math.max(3, Math.min(8, itemCount / 2));
  const nodeR = 30;

  // Distribute leaves around the branch end in a grid-like fan
  const leafPositions = useMemo(() => {
    if (!expanded) return [];
    const rows = Math.ceil(items.length / 3);
    return items.map((item, i) => {
      const row = Math.floor(i / 3);
      const col = i % 3;
      // Fan out perpendicular to the branch angle
      const perpAngle = angle + Math.PI / 2;
      const spreadAngle = angle + ((col - 1) * 0.22);
      const dist = nodeR + 50 + row * 45;
      return {
        x: endX + Math.cos(spreadAngle) * dist + Math.cos(perpAngle) * (col - 1) * 10,
        y: endY + Math.sin(spreadAngle) * dist + Math.sin(perpAngle) * (col - 1) * 10,
        item,
      };
    });
  }, [items, expanded, endX, endY, angle, nodeR]);

  return (
    <g>
      {/* Branch line */}
      <motion.path
        d={`M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`}
        fill="none" stroke={colors.bg} strokeWidth={thickness}
        strokeLinecap="round" opacity={0.5}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />

      {/* Progress overlay on branch */}
      {progress > 0 && (
        <motion.path
          d={`M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`}
          fill="none" stroke={colors.border} strokeWidth={thickness}
          strokeLinecap="round" opacity={0.85}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: progress }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
        />
      )}

      {/* Leaf connector lines when expanded */}
      {leafPositions.map((leaf, i) => (
        <motion.line key={leaf.item.id}
          x1={endX} y1={endY} x2={leaf.x} y2={leaf.y}
          stroke={colors.bg} strokeWidth={1.5} opacity={0.2}
          initial={{ opacity: 0 }} animate={{ opacity: 0.2 }}
          transition={{ delay: i * 0.02 }}
        />
      ))}

      {/* Leaves */}
      {leafPositions.map((leaf) => (
        <LeafNode key={leaf.item.id}
          item={leaf.item} x={leaf.x} y={leaf.y}
          onSelect={onSelectItem} onHover={onHoverItem} onLeave={onLeaveItem}
        />
      ))}

      {/* Branch endpoint node */}
      <g onClick={() => onToggle(category)} className="cursor-pointer">
        {/* Hit area */}
        <circle cx={endX} cy={endY} r={nodeR + 8} fill="transparent" />

        {/* Background */}
        <circle cx={endX} cy={endY} r={nodeR}
          fill={colors.bg} opacity={0.12}
          stroke={colors.border} strokeWidth={2}
        />

        {/* Progress ring */}
        <circle cx={endX} cy={endY} r={nodeR}
          fill="none" stroke={colors.border} strokeWidth={3}
          strokeDasharray={`${progress * (2 * Math.PI * nodeR)} ${2 * Math.PI * nodeR}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${endX} ${endY})`}
          opacity={0.8}
        />

        {/* Count */}
        <text x={endX} y={endY - 2} textAnchor="middle" dominantBaseline="middle"
          fill={colors.text} fontSize={16} fontWeight="bold">
          {shippedCount}/{itemCount}
        </text>

        {/* Percentage */}
        <text x={endX} y={endY + 14} textAnchor="middle"
          fill={colors.text} fontSize={10} opacity={0.7}>
          {pctText}%
        </text>

        {/* Label below node */}
        <text x={endX} y={endY + nodeR + 18} textAnchor="middle"
          fill={colors.text} fontSize={13} fontWeight="700" opacity={0.95}>
          {label}
        </text>

        {/* Expand hint */}
        <text x={endX} y={endY + nodeR + 32} textAnchor="middle"
          fill="#71717a" fontSize={10}>
          {expanded ? '▾ collapse' : `▸ expand`}
        </text>
      </g>
    </g>
  );
}

// ─── Hover Tooltip ───────────────────────────────────────────
function Tooltip({ item, position }) {
  if (!item || !position) return null;
  const statusColor = STATUS_COLORS[item.status] || '#71717a';
  return (
    <div
      className="absolute z-50 pointer-events-none"
      style={{ left: position.x + 16, top: position.y - 10 }}
    >
      <div className="bg-zinc-900/95 border border-zinc-700 rounded-xl px-4 py-3 shadow-xl backdrop-blur-sm max-w-[280px]">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: statusColor }} />
          <span className="text-xs font-semibold text-white leading-tight">{item.title}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-zinc-400 mb-1">
          <span className="px-1.5 py-0.5 rounded bg-zinc-800">{STATUS_LABELS[item.status]}</span>
          {item.priority && <span className="px-1.5 py-0.5 rounded bg-zinc-800">{PRIORITY_LABELS[item.priority] || item.priority}</span>}
          {item.effort && <span className="px-1.5 py-0.5 rounded bg-zinc-800">{item.effort.toUpperCase()}</span>}
        </div>
        {item.description && (
          <p className="text-[10px] text-zinc-500 line-clamp-2 mt-1">{item.description}</p>
        )}
        {item.auto_queued && (
          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-red-400">
            <Bot className="w-3 h-3" /> Queued for auto-build
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Tree Component ─────────────────────────────────────
export default function TreeRoadmap({ items = [], onSelectItem }) {
  const [expanded, setExpanded] = useState({});
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [tooltipPos, setTooltipPos] = useState(null);
  const containerRef = useRef(null);

  const toggleBranch = useCallback((category) => {
    setExpanded(prev => ({ ...prev, [category]: !prev[category] }));
  }, []);

  // Group items by category (normalize hyphen variants to underscore)
  const grouped = useMemo(() => {
    const groups = {};
    items.forEach(item => {
      const cat = (item.category || 'platform').replace(/-/g, '_');
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [items]);

  // Only show categories that have items + always show the top ones
  const categories = useMemo(() => {
    return Object.keys(MODULE_LABELS).filter(cat => (grouped[cat] || []).length > 0);
  }, [grouped]);

  // Layout config — scale with category count
  const SIZE = 1600;
  const centerX = SIZE / 2;
  const centerY = SIZE / 2;
  const branchLength = 320;

  // Stats
  const totalItems = items.length;
  const shippedItems = items.filter(i => i.status === 'done').length;
  const activeItems = items.filter(i => i.status === 'in_progress').length;
  const queuedItems = items.filter(i => i.auto_queued).length;

  // Zoom controls
  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.4));
  const handleReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  // Mouse wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(z => Math.max(0.4, Math.min(3, z + delta)));
  }, []);

  // Pan via drag
  const handleMouseDown = (e) => {
    if (e.target.tagName === 'circle' || e.target.tagName === 'text') return;
    setDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };
  const handleMouseMove = (e) => {
    if (!dragging || !dragStart) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => { setDragging(false); setDragStart(null); };

  // Hover tooltip
  const handleHoverItem = useCallback((item, e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setHoveredItem(item);
      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  }, []);
  const handleLeaveItem = useCallback(() => {
    setHoveredItem(null);
    setTooltipPos(null);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden" style={{ height: 'calc(100vh - 380px)', minHeight: 500 }}>
      {/* Legend */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-3 bg-zinc-950/80 backdrop-blur-sm rounded-xl px-3 py-2 border border-zinc-800/50">
        {Object.entries(STATUS_LABELS).map(([status, label]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} />
            <span className="text-[11px] text-zinc-400">{label}</span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="absolute top-4 right-4 z-20 flex gap-4 text-xs text-zinc-400 bg-zinc-950/80 backdrop-blur-sm rounded-xl px-3 py-2 border border-zinc-800/50">
        <span className="flex items-center gap-1.5">
          <Package className="w-4 h-4" /> {totalItems} total
        </span>
        <span className="flex items-center gap-1.5 text-cyan-400">
          <CheckCircle2 className="w-4 h-4" /> {shippedItems} done
        </span>
        {activeItems > 0 && (
          <span className="flex items-center gap-1.5 text-yellow-400">
            <Loader2 className="w-4 h-4 animate-spin" /> {activeItems} building
          </span>
        )}
        {queuedItems > 0 && (
          <span className="flex items-center gap-1.5 text-red-400">
            <Zap className="w-4 h-4" /> {queuedItems} queued
          </span>
        )}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1">
        <button onClick={handleZoomIn}
          className="w-9 h-9 rounded-lg bg-zinc-800/90 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors">
          <ZoomIn className="w-4 h-4" />
        </button>
        <div className="text-center text-[10px] text-zinc-500 py-0.5">{Math.round(zoom * 100)}%</div>
        <button onClick={handleZoomOut}
          className="w-9 h-9 rounded-lg bg-zinc-800/90 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors">
          <ZoomOut className="w-4 h-4" />
        </button>
        <button onClick={handleReset}
          className="w-9 h-9 rounded-lg bg-zinc-800/90 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors mt-1">
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Pan hint */}
      <div className="absolute bottom-4 left-4 z-20 text-[10px] text-zinc-600">
        Scroll to zoom · Drag to pan · Click module to expand
      </div>

      {/* Tooltip */}
      <Tooltip item={hoveredItem} position={tooltipPos} />

      {/* SVG Canvas */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          cursor: dragging ? 'grabbing' : 'grab',
          width: '100%',
          height: '100%',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="w-full h-full"
          style={{ minHeight: 500 }}
        >
          <defs>
            <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background glow */}
          <circle cx={centerX} cy={centerY} r={100} fill="url(#centerGlow)" />

          {/* Branches */}
          {categories.map((cat, i) => {
            const angle = ((i / categories.length) * Math.PI * 2) - Math.PI / 2;
            const catItems = grouped[cat] || [];

            return (
              <BranchNode
                key={cat}
                category={cat}
                items={catItems}
                startX={centerX}
                startY={centerY}
                angle={angle}
                branchLength={branchLength + catItems.length * 5}
                expanded={expanded[cat]}
                onToggle={toggleBranch}
                onSelectItem={onSelectItem}
                onHoverItem={handleHoverItem}
                onLeaveItem={handleLeaveItem}
              />
            );
          })}

          {/* Root node */}
          <g>
            <circle cx={centerX} cy={centerY} r={48} fill="#18181b" stroke="#ef4444" strokeWidth={3} />
            <circle cx={centerX} cy={centerY} r={40} fill="#ef4444" opacity={0.12} />
            <text x={centerX} y={centerY - 8} textAnchor="middle" fill="white" fontSize={16} fontWeight="bold">
              iSyncSO
            </text>
            <text x={centerX} y={centerY + 10} textAnchor="middle" fill="#fca5a5" fontSize={12}>
              {totalItems} features
            </text>
            <text x={centerX} y={centerY + 26} textAnchor="middle" fill="#71717a" fontSize={10}>
              {shippedItems} shipped
            </text>
          </g>
        </svg>
      </div>
    </div>
  );
}
