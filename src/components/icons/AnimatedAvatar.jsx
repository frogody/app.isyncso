import React, { useEffect, useRef } from 'react';
import anime from '@/lib/anime-wrapper';

const AnimatedAvatar = ({ size = 40, className = "", state = 'idle' }) => {
  const containerRef = useRef(null);
  const timelineRef = useRef(null);
  const elementsRef = useRef({});

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = '';

    // Create SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    container.appendChild(svg);

    const center = size / 2;

    // Create gradient definitions
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    // Gradient for rings
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', 'sync-gradient');
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '100%');
    gradient.setAttribute('y2', '100%');

    const stops = [
      { offset: '0%', color: '#10b981' },   // green
      { offset: '25%', color: '#06b6d4' },  // cyan
      { offset: '50%', color: '#f59e0b' },  // amber
      { offset: '75%', color: '#ef4444' },  // red
      { offset: '100%', color: '#10b981' }  // green
    ];

    stops.forEach(stop => {
      const stopEl = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stopEl.setAttribute('offset', stop.offset);
      stopEl.setAttribute('stop-color', stop.color);
      gradient.appendChild(stopEl);
    });

    defs.appendChild(gradient);
    svg.appendChild(defs);

    // Create 3 concentric rotating rings
    const rings = [];
    for (let i = 0; i < 3; i++) {
      const radius = center - (i * 4) - 2;
      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ring.setAttribute('cx', center);
      ring.setAttribute('cy', center);
      ring.setAttribute('r', radius);
      ring.setAttribute('fill', 'none');
      ring.setAttribute('stroke', 'url(#sync-gradient)');
      ring.setAttribute('stroke-width', '0.5');
      ring.setAttribute('opacity', 0.3 + (i * 0.1));
      ring.setAttribute('stroke-dasharray', `${2 + i} ${3 + i}`);
      ring.style.transformOrigin = '50% 50%';
      svg.appendChild(ring);
      rings.push(ring);
    }

    // Create orbital dots (like homepage)
    const dots = [];
    const numDots = 12;
    for (let i = 0; i < numDots; i++) {
      const angle = (i / numDots) * Math.PI * 2;
      const orbitRadius = center - 2;
      const x = center + Math.cos(angle) * orbitRadius;
      const y = center + Math.sin(angle) * orbitRadius;

      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', x);
      dot.setAttribute('cy', y);
      dot.setAttribute('r', 0.8);
      dot.setAttribute('fill', '#ef4444');
      dot.setAttribute('opacity', 0.6);
      svg.appendChild(dot);
      dots.push(dot);
    }

    // Create center neural network lines (like brain pattern on homepage)
    const centerLines = [];
    const numCenterLines = 8;
    for (let i = 0; i < numCenterLines; i++) {
      const angle = (i / numCenterLines) * Math.PI * 2;
      const innerR = 3;
      const outerR = center - 14;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', center + Math.cos(angle) * innerR);
      line.setAttribute('y1', center + Math.sin(angle) * innerR);
      line.setAttribute('x2', center + Math.cos(angle) * outerR);
      line.setAttribute('y2', center + Math.sin(angle) * outerR);
      line.setAttribute('stroke', '#ef4444');
      line.setAttribute('stroke-width', '0.5');
      line.setAttribute('opacity', 0.4);
      line.setAttribute('stroke-linecap', 'round');
      svg.appendChild(line);
      centerLines.push(line);
    }

    // Create pulsing center core
    const centerCore = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    centerCore.setAttribute('cx', center);
    centerCore.setAttribute('cy', center);
    centerCore.setAttribute('r', 3);
    centerCore.setAttribute('fill', '#ef4444');
    centerCore.setAttribute('opacity', 0.8);
    svg.appendChild(centerCore);

    // Store elements for state changes
    elementsRef.current = {
      rings,
      dots,
      centerLines,
      centerCore
    };

    // Create main timeline animation (like homepage)
    const timeline = anime.timeline({
      loop: true,
      easing: 'linear'
    });

    // Rotate each ring at different speeds
    rings.forEach((ring, i) => {
      timeline.add({
        targets: ring,
        rotate: i % 2 === 0 ? 360 : -360,
        duration: 20000 - (i * 3000),
        easing: 'linear'
      }, 0);
    });

    // Animate dots in orbital pattern with stagger
    timeline.add({
      targets: dots,
      opacity: [0.2, 0.8, 0.2],
      scale: [0.8, 1.3, 0.8],
      duration: 2000,
      delay: anime.stagger(150, {from: 'center'}),
      easing: 'easeInOutSine'
    }, 0);

    // Pulse center core
    timeline.add({
      targets: centerCore,
      scale: [1, 1.4, 1],
      opacity: [0.8, 1, 0.8],
      duration: 2000,
      easing: 'easeInOutQuad'
    }, 0);

    // Animate center lines radiating outward
    timeline.add({
      targets: centerLines,
      opacity: [0.2, 0.6, 0.2],
      strokeWidth: [0.3, 0.8, 0.3],
      duration: 3000,
      delay: anime.stagger(100),
      easing: 'easeInOutSine'
    }, 0);

    timelineRef.current = timeline;

    return () => {
      if (timelineRef.current) {
        timelineRef.current.pause();
        timelineRef.current = null;
      }
    };
  }, [size, state]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    />
  );
};

export default AnimatedAvatar;
