import React, { useEffect, useRef } from 'react';
import anime from '@/lib/anime-wrapper';

// Generate particles with initial random positions and target "silhouette" positions
function generateParticles(count, width, height) {
  const particles = [];
  const centerX = width / 2;
  const centerY = height / 2;

  // Head-and-shoulders silhouette target points
  // Head: rough circle around (centerX, centerY - 40), radius ~30
  // Neck: narrow band around (centerX, centerY + 0..10), width ~10
  // Shoulders: wide arc around (centerX, centerY + 20..50), width ~80

  for (let i = 0; i < count; i++) {
    let targetX, targetY;
    const region = Math.random();

    if (region < 0.4) {
      // Head region — clustered in a circle
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 28 + 4;
      targetX = centerX + Math.cos(angle) * radius;
      targetY = centerY - 45 + Math.sin(angle) * radius;
    } else if (region < 0.5) {
      // Neck region
      targetX = centerX + (Math.random() - 0.5) * 16;
      targetY = centerY + Math.random() * 12;
    } else {
      // Shoulders region — wide arc
      const spread = (Math.random() - 0.5) * 2;
      const armWidth = 80;
      targetX = centerX + spread * armWidth;
      const shoulderDrop = Math.abs(spread) * 30;
      targetY = centerY + 20 + shoulderDrop + Math.random() * 12;
    }

    particles.push({
      id: i,
      // Start at random positions across the viewport
      startX: Math.random() * width,
      startY: Math.random() * height,
      targetX,
      targetY,
      // Visual properties
      radius: Math.random() * 2 + 1,
      color: Math.random() > 0.4 ? 'cyan' : 'purple',
      opacity: Math.random() * 0.5 + 0.3,
    });
  }

  return particles;
}

export default function ParticleFormation() {
  const svgRef = useRef(null);
  const particlesRef = useRef([]);
  const animationsRef = useRef([]);

  useEffect(() => {
    const width = 200;
    const height = 250;
    const count = 35;
    const particles = generateParticles(count, width, height);
    particlesRef.current = particles;

    const svg = svgRef.current;
    if (!svg) return;

    // Clear previous
    svg.innerHTML = '';

    // Create defs for glow filter
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'particle-glow');
    filter.setAttribute('x', '-50%');
    filter.setAttribute('y', '-50%');
    filter.setAttribute('width', '200%');
    filter.setAttribute('height', '200%');
    const feGaussian = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
    feGaussian.setAttribute('stdDeviation', '2');
    feGaussian.setAttribute('result', 'blur');
    const feMerge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
    const mergeNode1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    mergeNode1.setAttribute('in', 'blur');
    const mergeNode2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    mergeNode2.setAttribute('in', 'SourceGraphic');
    feMerge.appendChild(mergeNode1);
    feMerge.appendChild(mergeNode2);
    filter.appendChild(feGaussian);
    filter.appendChild(feMerge);
    defs.appendChild(filter);
    svg.appendChild(defs);

    // Create circle elements
    const circles = particles.map((p) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', p.startX);
      circle.setAttribute('cy', p.startY);
      circle.setAttribute('r', p.radius);
      circle.setAttribute('fill', p.color === 'cyan' ? '#22d3ee' : '#a855f7');
      circle.setAttribute('opacity', p.opacity);
      circle.setAttribute('filter', 'url(#particle-glow)');
      svg.appendChild(circle);
      return circle;
    });

    // Animate: drift randomly first, then gently pull toward silhouette
    const anims = [];

    // Phase 1: Initial drift (particles float around randomly)
    circles.forEach((circle, i) => {
      const p = particles[i];

      // Continuous gentle floating with a pull toward target
      const floatAnim = anime({
        targets: circle,
        cx: [
          { value: p.startX + (Math.random() - 0.5) * 60, duration: 2000 },
          { value: p.targetX + (Math.random() - 0.5) * 18, duration: 3000 },
          { value: p.targetX + (Math.random() - 0.5) * 12, duration: 2500 },
        ],
        cy: [
          { value: p.startY + (Math.random() - 0.5) * 60, duration: 2000 },
          { value: p.targetY + (Math.random() - 0.5) * 18, duration: 3000 },
          { value: p.targetY + (Math.random() - 0.5) * 12, duration: 2500 },
        ],
        opacity: [
          { value: p.opacity * 0.6, duration: 1500 },
          { value: p.opacity, duration: 2000 },
          { value: p.opacity * 0.8, duration: 2000 },
        ],
        easing: 'easeInOutSine',
        delay: i * 80,
        loop: false,
        complete: () => {
          // After reaching near-target, do subtle breathing motion
          const breatheAnim = anime({
            targets: circle,
            cx: p.targetX + (Math.random() - 0.5) * 14,
            cy: p.targetY + (Math.random() - 0.5) * 14,
            opacity: [p.opacity * 0.6, p.opacity],
            duration: () => 2500 + Math.random() * 2000,
            easing: 'easeInOutSine',
            direction: 'alternate',
            loop: true,
          });
          anims.push(breatheAnim);
        },
      });
      anims.push(floatAnim);
    });

    animationsRef.current = anims;

    return () => {
      anims.forEach((a) => {
        if (a && a.pause) a.pause();
      });
    };
  }, []);

  return (
    <div className="flex items-center justify-center">
      <svg
        ref={svgRef}
        viewBox="0 0 200 250"
        className="w-[200px] h-[250px] opacity-80"
        aria-hidden="true"
      />
    </div>
  );
}
