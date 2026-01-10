import React, { useEffect, useRef } from 'react';
import anime from 'animejs';

const AnimatedAvatar = ({ size = 40, className = "" }) => {
  const containerRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Clear any existing content
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

    // Rainbow gradient for the rings
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', 'rainbow-gradient');
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

    // Create concentric rings
    const rings = [];
    const numRings = 3;
    const ringWidth = 1.5;

    for (let i = 0; i < numRings; i++) {
      const radius = center - (i * 6) - 4;
      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ring.setAttribute('cx', center);
      ring.setAttribute('cy', center);
      ring.setAttribute('r', radius);
      ring.setAttribute('fill', 'none');
      ring.setAttribute('stroke', 'url(#rainbow-gradient)');
      ring.setAttribute('stroke-width', ringWidth);
      ring.setAttribute('opacity', 0.6 - (i * 0.15));
      ring.style.transformOrigin = 'center';
      svg.appendChild(ring);
      rings.push(ring);
    }

    // Create animated dots
    const dots = [];
    const numDots = 12;

    for (let i = 0; i < numDots; i++) {
      const angle = (i / numDots) * Math.PI * 2;
      const radius = center - 4;
      const x = center + Math.cos(angle) * radius;
      const y = center + Math.sin(angle) * radius;

      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', x);
      dot.setAttribute('cy', y);
      dot.setAttribute('r', 1.5);
      dot.setAttribute('fill', '#06b6d4');
      dot.setAttribute('opacity', 0.8);
      svg.appendChild(dot);
      dots.push(dot);
    }

    // Create center circle with gradient
    const centerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    centerCircle.setAttribute('cx', center);
    centerCircle.setAttribute('cy', center);
    centerCircle.setAttribute('r', center - 20);
    centerCircle.setAttribute('fill', 'rgba(6, 182, 212, 0.1)');
    centerCircle.setAttribute('stroke', 'url(#rainbow-gradient)');
    centerCircle.setAttribute('stroke-width', 2);
    svg.appendChild(centerCircle);

    // Inner lines/pattern
    const lines = [];
    const numLines = 8;
    for (let i = 0; i < numLines; i++) {
      const angle = (i / numLines) * Math.PI * 2;
      const startRadius = center - 18;
      const endRadius = center - 22;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', center + Math.cos(angle) * startRadius);
      line.setAttribute('y1', center + Math.sin(angle) * startRadius);
      line.setAttribute('x2', center + Math.cos(angle) * endRadius);
      line.setAttribute('y2', center + Math.sin(angle) * endRadius);
      line.setAttribute('stroke', '#ef4444');
      line.setAttribute('stroke-width', 1);
      line.setAttribute('opacity', 0.6);
      svg.appendChild(line);
      lines.push(line);
    }

    // Animate rings rotating
    const ringAnimation = anime({
      targets: rings,
      rotate: [0, 360],
      duration: 20000,
      easing: 'linear',
      loop: true,
      delay: anime.stagger(2000)
    });

    // Animate dots pulsing
    const dotsAnimation = anime({
      targets: dots,
      scale: [1, 1.5, 1],
      opacity: [0.8, 1, 0.8],
      duration: 2000,
      easing: 'easeInOutSine',
      loop: true,
      delay: anime.stagger(100, {from: 'center'})
    });

    // Animate center circle pulsing
    const centerAnimation = anime({
      targets: centerCircle,
      scale: [1, 1.05, 1],
      duration: 3000,
      easing: 'easeInOutQuad',
      loop: true
    });

    // Animate inner lines rotating
    const linesAnimation = anime({
      targets: lines,
      rotate: [0, -360],
      duration: 15000,
      easing: 'linear',
      loop: true
    });

    // Store animation reference for cleanup
    animationRef.current = () => {
      ringAnimation.pause();
      dotsAnimation.pause();
      centerAnimation.pause();
      linesAnimation.pause();
    };

    return () => {
      if (animationRef.current) {
        animationRef.current();
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
