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

    // Create segmented rings - small squares arranged in circles
    const rings = [];
    const ringConfigs = [
      // Outer to inner: red/pink → orange → amber
      { radius: center - 4, segments: 20, squareSize: 2, color: '#ef4444', opacity: 0.9 },   // Red outer
      { radius: center - 8, segments: 18, squareSize: 2, color: '#f97316', opacity: 0.85 },  // Orange
      { radius: center - 12, segments: 16, squareSize: 2, color: '#f59e0b', opacity: 0.8 },  // Amber
      { radius: center - 16, segments: 14, squareSize: 2, color: '#fbbf24', opacity: 0.75 }, // Yellow
    ];

    ringConfigs.forEach((config, ringIndex) => {
      const ringGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      ringGroup.style.transformOrigin = '50% 50%';

      const segments = [];
      for (let i = 0; i < config.segments; i++) {
        const angle = (i / config.segments) * Math.PI * 2;

        // Position square on the circle
        const x = center + Math.cos(angle) * config.radius;
        const y = center + Math.sin(angle) * config.radius;

        // Create small square segment
        const segment = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        segment.setAttribute('x', x - config.squareSize / 2);
        segment.setAttribute('y', y - config.squareSize / 2);
        segment.setAttribute('width', config.squareSize);
        segment.setAttribute('height', config.squareSize);
        segment.setAttribute('fill', config.color);
        segment.setAttribute('opacity', config.opacity);
        segment.setAttribute('rx', 0.3); // Slightly rounded corners

        ringGroup.appendChild(segment);
        segments.push(segment);
      }

      svg.appendChild(ringGroup);
      rings.push({ group: ringGroup, segments, config });
    });

    // Teal/cyan middle circle (solid circle, not segments)
    const middleCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    middleCircle.setAttribute('cx', center);
    middleCircle.setAttribute('cy', center);
    middleCircle.setAttribute('r', 7);
    middleCircle.setAttribute('fill', '#06b6d4');
    middleCircle.setAttribute('opacity', 0.9);
    svg.appendChild(middleCircle);

    // Dark inner circle for depth
    const innerDarkCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    innerDarkCircle.setAttribute('cx', center);
    innerDarkCircle.setAttribute('cy', center);
    innerDarkCircle.setAttribute('r', 4);
    innerDarkCircle.setAttribute('fill', '#0e7490');
    innerDarkCircle.setAttribute('opacity', 1);
    svg.appendChild(innerDarkCircle);

    // Bright red center dot
    const centerDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    centerDot.setAttribute('cx', center);
    centerDot.setAttribute('cy', center);
    centerDot.setAttribute('r', 2);
    centerDot.setAttribute('fill', '#ff0000');
    centerDot.setAttribute('opacity', 1);
    svg.appendChild(centerDot);

    // White highlight in center
    const centerHighlight = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    centerHighlight.setAttribute('cx', center);
    centerHighlight.setAttribute('cy', center);
    centerHighlight.setAttribute('r', 0.8);
    centerHighlight.setAttribute('fill', '#ffffff');
    centerHighlight.setAttribute('opacity', 1);
    svg.appendChild(centerHighlight);

    // Store elements for state changes
    elementsRef.current = {
      rings,
      middleCircle,
      innerDarkCircle,
      centerDot,
      centerHighlight,
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
        duration: 25000 - (i * 4000), // Slower rotation for smoother look
        easing: 'linear'
      }, 0);
    });

    // Pulse middle teal circle
    timeline.add({
      targets: middleCircle,
      scale: [1, 1.1, 1],
      opacity: [0.8, 1, 0.8],
      duration: 3000,
      easing: 'easeInOutQuad'
    }, 0);

    // Pulse center red dot
    timeline.add({
      targets: centerDot,
      scale: [1, 1.3, 1],
      opacity: [0.9, 1, 0.9],
      duration: 2000,
      easing: 'easeInOutQuad'
    }, 0);

    // Pulse white highlight
    timeline.add({
      targets: centerHighlight,
      scale: [1, 1.2, 1],
      opacity: [0.8, 1, 0.8],
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
    if (!elementsRef.current.centerDot) return;

    if (isActive) {
      // Burst effect
      anime({
        targets: elementsRef.current.centerDot,
        scale: [1, 1.8, 1],
        duration: 500,
        easing: 'easeOutElastic(1, .7)'
      });

      anime({
        targets: elementsRef.current.middleCircle,
        scale: [1, 1.3, 1],
        duration: 600,
        easing: 'easeOutElastic(1, .7)'
      });

      if (elementsRef.current.rings) {
        elementsRef.current.rings.forEach((ring, i) => {
          anime({
            targets: ring.segments,
            scale: [1, 1.4, 1],
            duration: 600,
            easing: 'easeOutQuad',
            delay: anime.stagger(15, {from: 'center'})
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
