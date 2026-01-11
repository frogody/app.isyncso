/**
 * SYNC Agent Page - Unified Hub
 * Full-screen immersive experience with grey/tech/robotic aesthetic
 * Three-column layout: Agents | Main (Avatar + Chat) | Activity
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import {
  Send, Sparkles, User, Bot, RotateCcw, Brain, AlertCircle, RefreshCw, Plus, Download,
  ExternalLink, Image as ImageIcon, ChevronLeft, ChevronRight, X, Plug, Zap, BarChart3,
  Settings, Activity, Clock, Wifi, WifiOff, GraduationCap, TrendingUp, Shield, DollarSign,
  Palette, Package, ListTodo, MessageSquare, Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/components/context/UserContext';
import anime from '@/lib/anime-wrapper';
import { prefersReducedMotion } from '@/lib/animations';
import { useLocalStorage } from '@/components/hooks/useLocalStorage';
import { createPageUrl } from '@/utils';

// ============================================================================
// THEME: Grey/Tech/Robotic Design System
// ============================================================================

const SYNC_THEME = {
  bg: {
    deep: '#050508',
    primary: '#0a0a0f',
    secondary: '#12121a',
    tertiary: '#1a1a24',
  },
  border: {
    subtle: '#2a2a35',
    active: '#3a3a48',
  },
  accent: {
    cyan: '#00ffff',
    cyanDim: '#00cccc',
    green: '#00ff88',
    amber: '#ffaa00',
    red: '#ff4455',
  },
  text: {
    primary: '#e0e0e8',
    dim: '#888890',
    muted: '#555560',
  }
};

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

function formatTimeAgo(date) {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// ============================================================================
// IMAGE URL DETECTION AND EXTRACTION
// ============================================================================

const IMAGE_URL_PATTERNS = [
  /https?:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/(?:public|sign)\/[^\s"'<>]+\.(?:png|jpg|jpeg|gif|webp|svg)/gi,
  /https?:\/\/[^\s"'<>]+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\s"'<>]*)?/gi,
  /https?:\/\/[^\s"'<>]*(?:together|replicate|openai|stability|flux)[^\s"'<>]*\.(?:png|jpg|jpeg|gif|webp)/gi,
];

function extractImageUrls(text) {
  const matches = [];
  const seen = new Set();
  for (const pattern of IMAGE_URL_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const url = match[0];
      if (!seen.has(url)) {
        seen.add(url);
        matches.push({ url, startIndex: match.index, endIndex: match.index + url.length });
      }
    }
  }
  return matches.sort((a, b) => a.startIndex - b.startIndex);
}

function parseTextWithImages(text) {
  const images = extractImageUrls(text);
  if (images.length === 0) return [{ type: 'text', content: text }];
  const parts = [];
  let lastIndex = 0;
  for (const img of images) {
    if (img.startIndex > lastIndex) {
      const textBefore = text.slice(lastIndex, img.startIndex).trim();
      if (textBefore) parts.push({ type: 'text', content: textBefore });
    }
    parts.push({ type: 'image', url: img.url });
    lastIndex = img.endIndex;
  }
  if (lastIndex < text.length) {
    const textAfter = text.slice(lastIndex).trim();
    if (textAfter) parts.push({ type: 'text', content: textAfter });
  }
  return parts;
}

// ============================================================================
// AGENT CONFIGURATION
// ============================================================================

const AGENT_MODES = [
  { id: 'sync', name: 'SYNC', icon: Brain, color: '#00ffff', description: 'AI Orchestrator', actions: 51 },
  { id: 'finance', name: 'Finance', icon: DollarSign, color: '#ffaa00', description: 'Invoices & Expenses', actions: 8 },
  { id: 'growth', name: 'Growth', icon: TrendingUp, color: '#6366f1', description: 'CRM & Pipeline', actions: 9 },
  { id: 'learn', name: 'Learn', icon: GraduationCap, color: '#00cccc', description: 'Courses & Skills', actions: 4 },
  { id: 'sentinel', name: 'Sentinel', icon: Shield, color: '#86EFAC', description: 'AI Compliance', actions: 3 },
  { id: 'products', name: 'Products', icon: Package, color: '#10b981', description: 'Inventory', actions: 6 },
  { id: 'tasks', name: 'Tasks', icon: ListTodo, color: '#f97316', description: 'Task Management', actions: 8 },
  { id: 'create', name: 'Create', icon: Palette, color: '#f43f5e', description: 'AI Images', actions: 2 },
];

// Outer ring segments for avatar
const AGENT_SEGMENTS = [
  { id: 'orchestrator', name: 'Orchestrator', color: '#00ffff', from: 0.00, to: 0.10 },
  { id: 'learn', name: 'Learn', color: '#00cccc', from: 0.12, to: 0.22 },
  { id: 'growth', name: 'Growth', color: '#6366f1', from: 0.24, to: 0.34 },
  { id: 'products', name: 'Products', color: '#10b981', from: 0.36, to: 0.46 },
  { id: 'sentinel', name: 'Sentinel', color: '#86EFAC', from: 0.48, to: 0.58 },
  { id: 'finance', name: 'Finance', color: '#f59e0b', from: 0.60, to: 0.70 },
  { id: 'create', name: 'Create', color: '#f43f5e', from: 0.72, to: 0.82 },
  { id: 'tasks', name: 'Tasks', color: '#f97316', from: 0.84, to: 0.94 },
];

// ============================================================================
// IMAGE CARD COMPONENT
// ============================================================================

function ImageCard({ url }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDownload = async (e) => {
    e.stopPropagation();
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = url.split('/').pop()?.split('?')[0] || `sync-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

  if (hasError) {
    return (
      <div className="mt-3 rounded-lg border border-red-500/20 bg-red-950/20 p-4">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">Failed to load image</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="mt-3 group relative rounded-lg border border-[#2a2a35] bg-[#12121a] overflow-hidden cursor-pointer hover:border-[#00ffff]/30 transition-all"
        onClick={() => setIsExpanded(true)}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]/80">
            <ImageIcon className="h-5 w-5 animate-pulse text-[#00ffff]" />
          </div>
        )}
        <img
          src={url}
          alt="Generated"
          className={cn("w-full max-h-[300px] object-contain transition-opacity", isLoading ? "opacity-0" : "opacity-100")}
          onLoad={() => setIsLoading(false)}
          onError={() => { setIsLoading(false); setHasError(true); }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
          <Button size="sm" variant="ghost" className="h-7 bg-white/10 text-white text-xs" onClick={handleDownload}>
            <Download className="h-3 w-3 mr-1" /> Download
          </Button>
        </div>
      </div>
      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 cursor-zoom-out" onClick={() => setIsExpanded(false)}>
          <img src={url} alt="Generated" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
        </div>
      )}
    </>
  );
}

// ============================================================================
// OUTER RING COMPONENT (Tech-styled)
// ============================================================================

function OuterRing({ size = 280, mood = 'listening', level = 0.2, activeAgent = null }) {
  const segmentsRef = useRef(null);
  const r = size / 2;
  const pad = 8;
  const ringR = r - pad;
  const glow = mood === 'speaking' ? 1.0 : mood === 'thinking' ? 0.7 : 0.45;

  useEffect(() => {
    if (prefersReducedMotion() || !segmentsRef.current) return;
    const paths = segmentsRef.current.querySelectorAll('path');
    anime.remove(paths);

    if (activeAgent) {
      const activePath = segmentsRef.current.querySelector(`path[data-agent="${activeAgent}"]`);
      const inactivePaths = Array.from(paths).filter(p => p.dataset.agent !== activeAgent);
      if (inactivePaths.length > 0) {
        anime({ targets: inactivePaths, strokeWidth: 6, opacity: 0.25, duration: 300, easing: 'easeOutQuad' });
      }
      if (activePath) {
        anime({ targets: activePath, strokeWidth: [10, 14, 10], opacity: [0.9, 1, 0.9], duration: 600, loop: true, easing: 'easeInOutSine' });
      }
    } else {
      anime({
        targets: paths,
        strokeWidth: mood === 'speaking' ? [8, 10, 8] : [8, 9, 8],
        opacity: [0.6 + glow * 0.2, 0.75 + glow * 0.15, 0.6 + glow * 0.2],
        duration: mood === 'speaking' ? 600 : 1200,
        loop: true,
        easing: 'easeInOutSine',
        delay: anime.stagger(80),
      });
    }
    return () => anime.remove(paths);
  }, [mood, glow, activeAgent]);

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
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <filter id="techGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={4} result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Base ring with tech pattern */}
        <circle cx={r} cy={r} r={ringR} fill="none" stroke="#1a1a24" strokeWidth={14} />

        {/* Grid ticks */}
        <g opacity={0.3}>
          {Array.from({ length: 60 }).map((_, i) => {
            const a = i / 60;
            const p0 = polar(r, r, ringR - 12, a);
            const p1 = polar(r, r, ringR - (i % 5 === 0 ? 4 : 8), a);
            return <line key={i} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke="#00ffff" strokeWidth={i % 5 === 0 ? 1.5 : 0.5} />;
          })}
        </g>

        {/* Colored segments */}
        <g ref={segmentsRef} filter="url(#techGlow)">
          {AGENT_SEGMENTS.map((seg) => (
            <path
              key={seg.id}
              data-agent={seg.id}
              d={arcPath(r, r, ringR, seg.from, seg.to)}
              fill="none"
              stroke={seg.color}
              strokeWidth={8}
              strokeLinecap="round"
              opacity={0.7}
            />
          ))}
        </g>

        {/* Inner rim */}
        <circle cx={r} cy={r} r={ringR - 20} fill="none" stroke="#2a2a35" strokeWidth={1} />
        <circle cx={r} cy={r} r={ringR - 35} fill="rgba(0,255,255,0.02)" stroke="#00ffff" strokeWidth={0.5} opacity={0.3} />
      </svg>

      {/* Outer glow */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full transition-all duration-500"
        style={{ boxShadow: `0 0 ${20 + level * 15}px rgba(0,255,255,${0.1 + glow * 0.1})` }}
      />
    </div>
  );
}

// ============================================================================
// INNER VISUALIZATION (Canvas-based particles)
// ============================================================================

function InnerViz({ size = 280, mood = 'listening', level = 0.25, seed = 1 }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const stateRef = useRef({ w: size, h: size, particles: [], seed, pointer: { x: size / 2, y: size / 2, down: false }, time: 0 });

  useEffect(() => {
    const st = stateRef.current;
    st.w = size; st.h = size; st.seed = seed;
    const N = 70;
    const rand = (a) => { const x = Math.sin((st.seed + a) * 9999) * 10000; return x - Math.floor(x); };
    st.particles = Array.from({ length: N }).map((_, i) => {
      const rr = (size * 0.30) * Math.sqrt(rand(i + 1));
      const ang = rand(i + 7) * Math.PI * 2;
      return { x: size / 2 + rr * Math.cos(ang), y: size / 2 + rr * Math.sin(ang), vx: (rand(i + 11) - 0.5) * 0.3, vy: (rand(i + 17) - 0.5) * 0.3, s: 1 + rand(i + 23) * 2.5, p: rand(i + 31) };
    });
  }, [size, seed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const st = stateRef.current;
    let running = true;

    const render = () => {
      if (!running) return;
      st.time += 0.016;
      const { w, h } = st;
      const cx = w / 2, cy = h / 2;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== w * dpr) {
        canvas.width = w * dpr; canvas.height = h * dpr;
        canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, w * 0.32, 0, Math.PI * 2); ctx.clip();

      // Gradient background - cyan tones for tech feel
      const g = ctx.createRadialGradient(cx - w * 0.1, cy - h * 0.1, w * 0.05, cx, cy, w * 0.35);
      g.addColorStop(0, mood === 'speaking' ? 'rgba(0,255,255,0.15)' : 'rgba(0,255,255,0.08)');
      g.addColorStop(0.5, 'rgba(0,200,200,0.05)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

      // Waves
      const amp = 6 + level * 20;
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 8; i++) {
        const y0 = h * 0.3 + (i / 7) * (h * 0.4);
        ctx.beginPath();
        for (let x = 0; x <= w; x += 5) {
          const nx = x / w;
          const wobble = Math.sin(nx * Math.PI * 2 + st.time * (0.8 + i * 0.05)) * amp * (0.3 + i / 8);
          const y = y0 + wobble;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(0,255,255,${0.03 + level * 0.05})`;
        ctx.lineWidth = 1; ctx.stroke();
      }

      // Particles
      const speedBoost = mood === 'speaking' ? 1.3 : mood === 'thinking' ? 0.95 : 0.85;
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < st.particles.length; i++) {
        const a = st.particles[i];
        const dx = a.x - cx, dy = a.y - cy;
        const ang = Math.atan2(dy, dx) + 0.002 * speedBoost;
        const rr = Math.sqrt(dx * dx + dy * dy);
        a.vx += (cx + rr * Math.cos(ang) - a.x) * 0.0008;
        a.vy += (cy + rr * Math.sin(ang) - a.y) * 0.0008;
        a.x += a.vx * (1 + level * 0.8) * speedBoost;
        a.y += a.vy * (1 + level * 0.8) * speedBoost;
        const ddx = a.x - cx, ddy = a.y - cy, dist = Math.sqrt(ddx * ddx + ddy * ddy);
        if (dist > w * 0.32) { const k = (w * 0.32) / dist; a.x = cx + ddx * k; a.y = cy + ddy * k; a.vx *= -0.3; a.vy *= -0.3; }

        // Links
        for (let j = i + 1; j < st.particles.length; j += 5) {
          const b = st.particles[j];
          const lx = b.x - a.x, ly = b.y - a.y, ld = Math.sqrt(lx * lx + ly * ly);
          if (ld < 30) {
            ctx.strokeStyle = `rgba(0,255,255,${(1 - ld / 30) * (0.1 + level * 0.2)})`;
            ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      ctx.globalCompositeOperation = 'lighter';
      for (const p of st.particles) {
        ctx.fillStyle = 'rgba(0,255,255,0.2)';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (0.5 + level * 0.2), 0, Math.PI * 2); ctx.fill();
      }

      // Scan line
      const scanY = cy + Math.sin(st.time * (mood === 'speaking' ? 2.5 : 1.5)) * (h * 0.12);
      ctx.fillStyle = 'rgba(0,255,255,0.1)'; ctx.fillRect(0, scanY - 1, w, 2);

      ctx.restore();
      animationRef.current = requestAnimationFrame(render);
    };
    animationRef.current = requestAnimationFrame(render);
    return () => { running = false; if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [mood, level]);

  return (
    <div className="absolute inset-0 grid place-items-center">
      <canvas ref={canvasRef} className="rounded-full" style={{ width: size, height: size }} />
    </div>
  );
}

// ============================================================================
// AGENT AVATAR (Combined)
// ============================================================================

function AgentAvatar({ size = 280, mood = 'listening', level = 0.25, seed = 1, activeAgent = null }) {
  const activeInfo = activeAgent ? AGENT_SEGMENTS.find(a => a.id === activeAgent) : null;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <OuterRing size={size} mood={mood} level={level} activeAgent={activeAgent} />
      <InnerViz size={size} mood={mood} level={level} seed={seed} />
      <div className="absolute inset-x-0 bottom-[-8px] flex justify-center">
        <div className="rounded-full border border-[#2a2a35] bg-[#0a0a0f]/90 px-3 py-1.5 text-xs backdrop-blur">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: activeInfo?.color || '#00ffff', boxShadow: `0 0 8px ${activeInfo?.color || '#00ffff'}` }} />
            <span className="font-mono text-[#e0e0e8]">{activeInfo ? activeInfo.name : 'SYNC'}</span>
            <span className="text-[#555560]">•</span>
            <span className="text-[#888890] capitalize">{mood}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CHAT BUBBLE
// ============================================================================

function Bubble({ role, text, ts }) {
  const isUser = role === 'user';
  const contentParts = useMemo(() => isUser ? null : parseTextWithImages(text), [text, isUser]);

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn(
        'max-w-[85%] rounded-xl border px-4 py-3 text-sm',
        isUser
          ? 'border-[#00ffff]/20 bg-[#00ffff]/5 text-[#e0e0e8]'
          : 'border-[#2a2a35] bg-[#12121a] text-[#e0e0e8]'
      )}>
        <div className="mb-1 flex items-center gap-2 text-[10px] text-[#555560] font-mono uppercase tracking-wider">
          {isUser ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
          <span>{isUser ? 'You' : 'SYNC'}</span>
          <span>•</span>
          <span>{formatTime(ts)}</span>
        </div>
        {isUser ? (
          <div className="whitespace-pre-wrap">{text}</div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-code:text-[#00ffff] prose-code:bg-[#00ffff]/10 prose-code:px-1 prose-code:rounded">
            {contentParts.map((part, i) => (
              part.type === 'image' ? <ImageCard key={`img-${i}`} url={part.url} /> : <ReactMarkdown key={`text-${i}`}>{part.content}</ReactMarkdown>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// AGENTS PANEL (Left)
// ============================================================================

function AgentsPanel({ isCollapsed, onToggle, selectedAgent, onSelectAgent }) {
  return (
    <div className={cn(
      "flex flex-col bg-[#0a0a0f] border-r border-[#2a2a35] transition-all duration-300",
      isCollapsed ? "w-[60px]" : "w-[200px]"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[#2a2a35]">
        {!isCollapsed && <span className="text-[10px] font-mono uppercase tracking-widest text-[#00ffff]">Agents</span>}
        <button onClick={onToggle} className="p-1.5 rounded hover:bg-[#1a1a24] text-[#888890] hover:text-[#e0e0e8] transition-colors">
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Agent List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {AGENT_MODES.map((agent) => {
          const Icon = agent.icon;
          const isActive = selectedAgent === agent.id;
          return (
            <button
              key={agent.id}
              onClick={() => onSelectAgent(agent.id)}
              className={cn(
                "w-full flex items-center gap-3 p-2.5 rounded-lg transition-all group",
                isActive
                  ? "bg-[#00ffff]/10 border border-[#00ffff]/30"
                  : "hover:bg-[#1a1a24] border border-transparent"
              )}
              title={agent.name}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                isActive ? "bg-[#00ffff]/20" : "bg-[#1a1a24] group-hover:bg-[#2a2a35]"
              )}>
                <Icon className="w-4 h-4" style={{ color: agent.color }} />
              </div>
              {!isCollapsed && (
                <div className="flex-1 text-left min-w-0">
                  <div className="text-xs font-medium text-[#e0e0e8] truncate">{agent.name}</div>
                  <div className="text-[10px] text-[#555560] truncate">{agent.actions} actions</div>
                </div>
              )}
              {!isCollapsed && isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-[#00ffff] animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// ACTIVITY PANEL (Right)
// ============================================================================

function ActivityPanel({ isCollapsed, onToggle }) {
  const [activities] = useState([
    { id: 1, type: 'action', text: 'Invoice #1042 created', time: Date.now() - 120000, status: 'success' },
    { id: 2, type: 'query', text: 'Searched products', time: Date.now() - 300000, status: 'success' },
    { id: 3, type: 'action', text: 'Task assigned', time: Date.now() - 600000, status: 'success' },
    { id: 4, type: 'integration', text: 'Gmail connected', time: Date.now() - 1200000, status: 'success' },
    { id: 5, type: 'query', text: 'Pipeline analytics', time: Date.now() - 1800000, status: 'success' },
  ]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return '#00ff88';
      case 'pending': return '#ffaa00';
      case 'error': return '#ff4455';
      default: return '#888890';
    }
  };

  return (
    <div className={cn(
      "flex flex-col bg-[#0a0a0f] border-l border-[#2a2a35] transition-all duration-300",
      isCollapsed ? "w-[60px]" : "w-[220px]"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[#2a2a35]">
        <button onClick={onToggle} className="p-1.5 rounded hover:bg-[#1a1a24] text-[#888890] hover:text-[#e0e0e8] transition-colors">
          {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        {!isCollapsed && <span className="text-[10px] font-mono uppercase tracking-widest text-[#00ffff]">Activity</span>}
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2 pt-2">
            {activities.slice(0, 5).map((a) => (
              <div
                key={a.id}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getStatusColor(a.status) }}
                title={a.text}
              />
            ))}
          </div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="p-2.5 rounded-lg bg-[#12121a] border border-[#2a2a35]/50 hover:border-[#2a2a35]">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: getStatusColor(activity.status) }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-[#e0e0e8] truncate">{activity.text}</div>
                  <div className="text-[10px] text-[#555560] font-mono">{formatTimeAgo(activity.time)}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Status */}
      {!isCollapsed && (
        <div className="p-3 border-t border-[#2a2a35]">
          <div className="flex items-center gap-2 text-[10px]">
            <Wifi className="w-3 h-3 text-[#00ff88]" />
            <span className="text-[#888890] font-mono">ONLINE</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// FOOTER BAR
// ============================================================================

function SyncFooter({ onNavigate }) {
  const navigate = useNavigate();
  const actions = [
    { id: 'integrations', icon: Plug, label: 'Integrations', path: '/Integrations' },
    { id: 'actions', icon: Zap, label: 'Actions', path: '/Agents' },
    { id: 'stats', icon: BarChart3, label: 'Stats', path: '/Activity' },
    { id: 'settings', icon: Settings, label: 'Settings', path: '/Settings' },
  ];

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-2 bg-[#0a0a0f] border-t border-[#2a2a35]">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            onClick={() => navigate(action.path)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono text-[#888890] hover:text-[#e0e0e8] hover:bg-[#1a1a24] border border-transparent hover:border-[#2a2a35] transition-all"
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{action.label}</span>
          </button>
        );
      })}
      <div className="h-4 w-px bg-[#2a2a35] mx-2" />
      <button
        onClick={() => navigate('/Dashboard')}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono text-[#555560] hover:text-[#e0e0e8] hover:bg-[#1a1a24] transition-all"
      >
        <Home className="w-4 h-4" />
        <span className="hidden sm:inline">Exit</span>
      </button>
    </div>
  );
}

// ============================================================================
// MAIN SYNC AGENT PAGE
// ============================================================================

const DEFAULT_MESSAGES = [
  { role: 'assistant', text: "SYNC online. I'm your AI orchestrator — I route commands to Finance, Growth, Products, Tasks, and more.\n\nTry: \"Create an invoice\" or \"Show my pipeline stats\"", ts: Date.now() - 60000 },
];

export default function SyncAgent() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [mood, setMood] = useState('listening');
  const [level, setLevel] = useState(0.18);
  const [seed, setSeed] = useState(4);
  const [activeAgent, setActiveAgent] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState('sync');

  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  const [sessionId, setSessionId] = useLocalStorage('sync_agent_session_id', null);
  const [cachedMessages, setCachedMessages] = useLocalStorage('sync_agent_messages', []);
  const [messages, setMessages] = useState(() => cachedMessages?.length > 0 ? cachedMessages : DEFAULT_MESSAGES);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const scrollerRef = useRef(null);

  useEffect(() => {
    if (messages.length > 0 && messages !== DEFAULT_MESSAGES) {
      setCachedMessages(messages.slice(-50));
    }
  }, [messages]);

  const handleNewChat = useCallback(() => {
    setMessages(DEFAULT_MESSAGES);
    setSessionId(null);
    setCachedMessages([]);
    setError(null);
    setActiveAgent(null);
    setMood('listening');
    setInput('');
  }, [setSessionId, setCachedMessages]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    let raf = 0, t0 = performance.now();
    const loop = (t) => {
      const dt = (t - t0) / 1000; t0 = t;
      const target = mood === 'speaking' ? 0.55 : mood === 'thinking' ? 0.35 : 0.18;
      setLevel((v) => v + (target - v) * clamp(dt * 3.2, 0, 1));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mood]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || isSending) return;
    setError(null);
    setIsSending(true);
    setMood('thinking');
    setMessages((m) => [...m, { role: 'user', text, ts: Date.now() }]);
    setInput('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sfxpmzicgpaxfntqleig.supabase.co';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeHBtemljZ3BheGZudHFsZWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDY0NjIsImV4cCI6MjA4MjE4MjQ2Mn0.337ohi8A4zu_6Hl1LpcPaWP8UkI5E4Om7ZgeU9_A8t4';
      const authToken = session?.access_token || supabaseAnonKey;

      const response = await fetch(`${supabaseUrl}/functions/v1/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}`, 'apikey': supabaseAnonKey },
        body: JSON.stringify({ message: text, sessionId, context: { userId: session?.user?.id, companyId: user?.company_id } }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const data = await response.json();
      if (data.sessionId) setSessionId(data.sessionId);
      if (data.delegatedTo) setActiveAgent(data.delegatedTo.toLowerCase());

      setMood('speaking');
      await new Promise((r) => setTimeout(r, 300));
      setMessages((m) => [...m, { role: 'assistant', text: data.response, ts: Date.now() }]);
      await new Promise((r) => setTimeout(r, 1500));
      setActiveAgent(null);
      setMood('listening');
    } catch (err) {
      console.error('SYNC error:', err);
      setError(err.message || 'Failed to send message');
      setActiveAgent(null);
      setMood('listening');
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, sessionId, user?.company_id]);

  const suggestions = [
    { label: 'Create invoice', action: 'Create an invoice for a client' },
    { label: 'Pipeline stats', action: 'Show my pipeline statistics' },
    { label: 'Weekly review', action: 'Give me a weekly business review' },
    { label: 'Find prospects', action: 'Find prospects in the SaaS industry' },
  ];

  return (
    <div className="h-screen flex flex-col bg-[#050508] text-[#e0e0e8] overflow-hidden">
      {/* Tech grid background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{
        backgroundImage: `radial-gradient(#00ffff 1px, transparent 1px)`,
        backgroundSize: '30px 30px'
      }} />

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-[#0a0a0f]/80 border-b border-[#2a2a35] backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#00ffff]/10 border border-[#00ffff]/30 flex items-center justify-center">
            <Brain className="w-4 h-4 text-[#00ffff]" />
          </div>
          <div>
            <div className="text-sm font-mono font-semibold tracking-wide">SYNC</div>
            <div className="text-[10px] text-[#555560] font-mono">AI Orchestrator • v2.0</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
            <span className="text-[10px] font-mono text-[#00ff88]">ONLINE</span>
          </div>
          <button
            onClick={handleNewChat}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono bg-[#1a1a24] border border-[#2a2a35] text-[#888890] hover:text-[#e0e0e8] hover:border-[#00ffff]/30 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Agents Panel */}
        <AgentsPanel
          isCollapsed={leftCollapsed}
          onToggle={() => setLeftCollapsed(!leftCollapsed)}
          selectedAgent={selectedAgent}
          onSelectAgent={setSelectedAgent}
        />

        {/* Center: Avatar + Chat */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#050508]">
          {/* Avatar Section */}
          <div className="shrink-0 flex items-center justify-center py-6 border-b border-[#2a2a35]/50">
            <AgentAvatar size={220} mood={mood} level={level} seed={seed} activeAgent={activeAgent} />
          </div>

          {/* Chat Section */}
          <div className="flex-1 flex flex-col min-h-0">
            <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <Sparkles className="w-10 h-10 text-[#00ffff]/50 mb-4" />
                  <h4 className="text-base font-mono text-[#e0e0e8] mb-2">Ready for commands</h4>
                  <div className="flex flex-wrap gap-2 justify-center mt-4">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => { setInput(s.action); setTimeout(send, 100); }}
                        className="px-3 py-1.5 text-xs font-mono rounded-lg bg-[#12121a] border border-[#2a2a35] text-[#888890] hover:text-[#00ffff] hover:border-[#00ffff]/30 transition-all"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((m, i) => <Bubble key={i} role={m.role} text={m.text} ts={m.ts} />)}
                  {isSending && (
                    <div className="flex justify-start">
                      <div className="rounded-xl border border-[#2a2a35] bg-[#12121a] px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#00ffff] animate-pulse" />
                          <span className="text-[#888890] font-mono text-xs">Processing...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {error && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-[#ff4455]/10 border border-[#ff4455]/30">
                      <AlertCircle className="w-4 h-4 text-[#ff4455]" />
                      <span className="text-xs text-[#ff4455]">{error}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Input */}
            <div className="shrink-0 p-4 border-t border-[#2a2a35]">
              <div className="flex items-end gap-3">
                <div className="flex-1 rounded-xl border border-[#2a2a35] bg-[#12121a] px-3 py-2 focus-within:border-[#00ffff]/50 transition-colors">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder="Enter command..."
                    rows={2}
                    disabled={isSending}
                    className="w-full resize-none bg-transparent text-sm text-[#e0e0e8] outline-none placeholder:text-[#555560] disabled:opacity-50 font-mono"
                  />
                  <div className="mt-1 flex items-center justify-between text-[10px] text-[#555560] font-mono">
                    <span>Enter to send</span>
                    <span>{input.length}</span>
                  </div>
                </div>
                <button
                  onClick={send}
                  disabled={isSending || !input.trim()}
                  className={cn(
                    "h-[52px] w-[52px] rounded-xl border flex items-center justify-center transition-all",
                    isSending || !input.trim()
                      ? "border-[#2a2a35] bg-[#1a1a24] text-[#555560] cursor-not-allowed"
                      : "border-[#00ffff]/30 bg-[#00ffff]/10 text-[#00ffff] hover:bg-[#00ffff]/20"
                  )}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Activity Panel */}
        <ActivityPanel
          isCollapsed={rightCollapsed}
          onToggle={() => setRightCollapsed(!rightCollapsed)}
        />
      </div>

      {/* Footer */}
      <SyncFooter />
    </div>
  );
}
