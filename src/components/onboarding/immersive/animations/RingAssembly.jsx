import React, { useEffect, useRef } from 'react';
import anime from '@/lib/anime-wrapper';

const AGENT_SEGMENTS = [
  { id: 'orchestrator', color: '#ec4899', from: 0.02, to: 0.08 },
  { id: 'learn', color: '#06b6d4', from: 0.12, to: 0.18 },
  { id: 'growth', color: '#6366f1', from: 0.22, to: 0.28 },
  { id: 'products', color: '#10b981', from: 0.32, to: 0.38 },
  { id: 'sentinel', color: '#86EFAC', from: 0.42, to: 0.48 },
  { id: 'finance', color: '#f59e0b', from: 0.52, to: 0.58 },
  { id: 'create', color: '#f43f5e', from: 0.62, to: 0.68 },
  { id: 'tasks', color: '#f97316', from: 0.72, to: 0.78 },
  { id: 'research', color: '#3b82f6', from: 0.82, to: 0.88 },
  { id: 'inbox', color: '#14b8a6', from: 0.92, to: 0.98 },
];

const SIZE = 200;
const CENTER = SIZE / 2;
const RING_RADIUS = 70;

export default function RingAssembly() {
  const particlesRef = useRef([]);
  const containerRef = useRef(null);

  useEffect(() => {
    const els = particlesRef.current.filter(Boolean);
    if (els.length === 0) return;

    // Set random initial positions
    els.forEach((el) => {
      const rx = (Math.random() - 0.5) * SIZE * 0.8;
      const ry = (Math.random() - 0.5) * SIZE * 0.8;
      el.style.transform = `translate(${rx}px, ${ry}px)`;
      el.style.opacity = '0';
    });

    // Fade in particles at random positions
    const fadeIn = anime({
      targets: els,
      opacity: [0, 1],
      duration: 600,
      delay: anime.stagger(80, { start: 500 }),
      easing: 'easeOutCubic',
    });

    // After fade-in, converge to ring positions
    const converge = anime({
      targets: els,
      translateX: (el, i) => {
        const seg = AGENT_SEGMENTS[i];
        const angle = ((seg.from + seg.to) / 2) * Math.PI * 2 - Math.PI / 2;
        return Math.cos(angle) * RING_RADIUS;
      },
      translateY: (el, i) => {
        const seg = AGENT_SEGMENTS[i];
        const angle = ((seg.from + seg.to) / 2) * Math.PI * 2 - Math.PI / 2;
        return Math.sin(angle) * RING_RADIUS;
      },
      scale: [1.5, 1],
      duration: 1200,
      delay: anime.stagger(60, { start: 1400 }),
      easing: 'easeInOutQuad',
      autoplay: false,
    });

    fadeIn.finished.then(() => {
      converge.play();
    });

    // Gentle pulse after convergence
    converge.finished.then(() => {
      anime({
        targets: els,
        scale: [1, 1.15, 1],
        duration: 2000,
        loop: true,
        easing: 'easeInOutSine',
        delay: anime.stagger(200),
      });
    });

    return () => {
      anime.remove(els);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ width: SIZE, height: SIZE }}
    >
      {AGENT_SEGMENTS.map((seg, i) => (
        <div
          key={seg.id}
          ref={(el) => (particlesRef.current[i] = el)}
          className="absolute rounded-full"
          style={{
            width: 10,
            height: 10,
            backgroundColor: seg.color,
            boxShadow: `0 0 12px ${seg.color}80`,
            left: CENTER - 5,
            top: CENTER - 5,
            opacity: 0,
            willChange: 'transform, opacity',
          }}
        />
      ))}
      {/* Center glow */}
      <div
        className="absolute rounded-full"
        style={{
          width: 16,
          height: 16,
          left: CENTER - 8,
          top: CENTER - 8,
          background: 'radial-gradient(circle, rgba(6,182,212,0.4) 0%, transparent 70%)',
          filter: 'blur(4px)',
        }}
      />
    </div>
  );
}
