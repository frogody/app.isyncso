/**
 * SYNC Agent Page
 * Full-page chat interface with interactive animated avatar
 * Uses anime.js for all animations
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Sparkles, User, Bot, RotateCcw, Brain, AlertCircle, RefreshCw, Plus, Download, ExternalLink, Image as ImageIcon, FileText, Sun, Moon, Mic, MessageSquare, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import SyncVoiceMode from '@/components/sync/SyncVoiceMode';
import { useTheme } from '@/contexts/GlobalThemeContext';
import { SyncPageTransition, SyncPageHeader } from '@/components/sync/ui';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { StatCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';
import { AGENTS_DATA, AGENT_COLOR_STYLES } from '@/data/agents';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import { useSyncState } from '@/components/context/SyncStateContext';
import { useActiveAppSegments } from '@/hooks/useActiveAppSegments';
import { getAgentColor } from '@/lib/appColors';
import anime from '@/lib/anime-wrapper';
import { prefersReducedMotion } from '@/lib/animations';
import { useLocalStorage } from '@/components/hooks/useLocalStorage';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function formatTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// ============================================================================
// IMAGE URL DETECTION AND EXTRACTION
// ============================================================================

// Patterns for detecting image URLs in text
const IMAGE_URL_PATTERNS = [
  // Supabase storage URLs
  /https?:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/(?:public|sign)\/[^\s"'<>]+\.(?:png|jpg|jpeg|gif|webp|svg)/gi,
  // Generic image URLs
  /https?:\/\/[^\s"'<>]+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\s"'<>]*)?/gi,
  // Together.ai / Replicate / other AI image URLs
  /https?:\/\/[^\s"'<>]*(?:together|replicate|openai|stability|flux)[^\s"'<>]*\.(?:png|jpg|jpeg|gif|webp)/gi,
];

/**
 * Extract image URLs from text
 * Returns array of { url, startIndex, endIndex }
 */
function extractImageUrls(text) {
  const matches = [];
  const seen = new Set();

  for (const pattern of IMAGE_URL_PATTERNS) {
    pattern.lastIndex = 0; // Reset regex state
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const url = match[0];
      if (!seen.has(url)) {
        seen.add(url);
        matches.push({
          url,
          startIndex: match.index,
          endIndex: match.index + url.length,
        });
      }
    }
  }

  return matches.sort((a, b) => a.startIndex - b.startIndex);
}

/**
 * Split text into parts: regular text and image URLs
 */
function parseTextWithImages(text) {
  const images = extractImageUrls(text);
  if (images.length === 0) {
    return [{ type: 'text', content: text }];
  }

  const parts = [];
  let lastIndex = 0;

  for (const img of images) {
    // Add text before this image
    if (img.startIndex > lastIndex) {
      const textBefore = text.slice(lastIndex, img.startIndex).trim();
      if (textBefore) {
        parts.push({ type: 'text', content: textBefore });
      }
    }
    // Add the image
    parts.push({ type: 'image', url: img.url });
    lastIndex = img.endIndex;
  }

  // Add remaining text after last image
  if (lastIndex < text.length) {
    const textAfter = text.slice(lastIndex).trim();
    if (textAfter) {
      parts.push({ type: 'text', content: textAfter });
    }
  }

  return parts;
}

// ============================================================================
// IMAGE CARD COMPONENT
// ============================================================================

function ImageCard({ url }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const cardRef = useRef(null);

  // Animate card entrance
  useEffect(() => {
    if (prefersReducedMotion() || !cardRef.current) return;

    anime({
      targets: cardRef.current,
      scale: [0.95, 1],
      opacity: [0, 1],
      duration: 300,
      easing: 'easeOutQuad',
    });
  }, []);

  const handleDownload = async (e) => {
    e.stopPropagation();
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      // Extract filename from URL or generate one
      const filename = url.split('/').pop()?.split('?')[0] || `sync-image-${Date.now()}.png`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Failed to download image:', err);
      // Fallback: open in new tab
      window.open(url, '_blank');
    }
  };

  const handleOpenInNewTab = (e) => {
    e.stopPropagation();
    window.open(url, '_blank');
  };

  if (hasError) {
    return (
      <div
        ref={cardRef}
        className="mt-3 rounded-xl border border-red-500/20 bg-red-950/20 p-4"
        style={{ opacity: 0 }}
      >
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">Failed to load image</span>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center gap-1 text-xs text-red-300/70 hover:text-red-300 transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          Open link
        </a>
      </div>
    );
  }

  return (
    <>
      <div
        ref={cardRef}
        className="mt-3 group relative rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 to-black/40 overflow-hidden cursor-pointer hover:border-cyan-400/50 transition-all"
        onClick={() => setIsExpanded(true)}
        style={{ opacity: 0 }}
      >
        {/* Loading skeleton */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="flex items-center gap-2 text-cyan-400">
              <ImageIcon className="h-5 w-5 animate-pulse" />
              <span className="text-sm">Loading image...</span>
            </div>
          </div>
        )}

        {/* Image */}
        <img
          src={url}
          alt="Generated image"
          className={cn(
            "w-full max-h-[400px] object-contain transition-opacity",
            isLoading ? "opacity-0" : "opacity-100"
          )}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        loading="lazy" decoding="async" />

        {/* Hover overlay with actions */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 bg-white/10 hover:bg-white/20 text-white border border-white/20"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4 mr-1.5" />
              Download
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 bg-white/10 hover:bg-white/20 text-white border border-white/20"
              onClick={handleOpenInNewTab}
            >
              <ExternalLink className="h-4 w-4 mr-1.5" />
              Open
            </Button>
          </div>
        </div>

        {/* Click hint */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[10px] text-white/50 bg-black/40 px-2 py-1 rounded-full">Click to expand</span>
        </div>
      </div>

      {/* Fullscreen modal */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setIsExpanded(false)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img
              src={url}
              alt="Generated image"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
             loading="lazy" decoding="async" />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              <Button
                size="sm"
                className="bg-cyan-600 hover:bg-cyan-500 text-white"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-1.5" />
                Download
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================================
// DOCUMENT CARD COMPONENT
// ============================================================================

function DocumentCard({ url, title }) {
  const { syt } = useTheme();
  const cardRef = useRef(null);

  // Animate card entrance
  useEffect(() => {
    if (prefersReducedMotion() || !cardRef.current) return;

    anime({
      targets: cardRef.current,
      scale: [0.95, 1],
      opacity: [0, 1],
      duration: 300,
      easing: 'easeOutQuad',
    });
  }, []);

  const handleOpen = () => {
    window.open(url, '_blank');
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Failed to download document:', err);
      window.open(url, '_blank');
    }
  };

  return (
    <div
      ref={cardRef}
      className="mt-3 group rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/30 to-black/30 p-4 cursor-pointer hover:border-cyan-400/50 transition-all"
      onClick={handleOpen}
      style={{ opacity: 0 }}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
          <FileText className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${syt('text-slate-900', 'text-white')} truncate`}>{title}</div>
          <div className={`text-xs ${syt('text-slate-400', 'text-zinc-500')} mt-0.5`}>Markdown Document</div>
        </div>
        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleDownload}
            className={`p-1.5 rounded-lg bg-white/5 hover:bg-white/10 ${syt('text-slate-500', 'text-zinc-400')} ${syt('hover:text-slate-900', 'hover:text-white')} transition-colors`}
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpen}
            className={`p-1.5 rounded-lg bg-white/5 hover:bg-white/10 ${syt('text-slate-500', 'text-zinc-400')} ${syt('hover:text-slate-900', 'hover:text-white')} transition-colors`}
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// OUTER RING COMPONENT (SVG-based, stable shape)
// ============================================================================

// Agent segments configuration - each segment represents an agent SYNC can delegate to
// Matches the agents in the SYNC edge function + orchestrator
// Segments now fill the entire ring with no gaps (10 visible segments)
const AGENT_SEGMENTS = [
  { id: 'orchestrator', name: 'Orchestrator', color: '#ec4899', from: 0.01, to: 0.09, icon: '🎯' },  // pink
  { id: 'learn', name: 'Learn', color: '#06b6d4', from: 0.11, to: 0.19, icon: '📚' },       // cyan
  { id: 'growth', name: 'Growth', color: '#6366f1', from: 0.21, to: 0.29, icon: '📈' },     // indigo
  { id: 'products', name: 'Products', color: '#10b981', from: 0.31, to: 0.39, icon: '📦' }, // emerald
  { id: 'sentinel', name: 'Sentinel', color: '#86EFAC', from: 0.41, to: 0.49, icon: '🛡️' }, // sage
  { id: 'finance', name: 'Finance', color: '#3b82f6', from: 0.51, to: 0.59, icon: '💰' },   // blue
  { id: 'create', name: 'Create', color: '#06b6d4', from: 0.61, to: 0.69, icon: '🎨' },     // cyan
  { id: 'tasks', name: 'Tasks', color: '#f97316', from: 0.71, to: 0.79, icon: '✅' },       // orange
  { id: 'research', name: 'Research', color: '#3b82f6', from: 0.81, to: 0.89, icon: '🔍' }, // blue
  { id: 'inbox', name: 'Inbox', color: '#14b8a6', from: 0.91, to: 0.99, icon: '📬' },       // teal
  { id: 'sync', name: 'SYNC', color: '#a855f7', from: 0, to: 0, icon: '🧠' },               // purple - main orchestrator (no segment)
  { id: 'team', name: 'Team', color: '#8b5cf6', from: 0, to: 0, icon: '👥' },               // violet (no segment)
  { id: 'composio', name: 'Integrations', color: '#22c55e', from: 0, to: 0, icon: '🔗' },   // green (no segment)
];

// ============================================================================
// ACTION EFFECTS CONFIGURATION - Enhanced visual feedback for different actions
// ============================================================================

const ACTION_EFFECTS = {
  // Database/Query actions - Cool blue pulse
  list_invoices: { color: '#3b82f6', intensity: 0.7, pattern: 'scan', icon: '📋' },
  list_tasks: { color: '#3b82f6', intensity: 0.7, pattern: 'scan', icon: '📋' },
  list_prospects: { color: '#3b82f6', intensity: 0.7, pattern: 'scan', icon: '📋' },
  search_products: { color: '#06b6d4', intensity: 0.8, pattern: 'scan', icon: '🔍' },
  search_prospects: { color: '#06b6d4', intensity: 0.8, pattern: 'scan', icon: '🔍' },
  get_financial_summary: { color: '#f59e0b', intensity: 0.85, pattern: 'pulse', icon: '📊' },
  get_pipeline_stats: { color: '#6366f1', intensity: 0.85, pattern: 'pulse', icon: '📈' },
  
  // Creation actions - Energetic burst
  create_invoice: { color: '#10b981', intensity: 0.9, pattern: 'burst', icon: '✨' },
  create_task: { color: '#10b981', intensity: 0.9, pattern: 'burst', icon: '✨' },
  create_prospect: { color: '#10b981', intensity: 0.9, pattern: 'burst', icon: '✨' },
  create_expense: { color: '#f59e0b', intensity: 0.85, pattern: 'burst', icon: '💸' },
  
  // AI/Generation actions - Creative spiral
  generate_image: { color: '#ec4899', intensity: 1.0, pattern: 'spiral', icon: '🎨' },
  web_search: { color: '#8b5cf6', intensity: 0.85, pattern: 'wave', icon: '🌐' },
  
  // Default fallback
  default: { color: '#a855f7', intensity: 0.6, pattern: 'pulse', icon: '⚡' },
};

// Get effect for an action type
function getActionEffect(actionType) {
  return ACTION_EFFECTS[actionType] || ACTION_EFFECTS.default;
}

// ============================================================================
// AGENT CHANNEL MESSAGE COMPONENT
// ============================================================================

function AgentChannelMessage({ message, isLatest, highlightBorders }) {
  const { syt } = useTheme();
  const messageRef = useRef(null);
  const agent = AGENT_SEGMENTS.find(a => a.id === message.agentId) || AGENT_SEGMENTS.find(a => a.id === 'sync');
  // Use platform-consistent colors
  const agentColor = getAgentColor(message.agentId || 'sync');
  const isSyncMessage = message.agentId === 'sync' || !message.agentId;

  // Animate message entrance
  useEffect(() => {
    if (prefersReducedMotion() || !messageRef.current) return;

    anime({
      targets: messageRef.current,
      translateX: [isSyncMessage ? -15 : 15, 0],
      opacity: [0, 1],
      duration: 300,
      easing: 'easeOutCubic',
    });
  }, []);

  return (
    <div
      ref={messageRef}
      className={cn(
        "flex items-start gap-3 py-3 px-4 rounded-xl max-w-[85%] transition-all duration-300",
        isSyncMessage
          ? `mr-auto ${syt('bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200', 'bg-gradient-to-br from-zinc-800/70 to-zinc-800/40 border border-zinc-700/30')}`
          : `ml-auto flex-row-reverse ${syt('bg-gradient-to-bl from-slate-100 to-slate-50 border border-slate-200', 'bg-gradient-to-bl from-zinc-700/50 to-zinc-700/30 border border-zinc-600/30')}`,
        highlightBorders && "border-cyan-400/70 shadow-[0_0_20px_rgba(34,211,238,0.4)]"
      )}
      style={{ opacity: 0 }}
    >
      {/* Agent Avatar */}
      <div
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 shadow-lg"
        style={{
          backgroundColor: `${agentColor}15`,
          borderColor: `${agentColor}50`,
          boxShadow: `0 4px 12px ${agentColor}20`,
        }}
      >
        {agent?.icon || '🤖'}
      </div>

      {/* Message Content */}
      <div className={cn("flex-1 min-w-0", !isSyncMessage && "text-right")}>
        <div className={cn("flex items-center gap-2 mb-1", !isSyncMessage && "justify-end")}>
          <span
            className="text-sm font-semibold"
            style={{ color: agentColor }}
          >
            {agent?.name || 'Agent'}
          </span>
          <span className={`text-[10px] ${syt('text-slate-400', 'text-zinc-500')}`}>
            {formatTime(message.ts)}
          </span>
          {/* Status indicator for latest */}
          {isLatest && message.status === 'thinking' && (
            <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-amber-400" />
          )}
        </div>
        <p className={`text-sm ${syt('text-slate-600', 'text-zinc-300')} leading-relaxed`}>
          {message.text}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// AGENT CHANNEL COMPONENT (Slack-like feed)
// ============================================================================

function AgentChannel({ messages, isActive, highlightBorders }) {
  const scrollerRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Don't show anything if no messages
  if (messages.length === 0) {
    return null;
  }

  // Show only the last 5 messages
  const visibleMessages = messages.slice(-5);

  return (
    <div ref={scrollerRef} className="flex flex-col justify-end h-full px-5 pb-6">
      <div className="space-y-4">
        {visibleMessages.map((msg, idx) => (
          <AgentChannelMessage
            key={msg.id || idx}
            message={msg}
            isLatest={idx === visibleMessages.length - 1}
            highlightBorders={highlightBorders}
          />
        ))}

        {/* Active indicator */}
        {isActive && (
          <div className="flex items-center justify-center gap-2 py-2">
            <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
            <span className="text-xs text-cyan-400">Processing...</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function OuterRing({ size = 360, mood = 'listening', level = 0.2, activeAgent = null, activeAgentAngle = null, segments = null }) {
  const ringRef = useRef(null);
  const segmentsRef = useRef(null);
  const dotsRef = useRef(null);
  const svgRef = useRef(null);
  const bezelRef = useRef(null);
  const [hoveredAgent, setHoveredAgent] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [currentBezelAngle, setCurrentBezelAngle] = useState(0);

  const r = size / 2;
  const pad = 10;
  const ringR = r - pad;
  const bezelR = ringR - 28; // Inner bezel radius

  const glow = mood === 'speaking' ? 1.0 : mood === 'thinking' ? 0.7 : 0.45;
  const pulse = clamp(0.35 + level * 0.9, 0.35, 1.2);

  // Smooth bezel rotation towards active agent
  useEffect(() => {
    if (activeAgentAngle !== null) {
      // Convert 0-1 position to degrees (0 = top)
      const targetDegrees = activeAgentAngle * 360 - 90;
      
      // Animate the bezel rotation
      if (!prefersReducedMotion() && bezelRef.current) {
        anime.remove(bezelRef.current);
        anime({
          targets: bezelRef.current,
          rotate: targetDegrees,
          duration: 800,
          easing: 'easeOutQuad',
        });
      }
      setCurrentBezelAngle(targetDegrees);
    } else {
      // Return to neutral position (top)
      if (!prefersReducedMotion() && bezelRef.current) {
        anime.remove(bezelRef.current);
        anime({
          targets: bezelRef.current,
          rotate: 0,
          duration: 600,
          easing: 'easeOutQuad',
        });
      }
      setCurrentBezelAngle(0);
    }
  }, [activeAgentAngle]);

  // Animate segments based on mood and activeAgent
  useEffect(() => {
    if (prefersReducedMotion() || !segmentsRef.current) return;

    const paths = segmentsRef.current.querySelectorAll('path');

    anime.remove(paths);

    // If an agent is active, animate that segment more intensely
    if (activeAgent) {
      const activePath = segmentsRef.current.querySelector(`path[data-agent="${activeAgent}"]`);
      const inactivePaths = Array.from(paths).filter(p => p.dataset.agent !== activeAgent);

      // Dim inactive segments
      if (inactivePaths.length > 0) {
        anime({
          targets: inactivePaths,
          strokeWidth: 8,
          opacity: 0.35,
          duration: 300,
          easing: 'easeOutQuad',
        });
      }

      // Pulse the active segment with intense glow
      if (activePath) {
        anime({
          targets: activePath,
          strokeWidth: [12, 16, 12],
          opacity: [0.9, 1, 0.9],
          duration: 500,
          loop: true,
          easing: 'easeInOutSine',
        });
      }
    } else {
      // Default animation for all segments
      anime({
        targets: paths,
        strokeWidth: mood === 'speaking' ? [10, 12, 10] : [10, 11, 10],
        opacity: [0.75 + glow * 0.25, 0.85 + glow * 0.15, 0.75 + glow * 0.25],
        duration: mood === 'speaking' ? 600 : 1200,
        loop: true,
        easing: 'easeInOutSine',
        delay: anime.stagger(100),
      });
    }

    return () => anime.remove(paths);
  }, [mood, glow, activeAgent]);

  // Animate mood dots
  useEffect(() => {
    if (prefersReducedMotion() || !dotsRef.current) return;

    const dots = dotsRef.current.querySelectorAll('circle');

    anime.remove(dots);
    anime({
      targets: dots,
      r: (el, i) => [2.6 + (i / 18) * 2.4, 3.2 + (i / 18) * 3, 2.6 + (i / 18) * 2.4],
      opacity: (el, i) => [0.15 + (i / 18) * 0.75, 0.3 + (i / 18) * 0.7, 0.15 + (i / 18) * 0.75],
      duration: mood === 'speaking' ? 400 : 800,
      loop: true,
      easing: 'easeInOutQuad',
      delay: anime.stagger(30, { direction: 'reverse' }),
    });

    return () => anime.remove(dots);
  }, [mood]);

  // Helpers for SVG arc paths
  const polar = (cx, cy, radius, a) => {
    const ang = (a - 0.25) * Math.PI * 2;
    return { x: cx + radius * Math.cos(ang), y: cy + radius * Math.sin(ang) };
  };

  const arcPath = (cx, cy, radius, a0, a1) => {
    const p0 = polar(cx, cy, radius, a0);
    const p1 = polar(cx, cy, radius, a1);
    const large = a1 - a0 > 0.5 ? 1 : 0;
    return `M ${p0.x} ${p0.y} A ${radius} ${radius} 0 ${large} 1 ${p1.x} ${p1.y}`;
  };

  return (
    <div
      ref={ringRef}
      className="relative"
      style={{ width: size, height: size }}
      aria-label="Agent avatar ring"
    >
      <svg ref={svgRef} width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block" style={{ transformOrigin: 'center center' }}>
        <defs>
          <radialGradient id="glass" cx="30%" cy="25%" r="70%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
            <stop offset="35%" stopColor="rgba(255,255,255,0.08)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>

          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={6} result="b" />
            <feColorMatrix
              in="b"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.9 0"
              result="c"
            />
            <feMerge>
              <feMergeNode in="c" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="tinyGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={2.5} />
          </filter>

          <linearGradient id="ringBase" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
          </linearGradient>
        </defs>

        {/* Base ring */}
        <circle
          cx={r}
          cy={r}
          r={ringR}
          fill="none"
          stroke="url(#ringBase)"
          strokeWidth={18}
          opacity={0.9}
        />

        {/* Ticks */}
        <g opacity={0.55}>
          {Array.from({ length: 120 }).map((_, i) => {
            const a = i / 120;
            const p0 = polar(r, r, ringR - 16, a);
            const p1 = polar(r, r, ringR - (i % 5 === 0 ? 6 : 10), a);
            return (
              <line
                key={i}
                x1={p0.x}
                y1={p0.y}
                x2={p1.x}
                y2={p1.y}
                stroke="rgba(255,255,255,0.12)"
                strokeWidth={i % 5 === 0 ? 2 : 1}
              />
            );
          })}
        </g>

        {/* Colored segments - dynamic from user's active apps */}
        <g ref={segmentsRef} filter="url(#softGlow)">
          {(segments || AGENT_SEGMENTS.filter(s => s.from !== s.to)).map((segment) => {
            const midAngle = (segment.from + segment.to) / 2;
            const midPoint = polar(r, r, ringR, midAngle);
            return (
              <path
                key={segment.id}
                data-agent={segment.id}
                d={arcPath(r, r, ringR, segment.from, segment.to)}
                fill="none"
                stroke={segment.color}
                strokeWidth={hoveredAgent === segment.id ? 14 : 10}
                strokeLinecap="round"
                style={{ 
                  opacity: activeAgent === segment.id ? 1 : hoveredAgent === segment.id ? 0.95 : 0.75 + glow * 0.25,
                  cursor: 'pointer',
                  transition: 'stroke-width 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  setHoveredAgent(segment.id);
                  setTooltipPos({ x: midPoint.x, y: midPoint.y - 30 });
                }}
                onMouseLeave={() => setHoveredAgent(null)}
              />
            );
          })}
        </g>

        {/* Inner bezel track (static gray ring) */}
        <circle
          cx={r}
          cy={r}
          r={bezelR}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={12}
        />

        {/* Rotating inner bezel indicator */}
        <g 
          ref={bezelRef} 
          style={{ transformOrigin: `${r}px ${r}px` }}
        >
          {/* Main indicator segment - points towards active agent */}
          <path
            d={arcPath(r, r, bezelR, -0.08, 0.08)}
            fill="none"
            stroke={activeAgent ? (AGENT_SEGMENTS.find(a => a.id === activeAgent)?.color || '#a855f7') : 'rgba(255,255,255,0.25)'}
            strokeWidth={activeAgent ? 14 : 10}
            strokeLinecap="round"
            style={{
              filter: activeAgent ? 'url(#softGlow)' : 'none',
              transition: 'stroke 0.3s ease, stroke-width 0.3s ease',
            }}
          />
          {/* Arrow tip indicator */}
          {activeAgent && (
            <>
              <circle
                cx={r}
                cy={r - bezelR}
                r={6}
                fill={AGENT_SEGMENTS.find(a => a.id === activeAgent)?.color || '#a855f7'}
                style={{ filter: 'url(#softGlow)' }}
              />
              {/* Direction line from center towards target */}
              <line
                x1={r}
                y1={r}
                x2={r}
                y2={r - bezelR + 20}
                stroke={AGENT_SEGMENTS.find(a => a.id === activeAgent)?.color || '#a855f7'}
                strokeWidth={2}
                opacity={0.5}
              />
            </>
          )}
        </g>

        {/* Subtle inner rim */}
        <circle
          cx={r}
          cy={r}
          r={ringR - 42}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth={1}
        />

        {/* Center lens */}
        <circle cx={r} cy={r} r={ringR - 46} fill="rgba(0,0,0,0.4)" />
        <circle cx={r} cy={r} r={ringR - 46} fill="url(#glass)" opacity={0.9} />

        {/* Inner accent ring */}
        <circle
          cx={r}
          cy={r}
          r={ringR - 58}
          fill="none"
          stroke={activeAgent ? (AGENT_SEGMENTS.find(a => a.id === activeAgent)?.color || '#a855f7') : '#a855f7'}
          strokeWidth={2}
          opacity={0.25 + pulse * 0.15}
          style={{ transition: 'stroke 0.5s ease' }}
        />
      </svg>

      {/* Outer glow halo */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full transition-shadow duration-500"
        style={{
          boxShadow: `0 0 ${24 + pulse * 18}px rgba(168,85,247,${0.10 + glow * 0.12}), 0 0 ${52 + pulse * 26}px rgba(139,92,246,${0.06 + glow * 0.08})`,
        }}
      />

      {/* Tooltip for hovered agent */}
      {hoveredAgent && (
        <div
          className="pointer-events-none absolute z-50 px-2.5 py-1.5 rounded-lg bg-black/90 border border-white/20 shadow-xl backdrop-blur-sm transition-all duration-150"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {(() => {
            const agent = AGENT_SEGMENTS.find(a => a.id === hoveredAgent);
            return agent ? (
              <div className="flex items-center gap-2">
                <span className="text-base">{agent.icon}</span>
                <span className="text-xs font-medium text-white">{agent.name}</span>
                <span 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: agent.color }}
                />
              </div>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// INNER VISUALIZATION COMPONENT (Canvas-based particles + waves)
// ============================================================================

export function InnerViz({ size = 360, mood = 'listening', level = 0.25, seed = 1, actionEffect = null, activeAgentColor = null, showSuccess = false, activeAgentAngle = null, userAvatarUrl = null }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const stateRef = useRef({
    w: size,
    h: size,
    particles: [],
    seed,
    pointer: { x: size / 2, y: size / 2, down: false },
    time: 0,
    actionEffect: null,
    burstParticles: [],
    spiralAngle: 0,
    successParticles: [],
    activeAgentColor: null,
    // New micro-interaction states
    ripples: [], // Click ripple effects
    breathPhase: 0, // Breathing glow phase
    prevAgentColor: null, // For smooth color transitions
    colorTransition: 0, // 0-1 for color lerp
    // Turning/orientation effect
    currentFacingAngle: 0, // Current angle the "face" is pointing
    targetFacingAngle: 0, // Target angle to turn towards
  });
  
  // Update action effect in state
  useEffect(() => {
    stateRef.current.actionEffect = actionEffect;
    
    // Trigger burst particles when action starts
    if (actionEffect && actionEffect.pattern === 'burst') {
      const st = stateRef.current;
      const cx = size / 2;
      const cy = size / 2;
      st.burstParticles = Array.from({ length: 24 }).map((_, i) => {
        const angle = (i / 24) * Math.PI * 2;
        return {
          x: cx,
          y: cy,
          vx: Math.cos(angle) * (3 + Math.random() * 2),
          vy: Math.sin(angle) * (3 + Math.random() * 2),
          life: 1.0,
          size: 2 + Math.random() * 3,
        };
      });
    }
  }, [actionEffect, size]);

  // Update active agent color with smooth transition
  useEffect(() => {
    const st = stateRef.current;
    if (activeAgentColor !== st.activeAgentColor) {
      st.prevAgentColor = st.activeAgentColor;
      st.activeAgentColor = activeAgentColor;
      st.colorTransition = 0; // Start transition
    }
  }, [activeAgentColor]);

  // Update facing angle when active agent changes (turning towards coworker)
  useEffect(() => {
    const st = stateRef.current;
    if (activeAgentAngle !== null) {
      // Convert 0-1 position to radians (adjusting so 0 is at top)
      st.targetFacingAngle = (activeAgentAngle - 0.25) * Math.PI * 2;
    } else {
      // Return to neutral (facing up/forward)
      st.targetFacingAngle = -Math.PI / 2;
    }
  }, [activeAgentAngle]);

  // Trigger success celebration particles
  useEffect(() => {
    if (showSuccess) {
      const st = stateRef.current;
      const cx = size / 2;
      const cy = size / 2;
      // Create confetti-like success particles
      st.successParticles = Array.from({ length: 40 }).map((_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 4;
        return {
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2, // Slight upward bias
          life: 1.0,
          size: 2 + Math.random() * 4,
          color: ['#10b981', '#22c55e', '#4ade80', '#86efac'][Math.floor(Math.random() * 4)], // Green success colors
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.3,
        };
      });
    }
  }, [showSuccess, size]);

  // Initialize particles
  useEffect(() => {
    const st = stateRef.current;
    st.w = size;
    st.h = size;
    st.seed = seed;

    const N = 90;
    const rand = (a) => {
      const x = Math.sin((st.seed + a) * 9999) * 10000;
      return x - Math.floor(x);
    };

    st.particles = Array.from({ length: N }).map((_, i) => {
      const r = (size * 0.33) * Math.sqrt(rand(i + 1));
      const ang = rand(i + 7) * Math.PI * 2;
      return {
        x: size / 2 + r * Math.cos(ang),
        y: size / 2 + r * Math.sin(ang),
        vx: (rand(i + 11) - 0.5) * 0.35,
        vy: (rand(i + 17) - 0.5) * 0.35,
        s: 1.2 + rand(i + 23) * 3.2,
        p: rand(i + 31),
      };
    });
  }, [size, seed]);

  // Animation loop using anime.js timeline approach
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const st = stateRef.current;
    let running = true;

    const render = () => {
      if (!running) return;

      st.time += 0.016; // ~60fps increment
      const time = st.time;
      const w = st.w;
      const h = st.h;
      const cx = w / 2;
      const cy = h / 2;

      // Handle DPR
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      // Background
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.arc(cx, cy, w * 0.34, 0, Math.PI * 2);
      ctx.fill();

      // Clip to circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, w * 0.34, 0, Math.PI * 2);
      ctx.clip();

      // Mood palette (purple theme for SYNC, or agent-specific when delegating)
      const agentColor = st.activeAgentColor;
      const hexToRgba = (hex, alpha) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return `rgba(168,85,247,${alpha})`;
        return `rgba(${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)},${alpha})`;
      };
      
      const palettes = {
        listening: { a: 'rgba(168,85,247,0.45)', b: 'rgba(139,92,246,0.30)', dot: 'rgba(255,255,255,0.18)' },
        thinking: agentColor ? {
          a: hexToRgba(agentColor, 0.45),
          b: hexToRgba(agentColor, 0.25),
          dot: 'rgba(255,255,255,0.18)'
        } : { a: 'rgba(245,158,11,0.40)', b: 'rgba(217,119,6,0.25)', dot: 'rgba(255,255,255,0.16)' },
        speaking: { a: 'rgba(192,132,252,0.55)', b: 'rgba(168,85,247,0.35)', dot: 'rgba(255,255,255,0.22)' },
      };
      const P = palettes[mood] || palettes.listening;

      // Gradient wash
      const g = ctx.createRadialGradient(cx - w * 0.12, cy - h * 0.12, w * 0.08, cx, cy, w * 0.42);
      g.addColorStop(0, P.a);
      g.addColorStop(0.6, P.b);
      g.addColorStop(1, 'rgba(0,0,0,0.0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // ========== ACTION-SPECIFIC VISUAL EFFECTS ==========
      const effect = st.actionEffect;
      if (effect) {
        ctx.globalCompositeOperation = 'lighter';
        
        // Parse the effect color to RGB
        const hexToRgb = (hex) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
          } : { r: 168, g: 85, b: 247 };
        };
        const rgb = hexToRgb(effect.color);
        const intensity = effect.intensity || 0.6;
        
        if (effect.pattern === 'scan') {
          // Scanning pattern - horizontal lines moving down
          const scanCount = 5;
          for (let i = 0; i < scanCount; i++) {
            const scanOffset = ((time * 1.5 + i * 0.2) % 1) * h;
            const scanOpacity = 0.15 * intensity * Math.sin((scanOffset / h) * Math.PI);
            ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${scanOpacity})`;
            ctx.fillRect(cx - w * 0.3, scanOffset - 1, w * 0.6, 3);
          }
          
          // Corner brackets for "scanning" feel
          const bracketSize = 20;
          const bracketPulse = 0.5 + Math.sin(time * 4) * 0.3;
          ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${0.4 * intensity * bracketPulse})`;
          ctx.lineWidth = 2;
          // Top-left
          ctx.beginPath();
          ctx.moveTo(cx - w * 0.25, cy - h * 0.2 + bracketSize);
          ctx.lineTo(cx - w * 0.25, cy - h * 0.2);
          ctx.lineTo(cx - w * 0.25 + bracketSize, cy - h * 0.2);
          ctx.stroke();
          // Top-right
          ctx.beginPath();
          ctx.moveTo(cx + w * 0.25, cy - h * 0.2 + bracketSize);
          ctx.lineTo(cx + w * 0.25, cy - h * 0.2);
          ctx.lineTo(cx + w * 0.25 - bracketSize, cy - h * 0.2);
          ctx.stroke();
          // Bottom-left
          ctx.beginPath();
          ctx.moveTo(cx - w * 0.25, cy + h * 0.2 - bracketSize);
          ctx.lineTo(cx - w * 0.25, cy + h * 0.2);
          ctx.lineTo(cx - w * 0.25 + bracketSize, cy + h * 0.2);
          ctx.stroke();
          // Bottom-right
          ctx.beginPath();
          ctx.moveTo(cx + w * 0.25, cy + h * 0.2 - bracketSize);
          ctx.lineTo(cx + w * 0.25, cy + h * 0.2);
          ctx.lineTo(cx + w * 0.25 - bracketSize, cy + h * 0.2);
          ctx.stroke();
        }
        
        if (effect.pattern === 'pulse') {
          // Pulsing rings expanding outward
          const ringCount = 3;
          for (let i = 0; i < ringCount; i++) {
            const ringPhase = ((time * 0.8 + i * 0.33) % 1);
            const ringRadius = w * 0.1 + ringPhase * w * 0.25;
            const ringOpacity = (1 - ringPhase) * 0.25 * intensity;
            ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${ringOpacity})`;
            ctx.lineWidth = 2 - ringPhase;
            ctx.beginPath();
            ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        
        if (effect.pattern === 'burst') {
          // Burst particles flying outward
          for (let i = st.burstParticles.length - 1; i >= 0; i--) {
            const bp = st.burstParticles[i];
            bp.x += bp.vx;
            bp.y += bp.vy;
            bp.vx *= 0.96;
            bp.vy *= 0.96;
            bp.life -= 0.02;
            
            if (bp.life <= 0) {
              st.burstParticles.splice(i, 1);
            } else {
              ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${bp.life * 0.8 * intensity})`;
              ctx.beginPath();
              ctx.arc(bp.x, bp.y, bp.size * bp.life, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          
          // Central glow during burst
          if (st.burstParticles.length > 0) {
            const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.2);
            glowGrad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${0.4 * intensity})`);
            glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glowGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, w * 0.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        
        if (effect.pattern === 'spiral') {
          // Creative spiral for image generation
          st.spiralAngle = (st.spiralAngle || 0) + 0.08;
          const spiralArms = 4;
          const spiralTurns = 2;
          
          for (let arm = 0; arm < spiralArms; arm++) {
            const armOffset = (arm / spiralArms) * Math.PI * 2;
            ctx.beginPath();
            for (let t = 0; t < 1; t += 0.02) {
              const angle = st.spiralAngle + armOffset + t * Math.PI * 2 * spiralTurns;
              const radius = t * w * 0.28;
              const x = cx + Math.cos(angle) * radius;
              const y = cy + Math.sin(angle) * radius;
              if (t === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            const spiralOpacity = 0.25 * intensity * (0.5 + Math.sin(time * 3) * 0.3);
            ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${spiralOpacity})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
          
          // Center sparkle
          const sparkleSize = 4 + Math.sin(time * 8) * 2;
          ctx.fillStyle = `rgba(255,255,255,${0.6 * intensity})`;
          ctx.beginPath();
          ctx.arc(cx, cy, sparkleSize, 0, Math.PI * 2);
          ctx.fill();
        }
        
        if (effect.pattern === 'wave') {
          // Web search wave pattern
          const waveCount = 4;
          for (let i = 0; i < waveCount; i++) {
            const wavePhase = time * 2 + i * 0.5;
            ctx.beginPath();
            for (let x = cx - w * 0.3; x <= cx + w * 0.3; x += 4) {
              const dx = (x - cx) / (w * 0.3);
              const waveY = cy + Math.sin(dx * Math.PI * 2 + wavePhase) * 15 * (1 - Math.abs(dx));
              if (x === cx - w * 0.3) ctx.moveTo(x, waveY);
              else ctx.lineTo(x, waveY);
            }
            const waveOpacity = 0.2 * intensity * (1 - i * 0.2);
            ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${waveOpacity})`;
            ctx.lineWidth = 2 - i * 0.3;
            ctx.stroke();
          }
        }
      }
      // ========== END ACTION EFFECTS ==========

      // ========== SUCCESS CELEBRATION PARTICLES ==========
      if (st.successParticles && st.successParticles.length > 0) {
        ctx.globalCompositeOperation = 'lighter';
        for (let i = st.successParticles.length - 1; i >= 0; i--) {
          const sp = st.successParticles[i];
          // Physics
          sp.x += sp.vx;
          sp.y += sp.vy;
          sp.vy += 0.08; // Gravity
          sp.vx *= 0.99; // Air resistance
          sp.rotation += sp.rotationSpeed;
          sp.life -= 0.015;
          
          if (sp.life <= 0) {
            st.successParticles.splice(i, 1);
          } else {
            // Draw confetti piece
            ctx.save();
            ctx.translate(sp.x, sp.y);
            ctx.rotate(sp.rotation);
            ctx.fillStyle = sp.color.replace(')', `,${sp.life * 0.9})`).replace('rgb', 'rgba');
            ctx.fillRect(-sp.size / 2, -sp.size / 4, sp.size, sp.size / 2);
            ctx.restore();
          }
        }
      }
      // ========== END SUCCESS PARTICLES ==========

      // ========== CLICK RIPPLE EFFECTS ==========
      if (st.ripples && st.ripples.length > 0) {
        ctx.globalCompositeOperation = 'lighter';
        for (let i = st.ripples.length - 1; i >= 0; i--) {
          const rp = st.ripples[i];
          rp.radius += rp.speed;
          rp.life -= 0.025;
          
          if (rp.life <= 0 || rp.radius > rp.maxRadius) {
            st.ripples.splice(i, 1);
          } else {
            // Draw expanding ring
            const rippleOpacity = rp.life * 0.4;
            ctx.strokeStyle = `rgba(168, 85, 247, ${rippleOpacity})`;
            ctx.lineWidth = 2 * rp.life;
            ctx.beginPath();
            ctx.arc(rp.x, rp.y, rp.radius, 0, Math.PI * 2);
            ctx.stroke();
            
            // Inner glow
            const innerGlow = ctx.createRadialGradient(rp.x, rp.y, 0, rp.x, rp.y, rp.radius * 0.5);
            innerGlow.addColorStop(0, `rgba(192, 132, 252, ${rippleOpacity * 0.3})`);
            innerGlow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = innerGlow;
            ctx.beginPath();
            ctx.arc(rp.x, rp.y, rp.radius * 0.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      // ========== END RIPPLE EFFECTS ==========

      // ========== BREATHING GLOW (IDLE STATE) ==========
      if (mood === 'listening' && !st.actionEffect) {
        st.breathPhase = (st.breathPhase || 0) + 0.02;
        const breathIntensity = 0.08 + Math.sin(st.breathPhase) * 0.05;
        
        ctx.globalCompositeOperation = 'lighter';
        const breathGlow = ctx.createRadialGradient(cx, cy, w * 0.15, cx, cy, w * 0.32);
        breathGlow.addColorStop(0, `rgba(168, 85, 247, ${breathIntensity})`);
        breathGlow.addColorStop(0.5, `rgba(139, 92, 246, ${breathIntensity * 0.5})`);
        breathGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = breathGlow;
        ctx.beginPath();
        ctx.arc(cx, cy, w * 0.32, 0, Math.PI * 2);
        ctx.fill();
      }
      // ========== END BREATHING GLOW ==========

      // ========== COLOR TRANSITION (SMOOTH AGENT SWITCH) ==========
      if (st.colorTransition < 1 && st.prevAgentColor && st.activeAgentColor) {
        st.colorTransition = Math.min(1, st.colorTransition + 0.03);
      }
      // ========== END COLOR TRANSITION ==========

      // Central "eye" glow when agent is active
      if (st.activeAgentColor) {
        ctx.globalCompositeOperation = 'lighter';
        const hexToRgb = (hex) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 168, g: 85, b: 247 };
        };
        const rgb = hexToRgb(st.activeAgentColor);
        const eyePulse = 0.5 + Math.sin(time * 3) * 0.2;
        const eyeGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.06);
        eyeGrad.addColorStop(0, `rgba(255,255,255,${eyePulse})`);
        eyeGrad.addColorStop(0.4, `rgba(${rgb.r},${rgb.g},${rgb.b},${eyePulse * 0.5})`);
        eyeGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = eyeGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, w * 0.06, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // Lens vignette
      ctx.globalCompositeOperation = 'source-over';
      const vg = ctx.createRadialGradient(cx, cy, w * 0.10, cx, cy, w * 0.36);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = vg;
      ctx.beginPath();
      ctx.arc(cx, cy, w * 0.34, 0, Math.PI * 2);
      ctx.fill();

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      running = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [mood, level, actionEffect]);

  const avatarDiameter = Math.round(size * 0.68);
  const avatarOffset = (size - avatarDiameter) / 2;
  const [imgError, setImgError] = React.useState(false);

  return (
    <div className="absolute inset-0 grid place-items-center">
      <canvas
        ref={canvasRef}
        className="rounded-full cursor-pointer"
        style={{ width: size, height: size }}
        onPointerDown={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          stateRef.current.pointer = { x, y, down: true };

          // Create ripple effect on click
          stateRef.current.ripples.push({
            x,
            y,
            radius: 0,
            maxRadius: size * 0.35,
            life: 1.0,
            speed: 3 + Math.random() * 2,
          });
        }}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          stateRef.current.pointer = {
            ...stateRef.current.pointer,
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          };
        }}
        onPointerUp={() => {
          stateRef.current.pointer = { ...stateRef.current.pointer, down: false };
        }}
        onPointerLeave={() => {
          stateRef.current.pointer = { ...stateRef.current.pointer, down: false };
        }}
      />

      {/* User avatar photo overlay */}
      <div
        className="absolute rounded-full overflow-hidden pointer-events-none"
        style={{
          width: avatarDiameter,
          height: avatarDiameter,
          top: avatarOffset,
          left: avatarOffset,
        }}
      >
        {userAvatarUrl && !imgError ? (
          <img
            src={userAvatarUrl}
            alt="User avatar"
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center">
            <User className="w-1/3 h-1/3 text-white/70" />
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// AGENT AVATAR COMPONENT (Combines ring + inner viz)
// ============================================================================

function AgentAvatar({ size = 360, agentName = 'SYNC', mood = 'listening', level = 0.25, seed = 1, activeAgent = null, actionEffect = null, showSuccess = false }) {
  const { syt } = useTheme();
  const labelRef = useRef(null);
  const containerRef = useRef(null);

  // Dynamic ring segments from user's active apps
  const { segments } = useActiveAppSegments();
  const { user } = useUser();
  const userAvatarUrl = user?.avatar_url || null;

  // Get active agent info — try dynamic segments first, then fall back to static lookup
  const activeAgentInfo = activeAgent
    ? segments.find(a => a.id === activeAgent) || AGENT_SEGMENTS.find(a => a.id === activeAgent)
    : null;
  const activeAgentColor = activeAgent ? getAgentColor(activeAgent) : null;
  // Calculate the angle to point towards (center of the agent's segment on the ring)
  const activeAgentAngle = activeAgentInfo && activeAgentInfo.from !== activeAgentInfo.to
    ? (activeAgentInfo.from + activeAgentInfo.to) / 2  // Middle of the segment
    : null;

  // Animate label on mood change
  useEffect(() => {
    if (prefersReducedMotion() || !labelRef.current) return;

    anime({
      targets: labelRef.current,
      scale: [0.95, 1],
      opacity: [0.7, 1],
      duration: 200,
      easing: 'easeOutQuad',
    });
  }, [mood, activeAgent]);

  // Enhanced container animation when action starts
  useEffect(() => {
    if (prefersReducedMotion() || !containerRef.current || !actionEffect) return;

    // Quick scale pulse when action starts
    anime({
      targets: containerRef.current,
      scale: [1, 1.02, 1],
      duration: 300,
      easing: 'easeOutQuad',
    });
  }, [actionEffect]);

  return (
    <div ref={containerRef} className="relative" style={{ width: size, height: size }}>
      <OuterRing size={size} mood={mood} level={level} activeAgent={activeAgent} activeAgentAngle={activeAgentAngle} segments={segments} />
      <InnerViz size={size} mood={mood} level={level} seed={seed} actionEffect={actionEffect} activeAgentColor={activeAgentColor} showSuccess={showSuccess} activeAgentAngle={activeAgentAngle} userAvatarUrl={userAvatarUrl} />

      {/* Label - positioned below avatar */}
      <div className="absolute inset-x-0 bottom-[-52px] flex justify-center">
        <div
          ref={labelRef}
          className={`rounded-xl border ${syt('border-slate-200 bg-white/80', 'border-white/10 bg-black/60')} px-3 py-1.5 text-xs shadow-lg backdrop-blur`}
        >
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full animate-pulse"
              style={{
                backgroundColor: actionEffect?.color || activeAgentColor || (mood === 'speaking' ? '#a855f7' : mood === 'thinking' ? '#f59e0b' : '#22c55e'),
                boxShadow: `0 0 10px ${actionEffect?.color || activeAgentColor || 'rgba(168,85,247,0.6)'}`,
              }}
            />
            {actionEffect?.icon && (
              <span className="text-sm">{actionEffect.icon}</span>
            )}
            <span className={`font-medium ${syt('text-slate-900', 'text-white')}`}>
              {activeAgentInfo ? `${agentName} → ${activeAgentInfo.name}` : agentName}
            </span>
            <span className={syt('text-slate-400', 'text-zinc-500')}>·</span>
            <span className={`${syt('text-slate-500', 'text-zinc-400')} capitalize`}>{mood}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CHAT BUBBLE COMPONENT
// ============================================================================

function Bubble({ role, text, ts, index, document, highlightBorders }) {
  const { syt } = useTheme();
  const bubbleRef = useRef(null);
  const isUser = role === 'user';

  // Parse text for images (only for assistant messages)
  const contentParts = useMemo(() => {
    if (isUser) return null;
    return parseTextWithImages(text);
  }, [text, isUser]);

  // Animate bubble entrance
  useEffect(() => {
    if (prefersReducedMotion() || !bubbleRef.current) return;

    anime({
      targets: bubbleRef.current,
      translateY: [16, 0],
      opacity: [0, 1],
      duration: 350,
      delay: 50,
      easing: 'easeOutCubic',
    });
  }, []);

  return (
    <div ref={bubbleRef} className={cn('flex items-end gap-2.5', isUser ? 'justify-end' : 'justify-start')} style={{ opacity: 0 }}>
      {/* Assistant avatar */}
      {!isUser && (
        <div className={cn(
          'shrink-0 w-7 h-7 rounded-lg flex items-center justify-center',
          syt('bg-purple-100', 'bg-purple-500/15 ring-1 ring-purple-500/20')
        )}>
          <Bot className={cn('h-3.5 w-3.5', syt('text-purple-600', 'text-purple-400'))} />
        </div>
      )}

      <div
        className={cn(
          'max-w-[75%] text-sm leading-relaxed transition-all duration-300',
          isUser
            ? cn(
                'rounded-2xl rounded-br-sm px-4 py-2.5',
                syt(
                  'bg-gradient-to-br from-cyan-500 to-cyan-600 text-white shadow-md shadow-cyan-500/15',
                  'bg-gradient-to-br from-cyan-600 to-cyan-700 text-white shadow-lg shadow-cyan-600/15'
                )
              )
            : cn(
                'rounded-2xl rounded-bl-sm px-4 py-2.5',
                syt(
                  'bg-white ring-1 ring-slate-200/80 text-slate-800 shadow-sm',
                  'bg-zinc-900/80 ring-1 ring-white/[0.06] text-zinc-100 backdrop-blur-sm'
                )
              ),
          highlightBorders && 'ring-2 ring-cyan-400/60 shadow-[0_0_24px_rgba(34,211,238,0.25)]'
        )}
      >
        <div className={cn(
          'mb-1 flex items-center gap-1.5 text-[10px] font-medium tracking-wide uppercase',
          isUser ? 'text-white/50' : syt('text-slate-400', 'text-zinc-500')
        )}>
          <span>{isUser ? 'You' : 'SYNC'}</span>
          <span className={isUser ? 'text-white/30' : syt('text-slate-300', 'text-zinc-700')}>·</span>
          <span>{formatTime(ts)}</span>
        </div>
        {isUser ? (
          <div className="whitespace-pre-wrap">{text}</div>
        ) : (
          <>
            <div className={cn(
              'prose prose-sm max-w-none prose-p:my-1.5 prose-headings:my-2.5 prose-ul:my-1.5 prose-li:my-0.5',
              syt(
                'prose-slate prose-code:text-cyan-700 prose-code:bg-cyan-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-xs',
                'prose-invert prose-code:text-cyan-400 prose-code:bg-cyan-950/40 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-xs'
              )
            )}>
              {contentParts.map((part, i) => (
                part.type === 'image' ? (
                  <ImageCard key={`img-${i}`} url={part.url} />
                ) : (
                  <ReactMarkdown key={`text-${i}`}>
                    {part.content}
                  </ReactMarkdown>
                )
              ))}
            </div>
            {document && <DocumentCard url={document.url} title={document.title} />}
          </>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className={cn(
          'shrink-0 w-7 h-7 rounded-lg flex items-center justify-center',
          syt('bg-cyan-100', 'bg-cyan-500/15 ring-1 ring-cyan-500/20')
        )}>
          <User className={cn('h-3.5 w-3.5', syt('text-cyan-700', 'text-cyan-400'))} />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN SYNC AGENT PAGE
// ============================================================================

// Default welcome messages
const DEFAULT_MESSAGES = [
  { role: 'assistant', text: "Hey — I'm SYNC, your AI orchestrator. I can help with invoices, prospects, compliance, learning, and more.", ts: Date.now() - 1000 * 60 * 2 },
  { role: 'assistant', text: 'Tip: click and drag inside the avatar to interact with the visualization.', ts: Date.now() - 1000 * 60 * 1 },
];

export default function SyncAgent() {
  const { theme, toggleTheme, syt } = useTheme();
  const { user } = useUser();
  const syncStateContext = useSyncState();
  const [mood, setMoodLocal] = useState('listening');
  const [level, setLevel] = useState(0.18);
  const [seed, setSeed] = useState(4);
  const [activeAgent, setActiveAgentLocal] = useState(null);
  const [currentActionEffect, setCurrentActionEffect] = useState(null);
  const [showSuccess, setShowSuccessLocal] = useState(false);
  const [agentsOpen, setAgentsOpen] = useState(false);

  // Sync local state changes to global context for mini avatar synchronization
  const setMood = useCallback((newMood) => {
    setMoodLocal(newMood);
    syncStateContext.setMood(newMood);
  }, [syncStateContext]);

  const setActiveAgent = useCallback((agent) => {
    setActiveAgentLocal(agent);
    syncStateContext.setActiveAgent(agent);
  }, [syncStateContext]);

  const setShowSuccess = useCallback((show) => {
    setShowSuccessLocal(show);
    if (show) syncStateContext.triggerSuccess();
  }, [syncStateContext]);

  // Agent channel messages (inter-agent communication feed)
  const [agentMessages, setAgentMessages] = useState([]);

  // Helper to add agent channel message
  const addAgentMessage = useCallback((agentId, text, status = 'complete') => {
    setAgentMessages(prev => [...prev, {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      agentId,
      text,
      ts: Date.now(),
      status,
    }]);
  }, []);

  // Persist sessionId and messages in localStorage
  const [sessionId, setSessionId] = useLocalStorage('sync_agent_session_id', null);
  const [cachedMessages, setCachedMessages] = useLocalStorage('sync_agent_messages', []);

  // Initialize messages from cache or defaults
  const [messages, setMessages] = useState(() => {
    if (cachedMessages && cachedMessages.length > 0) {
      return cachedMessages;
    }
    return DEFAULT_MESSAGES;
  });

  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [highlightBorders, setHighlightBorders] = useState(false);
  const [voiceModeOpen, setVoiceModeOpen] = useState(false);
  const scrollerRef = useRef(null);
  const pageRef = useRef(null);

  // Listen for highlight borders event (when avatar clicked on this page)
  useEffect(() => {
    const handleHighlight = () => {
      setHighlightBorders(true);
      // Remove highlight after animation
      setTimeout(() => setHighlightBorders(false), 800);
    };

    window.addEventListener('sync-highlight-borders', handleHighlight);
    return () => window.removeEventListener('sync-highlight-borders', handleHighlight);
  }, []);

  // Sync messages to cache (limit to last 50)
  useEffect(() => {
    if (messages.length > 0 && messages !== DEFAULT_MESSAGES) {
      setCachedMessages(messages.slice(-50));
    }
  }, [messages]);

  // Handle new chat - clear session and messages
  const handleNewChat = useCallback(() => {
    setMessages(DEFAULT_MESSAGES);
    setSessionId(null);
    setCachedMessages([]);
    setAgentMessages([]); // Clear agent channel
    setError(null);
    setActiveAgent(null);
    setMood('listening');
    setInput('');
  }, [setSessionId, setCachedMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // Page entrance animation
  useEffect(() => {
    if (prefersReducedMotion() || !pageRef.current) return;

    const cards = pageRef.current.querySelectorAll('[data-animate]');
    anime({
      targets: cards,
      translateY: [20, 0],
      opacity: [0, 1],
      duration: 400,
      delay: anime.stagger(80),
      easing: 'easeOutQuad',
    });
  }, []);

  // Drive avatar level from mood
  useEffect(() => {
    let raf = 0;
    let t0 = performance.now();
    let lastContextUpdate = 0;

    const loop = (t) => {
      const dt = (t - t0) / 1000;
      t0 = t;
      const target = mood === 'speaking' ? 0.55 : mood === 'thinking' ? 0.35 : 0.18;
      setLevel((v) => {
        const newLevel = v + (target - v) * clamp(dt * 3.2, 0, 1);
        // Throttle context updates to ~10fps to avoid performance issues
        if (t - lastContextUpdate > 100) {
          lastContextUpdate = t;
          syncStateContext.updateState({ level: newLevel });
        }
        return newLevel;
      });
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mood, syncStateContext]);

  // Send message to SYNC API
  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || isSending) return;

    setError(null);
    setIsSending(true);
    setMood('thinking');
    const now = Date.now();

    setMessages((m) => [...m, { role: 'user', text, ts: now }]);
    setInput('');

    // Add initial agent channel message - SYNC receiving
    addAgentMessage('sync', `Received: "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"`, 'thinking');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sfxpmzicgpaxfntqleig.supabase.co';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDY0NjIsImV4cCI6MjA4MjE4MjQ2Mn0.337ohi8A4zu_6Hl1LpcPaWP8UkI5E4Om7ZgeU9_A8t4';
      const authToken = session?.access_token || supabaseAnonKey;

      addAgentMessage('sync', 'Thinking...', 'thinking');

      const response = await fetch(`${supabaseUrl}/functions/v1/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          message: text,
          sessionId,
          stream: true,
          voice: true,
          context: {
            userId: session?.user?.id,
            companyId: user?.company_id,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      // Handle SSE streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let receivedSessionId = null;
      let delegatedTo = null;
      let firstChunk = true;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(l => l.trim().startsWith('data:'));

          for (const line of lines) {
            const data = line.replace('data: ', '').trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);

              // Handle metadata event
              if (parsed.event === 'start') {
                receivedSessionId = parsed.sessionId;
                delegatedTo = parsed.delegatedTo;
                if (delegatedTo) {
                  const agentInfo = AGENT_SEGMENTS.find(a => a.id === delegatedTo?.toLowerCase());
                  if (agentInfo) setActiveAgent(delegatedTo.toLowerCase());
                }
                continue;
              }

              // Handle text chunks
              if (parsed.event === 'chunk' && parsed.content) {
                if (firstChunk) {
                  firstChunk = false;
                  setMood('speaking');
                  addAgentMessage('sync', 'Speaking...');
                }
                fullText += parsed.content;
              }

              // Handle action results
              if (parsed.event === 'action_result') {
                const effect = getActionEffect(parsed.actionType);
                setCurrentActionEffect(effect);
                if (parsed.success) {
                  setShowSuccess(true);
                  setTimeout(() => setShowSuccess(false), 100);
                }
              }
            } catch {
              // Skip unparseable chunks
            }
          }
        }
      }

      if (receivedSessionId) setSessionId(receivedSessionId);

      const elapsed = Date.now() - now;
      console.log(`[Voice] Response in ${elapsed}ms`);

      // Show the complete response
      if (fullText) {
        setMessages((m) => [...m, {
          role: 'assistant',
          text: fullText.trim(),
          ts: Date.now(),
          document: null,
        }]);
      }

      // Brief cooldown then back to listening
      await new Promise((r) => setTimeout(r, 800));
      setActiveAgent(null);
      setCurrentActionEffect(null);
      setMood('listening');
    } catch (err) {
      console.error('SYNC error:', err);
      addAgentMessage('sync', `Error: ${err.message || 'Something went wrong'}`);
      setError(err.message || 'Failed to send message');
      setActiveAgent(null);
      setCurrentActionEffect(null); // Clear on error too
      setMood('listening');
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, sessionId, user?.company_id, addAgentMessage]);

  // Retry handler
  const handleRetry = () => {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMessage) {
      setInput(lastUserMessage.text);
      setMessages((prev) => prev.filter((m) => m !== lastUserMessage));
      setError(null);
    }
  };

  // Quick suggestions - including orchestration workflows
  const suggestions = [
    { label: 'Weekly Review', action: 'Give me a weekly business review', isOrchestration: true },
    { label: 'Onboard Client', action: 'Onboard new client', isOrchestration: true },
    { label: 'Monthly Close', action: 'Do the monthly financial close', isOrchestration: true },
    { label: 'Create invoice', action: 'Help me create an invoice for a client' },
    { label: 'Product Launch', action: 'Launch a new product', isOrchestration: true },
    { label: 'Find prospects', action: 'Find prospects in the SaaS industry' },
  ];

  // Derived stats
  const actionsCount = useMemo(() => {
    return messages.filter(m => m.role === 'assistant' && m.text && /\[ACTION\]/.test(m.text)).length;
  }, [messages]);

  const moodLabel = mood === 'speaking' ? 'Active' : mood === 'thinking' ? 'Thinking' : 'Idle';

  return (
    <SyncPageTransition>
    <div ref={pageRef} className="min-h-screen bg-black text-white overflow-hidden">
      <div className="mx-auto max-w-[1600px] px-4 lg:px-6 py-4 flex flex-col gap-4 h-[calc(100dvh-3.5rem)]">

        {/* ── Header ── */}
        <div className="shrink-0">
          <SyncPageHeader icon={Brain} title="SYNC Agent" subtitle="Your AI assistant">
            <div />
            <div className="flex items-center gap-2">
              <button
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 bg-white/[0.06] text-zinc-400 hover:bg-white/[0.10] hover:text-zinc-200 ring-1 ring-white/[0.08]"
                onClick={() => setVoiceModeOpen(true)}
                title="Start voice conversation"
              >
                <Mic className="h-3.5 w-3.5" />
                <span>Voice</span>
              </button>
              <button
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 bg-white/[0.06] text-zinc-400 hover:bg-white/[0.10] hover:text-zinc-200 ring-1 ring-white/[0.08]"
                onClick={handleNewChat}
                title="Start new conversation"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Chat</span>
              </button>
            </div>
          </SyncPageHeader>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          <StatCard icon={Brain} label="Sessions Today" value={1} color="cyan" delay={0.05} />
          <StatCard icon={MessageSquare} label="Messages Sent" value={messages.length} color="blue" delay={0.10} />
          <StatCard icon={Zap} label="Actions Run" value={actionsCount} color="indigo" delay={0.15} />
          <StatCard icon={Sparkles} label="Mood" value={moodLabel} color="purple" delay={0.20} />
        </div>

        {/* ── Main Content: 2-column ── */}
        <div className="flex-1 min-h-0 grid lg:grid-cols-3 gap-4">

          {/* Chat Card (2/3 width) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="lg:col-span-2 flex flex-col min-h-0 rounded-[20px] border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm"
          >
            {/* Chat card header */}
            <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-zinc-800/40">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white">Conversation</h2>
                <span className="flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  {activeAgent ? `${activeAgent}` : 'SYNC'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="inline-flex items-center justify-center rounded-lg p-1.5 transition-all duration-200 text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06]"
                  onClick={() => setSeed((s) => s + 1)}
                  title="Refresh visual"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <Sheet open={agentsOpen} onOpenChange={setAgentsOpen}>
                  <SheetTrigger asChild>
                    <button className="inline-flex items-center justify-center rounded-lg p-1.5 transition-all duration-200 text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06]">
                      <Bot className="w-3.5 h-3.5" />
                    </button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[400px] sm:w-[440px] border-l bg-zinc-950 border-white/10">
                    <SheetHeader>
                      <SheetTitle className="text-white">Specialized Agents</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4 space-y-3 overflow-y-auto max-h-[calc(100vh-120px)] pr-1">
                      {AGENTS_DATA.map(agent => {
                        const colors = AGENT_COLOR_STYLES[agent.color];
                        const Icon = agent.icon;
                        return (
                          <div key={agent.id} className="p-4 rounded-xl border bg-white/[0.03] border-white/10">
                            <div className="flex items-start gap-3">
                              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border', colors.bg, colors.border)}>
                                <Icon className={cn('w-5 h-5', colors.text)} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-semibold text-sm text-white">{agent.name}</h4>
                                  {agent.status === 'active' ? (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">Active</span>
                                  ) : (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-500/20 text-zinc-400 border border-zinc-500/30">Soon</span>
                                  )}
                                </div>
                                <p className="text-xs mt-1 line-clamp-2 text-zinc-400">{agent.description}</p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {agent.capabilities.slice(0, 3).map((cap, i) => (
                                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-400">{cap}</span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            {/* Messages area */}
            <div ref={scrollerRef} className="flex-1 min-h-0 overflow-y-auto px-4 pt-5 pb-3">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-6">
                  <div className="relative mb-8">
                    <div className="absolute inset-0 rounded-full blur-3xl scale-[3] bg-purple-500/10" />
                    <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-cyan-500/10 ring-1 ring-white/10 shadow-lg shadow-purple-500/10">
                      <Sparkles className="w-8 h-8 text-purple-400" />
                    </div>
                  </div>
                  <h4 className="text-xl font-semibold mb-2 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">What can I help with?</h4>
                  <p className="text-sm mb-10 max-w-xs text-zinc-500">
                    Invoices, prospects, compliance, learning, and more.
                  </p>
                  <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                    {suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => { setInput(suggestion.action); setTimeout(() => send(), 100); }}
                        className="group px-4 py-3 text-sm rounded-xl text-left transition-all duration-200 bg-white/[0.03] ring-1 ring-white/[0.06] text-zinc-400 hover:ring-cyan-500/30 hover:bg-cyan-500/5 hover:text-cyan-400"
                      >
                        <span className="flex items-center gap-2">
                          {suggestion.isOrchestration && <Sparkles className="w-3.5 h-3.5 opacity-40" />}
                          {suggestion.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((m, idx) => (
                    <Bubble key={idx} role={m.role} text={m.text} ts={m.ts} index={idx} document={m.document} highlightBorders={highlightBorders} />
                  ))}

                  {isSending && (
                    <div className="flex items-end gap-2.5">
                      <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-purple-500/15 ring-1 ring-purple-500/20">
                        <Bot className="h-3.5 w-3.5 text-purple-400" />
                      </div>
                      <div className="rounded-2xl rounded-bl-sm px-4 py-3 bg-zinc-900/80 ring-1 ring-white/[0.06] backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '600ms' }} />
                            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms', animationDuration: '600ms' }} />
                            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms', animationDuration: '600ms' }} />
                          </div>
                          <span className="text-xs text-zinc-500">
                            {mood === 'thinking' ? 'Thinking...' : 'Responding...'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 ring-1 ring-red-500/20 backdrop-blur-sm">
                      <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-400">Something went wrong</p>
                        <p className="text-xs mt-1 text-red-400/70">{error}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleRetry}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Retry
                      </Button>
                    </div>
                  )}

                  {/* Suggestion chips */}
                  {messages.length > 0 && messages.length <= 4 && !isSending && (
                    <div className="pt-2">
                      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
                        {suggestions.map((s, idx) => (
                          <button
                            key={idx}
                            onClick={() => { setInput(s.action); setTimeout(() => send(), 100); }}
                            className="shrink-0 px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition-all duration-200 bg-white/[0.04] text-zinc-400 hover:bg-cyan-500/10 hover:text-cyan-400 ring-1 ring-white/[0.06]"
                          >
                            {s.isOrchestration && <Sparkles className="inline w-3 h-3 mr-1 opacity-50" />}
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="shrink-0 px-3 pb-3 pt-1">
              <div className="flex items-end gap-2 rounded-2xl p-1.5 transition-all duration-300 bg-zinc-900/80 ring-1 ring-white/[0.06] backdrop-blur-sm focus-within:ring-cyan-500/30 focus-within:shadow-lg focus-within:shadow-cyan-500/5">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Message SYNC..."
                  rows={1}
                  disabled={isSending}
                  className="flex-1 resize-none bg-transparent text-sm outline-none disabled:opacity-50 px-3 py-2.5 min-h-[40px] max-h-[120px] text-white/90 placeholder:text-zinc-500"
                />
                <button
                  onClick={send}
                  disabled={isSending || !input.trim()}
                  className={cn(
                    'shrink-0 h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-300',
                    isSending || !input.trim()
                      ? 'bg-zinc-800/60 text-zinc-600'
                      : 'bg-gradient-to-br from-cyan-500 to-cyan-600 text-white shadow-md shadow-cyan-500/20 hover:shadow-lg hover:shadow-cyan-500/30 hover:scale-105 active:scale-95'
                  )}
                  title="Send (Enter)"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <div className="px-3 pt-1.5 flex items-center justify-between text-[10px] text-zinc-600">
                <span>Enter to send · Shift+Enter for newline</span>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-500">1 credit per message</span>
                  <span className="tabular-nums">{input.length}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Avatar Sidebar Card (1/3 width) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.30, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="lg:col-span-1 flex flex-col rounded-[20px] border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm overflow-hidden"
          >
            {/* Avatar area */}
            <div className="shrink-0 grid place-items-center pt-6 pb-10 relative">
              {/* Ambient glow behind avatar */}
              <div className={cn(
                'absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full blur-[80px] pointer-events-none transition-all duration-1000',
                mood === 'speaking'
                  ? 'bg-purple-500/20'
                  : mood === 'thinking'
                    ? 'bg-amber-500/15'
                    : 'bg-cyan-500/10'
              )} />
              <div className="relative z-10">
                <AgentAvatar size={240} agentName="SYNC" mood={mood} level={level} seed={seed} activeAgent={activeAgent} actionEffect={currentActionEffect} showSuccess={showSuccess} />
              </div>
            </div>

            {/* Separator */}
            <div className="mx-5 border-t border-zinc-800/40" />

            {/* Agent info + quick actions */}
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
              {/* Active agent label */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">
                    {activeAgent ? `SYNC → ${AGENT_SEGMENTS.find(a => a.id === activeAgent)?.name || activeAgent}` : 'SYNC'}
                  </span>
                  <span
                    className="inline-block h-2 w-2 rounded-full animate-pulse"
                    style={{
                      backgroundColor: currentActionEffect?.color || (activeAgent ? getAgentColor(activeAgent) : (mood === 'speaking' ? '#a855f7' : mood === 'thinking' ? '#f59e0b' : '#22c55e')),
                    }}
                  />
                </div>
                <span className="text-xs text-zinc-500 capitalize">{mood}</span>
              </div>

              {/* Mood indicator */}
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2.5">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>
                    {mood === 'speaking' ? 'Delivering response...' : mood === 'thinking' ? 'Processing your request...' : 'Ready for input'}
                  </span>
                </div>
              </div>

              {/* Agent channel messages (compact) */}
              {agentMessages.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Agent Activity</p>
                  <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                    {agentMessages.slice(-5).map((msg, idx) => {
                      const agent = AGENT_SEGMENTS.find(a => a.id === msg.agentId) || AGENT_SEGMENTS.find(a => a.id === 'sync');
                      return (
                        <div key={msg.id || idx} className="flex items-start gap-2 text-xs">
                          <span className="shrink-0 mt-0.5">{agent?.icon || '🤖'}</span>
                          <span className="text-zinc-400 leading-relaxed">{msg.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick action buttons */}
              <div className="space-y-2 pt-2">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Quick Actions</p>
                <button
                  onClick={() => setVoiceModeOpen(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-zinc-300 bg-white/[0.03] border border-white/[0.06] hover:bg-cyan-500/5 hover:border-cyan-500/20 hover:text-cyan-400 transition-all"
                >
                  <Mic className="w-4 h-4" />
                  Start Voice
                </button>
                <button
                  onClick={handleNewChat}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-zinc-300 bg-white/[0.03] border border-white/[0.06] hover:bg-cyan-500/5 hover:border-cyan-500/20 hover:text-cyan-400 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  New Chat
                </button>
                <Sheet open={agentsOpen} onOpenChange={setAgentsOpen}>
                  <SheetTrigger asChild>
                    <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-zinc-300 bg-white/[0.03] border border-white/[0.06] hover:bg-cyan-500/5 hover:border-cyan-500/20 hover:text-cyan-400 transition-all">
                      <Bot className="w-4 h-4" />
                      View Agents
                    </button>
                  </SheetTrigger>
                </Sheet>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Voice Mode Overlay */}
      <SyncVoiceMode
        isOpen={voiceModeOpen}
        onClose={() => setVoiceModeOpen(false)}
        onSwitchToChat={() => setVoiceModeOpen(false)}
      />
    </div>
    </SyncPageTransition>
  );
}
