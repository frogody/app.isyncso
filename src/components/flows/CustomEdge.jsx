/**
 * CustomEdge - Animated edge with color variants
 * Supports different colors for condition branches
 */

import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow
} from '@xyflow/react';
import { X } from 'lucide-react';

const EDGE_COLORS = {
  default: { stroke: '#64748b', glow: '#64748b30' },
  true: { stroke: '#34d399', glow: '#34d39930' },
  false: { stroke: '#f87171', glow: '#f8717130' },
  success: { stroke: '#22c55e', glow: '#22c55e30' },
  error: { stroke: '#ef4444', glow: '#ef444430' }
};

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  sourceHandleId,
  style = {},
  markerEnd,
  selected,
  data
}) {
  const { setEdges } = useReactFlow();

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Determine color based on source handle (for condition branches)
  const edgeType = sourceHandleId || data?.type || 'default';
  const colors = EDGE_COLORS[edgeType] || EDGE_COLORS.default;

  const onEdgeClick = (e) => {
    e.stopPropagation();
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  };

  return (
    <>
      {/* Glow effect when selected */}
      {selected && (
        <path
          d={edgePath}
          fill="none"
          stroke={colors.glow}
          strokeWidth={12}
          style={{ filter: 'blur(4px)' }}
        />
      )}

      {/* Main edge */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: colors.stroke,
          strokeWidth: selected ? 3 : 2,
          transition: 'stroke-width 0.2s, stroke 0.2s',
        }}
      />

      {/* Animated flow effect */}
      <path
        d={edgePath}
        fill="none"
        stroke={colors.stroke}
        strokeWidth={2}
        strokeDasharray="5,5"
        style={{
          animation: 'flowAnimation 1s linear infinite',
          opacity: 0.6,
        }}
      />

      {/* Delete button when selected */}
      {selected && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <button
              onClick={onEdgeClick}
              className="w-5 h-5 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center shadow-lg transition-all"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}

      {/* Label for condition branches */}
      {(sourceHandleId === 'true' || sourceHandleId === 'false') && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${sourceX + (targetX - sourceX) * 0.2}px,${sourceY + (targetY - sourceY) * 0.2}px)`,
              pointerEvents: 'none',
            }}
          >
            <span className={`
              text-[10px] px-1.5 py-0.5 rounded font-medium
              ${sourceHandleId === 'true' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}
            `}>
              {sourceHandleId}
            </span>
          </div>
        </EdgeLabelRenderer>
      )}

      <style>{`
        @keyframes flowAnimation {
          0% {
            stroke-dashoffset: 10;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </>
  );
}

// Edge types mapping
export const edgeTypes = {
  custom: CustomEdge,
};
