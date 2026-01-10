import React, { useEffect, useRef, useState, useCallback } from 'react';
import anime from '@/lib/anime-wrapper';

const AnimatedAvatar = ({ size = 40, className = "", state = 'idle' }) => {
  const containerRef = useRef(null);
  const timelineRef = useRef(null);
  const elementsRef = useRef({});
  const mousePositionRef = useRef({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);

  // Mouse tracking for interactive parallax effect
  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mousePositionRef.current = {
      x: (e.clientX - centerX) / rect.width,
      y: (e.clientY - centerY) / rect.height
    };
  }, []);

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

    // Animated radial gradient for depth
    const radialGradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
    radialGradient.setAttribute('id', 'glow-gradient');
    radialGradient.setAttribute('cx', '50%');
    radialGradient.setAttribute('cy', '50%');

    const radialStops = [
      { offset: '0%', color: '#ef4444', opacity: 0.8 },
      { offset: '50%', color: '#f97316', opacity: 0.4 },
      { offset: '100%', color: '#06b6d4', opacity: 0 }
    ];

    radialStops.forEach(stop => {
      const stopEl = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stopEl.setAttribute('offset', stop.offset);
      stopEl.setAttribute('stop-color', stop.color);
      stopEl.setAttribute('stop-opacity', stop.opacity);
      radialGradient.appendChild(stopEl);
    });

    // Rainbow gradient for rings
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', 'sync-gradient');
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '100%');
    gradient.setAttribute('y2', '100%');

    const stops = [
      { offset: '0%', color: '#10b981' },
      { offset: '25%', color: '#06b6d4' },
      { offset: '50%', color: '#f59e0b' },
      { offset: '75%', color: '#ef4444' },
      { offset: '100%', color: '#10b981' }
    ];

    stops.forEach(stop => {
      const stopEl = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stopEl.setAttribute('offset', stop.offset);
      stopEl.setAttribute('stop-color', stop.color);
      gradient.appendChild(stopEl);
    });

    // Blur filter for glow effects
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'glow');
    const feGaussianBlur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
    feGaussianBlur.setAttribute('stdDeviation', '2');
    feGaussianBlur.setAttribute('result', 'coloredBlur');
    const feMerge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
    const feMergeNode1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    feMergeNode1.setAttribute('in', 'coloredBlur');
    const feMergeNode2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    feMergeNode2.setAttribute('in', 'SourceGraphic');
    feMerge.appendChild(feMergeNode1);
    feMerge.appendChild(feMergeNode2);
    filter.appendChild(feGaussianBlur);
    filter.appendChild(feMerge);

    defs.appendChild(radialGradient);
    defs.appendChild(gradient);
    defs.appendChild(filter);
    svg.appendChild(defs);

    // Background glow circle
    const bgGlow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bgGlow.setAttribute('cx', center);
    bgGlow.setAttribute('cy', center);
    bgGlow.setAttribute('r', center - 2);
    bgGlow.setAttribute('fill', 'url(#glow-gradient)');
    bgGlow.setAttribute('opacity', 0.3);
    bgGlow.setAttribute('filter', 'url(#glow)');
    svg.appendChild(bgGlow);

    // Create 5 concentric rotating rings with varying styles
    const rings = [];
    for (let i = 0; i < 5; i++) {
      const radius = center - (i * 3) - 2;
      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ring.setAttribute('cx', center);
      ring.setAttribute('cy', center);
      ring.setAttribute('r', radius);
      ring.setAttribute('fill', 'none');
      ring.setAttribute('stroke', 'url(#sync-gradient)');
      ring.setAttribute('stroke-width', i === 0 ? '1.5' : '0.6');
      ring.setAttribute('opacity', 0.2 + (i * 0.08));
      ring.setAttribute('stroke-dasharray', `${2 + i * 0.5} ${3 + i * 0.8}`);
      ring.style.transformOrigin = '50% 50%';
      if (i % 2 === 0) ring.setAttribute('filter', 'url(#glow)');
      svg.appendChild(ring);
      rings.push(ring);
    }

    // Create particle field (more dots, smaller, more dynamic)
    const particles = [];
    const numParticles = 24;
    for (let i = 0; i < numParticles; i++) {
      const angle = (i / numParticles) * Math.PI * 2;
      const orbitRadius = center - 2;
      const x = center + Math.cos(angle) * orbitRadius;
      const y = center + Math.sin(angle) * orbitRadius;

      const particle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      particle.setAttribute('cx', x);
      particle.setAttribute('cy', y);
      particle.setAttribute('r', 0.6);
      particle.setAttribute('fill', i % 3 === 0 ? '#ef4444' : i % 3 === 1 ? '#06b6d4' : '#10b981');
      particle.setAttribute('opacity', 0.4);
      particle.setAttribute('filter', 'url(#glow)');
      svg.appendChild(particle);
      particles.push(particle);
    }

    // Create secondary orbit layer
    const secondaryParticles = [];
    const numSecondary = 16;
    for (let i = 0; i < numSecondary; i++) {
      const angle = (i / numSecondary) * Math.PI * 2 + Math.PI / numSecondary;
      const orbitRadius = center - 8;
      const x = center + Math.cos(angle) * orbitRadius;
      const y = center + Math.sin(angle) * orbitRadius;

      const particle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      particle.setAttribute('cx', x);
      particle.setAttribute('cy', y);
      particle.setAttribute('r', 0.4);
      particle.setAttribute('fill', '#f59e0b');
      particle.setAttribute('opacity', 0.3);
      svg.appendChild(particle);
      secondaryParticles.push(particle);
    }

    // Create neural network lines (more complex pattern)
    const centerLines = [];
    const numCenterLines = 12;
    for (let i = 0; i < numCenterLines; i++) {
      const angle = (i / numCenterLines) * Math.PI * 2;
      const innerR = 4;
      const outerR = center - 12;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', center + Math.cos(angle) * innerR);
      line.setAttribute('y1', center + Math.sin(angle) * innerR);
      line.setAttribute('x2', center + Math.cos(angle) * outerR);
      line.setAttribute('y2', center + Math.sin(angle) * outerR);
      line.setAttribute('stroke', i % 2 === 0 ? '#ef4444' : '#06b6d4');
      line.setAttribute('stroke-width', '0.4');
      line.setAttribute('opacity', 0.3);
      line.setAttribute('stroke-linecap', 'round');
      svg.appendChild(line);
      centerLines.push(line);
    }

    // Outer glow ring (interactive)
    const outerGlow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    outerGlow.setAttribute('cx', center);
    outerGlow.setAttribute('cy', center);
    outerGlow.setAttribute('r', center - 1);
    outerGlow.setAttribute('fill', 'none');
    outerGlow.setAttribute('stroke', '#ef4444');
    outerGlow.setAttribute('stroke-width', '2');
    outerGlow.setAttribute('opacity', 0);
    outerGlow.setAttribute('filter', 'url(#glow)');
    svg.appendChild(outerGlow);

    // Create pulsing center core with multiple layers
    const centerCoreOuter = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    centerCoreOuter.setAttribute('cx', center);
    centerCoreOuter.setAttribute('cy', center);
    centerCoreOuter.setAttribute('r', 5);
    centerCoreOuter.setAttribute('fill', '#ef4444');
    centerCoreOuter.setAttribute('opacity', 0.3);
    centerCoreOuter.setAttribute('filter', 'url(#glow)');
    svg.appendChild(centerCoreOuter);

    const centerCore = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    centerCore.setAttribute('cx', center);
    centerCore.setAttribute('cy', center);
    centerCore.setAttribute('r', 3);
    centerCore.setAttribute('fill', '#ef4444');
    centerCore.setAttribute('opacity', 0.9);
    centerCore.setAttribute('filter', 'url(#glow)');
    svg.appendChild(centerCore);

    const centerCoreInner = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    centerCoreInner.setAttribute('cx', center);
    centerCoreInner.setAttribute('cy', center);
    centerCoreInner.setAttribute('r', 1.5);
    centerCoreInner.setAttribute('fill', '#ffffff');
    centerCoreInner.setAttribute('opacity', 1);
    svg.appendChild(centerCoreInner);

    // Store elements for state changes
    elementsRef.current = {
      rings,
      particles,
      secondaryParticles,
      centerLines,
      centerCore,
      centerCoreOuter,
      centerCoreInner,
      bgGlow,
      outerGlow,
      svg
    };

    // Create main timeline animation
    const timeline = anime.timeline({
      loop: true,
      easing: 'linear'
    });

    // Rotate each ring at different speeds and directions
    rings.forEach((ring, i) => {
      timeline.add({
        targets: ring,
        rotate: i % 2 === 0 ? 360 : -360,
        duration: 15000 - (i * 2000),
        easing: 'linear'
      }, 0);
    });

    // Background glow pulse
    timeline.add({
      targets: bgGlow,
      scale: [1, 1.15, 1],
      opacity: [0.2, 0.4, 0.2],
      duration: 4000,
      easing: 'easeInOutQuad'
    }, 0);

    // Primary particles - wave motion with color shifts
    timeline.add({
      targets: particles,
      opacity: [0.3, 0.9, 0.3],
      scale: [0.7, 1.5, 0.7],
      duration: 3000,
      delay: anime.stagger(80, {from: 'center', direction: 'normal'}),
      easing: 'easeInOutSine'
    }, 0);

    // Secondary particles - counter rotation
    timeline.add({
      targets: secondaryParticles,
      opacity: [0.2, 0.7, 0.2],
      scale: [0.8, 1.3, 0.8],
      duration: 2500,
      delay: anime.stagger(100, {from: 'last'}),
      easing: 'easeInOutSine'
    }, 0);

    // Pulse center core layers
    timeline.add({
      targets: centerCoreOuter,
      scale: [1, 1.6, 1],
      opacity: [0.3, 0.6, 0.3],
      duration: 2000,
      easing: 'easeInOutQuad'
    }, 0);

    timeline.add({
      targets: centerCore,
      scale: [1, 1.3, 1],
      opacity: [0.9, 1, 0.9],
      duration: 2000,
      easing: 'easeInOutQuad'
    }, 0);

    timeline.add({
      targets: centerCoreInner,
      scale: [1, 1.2, 1],
      opacity: [0.8, 1, 0.8],
      duration: 2000,
      easing: 'easeInOutQuad'
    }, 0);

    // Animate center lines radiating outward with depth
    timeline.add({
      targets: centerLines,
      opacity: [0.2, 0.7, 0.2],
      strokeWidth: [0.2, 1, 0.2],
      duration: 3500,
      delay: anime.stagger(80, {direction: 'reverse'}),
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

  // Interactive hover effects
  useEffect(() => {
    if (!elementsRef.current.outerGlow) return;

    if (isHovered) {
      anime({
        targets: elementsRef.current.outerGlow,
        opacity: [0, 0.6],
        scale: [0.9, 1],
        duration: 400,
        easing: 'easeOutCubic'
      });

      anime({
        targets: elementsRef.current.svg,
        scale: [1, 1.08],
        duration: 500,
        easing: 'easeOutElastic(1, .6)'
      });

      // Speed up animations on hover
      if (timelineRef.current) {
        anime({
          targets: timelineRef.current,
          duration: 300,
          timeScale: 1.5,
          easing: 'easeOutQuad'
        });
      }
    } else {
      anime({
        targets: elementsRef.current.outerGlow,
        opacity: [0.6, 0],
        duration: 300,
        easing: 'easeOutQuad'
      });

      anime({
        targets: elementsRef.current.svg,
        scale: [1.08, 1],
        duration: 400,
        easing: 'easeOutElastic(1, .6)'
      });

      // Return to normal speed
      if (timelineRef.current) {
        anime({
          targets: timelineRef.current,
          duration: 300,
          timeScale: 1,
          easing: 'easeOutQuad'
        });
      }
    }
  }, [isHovered]);

  // Click/active effects
  useEffect(() => {
    if (!elementsRef.current.centerCore) return;

    if (isActive) {
      // Burst effect
      anime({
        targets: elementsRef.current.particles,
        scale: [1, 2, 1],
        opacity: [0.6, 1, 0.6],
        duration: 600,
        easing: 'easeOutElastic(1, .8)',
        delay: anime.stagger(20, {from: 'center'})
      });

      anime({
        targets: elementsRef.current.centerCore,
        scale: [1, 1.8, 1],
        duration: 500,
        easing: 'easeOutElastic(1, .7)'
      });

      anime({
        targets: elementsRef.current.rings,
        scale: [1, 1.1, 1],
        opacity: [0.4, 0.8, 0.4],
        duration: 600,
        easing: 'easeOutQuad',
        delay: anime.stagger(50)
      });
    }
  }, [isActive]);

  // Parallax effect based on mouse position
  useEffect(() => {
    if (!isHovered || !elementsRef.current.svg) return;

    const interval = setInterval(() => {
      const { x, y } = mousePositionRef.current;

      if (elementsRef.current.centerLines) {
        elementsRef.current.centerLines.forEach((line, i) => {
          const factor = (i / elementsRef.current.centerLines.length) * 0.5;
          anime({
            targets: line,
            translateX: x * 2 * factor,
            translateY: y * 2 * factor,
            duration: 800,
            easing: 'easeOutQuad'
          });
        });
      }

      if (elementsRef.current.particles) {
        elementsRef.current.particles.forEach((particle, i) => {
          const factor = (i / elementsRef.current.particles.length) * 0.3;
          anime({
            targets: particle,
            translateX: x * 1.5 * factor,
            translateY: y * 1.5 * factor,
            duration: 600,
            easing: 'easeOutQuad'
          });
        });
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isHovered]);

  return (
    <div
      ref={containerRef}
      className={className}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'transform 0.3s ease'
      }}
    />
  );
};

export default AnimatedAvatar;
