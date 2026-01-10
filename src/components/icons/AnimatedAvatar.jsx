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

  // Helper function to get color based on angle (rainbow gradient around the circle)
  const getColorForAngle = (angle) => {
    // Normalize angle to 0-1
    const normalized = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2);

    // Create rainbow gradient: Red → Orange → Yellow → Green → Cyan → Blue → Red
    if (normalized < 0.166) {
      // Red to Orange
      return `rgb(${255}, ${Math.floor(100 + normalized * 6 * 155)}, 0)`;
    } else if (normalized < 0.333) {
      // Orange to Yellow
      return `rgb(${255}, ${Math.floor(165 + (normalized - 0.166) * 6 * 90)}, 0)`;
    } else if (normalized < 0.5) {
      // Yellow to Green
      const factor = (normalized - 0.333) * 6;
      return `rgb(${Math.floor(255 - factor * 255)}, ${255}, 0)`;
    } else if (normalized < 0.666) {
      // Green to Cyan
      const factor = (normalized - 0.5) * 6;
      return `rgb(0, ${255}, ${Math.floor(factor * 255)})`;
    } else if (normalized < 0.833) {
      // Cyan to Blue
      const factor = (normalized - 0.666) * 6;
      return `rgb(0, ${Math.floor(255 - factor * 155)}, ${255})`;
    } else {
      // Blue to Red
      const factor = (normalized - 0.833) * 6;
      return `rgb(${Math.floor(factor * 255)}, 0, ${Math.floor(255 - factor * 155)})`;
    }
  };

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

    // Create segmented rings - tick marks like a clock
    const rings = [];
    const ringConfigs = [
      { radius: center - 3, segments: 60, tickHeight: 2, tickWidth: 0.8 },  // Outer ring - most segments
      { radius: center - 7, segments: 48, tickHeight: 2, tickWidth: 0.8 },
      { radius: center - 11, segments: 36, tickHeight: 2, tickWidth: 0.8 },
    ];

    ringConfigs.forEach((config, ringIndex) => {
      const ringGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      ringGroup.style.transformOrigin = '50% 50%';

      const segments = [];
      for (let i = 0; i < config.segments; i++) {
        const angle = (i / config.segments) * Math.PI * 2 - Math.PI / 2; // Start from top

        // Get color based on angle (rainbow gradient around)
        const color = getColorForAngle(angle);

        // Position tick mark on the circle (pointing radially outward)
        const x = center + Math.cos(angle) * config.radius;
        const y = center + Math.sin(angle) * config.radius;

        // Create tick mark (small vertical rectangle)
        const segment = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        segment.setAttribute('x', x - config.tickWidth / 2);
        segment.setAttribute('y', y - config.tickHeight / 2);
        segment.setAttribute('width', config.tickWidth);
        segment.setAttribute('height', config.tickHeight);
        segment.setAttribute('fill', color);
        segment.setAttribute('opacity', 0.8 - ringIndex * 0.15);
        segment.setAttribute('rx', 0.2);

        // Rotate to point outward from center
        segment.style.transformOrigin = `${x}px ${y}px`;
        segment.style.transform = `rotate(${(angle + Math.PI / 2) * 180 / Math.PI}deg)`;

        ringGroup.appendChild(segment);
        segments.push(segment);
      }

      svg.appendChild(ringGroup);
      rings.push({ group: ringGroup, segments, config });
    });

    // Center red dot
    const centerDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    centerDot.setAttribute('cx', center);
    centerDot.setAttribute('cy', center);
    centerDot.setAttribute('r', 2);
    centerDot.setAttribute('fill', '#ef4444');
    centerDot.setAttribute('opacity', 1);
    svg.appendChild(centerDot);

    // White highlight in center
    const centerHighlight = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    centerHighlight.setAttribute('cx', center);
    centerHighlight.setAttribute('cy', center);
    centerHighlight.setAttribute('r', 0.8);
    centerHighlight.setAttribute('fill', '#ffffff');
    centerHighlight.setAttribute('opacity', 0.9);
    svg.appendChild(centerHighlight);

    // Store elements for state changes
    elementsRef.current = {
      rings,
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
        duration: 30000 - (i * 5000), // Slower, smoother rotation
        easing: 'linear'
      }, 0);
    });

    // Pulse center dot
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
      opacity: [0.7, 1, 0.7],
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
          timeScale: 1.8,
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
        scale: [1, 2, 1],
        duration: 500,
        easing: 'easeOutElastic(1, .7)'
      });

      if (elementsRef.current.rings) {
        elementsRef.current.rings.forEach((ring, i) => {
          anime({
            targets: ring.segments,
            scale: [1, 1.5, 1],
            opacity: [0.8, 1, 0.8],
            duration: 600,
            easing: 'easeOutQuad',
            delay: anime.stagger(5, {from: 'center'})
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
