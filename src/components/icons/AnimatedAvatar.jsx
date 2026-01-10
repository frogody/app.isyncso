import React, { useEffect, useRef, useState, useCallback } from 'react';
import anime from '@/lib/anime-wrapper';

const AnimatedAvatar = ({ size = 40, className = "", state = 'idle' }) => {
  const containerRef = useRef(null);
  const timelineRef = useRef(null);
  const elementsRef = useRef({});
  const [isHovered, setIsHovered] = useState(false);

  // Helper function to get color based on angle (rainbow gradient around the circle)
  const getColorForAngle = (angle) => {
    const normalized = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2);

    if (normalized < 0.166) return `hsl(${normalized * 6 * 60}, 100%, 50%)`;
    else if (normalized < 0.333) return `hsl(${60 + (normalized - 0.166) * 6 * 60}, 100%, 50%)`;
    else if (normalized < 0.5) return `hsl(${120 + (normalized - 0.333) * 6 * 60}, 100%, 50%)`;
    else if (normalized < 0.666) return `hsl(${180 + (normalized - 0.5) * 6 * 60}, 100%, 50%)`;
    else if (normalized < 0.833) return `hsl(${240 + (normalized - 0.666) * 6 * 60}, 100%, 50%)`;
    else return `hsl(${300 + (normalized - 0.833) * 6 * 60}, 100%, 50%)`;
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

    // Create rings with reduced segments for performance
    const rings = [];
    const ringConfigs = [
      { radius: center - 3, segments: 24, tickHeight: 2, tickWidth: 0.8, opacity: 0.8 },
      { radius: center - 7, segments: 20, tickHeight: 1.8, tickWidth: 0.7, opacity: 0.6 },
      { radius: center - 11, segments: 16, tickHeight: 1.6, tickWidth: 0.6, opacity: 0.4 },
    ];

    ringConfigs.forEach((config) => {
      const ringGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      ringGroup.style.transformOrigin = '50% 50%';

      const segments = [];
      for (let i = 0; i < config.segments; i++) {
        const angle = (i / config.segments) * Math.PI * 2 - Math.PI / 2;
        const color = getColorForAngle(angle);

        const x = center + Math.cos(angle) * config.radius;
        const y = center + Math.sin(angle) * config.radius;

        const segment = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        segment.setAttribute('x', x - config.tickWidth / 2);
        segment.setAttribute('y', y - config.tickHeight / 2);
        segment.setAttribute('width', config.tickWidth);
        segment.setAttribute('height', config.tickHeight);
        segment.setAttribute('fill', color);
        segment.setAttribute('opacity', config.opacity);
        segment.setAttribute('rx', 0.2);

        segment.style.transformOrigin = `${x}px ${y}px`;
        segment.style.transform = `rotate(${(angle + Math.PI / 2) * 180 / Math.PI}deg)`;

        ringGroup.appendChild(segment);
        segments.push(segment);
      }

      svg.appendChild(ringGroup);
      rings.push({ group: ringGroup, segments, config });
    });

    // Center dot
    const centerDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    centerDot.setAttribute('cx', center);
    centerDot.setAttribute('cy', center);
    centerDot.setAttribute('r', 2);
    centerDot.setAttribute('fill', '#ef4444');
    centerDot.setAttribute('opacity', 1);
    svg.appendChild(centerDot);

    // White highlight
    const centerHighlight = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    centerHighlight.setAttribute('cx', center);
    centerHighlight.setAttribute('cy', center);
    centerHighlight.setAttribute('r', 0.8);
    centerHighlight.setAttribute('fill', '#ffffff');
    centerHighlight.setAttribute('opacity', 0.9);
    svg.appendChild(centerHighlight);

    // Store elements
    elementsRef.current = {
      rings,
      centerDot,
      centerHighlight,
      svg
    };

    // Create efficient timeline
    const timeline = anime.timeline({
      loop: true,
      easing: 'linear'
    });

    // Rotate rings only - no complex animations
    rings.forEach((ring, i) => {
      timeline.add({
        targets: ring.group,
        rotate: i % 2 === 0 ? 360 : -360,
        duration: 30000 - (i * 5000),
        easing: 'linear'
      }, 0);
    });

    // Simple center pulse
    timeline.add({
      targets: centerDot,
      scale: [1, 1.2, 1],
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

  // Simplified hover - no complex stagger or parallax
  useEffect(() => {
    if (!elementsRef.current.svg) return;

    if (isHovered) {
      anime({
        targets: elementsRef.current.svg,
        scale: [1, 1.08],
        duration: 300,
        easing: 'easeOutQuad'
      });

      if (timelineRef.current) {
        anime({
          targets: timelineRef.current,
          timeScale: 1.5,
          duration: 200,
          easing: 'easeOutQuad'
        });
      }
    } else {
      anime({
        targets: elementsRef.current.svg,
        scale: [1.08, 1],
        duration: 300,
        easing: 'easeOutQuad'
      });

      if (timelineRef.current) {
        anime({
          targets: timelineRef.current,
          timeScale: 1,
          duration: 200,
          easing: 'easeOutQuad'
        });
      }
    }
  }, [isHovered]);

  return (
    <div
      ref={containerRef}
      className={className}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
    />
  );
};

export default AnimatedAvatar;
