/**
 * SYNC Agent Page
 * Full-page chat interface with interactive animated avatar
 * Uses anime.js for all animations
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Sparkles, User, Bot, RotateCcw, Brain, AlertCircle, RefreshCw, Plus, Download, ExternalLink, Image as ImageIcon, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
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
        className="mt-3 group relative rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-950/40 to-black/40 overflow-hidden cursor-pointer hover:border-blue-400/50 transition-all"
        onClick={() => setIsExpanded(true)}
        style={{ opacity: 0 }}
      >
        {/* Loading skeleton */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="flex items-center gap-2 text-blue-400">
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
        />

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
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-500 text-white"
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
      className="mt-3 group rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-950/30 to-black/30 p-4 cursor-pointer hover:border-blue-400/50 transition-all"
      onClick={handleOpen}
      style={{ opacity: 0 }}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
          <FileText className="w-5 h-5 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate">{title}</div>
          <div className="text-xs text-zinc-500 mt-0.5">Markdown Document</div>
        </div>
        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpen}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
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
  { id: 'orchestrator', name: 'Orchestrator', color: '#ec4899', from: 0.00, to: 0.10, icon: '🎯' },  // pink - multi-agent workflows
  { id: 'learn', name: 'Learn', color: '#06b6d4', from: 0.10, to: 0.20, icon: '📚' },       // cyan
  { id: 'growth', name: 'Growth', color: '#6366f1', from: 0.20, to: 0.30, icon: '📈' },     // indigo
  { id: 'products', name: 'Products', color: '#10b981', from: 0.30, to: 0.40, icon: '📦' }, // emerald
  { id: 'sentinel', name: 'Sentinel', color: '#86EFAC', from: 0.40, to: 0.50, icon: '🛡️' }, // sage
  { id: 'finance', name: 'Finance', color: '#f59e0b', from: 0.50, to: 0.60, icon: '💰' },   // amber
  { id: 'create', name: 'Create', color: '#f43f5e', from: 0.60, to: 0.70, icon: '🎨' },     // rose
  { id: 'tasks', name: 'Tasks', color: '#f97316', from: 0.70, to: 0.80, icon: '✅' },       // orange
  { id: 'research', name: 'Research', color: '#3b82f6', from: 0.80, to: 0.90, icon: '🔍' }, // blue
  { id: 'inbox', name: 'Inbox', color: '#14b8a6', from: 0.90, to: 1.00, icon: '📬' },       // teal - completes the ring
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

function AgentChannelMessage({ message, isLatest }) {
  const messageRef = useRef(null);
  const agent = AGENT_SEGMENTS.find(a => a.id === message.agentId) || AGENT_SEGMENTS.find(a => a.id === 'sync');

  // Animate message entrance
  useEffect(() => {
    if (prefersReducedMotion() || !messageRef.current) return;

    anime({
      targets: messageRef.current,
      translateX: [-10, 0],
      opacity: [0, 1],
      duration: 250,
      easing: 'easeOutQuad',
    });
  }, []);

  return (
    <div
      ref={messageRef}
      className={cn(
        "flex items-start gap-2.5 py-2 px-3 rounded-lg transition-colors",
        isLatest && "bg-white/5"
      )}
      style={{ opacity: 0 }}
    >
      {/* Agent Avatar */}
      <div
        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs border"
        style={{
          backgroundColor: `${agent?.color}20`,
          borderColor: `${agent?.color}40`,
        }}
      >
        {agent?.icon || '🤖'}
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span
            className="text-xs font-medium"
            style={{ color: agent?.color }}
          >
            {agent?.name || 'Agent'}
          </span>
          <span className="text-[10px] text-zinc-600">
            {formatTime(message.ts)}
          </span>
        </div>
        <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
          {message.text}
        </p>
      </div>

      {/* Status indicator for latest */}
      {isLatest && message.status === 'thinking' && (
        <div className="shrink-0">
          <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// AGENT CHANNEL COMPONENT (Slack-like feed)
// ============================================================================

function AgentChannel({ messages, isActive }) {
  const scrollerRef = useRef(null);
  const channelRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Pulse animation when active
  useEffect(() => {
    if (prefersReducedMotion() || !channelRef.current) return;

    if (isActive) {
      anime({
        targets: channelRef.current,
        borderColor: ['rgba(168, 85, 247, 0.1)', 'rgba(168, 85, 247, 0.3)', 'rgba(168, 85, 247, 0.1)'],
        duration: 1500,
        loop: true,
        easing: 'easeInOutSine',
      });
    } else {
      anime.remove(channelRef.current);
    }

    return () => {
      if (channelRef.current) anime.remove(channelRef.current);
    };
  }, [isActive]);

  return (
    <div
      ref={channelRef}
      className="rounded-2xl border border-white/10 bg-black/40 overflow-hidden flex flex-col h-full"
    >
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-white/10 bg-black/20">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-xs font-medium text-white/90">Agent Channel</span>
        </div>
        <span className="text-[10px] text-zinc-600">
          {messages.length} messages
        </span>
      </div>

      {/* Messages */}
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-2">
              <Brain className="w-5 h-5 text-blue-400/50" />
            </div>
            <p className="text-xs text-zinc-600">
              Agent communications will appear here
            </p>
            <p className="text-[10px] text-zinc-700 mt-1">
              Watch SYNC coordinate with specialized agents
            </p>
          </div>
        ) : (
          <div className="py-1">
            {messages.map((msg, idx) => (
              <AgentChannelMessage
                key={msg.id || idx}
                message={msg}
                isLatest={idx === messages.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Active indicator */}
      {isActive && (
        <div className="shrink-0 px-3 py-1.5 border-t border-white/5 bg-blue-500/5">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
            <span className="text-[10px] text-blue-400">Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
}

function OuterRing({ size = 360, mood = 'listening', level = 0.2, activeAgent = null, activeAgentAngle = null }) {
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

        {/* Colored segments - each represents an agent */}
        <g ref={segmentsRef} filter="url(#softGlow)">
          {AGENT_SEGMENTS.filter(s => s.from !== s.to).map((segment) => {
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

function InnerViz({ size = 360, mood = 'listening', level = 0.25, seed = 1, actionEffect = null, activeAgentColor = null, showSuccess = false, activeAgentAngle = null }) {
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

      // Waves
      const amp = 8 + level * 28;
      const bands = 12;
      ctx.globalCompositeOperation = 'lighter';

      for (let i = 0; i < bands; i++) {
        const y0 = (h * 0.28) + (i / (bands - 1)) * (h * 0.44);
        const ph = time * (0.9 + i * 0.06);
        ctx.beginPath();
        for (let x = 0; x <= w; x += 6) {
          const nx = x / w;
          const wobble = Math.sin(nx * Math.PI * 2 + ph) * amp * (0.35 + i / bands);
          const curve = Math.sin((nx * 1.7 + ph * 0.25) * Math.PI * 2) * amp * 0.12;
          const y = y0 + wobble + curve;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(255,255,255,${0.02 + level * 0.06})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Particle physics
      const px = st.pointer.x;
      const py = st.pointer.y;
      const attract = st.pointer.down ? 1.0 : 0.35;
      const speedBoost = mood === 'speaking' ? 1.3 : mood === 'thinking' ? 0.95 : 0.85;

      // Draw links
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < st.particles.length; i++) {
        const a = st.particles[i];
        const dxp = px - a.x;
        const dyp = py - a.y;
        const d2 = dxp * dxp + dyp * dyp;
        const pull = (attract * 0.00018) / (1 + d2 * 0.0009);
        a.vx += dxp * pull;
        a.vy += dyp * pull;

        // Orbit around center
        const dx = a.x - cx;
        const dy = a.y - cy;
        const ang = Math.atan2(dy, dx) + 0.0025 * speedBoost;
        const r = Math.sqrt(dx * dx + dy * dy);
        a.vx += (cx + r * Math.cos(ang) - a.x) * 0.0009;
        a.vy += (cy + r * Math.sin(ang) - a.y) * 0.0009;

        a.x += a.vx * (1.0 + level * 0.9) * speedBoost;
        a.y += a.vy * (1.0 + level * 0.9) * speedBoost;

        // Keep inside lens
        const ddx = a.x - cx;
        const ddy = a.y - cy;
        const rr = Math.sqrt(ddx * ddx + ddy * ddy);
        const maxR = w * 0.34;
        if (rr > maxR) {
          const k = maxR / rr;
          a.x = cx + ddx * k;
          a.y = cy + ddy * k;
          a.vx *= -0.35;
          a.vy *= -0.35;
        }

        // Draw links
        for (let j = i + 1; j < st.particles.length; j += 6) {
          const b = st.particles[j];
          const lx = b.x - a.x;
          const ly = b.y - a.y;
          const dist = Math.sqrt(lx * lx + ly * ly);
          if (dist < 36) {
            const o = (1 - dist / 36) * (0.10 + level * 0.25);
            ctx.strokeStyle = `rgba(255,255,255,${o})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Draw dots
      ctx.globalCompositeOperation = 'lighter';
      for (const p of st.particles) {
        ctx.fillStyle = P.dot;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s * (0.55 + level * 0.25), 0, Math.PI * 2);
        ctx.fill();
      }

      // Scan line
      const scanY = cy + Math.sin(time * (mood === 'speaking' ? 2.8 : 1.8)) * (h * 0.14);
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = mood === 'speaking' ? 'rgba(192,132,252,0.18)' : 'rgba(255,255,255,0.08)';
      ctx.fillRect(0, scanY - 2, w, 4);

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
    </div>
  );
}

// ============================================================================
// AGENT AVATAR COMPONENT (Combines ring + inner viz)
// ============================================================================

function AgentAvatar({ size = 360, agentName = 'SYNC', mood = 'listening', level = 0.25, seed = 1, activeAgent = null, actionEffect = null, showSuccess = false }) {
  const labelRef = useRef(null);
  const containerRef = useRef(null);

  // Get active agent info for display and positioning
  const activeAgentInfo = activeAgent ? AGENT_SEGMENTS.find(a => a.id === activeAgent) : null;
  const activeAgentColor = activeAgentInfo?.color || null;
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
      <OuterRing size={size} mood={mood} level={level} activeAgent={activeAgent} activeAgentAngle={activeAgentAngle} />
      <InnerViz size={size} mood={mood} level={level} seed={seed} actionEffect={actionEffect} activeAgentColor={activeAgentColor} showSuccess={showSuccess} activeAgentAngle={activeAgentAngle} />

      {/* Label */}
      <div className="absolute inset-x-0 bottom-[-10px] flex justify-center">
        <div
          ref={labelRef}
          className="rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs shadow-lg backdrop-blur"
        >
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full animate-pulse"
              style={{
                backgroundColor: actionEffect?.color || activeAgentInfo?.color || (mood === 'speaking' ? '#a855f7' : mood === 'thinking' ? '#f59e0b' : '#22c55e'),
                boxShadow: `0 0 10px ${actionEffect?.color || activeAgentInfo?.color || 'rgba(168,85,247,0.6)'}`,
              }}
            />
            {actionEffect?.icon && (
              <span className="text-sm">{actionEffect.icon}</span>
            )}
            <span className="font-medium text-white">
              {activeAgentInfo ? `${agentName} → ${activeAgentInfo.name}` : agentName}
            </span>
            <span className="text-zinc-500">·</span>
            <span className="text-zinc-400 capitalize">{mood}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CHAT BUBBLE COMPONENT
// ============================================================================

function Bubble({ role, text, ts, index, document }) {
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
      translateY: [20, 0],
      opacity: [0, 1],
      duration: 300,
      delay: 50,
      easing: 'easeOutQuad',
    });
  }, []);

  return (
    <div ref={bubbleRef} className={cn('flex', isUser ? 'justify-end' : 'justify-start')} style={{ opacity: 0 }}>
      <div
        className={cn(
          'max-w-[78%] rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow-sm',
          isUser
            ? 'border-blue-500/20 bg-blue-600/20 text-white'
            : 'border-white/10 bg-black/40 text-white/90'
        )}
      >
        <div className="mb-1.5 flex items-center gap-2 text-[11px] text-zinc-500">
          <span className="inline-flex items-center gap-1.5">
            {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
            <span className="capitalize">{isUser ? 'You' : 'SYNC'}</span>
          </span>
          <span>·</span>
          <span>{formatTime(ts)}</span>
        </div>
        {isUser ? (
          <div className="whitespace-pre-wrap">{text}</div>
        ) : (
          <>
            <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-li:my-1 prose-code:text-blue-400 prose-code:bg-blue-950/30 prose-code:px-1 prose-code:rounded">
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
            {/* Render document card if present */}
            {document && <DocumentCard url={document.url} title={document.title} />}
          </>
        )}
      </div>
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
  const { user } = useUser();
  const [mood, setMood] = useState('listening');
  const [level, setLevel] = useState(0.18);
  const [seed, setSeed] = useState(4);
  const [activeAgent, setActiveAgent] = useState(null);
  const [currentActionEffect, setCurrentActionEffect] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

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
  const scrollerRef = useRef(null);
  const pageRef = useRef(null);

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

    const loop = (t) => {
      const dt = (t - t0) / 1000;
      t0 = t;
      const target = mood === 'speaking' ? 0.55 : mood === 'thinking' ? 0.35 : 0.18;
      setLevel((v) => v + (target - v) * clamp(dt * 3.2, 0, 1));
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mood]);

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

      // Add analyzing message
      await new Promise((r) => setTimeout(r, 400));
      addAgentMessage('sync', 'Analyzing intent and context...', 'thinking');

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

      const data = await response.json();

      // Debug logging - check what's being returned
      console.log('SYNC response:', {
        sessionId: data.sessionId,
        delegatedTo: data.delegatedTo,
        routing: data.routing,
        actionExecuted: data.actionExecuted,
        document: data.document
      });

      if (data.sessionId) {
        console.log('Saving sessionId to localStorage:', data.sessionId);
        setSessionId(data.sessionId);
      }

      // Set active agent if SYNC delegated to one and add agent channel messages
      if (data.delegatedTo) {
        const agentId = data.delegatedTo.toLowerCase();
        setActiveAgent(agentId);

        // Get agent info for nice messages
        const agentInfo = AGENT_SEGMENTS.find(a => a.id === agentId);
        const agentName = agentInfo?.name || data.delegatedTo;

        // More conversational agent exchanges
        const actionType = data.actionExecuted?.type || '';
        const actionReadable = actionType.replace(/_/g, ' ');

        // SYNC asks for help
        addAgentMessage('sync', `@${agentName}, I need your help with this request.`);
        await new Promise((r) => setTimeout(r, 400));

        // Agent responds
        addAgentMessage(agentId, `Hey SYNC! I'm on it. Let me check...`, 'thinking');
        await new Promise((r) => setTimeout(r, 600));

        // If an action was executed, show the work being done
        if (data.actionExecuted?.type) {
          // Trigger action-specific visual effect on avatar
          const effect = getActionEffect(data.actionExecuted.type);
          setCurrentActionEffect(effect);
          
          // Show what action is being performed
          const actionMessages = {
            list_invoices: 'Querying invoice database...',
            create_invoice: 'Creating new invoice entry...',
            search_products: 'Searching product catalog...',
            create_prospect: 'Adding to CRM pipeline...',
            search_prospects: 'Searching contacts database...',
            list_prospects: 'Fetching prospect list...',
            create_task: 'Adding task to your list...',
            list_tasks: 'Pulling up your tasks...',
            get_financial_summary: 'Crunching the numbers...',
            create_expense: 'Logging expense entry...',
            get_pipeline_stats: 'Analyzing pipeline data...',
            generate_image: 'Generating image with AI...',
            web_search: 'Searching the web...',
          };
          const workMessage = actionMessages[actionType] || `Running ${actionReadable}...`;
          addAgentMessage(agentId, workMessage, 'thinking');
          await new Promise((r) => setTimeout(r, 500));

          // Show result summary
          if (data.actionExecuted.success) {
            const resultCount = Array.isArray(data.actionExecuted.result)
              ? data.actionExecuted.result.length
              : null;
            const successMsg = resultCount !== null
              ? `Done! Found ${resultCount} ${resultCount === 1 ? 'result' : 'results'}.`
              : `Done! ${actionReadable} completed successfully.`;
            addAgentMessage(agentId, successMsg);
            // Trigger success celebration
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 100); // Brief trigger
          } else {
            addAgentMessage(agentId, `Hmm, ran into an issue. Let me report back.`);
          }
          await new Promise((r) => setTimeout(r, 300));
        }

        // Agent hands back to SYNC
        addAgentMessage(agentId, `@SYNC Here's what I found. Over to you!`);
        await new Promise((r) => setTimeout(r, 300));

        // SYNC acknowledges
        addAgentMessage('sync', `Thanks ${agentName}! Formatting the response now...`);
      } else if (data.actionExecuted?.type) {
        // Direct action without delegation - also trigger visual effect
        const effect = getActionEffect(data.actionExecuted.type);
        setCurrentActionEffect(effect);
        
        const actionReadable = data.actionExecuted.type.replace(/_/g, ' ');
        addAgentMessage('sync', `I'll handle this myself. Running ${actionReadable}...`, 'thinking');
        await new Promise((r) => setTimeout(r, 400));

        if (data.actionExecuted.success) {
          const resultCount = Array.isArray(data.actionExecuted.result)
            ? data.actionExecuted.result.length
            : null;
          const msg = resultCount !== null
            ? `Got it! Found ${resultCount} ${resultCount === 1 ? 'item' : 'items'}.`
            : `Done! Action completed.`;
          addAgentMessage('sync', msg);
          // Trigger success celebration
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 100);
        } else {
          addAgentMessage('sync', `That didn't work as expected. Let me explain...`);
        }
      } else {
        // Simple response - just a conversation
        addAgentMessage('sync', 'Let me think about that...');
        await new Promise((r) => setTimeout(r, 300));
        addAgentMessage('sync', 'Got it! Here\'s my response...');
      }

      // Transition to speaking
      setMood('speaking');
      await new Promise((r) => setTimeout(r, 300));

      // Add message with optional document attachment
      setMessages((m) => [...m, {
        role: 'assistant',
        text: data.response,
        ts: Date.now(),
        document: data.document || null, // { url, title }
      }]);

      // Final agent channel message
      addAgentMessage('sync', 'All done! Let me know if you need anything else.');

      // Back to listening and clear active agent after a delay
      await new Promise((r) => setTimeout(r, 1500));
      setActiveAgent(null);
      setCurrentActionEffect(null); // Clear action visual effect
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

  return (
    <div ref={pageRef} className="h-screen flex flex-col bg-black text-white overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 z-20 border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-2xl border border-blue-500/30 bg-blue-500/10">
              <Brain className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">SYNC Agent</div>
              <div className="text-xs text-zinc-400">AI Orchestrator</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-400 hover:bg-blue-500/20 transition-colors"
              onClick={handleNewChat}
              title="Start new conversation"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10 transition-colors"
              onClick={() => setSeed((s) => s + 1)}
              title="Refresh inner visual"
            >
              <RotateCcw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Layout - fills remaining height */}
      <div className="flex-1 min-h-0 mx-auto w-full max-w-[1600px] grid grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[480px_1fr]">
        {/* Left: Avatar */}
        <div
          data-animate
          className="flex flex-col rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_30px_80px_rgba(0,0,0,0.55)] overflow-hidden"
          style={{ opacity: 0 }}
        >
          <div className="shrink-0 flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">SYNC</div>
              <div className="text-xs text-zinc-500">AI Orchestrator</div>
            </div>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs capitalize transition-colors',
                mood === 'speaking'
                  ? 'border-blue-400/30 bg-blue-500/10 text-blue-300'
                  : mood === 'thinking'
                  ? 'border-amber-400/30 bg-amber-500/10 text-amber-300'
                  : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
              )}
            >
              <span className={cn(
                'h-1.5 w-1.5 rounded-full',
                mood === 'speaking' ? 'bg-blue-400' : mood === 'thinking' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
              )} />
              {mood}
            </span>
          </div>

          <div className="shrink-0 mt-2 grid place-items-center">
            <AgentAvatar size={320} agentName="SYNC" mood={mood} level={level} seed={seed} activeAgent={activeAgent} actionEffect={currentActionEffect} showSuccess={showSuccess} />
          </div>

          {/* Agent Channel - Live communication feed */}
          <div className="mt-4 flex-1 min-h-0">
            <AgentChannel messages={agentMessages} isActive={isSending} />
          </div>
        </div>

        {/* Right: Chat */}
        <div
          data-animate
          className="flex flex-col min-h-0 rounded-3xl border border-white/10 bg-white/5 shadow-[0_30px_80px_rgba(0,0,0,0.55)]"
          style={{ opacity: 0 }}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
            <div>
              <div className="text-sm font-semibold">Conversation</div>
              <div className="text-xs text-zinc-500">Chat with SYNC</div>
            </div>
            <div className="text-xs text-zinc-500 tabular-nums">{messages.length} messages</div>
          </div>

          <div ref={scrollerRef} className="flex-1 min-h-0 space-y-4 overflow-y-auto px-5 py-5">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-blue-400" />
                </div>
                <h4 className="text-lg font-medium text-white mb-2">How can I help you?</h4>
                <p className="text-sm text-zinc-500 mb-6 max-w-sm">
                  I can help with invoices, prospects, compliance, learning, and more.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInput(suggestion.action);
                        setTimeout(() => send(), 100);
                      }}
                      className="px-3.5 py-2 text-xs rounded-xl border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((m, idx) => (
                  <Bubble key={idx} role={m.role} text={m.text} ts={m.ts} index={idx} document={m.document} />
                ))}

                {isSending && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <span className="inline-flex h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '600ms' }} />
                          <span className="inline-flex h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms', animationDuration: '600ms' }} />
                          <span className="inline-flex h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms', animationDuration: '600ms' }} />
                        </div>
                        <span className="text-zinc-400">SYNC is {mood === 'thinking' ? 'thinking' : 'responding'}…</span>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-red-400 font-medium">Something went wrong</p>
                      <p className="text-xs text-red-400/70 mt-1">{error}</p>
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
              </>
            )}
          </div>

          <div className="border-t border-white/10 px-5 py-4">
            <div className="flex items-end gap-3">
              <div className="flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Message SYNC…"
                  rows={2}
                  disabled={isSending}
                  className="w-full resize-none bg-transparent text-sm text-white/90 outline-none placeholder:text-zinc-500 disabled:opacity-50"
                />
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Enter to send · Shift+Enter for newline</span>
                  <span className="tabular-nums">{input.length}</span>
                </div>
              </div>

              <button
                onClick={send}
                disabled={isSending || !input.trim()}
                className={cn(
                  'inline-flex h-[54px] w-[54px] items-center justify-center rounded-2xl border transition-all',
                  isSending || !input.trim()
                    ? 'cursor-not-allowed border-white/10 bg-white/5 text-white/30'
                    : 'border-blue-500/30 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 hover:scale-105 active:scale-95',
                  input.trim() && !isSending && 'shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                )}
                title="Send (Enter)"
              >
                <Send className={cn("h-5 w-5 transition-transform", input.trim() && !isSending && "animate-pulse")} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-60">
        <div className="absolute left-[-20%] top-[-30%] h-[520px] w-[520px] rounded-full bg-blue-900/20 blur-3xl" />
        <div className="absolute right-[-25%] top-[10%] h-[620px] w-[620px] rounded-full bg-sky-900/15 blur-3xl" />
        <div className="absolute bottom-[-35%] left-[10%] h-[640px] w-[640px] rounded-full bg-blue-950/20 blur-3xl" />
      </div>
    </div>
  );
}
