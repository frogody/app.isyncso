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

    // Radial gradient for center glow
    const radialGradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
    radialGradient.setAttribute('id', 'center-glow');
    radialGradient.setAttribute('cx', '50%');
    radialGradient.setAttribute('cy', '50%');

    const radialStops = [
      { offset: '0%', color: '#ff0000', opacity: 1 },
      { offset: '50%', color: '#ff3333', opacity: 0.8 },
      { offset: '100%', color: '#ff0000', opacity: 0.3 }
    ];

    radialStops.forEach(stop => {
      const stopEl = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stopEl.setAttribute('offset', stop.offset);
      stopEl.setAttribute('stop-color', stop.color);
      stopEl.setAttribute('stop-opacity', stop.opacity);
      radialGradient.appendChild(stopEl);
    });

    defs.appendChild(radialGradient);
    svg.appendChild(defs);

    // Create segmented rings - exactly like the reference
    const rings = [];
    const ringConfigs = [
      { radius: center - 3, segments: 24, segmentLength: 2.5, gap: 1.5, color: '#ef4444', opacity: 0.8 }, // Red/orange inner
      { radius: center - 7, segments: 28, segmentLength: 2.8, gap: 1.8, color: '#f97316', opacity: 0.7 }, // Orange
      { radius: center - 11, segments: 32, segmentLength: 3, gap: 2, color: '#f59e0b', opacity: 0.6 },    // Amber
      { radius: center - 15, segments: 36, segmentLength: 3.2, gap: 2.2, color: '#06b6d4', opacity: 0.5 }, // Cyan outer
    ];

    ringConfigs.forEach((config, ringIndex) => {
      const ringGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      ringGroup.style.transformOrigin = '50% 50%';

      const segments = [];
      for (let i = 0; i < config.segments; i++) {
        const angle = (i / config.segments) * Math.PI * 2;
        const nextAngle = ((i + 0.5) / config.segments) * Math.PI * 2;

        // Calculate start and end points for segment arc
        const x1 = center + Math.cos(angle) * config.radius;
        const y1 = center + Math.sin(angle) * config.radius;
        const x2 = center + Math.cos(nextAngle) * config.radius;
        const y2 = center + Math.sin(nextAngle) * config.radius;

        // Create rectangular segment
        const segment = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        segment.setAttribute('x', x1 - 1);
        segment.setAttribute('y', y1 - config.segmentLength / 2);
        segment.setAttribute('width', 2);
        segment.setAttribute('height', config.segmentLength);
        segment.setAttribute('fill', config.color);
        segment.setAttribute('opacity', config.opacity);
        segment.setAttribute('rx', 0.5);
        segment.style.transformOrigin = `${center}px ${center}px`;
        segment.style.transform = `rotate(${(angle * 180 / Math.PI)}deg)`;

        ringGroup.appendChild(segment);
        segments.push(segment);
      }

      svg.appendChild(ringGroup);
      rings.push({ group: ringGroup, segments, config });
    });

    // Create bright red pulsing center core
    const centerCoreOuter = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    centerCoreOuter.setAttribute('cx', center);
    centerCoreOuter.setAttribute('cy', center);
    centerCoreOuter.setAttribute('r', 4);
    centerCoreOuter.setAttribute('fill', 'url(#center-glow)');
    centerCoreOuter.setAttribute('opacity', 0.6);
    svg.appendChild(centerCoreOuter);

    const centerCore = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    centerCore.setAttribute('cx', center);
    centerCore.setAttribute('cy', center);
    centerCore.setAttribute('r', 2.5);
    centerCore.setAttribute('fill', '#ff0000');
    centerCore.setAttribute('opacity', 1);
    svg.appendChild(centerCore);

    const centerCoreInner = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    centerCoreInner.setAttribute('cx', center);
    centerCoreInner.setAttribute('cy', center);
    centerCoreInner.setAttribute('r', 1.2);
    centerCoreInner.setAttribute('fill', '#ffffff');
    centerCoreInner.setAttribute('opacity', 1);
    svg.appendChild(centerCoreInner);

    // Store elements for state changes
    elementsRef.current = {
      rings,
      centerCore,
      centerCoreOuter,
      centerCoreInner,
      svg
    };

    // Create main timeline animation
    const timeline = anime.timeline({
      loop: true,
      easing: 'linear'
    });

    // Rotate each ring at different speeds and directions (alternating)
    rings.forEach((ring, i) => {
      timeline.add({
        targets: ring.group,
        rotate: i % 2 === 0 ? 360 : -360,
        duration: 20000 - (i * 3000), // Slower outer rings
        easing: 'linear'
      }, 0);
    });

    // Pulse center core
    timeline.add({
      targets: centerCoreOuter,
      scale: [1, 1.4, 1],
      opacity: [0.4, 0.8, 0.4],
      duration: 2000,
      easing: 'easeInOutQuad'
    }, 0);

    timeline.add({
      targets: centerCore,
      scale: [1, 1.2, 1],
      opacity: [0.9, 1, 0.9],
      duration: 2000,
      easing: 'easeInOutQuad'
    }, 0);

    timeline.add({
      targets: centerCoreInner,
      scale: [1, 1.3, 1],
      opacity: [0.9, 1, 0.9],
      duration: 2000,
      easing: 'easeInOutQuad'
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
    if (!elementsRef.current.svg) return;

    if (isHovered) {
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
        targets: elementsRef.current.centerCore,
        scale: [1, 1.8, 1],
        duration: 500,
        easing: 'easeOutElastic(1, .7)'
      });

      if (elementsRef.current.rings) {
        elementsRef.current.rings.forEach((ring, i) => {
          anime({
            targets: ring.group,
            scale: [1, 1.1, 1],
            opacity: [ring.config.opacity, ring.config.opacity * 1.5, ring.config.opacity],
            duration: 600,
            easing: 'easeOutQuad',
            delay: i * 50
          });
        });
      }
    }
  }, [isActive]);

  // Parallax effect based on mouse position
  useEffect(() => {
    if (!isHovered || !elementsRef.current.svg) return;

    const interval = setInterval(() => {
      const { x, y } = mousePositionRef.current;

      if (elementsRef.current.rings) {
        elementsRef.current.rings.forEach((ring, i) => {
          const factor = (i / elementsRef.current.rings.length) * 0.3;
          anime({
            targets: ring.group,
            translateX: x * 2 * factor,
            translateY: y * 2 * factor,
            duration: 800,
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
