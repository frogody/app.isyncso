/**
 * DemoSync – Exact replica of SyncAgent.jsx with mock data
 * Layout: Full-page chat interface with animated avatar
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, User, Bot, RotateCcw, Plus, Sun, Mic } from 'lucide-react';

// ============================================================================
// HELPERS
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
// AGENT SEGMENTS (matches real SyncAgent)
// ============================================================================

const AGENT_SEGMENTS = [
  { id: 'orchestrator', name: 'Orchestrator', color: '#ec4899', from: 0.01, to: 0.09, icon: '🎯' },
  { id: 'learn', name: 'Learn', color: '#06b6d4', from: 0.11, to: 0.19, icon: '📚' },
  { id: 'growth', name: 'Growth', color: '#6366f1', from: 0.21, to: 0.29, icon: '📈' },
  { id: 'products', name: 'Products', color: '#10b981', from: 0.31, to: 0.39, icon: '📦' },
  { id: 'sentinel', name: 'Sentinel', color: '#86EFAC', from: 0.41, to: 0.49, icon: '🛡️' },
  { id: 'finance', name: 'Finance', color: '#f59e0b', from: 0.51, to: 0.59, icon: '💰' },
  { id: 'create', name: 'Create', color: '#f43f5e', from: 0.61, to: 0.69, icon: '🎨' },
  { id: 'tasks', name: 'Tasks', color: '#f97316', from: 0.71, to: 0.79, icon: '✅' },
  { id: 'research', name: 'Research', color: '#3b82f6', from: 0.81, to: 0.89, icon: '🔍' },
  { id: 'inbox', name: 'Inbox', color: '#14b8a6', from: 0.91, to: 0.99, icon: '📬' },
  { id: 'sync', name: 'SYNC', color: '#a855f7', from: 0, to: 0, icon: '🧠' },
  { id: 'team', name: 'Team', color: '#8b5cf6', from: 0, to: 0, icon: '👥' },
  { id: 'composio', name: 'Integrations', color: '#22c55e', from: 0, to: 0, icon: '🔗' },
];

// ============================================================================
// OUTER RING COMPONENT (SVG-based, matches real)
// ============================================================================

function OuterRing({ size = 260, mood = 'listening', level = 0.2, activeAgent = null }) {
  const [hoveredAgent, setHoveredAgent] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const r = size / 2;
  const pad = 10;
  const ringR = r - pad;
  const bezelR = ringR - 28;

  const glow = mood === 'speaking' ? 1.0 : mood === 'thinking' ? 0.7 : 0.45;
  const pulse = clamp(0.35 + level * 0.9, 0.35, 1.2);

  const activeAgentInfo = activeAgent ? AGENT_SEGMENTS.find(a => a.id === activeAgent) : null;
  const activeAgentAngle = activeAgentInfo && activeAgentInfo.from !== activeAgentInfo.to
    ? (activeAgentInfo.from + activeAgentInfo.to) / 2
    : null;

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

  const bezelRotation = activeAgentAngle !== null ? activeAgentAngle * 360 - 90 : 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
        <defs>
          <radialGradient id="demo-glass" cx="30%" cy="25%" r="70%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
            <stop offset="35%" stopColor="rgba(255,255,255,0.08)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <filter id="demo-softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={6} result="b" />
            <feColorMatrix in="b" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.9 0" result="c" />
            <feMerge>
              <feMergeNode in="c" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="demo-ringBase" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
          </linearGradient>
        </defs>

        {/* Base ring */}
        <circle cx={r} cy={r} r={ringR} fill="none" stroke="url(#demo-ringBase)" strokeWidth={18} opacity={0.9} />

        {/* Ticks */}
        <g opacity={0.55}>
          {Array.from({ length: 120 }).map((_, i) => {
            const a = i / 120;
            const p0 = polar(r, r, ringR - 16, a);
            const p1 = polar(r, r, ringR - (i % 5 === 0 ? 6 : 10), a);
            return (
              <line key={i} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke="rgba(255,255,255,0.12)" strokeWidth={i % 5 === 0 ? 2 : 1} />
            );
          })}
        </g>

        {/* Colored segments */}
        <g filter="url(#demo-softGlow)">
          {AGENT_SEGMENTS.filter(s => s.from !== s.to).map((segment) => {
            const midAngle = (segment.from + segment.to) / 2;
            const midPoint = polar(r, r, ringR, midAngle);
            return (
              <path
                key={segment.id}
                d={arcPath(r, r, ringR, segment.from, segment.to)}
                fill="none"
                stroke={segment.color}
                strokeWidth={hoveredAgent === segment.id ? 14 : activeAgent === segment.id ? 14 : 10}
                strokeLinecap="round"
                style={{
                  opacity: activeAgent === segment.id ? 1 : hoveredAgent === segment.id ? 0.95 : 0.75 + glow * 0.25,
                  cursor: 'pointer',
                  transition: 'stroke-width 0.15s ease, opacity 0.3s ease'
                }}
                onMouseEnter={() => {
                  setHoveredAgent(segment.id);
                  setTooltipPos({ x: midPoint.x, y: midPoint.y - 30 });
                }}
                onMouseLeave={() => setHoveredAgent(null)}
              />
            );
          })}
        </g>

        {/* Inner bezel track */}
        <circle cx={r} cy={r} r={bezelR} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={12} />

        {/* Rotating bezel indicator */}
        <g style={{ transformOrigin: `${r}px ${r}px`, transform: `rotate(${bezelRotation}deg)`, transition: 'transform 0.8s ease' }}>
          <path
            d={arcPath(r, r, bezelR, -0.08, 0.08)}
            fill="none"
            stroke={activeAgentInfo?.color || 'rgba(255,255,255,0.25)'}
            strokeWidth={activeAgent ? 14 : 10}
            strokeLinecap="round"
            style={{ transition: 'stroke 0.3s ease, stroke-width 0.3s ease' }}
          />
          {activeAgent && (
            <circle cx={r} cy={r - bezelR} r={6} fill={activeAgentInfo?.color || '#a855f7'} />
          )}
        </g>

        {/* Inner rim */}
        <circle cx={r} cy={r} r={ringR - 42} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={1} />

        {/* Center lens */}
        <circle cx={r} cy={r} r={ringR - 46} fill="rgba(0,0,0,0.4)" />
        <circle cx={r} cy={r} r={ringR - 46} fill="url(#demo-glass)" opacity={0.9} />

        {/* Inner accent ring */}
        <circle
          cx={r} cy={r} r={ringR - 58}
          fill="none"
          stroke={activeAgentInfo?.color || '#a855f7'}
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

      {/* Tooltip */}
      {hoveredAgent && (
        <div
          className="pointer-events-none absolute z-50 px-2.5 py-1.5 rounded-lg bg-black/90 border border-white/20 shadow-xl backdrop-blur-sm"
          style={{ left: tooltipPos.x, top: tooltipPos.y, transform: 'translate(-50%, -100%)' }}
        >
          {(() => {
            const agent = AGENT_SEGMENTS.find(a => a.id === hoveredAgent);
            return agent ? (
              <div className="flex items-center gap-2">
                <span className="text-base">{agent.icon}</span>
                <span className="text-xs font-medium text-white">{agent.name}</span>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: agent.color }} />
              </div>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// INNER VISUALIZATION (Canvas-based particles)
// ============================================================================

function InnerViz({ size = 260, mood = 'listening', level = 0.25, seed = 1, activeAgentColor = null }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    w: size, h: size, particles: [], seed, time: 0,
    pointer: { x: size / 2, y: size / 2, down: false },
    activeAgentColor: null,
  });

  // Initialize particles
  useEffect(() => {
    const st = stateRef.current;
    st.w = size; st.h = size; st.seed = seed;
    const N = 90;
    const rand = (a) => { const x = Math.sin((st.seed + a) * 9999) * 10000; return x - Math.floor(x); };
    st.particles = Array.from({ length: N }).map((_, i) => {
      const r = (size * 0.33) * Math.sqrt(rand(i + 1));
      const ang = rand(i + 7) * Math.PI * 2;
      return { x: size / 2 + r * Math.cos(ang), y: size / 2 + r * Math.sin(ang), vx: (rand(i + 11) - 0.5) * 0.35, vy: (rand(i + 17) - 0.5) * 0.35, s: 1.2 + rand(i + 23) * 3.2, p: rand(i + 31) };
    });
  }, [size, seed]);

  useEffect(() => { stateRef.current.activeAgentColor = activeAgentColor; }, [activeAgentColor]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const st = stateRef.current;
    let running = true;

    const render = () => {
      if (!running) return;
      st.time += 0.016;
      const time = st.time;
      const w = st.w, h = st.h, cx = w / 2, cy = h / 2;

      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr; canvas.height = h * dpr;
        canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.arc(cx, cy, w * 0.34, 0, Math.PI * 2); ctx.fill();

      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, w * 0.34, 0, Math.PI * 2); ctx.clip();

      const agentColor = st.activeAgentColor;
      const hexToRgba = (hex, alpha) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return `rgba(168,85,247,${alpha})`;
        return `rgba(${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)},${alpha})`;
      };
      const palettes = {
        listening: { a: 'rgba(168,85,247,0.45)', b: 'rgba(139,92,246,0.30)', dot: 'rgba(255,255,255,0.18)' },
        thinking: agentColor
          ? { a: hexToRgba(agentColor, 0.45), b: hexToRgba(agentColor, 0.25), dot: 'rgba(255,255,255,0.18)' }
          : { a: 'rgba(245,158,11,0.40)', b: 'rgba(217,119,6,0.25)', dot: 'rgba(255,255,255,0.16)' },
        speaking: { a: 'rgba(192,132,252,0.55)', b: 'rgba(168,85,247,0.35)', dot: 'rgba(255,255,255,0.22)' },
      };
      const P = palettes[mood] || palettes.listening;

      const g = ctx.createRadialGradient(cx - w * 0.12, cy - h * 0.12, w * 0.08, cx, cy, w * 0.42);
      g.addColorStop(0, P.a); g.addColorStop(0.6, P.b); g.addColorStop(1, 'rgba(0,0,0,0.0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

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
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(255,255,255,${0.02 + level * 0.06})`;
        ctx.lineWidth = 1; ctx.stroke();
      }

      const px = st.pointer.x, py = st.pointer.y;
      const attract = st.pointer.down ? 1.0 : 0.35;
      const speedBoost = mood === 'speaking' ? 1.3 : mood === 'thinking' ? 0.95 : 0.85;

      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < st.particles.length; i++) {
        const a = st.particles[i];
        const dxp = px - a.x, dyp = py - a.y;
        const d2 = dxp * dxp + dyp * dyp;
        const pull = (attract * 0.00018) / (1 + d2 * 0.0009);
        a.vx += dxp * pull; a.vy += dyp * pull;
        const dx = a.x - cx, dy = a.y - cy;
        const ang = Math.atan2(dy, dx) + 0.0025 * speedBoost;
        const rr = Math.sqrt(dx * dx + dy * dy);
        a.vx += (cx + rr * Math.cos(ang) - a.x) * 0.0009;
        a.vy += (cy + rr * Math.sin(ang) - a.y) * 0.0009;
        a.x += a.vx * (1.0 + level * 0.9) * speedBoost;
        a.y += a.vy * (1.0 + level * 0.9) * speedBoost;

        const ddx = a.x - cx, ddy = a.y - cy;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy);
        const maxR = w * 0.34;
        if (dist > maxR) { const k = maxR / dist; a.x = cx + ddx * k; a.y = cy + ddy * k; a.vx *= -0.35; a.vy *= -0.35; }

        for (let j = i + 1; j < st.particles.length; j += 6) {
          const b = st.particles[j];
          const lx = b.x - a.x, ly = b.y - a.y;
          const ld = Math.sqrt(lx * lx + ly * ly);
          if (ld < 36) {
            const o = (1 - ld / 36) * (0.10 + level * 0.25);
            ctx.strokeStyle = `rgba(255,255,255,${o})`; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }

      ctx.globalCompositeOperation = 'lighter';
      for (const p of st.particles) {
        ctx.fillStyle = P.dot;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (0.55 + level * 0.25), 0, Math.PI * 2); ctx.fill();
      }

      const scanY = cy + Math.sin(time * (mood === 'speaking' ? 2.8 : 1.8)) * (h * 0.14);
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = mood === 'speaking' ? 'rgba(192,132,252,0.18)' : 'rgba(255,255,255,0.08)';
      ctx.fillRect(0, scanY - 2, w, 4);

      ctx.restore();
      requestAnimationFrame(render);
    };

    requestAnimationFrame(render);
    return () => { running = false; };
  }, [mood, level]);

  return (
    <div className="absolute inset-0 pointer-events-auto" style={{ width: size, height: size }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 rounded-full cursor-pointer"
        style={{ width: size, height: size }}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          stateRef.current.pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top, down: stateRef.current.pointer.down };
        }}
        onPointerDown={() => { stateRef.current.pointer = { ...stateRef.current.pointer, down: true }; }}
        onPointerUp={() => { stateRef.current.pointer = { ...stateRef.current.pointer, down: false }; }}
        onPointerLeave={() => { stateRef.current.pointer = { ...stateRef.current.pointer, down: false }; }}
      />
    </div>
  );
}

// ============================================================================
// AGENT AVATAR (ring + viz + label)
// ============================================================================

function AgentAvatar({ size = 260, mood = 'listening', level = 0.25, seed = 1, activeAgent = null }) {
  const activeAgentInfo = activeAgent ? AGENT_SEGMENTS.find(a => a.id === activeAgent) : null;
  const activeAgentColor = activeAgentInfo?.color || null;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <OuterRing size={size} mood={mood} level={level} activeAgent={activeAgent} />
      <InnerViz size={size} mood={mood} level={level} seed={seed} activeAgentColor={activeAgentColor} />

      {/* Label below avatar */}
      <div className="absolute inset-x-0 bottom-[-52px] flex justify-center">
        <div className="rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs shadow-lg backdrop-blur">
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full animate-pulse"
              style={{
                backgroundColor: activeAgentInfo?.color || (mood === 'speaking' ? '#a855f7' : mood === 'thinking' ? '#f59e0b' : '#22c55e'),
                boxShadow: `0 0 10px ${activeAgentInfo?.color || 'rgba(168,85,247,0.6)'}`,
              }}
            />
            <span className="font-medium text-white">
              {activeAgentInfo ? `SYNC → ${activeAgentInfo.name}` : 'SYNC'}
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
// AGENT CHANNEL MESSAGE
// ============================================================================

function AgentChannelMessage({ message, isLatest }) {
  const agent = AGENT_SEGMENTS.find(a => a.id === message.agentId) || AGENT_SEGMENTS.find(a => a.id === 'sync');
  const isSyncMessage = message.agentId === 'sync' || !message.agentId;

  return (
    <div
      className={`flex items-start gap-3 py-3 px-4 rounded-xl max-w-[85%] transition-all duration-300 ${
        isSyncMessage
          ? 'mr-auto bg-gradient-to-br from-zinc-800/70 to-zinc-800/40 border border-zinc-700/30'
          : 'ml-auto flex-row-reverse bg-gradient-to-bl from-zinc-700/50 to-zinc-700/30 border border-zinc-600/30'
      }`}
    >
      <div
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 shadow-lg"
        style={{ backgroundColor: `${agent?.color}15`, borderColor: `${agent?.color}50`, boxShadow: `0 4px 12px ${agent?.color}20` }}
      >
        {agent?.icon || '🤖'}
      </div>
      <div className={`flex-1 min-w-0 ${!isSyncMessage ? 'text-right' : ''}`}>
        <div className={`flex items-center gap-2 mb-1 ${!isSyncMessage ? 'justify-end' : ''}`}>
          <span className="text-sm font-semibold" style={{ color: agent?.color }}>{agent?.name || 'Agent'}</span>
          <span className="text-[10px] text-zinc-500">{formatTime(message.ts)}</span>
          {isLatest && message.status === 'thinking' && <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-amber-400" />}
        </div>
        <p className="text-sm text-zinc-300 leading-relaxed">{message.text}</p>
      </div>
    </div>
  );
}

// ============================================================================
// AGENT CHANNEL (feed)
// ============================================================================

function AgentChannel({ messages, isProcessing }) {
  const scrollerRef = useRef(null);
  useEffect(() => {
    if (scrollerRef.current) scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [messages.length]);

  if (messages.length === 0) return null;
  const visibleMessages = messages.slice(-5);

  return (
    <div ref={scrollerRef} className="flex flex-col justify-end h-full px-5 pb-6">
      <div className="space-y-4">
        {visibleMessages.map((msg, idx) => (
          <AgentChannelMessage key={msg.id || idx} message={msg} isLatest={idx === visibleMessages.length - 1} />
        ))}
        {isProcessing && (
          <div className="flex items-center justify-center gap-2 py-2">
            <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
            <span className="text-xs text-cyan-400">Processing...</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// CHAT BUBBLE
// ============================================================================

function Bubble({ role, text, ts }) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[78%] rounded-xl border px-4 py-3 text-sm leading-relaxed shadow-sm ${
          isUser
            ? 'border-cyan-500/20 bg-cyan-600/20 text-white'
            : 'border-white/10 bg-black/40 text-white/90'
        }`}
      >
        <div className="mb-1.5 flex items-center gap-2 text-[11px] text-zinc-500">
          <span className="inline-flex items-center gap-1.5">
            {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
            <span className="capitalize">{isUser ? 'You' : 'SYNC'}</span>
          </span>
          <span>·</span>
          <span>{formatTime(ts)}</span>
        </div>
        <div className="whitespace-pre-wrap">{text}</div>
      </div>
    </div>
  );
}

// ============================================================================
// MOCK DATA
// ============================================================================

const now = Date.now();

const MOCK_MESSAGES = [
  { role: 'assistant', text: "Hey — I'm SYNC, your AI orchestrator. I can help with invoices, prospects, compliance, learning, and more.", ts: now - 1000 * 60 * 5 },
  { role: 'assistant', text: 'Tip: click and drag inside the avatar to interact with the visualization.', ts: now - 1000 * 60 * 4 },
  { role: 'user', text: 'Show me a summary of our sales pipeline this week', ts: now - 1000 * 60 * 3 },
  { role: 'assistant', text: "Here's your pipeline summary for this week:\n\n**Active Deals:** 23\n**Total Pipeline Value:** $387,500\n**Closing This Week:** 3 deals ($89,200)\n**New Leads Added:** 7\n\nYour pipeline grew 12% this week, mainly from the Growth team's outreach campaign. The Meridian Health deal ($32,000) is the closest to close — proposal was sent yesterday.\n\nWant me to schedule follow-ups for the deals closing this week?", ts: now - 1000 * 60 * 2 },
  { role: 'user', text: 'Yes, and also create an invoice for the TechVentures platform license — $12,500', ts: now - 1000 * 60 * 1 },
  { role: 'assistant', text: "Done! Here's what I've set up:\n\n**Follow-up Tasks Created:**\n- Meridian Health review — Tuesday, Feb 11\n- Summit Analytics check-in — Wednesday, Feb 12\n- DataBridge pricing discussion — Thursday, Feb 13\n\n**Invoice Created:**\n- Invoice #INV-2026-047 for TechVentures\n- Amount: $12,500.00 (Platform License)\n- Status: Draft\n- Due Date: March 8, 2026\n\nAll tasks are linked to their respective deals in the pipeline. Would you like me to send the invoice directly or do you want to review it first?", ts: now - 1000 * 30 },
];

const MOCK_AGENT_MESSAGES = [
  { id: 'a1', agentId: 'sync', text: 'Received: "Show me a summary of our sales pipeline..."', ts: now - 1000 * 60 * 3, status: 'complete' },
  { id: 'a2', agentId: 'growth', text: 'Fetching pipeline data: 23 active deals, $387.5K total value', ts: now - 1000 * 60 * 3 + 2000, status: 'complete' },
  { id: 'a3', agentId: 'sync', text: 'Pipeline summary compiled and delivered', ts: now - 1000 * 60 * 3 + 4000, status: 'complete' },
  { id: 'a4', agentId: 'sync', text: 'Received: "Create an invoice for TechVentures..."', ts: now - 1000 * 60 * 1, status: 'complete' },
  { id: 'a5', agentId: 'tasks', text: 'Created 3 follow-up tasks linked to pipeline deals', ts: now - 1000 * 60 * 1 + 1500, status: 'complete' },
  { id: 'a6', agentId: 'finance', text: 'Invoice #INV-2026-047 created for TechVentures ($12,500)', ts: now - 1000 * 60 * 1 + 3000, status: 'complete' },
  { id: 'a7', agentId: 'sync', text: 'All actions completed successfully', ts: now - 1000 * 30, status: 'complete' },
];

const SUGGESTIONS = [
  { label: 'Weekly Review', action: 'Give me a weekly business review' },
  { label: 'Onboard Client', action: 'Onboard new client' },
  { label: 'Monthly Close', action: 'Do the monthly financial close' },
  { label: 'Create invoice', action: 'Help me create an invoice for a client' },
  { label: 'Product Launch', action: 'Launch a new product' },
  { label: 'Find prospects', action: 'Find prospects in the SaaS industry' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DemoSync({ companyName = 'Acme Corp', recipientName = 'there' }) {
  const [mood, setMood] = useState('listening');
  const [level, setLevel] = useState(0.18);
  const [seed, setSeed] = useState(4);
  const [activeAgent, setActiveAgent] = useState(null);
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [agentMessages] = useState(MOCK_AGENT_MESSAGES);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollerRef = useRef(null);

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

  // Auto-scroll chat
  useEffect(() => {
    if (scrollerRef.current) scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [messages.length]);

  // Simulate typing demo
  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isSending) return;

    setIsSending(true);
    setMood('thinking');
    setActiveAgent('growth');
    setMessages(m => [...m, { role: 'user', text, ts: Date.now() }]);
    setInput('');

    setTimeout(() => {
      setMood('speaking');
      setTimeout(() => {
        setMessages(m => [...m, {
          role: 'assistant',
          text: `I'd be happy to help with that! Let me look into "${text}" for you.\n\nThis is a demo — in the real app, SYNC would execute actions across your connected modules and provide real-time results.`,
          ts: Date.now(),
        }]);
        setMood('listening');
        setActiveAgent(null);
        setIsSending(false);
      }, 1500);
    }, 1200);
  }, [input, isSending]);

  const handleNewChat = () => {
    setMessages(MOCK_MESSAGES.slice(0, 2));
    setActiveAgent(null);
    setMood('listening');
    setInput('');
  };

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 z-20">
        <div className="mx-auto flex max-w-[1600px] items-center justify-end gap-3 px-6 py-3">
          <button className="group relative inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium overflow-hidden transition-all duration-300 shadow-lg shadow-purple-500/20 cursor-default">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-500 opacity-90" />
            <Mic className="relative h-4 w-4 text-white" />
            <span className="relative text-white">Voice</span>
          </button>
          <button
            className="group relative inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium overflow-hidden transition-all duration-300 cursor-default"
            onClick={handleNewChat}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-cyan-500 opacity-90" />
            <Plus className="relative h-4 w-4 text-white" />
            <span className="relative text-white">New Chat</span>
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-700/60 bg-zinc-800/50 text-zinc-300 px-4 py-2.5 text-sm transition-all duration-200 hover:bg-zinc-800 hover:text-white hover:border-zinc-600"
            onClick={() => setSeed(s => s + 1)}
          >
            <RotateCcw className="h-4 w-4" />
            Refresh
          </button>
          <button className="inline-flex items-center gap-2 rounded-xl border border-zinc-700/60 bg-zinc-800/50 text-zinc-300 px-4 py-2.5 text-sm transition-all duration-200 hover:bg-zinc-800 hover:text-white hover:border-zinc-600 cursor-default">
            <Sun className="h-4 w-4" />
          </button>
          <button className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/10 text-zinc-400 transition-all cursor-default">
            <Bot className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex-1 min-h-0 mx-auto w-full max-w-[1600px] grid grid-cols-1 gap-3 px-4 lg:px-6 pb-4 lg:grid-cols-[480px_1fr]">
        {/* Left: Avatar + Agent Messages */}
        <div className="flex flex-col rounded-xl border border-zinc-700/50 bg-zinc-900/30 overflow-hidden">
          <div className="shrink-0 grid place-items-center pt-10 pb-16">
            <AgentAvatar size={260} mood={mood} level={level} seed={seed} activeAgent={activeAgent} />
          </div>
          <div className="flex-1 min-h-0 overflow-hidden pb-3">
            <AgentChannel messages={agentMessages} isProcessing={isSending} />
          </div>
        </div>

        {/* Right: Chat Panel */}
        <div className="flex flex-col min-h-0">
          <div ref={scrollerRef} className="flex-1 min-h-0 space-y-4 overflow-y-auto px-2 pt-16 pb-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-cyan-500/20 rounded-xl blur-2xl scale-150" />
                  <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/10">
                    <Sparkles className="w-10 h-10 text-cyan-400" />
                  </div>
                </div>
                <h4 className="text-lg font-semibold bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent mb-2">How can I help you?</h4>
                <p className="text-sm text-zinc-500 mb-8 max-w-sm">I can help with invoices, prospects, compliance, learning, and more.</p>
                <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                  {SUGGESTIONS.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInput(s.action)}
                      className="px-4 py-2.5 text-sm rounded-xl border border-zinc-700/60 bg-zinc-800/40 text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-cyan-500/30 transition-all duration-200"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((m, idx) => (
                  <Bubble key={idx} role={m.role} text={m.text} ts={m.ts} />
                ))}
                {isSending && (
                  <div className="flex justify-start">
                    <div className="rounded-xl bg-gradient-to-br from-zinc-800/60 to-zinc-900/60 border border-zinc-700/50 px-4 py-3 text-sm backdrop-blur-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex h-2 w-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '600ms' }} />
                          <span className="inline-flex h-2 w-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms', animationDuration: '600ms' }} />
                          <span className="inline-flex h-2 w-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms', animationDuration: '600ms' }} />
                        </div>
                        <span className="text-zinc-400">SYNC is {mood === 'thinking' ? 'thinking' : 'responding'}...</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Input area */}
          <div className="shrink-0 px-2 py-4">
            <div className="flex items-end gap-4">
              <div className="flex-1 rounded-xl bg-zinc-900/60 border border-zinc-700/50 hover:border-zinc-600/60 focus-within:border-cyan-500/40 focus-within:shadow-lg focus-within:shadow-cyan-500/5 transition-all duration-200">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                  }}
                  placeholder="Message SYNC..."
                  rows={2}
                  disabled={isSending}
                  className="w-full resize-none bg-transparent text-sm text-white/90 outline-none placeholder:text-zinc-500 disabled:opacity-50 px-4 py-3"
                />
                <div className="px-4 pb-3 flex items-center justify-between text-[11px] text-zinc-600">
                  <span>Enter to send · Shift+Enter for newline</span>
                  <span className="tabular-nums">{input.length}</span>
                </div>
              </div>
              <button
                onClick={handleSend}
                disabled={isSending || !input.trim()}
                className={`group relative inline-flex h-14 w-14 items-center justify-center rounded-xl transition-all duration-300 overflow-hidden ${
                  isSending || !input.trim()
                    ? 'cursor-not-allowed bg-zinc-800/60 border border-zinc-700/50 text-zinc-600'
                    : 'shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30'
                }`}
              >
                {input.trim() && !isSending && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-cyan-600" />
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </>
                )}
                <Send className={`relative h-5 w-5 transition-all duration-300 ${input.trim() && !isSending ? 'text-white' : 'text-zinc-600'}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-60">
        <div className="absolute left-[-20%] top-[-30%] h-[520px] w-[520px] rounded-full bg-cyan-900/5 blur-3xl" />
        <div className="absolute right-[-25%] top-[10%] h-[620px] w-[620px] rounded-full bg-cyan-900/5 blur-3xl" />
        <div className="absolute bottom-[-35%] left-[10%] h-[640px] w-[640px] rounded-full bg-cyan-900/5 blur-3xl" />
      </div>
    </div>
  );
}
