import React, { useEffect, useRef } from 'react';
import anime from '@/lib/anime-wrapper';

const AnimatedAvatar = ({ size = 40, className = "" }) => {
  const containerRef = useRef(null);
  const timelineRef = useRef(null);

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

    // Professional gradient - subtle blues and purples
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', 'avatar-gradient');
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '100%');
    gradient.setAttribute('y2', '100%');

    const stops = [
      { offset: '0%', color: '#667eea' },   // Purple-blue
      { offset: '50%', color: '#06b6d4' },  // Cyan
      { offset: '100%', color: '#667eea' }  // Purple-blue
    ];

    stops.forEach(stop => {
      const stopEl = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stopEl.setAttribute('offset', stop.offset);
      stopEl.setAttribute('stop-color', stop.color);
      gradient.appendChild(stopEl);
    });

    defs.appendChild(gradient);
    svg.appendChild(defs);

    // Create outer ring with dots
    const outerRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    outerRing.setAttribute('cx', center);
    outerRing.setAttribute('cy', center);
    outerRing.setAttribute('r', center - 3);
    outerRing.setAttribute('fill', 'none');
    outerRing.setAttribute('stroke', 'url(#avatar-gradient)');
    outerRing.setAttribute('stroke-width', '1');
    outerRing.setAttribute('opacity', '0.3');
    outerRing.setAttribute('stroke-dasharray', '2 4');
    svg.appendChild(outerRing);

    // Create pulsing dots around the perimeter
    const dots = [];
    const numDots = 8;
    for (let i = 0; i < numDots; i++) {
      const angle = (i / numDots) * Math.PI * 2 - Math.PI / 2;
      const radius = center - 3;
      const x = center + Math.cos(angle) * radius;
      const y = center + Math.sin(angle) * radius;

      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', x);
      dot.setAttribute('cy', y);
      dot.setAttribute('r', 1.5);
      dot.setAttribute('fill', '#06b6d4');
      dot.setAttribute('opacity', '0');
      svg.appendChild(dot);
      dots.push(dot);
    }

    // Create center circle
    const centerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    centerCircle.setAttribute('cx', center);
    centerCircle.setAttribute('cy', center);
    centerCircle.setAttribute('r', center - 12);
    centerCircle.setAttribute('fill', 'rgba(102, 126, 234, 0.08)');
    centerCircle.setAttribute('stroke', 'url(#avatar-gradient)');
    centerCircle.setAttribute('stroke-width', '1.5');
    centerCircle.setAttribute('opacity', '0.6');
    svg.appendChild(centerCircle);

    // Create inner accent lines - more subtle
    const accentLines = [];
    const numLines = 3;
    for (let i = 0; i < numLines; i++) {
      const angle = (i / numLines) * Math.PI * 2;
      const innerRadius = 6;
      const outerRadius = 10;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', center + Math.cos(angle) * innerRadius);
      line.setAttribute('y1', center + Math.sin(angle) * innerRadius);
      line.setAttribute('x2', center + Math.cos(angle) * outerRadius);
      line.setAttribute('y2', center + Math.sin(angle) * outerRadius);
      line.setAttribute('stroke', '#667eea');
      line.setAttribute('stroke-width', '1.5');
      line.setAttribute('stroke-linecap', 'round');
      line.setAttribute('opacity', '0.4');
      svg.appendChild(line);
      accentLines.push(line);
    }

    // Create coordinated timeline animation
    const timeline = anime.timeline({
      loop: true,
      easing: 'easeInOutQuad'
    });

    // Rotate outer ring smoothly
    timeline.add({
      targets: outerRing,
      rotate: 360,
      duration: 8000,
      easing: 'linear'
    }, 0);

    // Pulse center circle elegantly
    timeline.add({
      targets: centerCircle,
      scale: [1, 1.08, 1],
      opacity: [0.6, 0.8, 0.6],
      duration: 3000,
      easing: 'easeInOutSine'
    }, 0);

    // Staggered dot appearance with smooth fade
    timeline.add({
      targets: dots,
      opacity: [0, 1, 0],
      scale: [0.5, 1.2, 0.5],
      duration: 2000,
      delay: anime.stagger(200, {start: 0}),
      easing: 'easeInOutQuad'
    }, 0);

    // Rotate accent lines in opposite direction - very slow
    timeline.add({
      targets: accentLines,
      rotate: -360,
      duration: 12000,
      easing: 'linear'
    }, 0);

    // Store timeline reference for cleanup
    timelineRef.current = timeline;

    return () => {
      if (timelineRef.current) {
        timelineRef.current.pause();
        timelineRef.current = null;
      }
    };
  }, [size]);

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
