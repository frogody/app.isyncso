/**
 * TreeRoadmap - Growing tree visualization for the roadmap
 *
 * Root = iSyncSO Platform
 * Branches = Module categories
 * Leaves = Individual features (roadmap_items)
 *
 * Uses pure SVG + React (no d3 dependency).
 */

import React, { useMemo, useState, useCallback } from 'react';
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

// ─── Leaf Node (individual feature) ──────────────────────────
function LeafNode({ item, x, y, onSelect }) {
  const color = STATUS_COLORS[item.status] || '#71717a';
  const isActive = item.status === 'in_progress';

  return (
    <motion.g
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, type: 'spring' }}
      onClick={() => onSelect?.(item)}
      className="cursor-pointer"
    >
      {/* Pulsing ring for active items */}
      {isActive && (
        <motion.circle
          cx={x}
          cy={y}
          r={8}
          fill="none"
          stroke={color}
          strokeWidth={1}
          opacity={0.4}
          animate={{ r: [8, 14], opacity: [0.4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
      <circle
        cx={x}
        cy={y}
        r={item.auto_queued ? 7 : 5}
        fill={color}
        stroke={item.auto_queued ? '#ef4444' : 'transparent'}
        strokeWidth={item.auto_queued ? 2 : 0}
        opacity={0.9}
      />
      <title>{`${item.title} (${STATUS_LABELS[item.status] || item.status})`}</title>
    </motion.g>
  );
}

// ─── Branch (module category) ────────────────────────────────
function BranchNode({ category, items, startX, startY, angle, branchLength, expanded, onToggle, onSelectItem }) {
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.platform;
  const label = MODULE_LABELS[category] || category;
  const itemCount = items.length;
  const shippedCount = items.filter(i => i.status === 'done').length;
  const progress = itemCount > 0 ? shippedCount / itemCount : 0;

  // Calculate branch endpoint
  const endX = startX + Math.cos(angle) * branchLength;
  const endY = startY + Math.sin(angle) * branchLength;

  // Control point for curved branch
  const ctrlX = startX + Math.cos(angle) * (branchLength * 0.6);
  const ctrlY = startY + Math.sin(angle) * (branchLength * 0.3);

  // Branch thickness based on item count
  const thickness = Math.max(2, Math.min(6, itemCount / 3));

  // Distribute leaves around the branch end
  const leafPositions = useMemo(() => {
    if (!expanded) return [];
    return items.map((item, i) => {
      const leafAngle = angle + ((i - items.length / 2) * 0.15);
      const leafDist = 30 + (i % 3) * 15;
      return {
        x: endX + Math.cos(leafAngle) * leafDist,
        y: endY + Math.sin(leafAngle) * leafDist,
        item,
      };
    });
  }, [items, expanded, endX, endY, angle]);

  return (
    <g>
      {/* Branch line */}
      <motion.path
        d={`M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`}
        fill="none"
        stroke={colors.bg}
        strokeWidth={thickness}
        strokeLinecap="round"
        opacity={0.6}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />

      {/* Progress overlay on branch */}
      {progress > 0 && (
        <motion.path
          d={`M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`}
          fill="none"
          stroke={colors.border}
          strokeWidth={thickness}
          strokeLinecap="round"
          opacity={0.9}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: progress }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
        />
      )}

      {/* Leaf lines when expanded */}
      {leafPositions.map((leaf, i) => (
        <motion.line
          key={leaf.item.id}
          x1={endX}
          y1={endY}
          x2={leaf.x}
          y2={leaf.y}
          stroke={colors.bg}
          strokeWidth={1}
          opacity={0.3}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ delay: i * 0.02 }}
        />
      ))}

      {/* Leaves */}
      {leafPositions.map((leaf) => (
        <LeafNode
          key={leaf.item.id}
          item={leaf.item}
          x={leaf.x}
          y={leaf.y}
          onSelect={onSelectItem}
        />
      ))}

      {/* Branch endpoint node */}
      <g
        onClick={() => onToggle(category)}
        className="cursor-pointer"
      >
        {/* Background circle */}
        <circle
          cx={endX}
          cy={endY}
          r={20}
          fill={colors.bg}
          opacity={0.15}
          stroke={colors.border}
          strokeWidth={1.5}
        />

        {/* Progress ring */}
        <circle
          cx={endX}
          cy={endY}
          r={20}
          fill="none"
          stroke={colors.border}
          strokeWidth={2}
          strokeDasharray={`${progress * 126} 126`}
          strokeLinecap="round"
          transform={`rotate(-90 ${endX} ${endY})`}
          opacity={0.8}
        />

        {/* Count text */}
        <text
          x={endX}
          y={endY + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={colors.text}
          fontSize={11}
          fontWeight="bold"
        >
          {itemCount}
        </text>

        {/* Label */}
        <text
          x={endX}
          y={endY + 34}
          textAnchor="middle"
          fill={colors.text}
          fontSize={10}
          fontWeight="600"
          opacity={0.9}
        >
          {label}
        </text>

        {/* Expand/collapse indicator */}
        <text
          x={endX}
          y={endY + 46}
          textAnchor="middle"
          fill="#71717a"
          fontSize={8}
        >
          {expanded ? '▾' : `▸ ${itemCount}`}
        </text>
      </g>
    </g>
  );
}

// ─── Main Tree Component ─────────────────────────────────────
export default function TreeRoadmap({ items = [], onSelectItem }) {
  const [expanded, setExpanded] = useState({});

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

  const categories = Object.keys(MODULE_LABELS);

  // Layout: radial tree from center
  const centerX = 500;
  const centerY = 400;
  const branchLength = 160;

  // Stats
  const totalItems = items.length;
  const shippedItems = items.filter(i => i.status === 'done').length;
  const activeItems = items.filter(i => i.status === 'in_progress').length;
  const queuedItems = items.filter(i => i.auto_queued).length;

  return (
    <div className="relative w-full overflow-auto">
      {/* Legend */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-3">
        {Object.entries(STATUS_LABELS).map(([status, label]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[status] }}
            />
            <span className="text-[10px] text-zinc-400">{label}</span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="absolute top-4 right-4 z-10 flex gap-4 text-xs text-zinc-400">
        <span className="flex items-center gap-1">
          <Package className="w-3.5 h-3.5" /> {totalItems} total
        </span>
        <span className="flex items-center gap-1 text-green-400">
          <CheckCircle2 className="w-3.5 h-3.5" /> {shippedItems} done
        </span>
        {activeItems > 0 && (
          <span className="flex items-center gap-1 text-yellow-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> {activeItems} building
          </span>
        )}
        {queuedItems > 0 && (
          <span className="flex items-center gap-1 text-red-400">
            <Zap className="w-3.5 h-3.5" /> {queuedItems} queued
          </span>
        )}
      </div>

      <svg
        viewBox="0 0 1000 800"
        className="w-full"
        style={{ minHeight: '600px' }}
      >
        <defs>
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Background glow */}
        <circle cx={centerX} cy={centerY} r={60} fill="url(#centerGlow)" />

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
              branchLength={branchLength + catItems.length * 2}
              expanded={expanded[cat]}
              onToggle={toggleBranch}
              onSelectItem={onSelectItem}
            />
          );
        })}

        {/* Root node */}
        <motion.g
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
        >
          <circle cx={centerX} cy={centerY} r={32} fill="#18181b" stroke="#ef4444" strokeWidth={2.5} />
          <circle cx={centerX} cy={centerY} r={26} fill="#ef4444" opacity={0.15} />
          <text
            x={centerX}
            y={centerY - 4}
            textAnchor="middle"
            fill="white"
            fontSize={11}
            fontWeight="bold"
          >
            iSyncSO
          </text>
          <text
            x={centerX}
            y={centerY + 10}
            textAnchor="middle"
            fill="#fca5a5"
            fontSize={8}
          >
            {totalItems} features
          </text>
        </motion.g>
      </svg>
    </div>
  );
}
