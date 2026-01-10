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
    const normalized = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2);

    // Rainbow: Red → Orange → Yellow → Green → Cyan → Blue → Purple → Red
    if (normalized < 0.14) {
      return `rgb(255, ${Math.floor(normalized * 7 * 100)}, 0)`;
    } else if (normalized < 0.28) {
      return `rgb(255, ${Math.floor(100 + (normalized - 0.14) * 7 * 155)}, 0)`;
    } else if (normalized < 0.42) {
      const factor = (normalized - 0.28) * 7;
      return `rgb(${Math.floor(255 - factor * 255)}, 255, 0)`;
    } else if (normalized < 0.57) {
      const factor = (normalized - 0.42) * 7;
      return `rgb(0, 255, ${Math.floor(factor * 255)})`;
    } else if (normalized < 0.71) {
      const factor = (normalized - 0.57) * 7;
      return `rgb(0, ${Math.floor(255 - factor * 155)}, 255)`;
    } else if (normalized < 0.85) {
      const factor = (normalized - 0.71) * 7;
      return `rgb(${Math.floor(factor * 200)}, 0, 255)`;
    } else {
      const factor = (normalized - 0.85) * 7;
      return `rgb(${Math.floor(200 + factor * 55)}, 0, ${Math.floor(255 - factor * 255)})`;
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

    // Create defs for filters
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    // Glow filter
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'glow');
    const feGaussianBlur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
    feGaussianBlur.setAttribute('stdDeviation', '1.5');
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
    defs.appendChild(filter);
    svg.appendChild(defs);

    // Create particle grid for stagger effects
    const particles = [];
    const gridSize = 8;
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const angle = Math.atan2(row - gridSize/2, col - gridSize/2);
        const distance = Math.sqrt(Math.pow(row - gridSize/2, 2) + Math.pow(col - gridSize/2, 2));
        const radius = (distance / (gridSize/2)) * (center - 18);

        if (radius > 3 && radius < center - 18) {
          const x = center + Math.cos(angle) * radius;
          const y = center + Math.sin(angle) * radius;

          const particle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          particle.setAttribute('cx', x);
          particle.setAttribute('cy', y);
          particle.setAttribute('r', 0.4);
          particle.setAttribute('fill', getColorForAngle(angle));
          particle.setAttribute('opacity', 0.3);
          particle.setAttribute('filter', 'url(#glow)');
          svg.appendChild(particle);
          particles.push(particle);
        }
      }
    }

    // Create segmented rings - clock tick marks
    const rings = [];
    const ringConfigs = [
      { radius: center - 3, segments: 72, tickHeight: 2.5, tickWidth: 1, opacity: 0.9 },
      { radius: center - 7, segments: 60, tickHeight: 2.2, tickWidth: 0.9, opacity: 0.75 },
      { radius: center - 11, segments: 48, tickHeight: 2, tickWidth: 0.8, opacity: 0.6 },
      { radius: center - 15, segments: 36, tickHeight: 1.8, tickWidth: 0.7, opacity: 0.45 },
    ];

    ringConfigs.forEach((config, ringIndex) => {
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
        segment.setAttribute('rx', 0.3);
        segment.setAttribute('filter', 'url(#glow)');

        segment.style.transformOrigin = `${x}px ${y}px`;
        segment.style.transform = `rotate(${(angle + Math.PI / 2) * 180 / Math.PI}deg)`;

        ringGroup.appendChild(segment);
        segments.push(segment);
      }

      svg.appendChild(ringGroup);
      rings.push({ group: ringGroup, segments, config });
    });

    // Orbital particles with stagger
    const orbitals = [];
    const numOrbitals = 16;
    for (let i = 0; i < numOrbitals; i++) {
      const angle = (i / numOrbitals) * Math.PI * 2;
      const radius = center - 19;
      const x = center + Math.cos(angle) * radius;
      const y = center + Math.sin(angle) * radius;

      const orbital = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      orbital.setAttribute('cx', x);
      orbital.setAttribute('cy', y);
      orbital.setAttribute('r', 1);
      orbital.setAttribute('fill', getColorForAngle(angle));
      orbital.setAttribute('opacity', 0.6);
      orbital.setAttribute('filter', 'url(#glow)');
      svg.appendChild(orbital);
      orbitals.push(orbital);
    }

    // Center gradient circle
    const centerGlow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    centerGlow.setAttribute('cx', center);
    centerGlow.setAttribute('cy', center);
    centerGlow.setAttribute('r', 5);
    centerGlow.setAttribute('fill', '#ef4444');
    centerGlow.setAttribute('opacity', 0.4);
    centerGlow.setAttribute('filter', 'url(#glow)');
    svg.appendChild(centerGlow);

    // Center dot
    const centerDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    centerDot.setAttribute('cx', center);
    centerDot.setAttribute('cy', center);
    centerDot.setAttribute('r', 2.5);
    centerDot.setAttribute('fill', '#ef4444');
    centerDot.setAttribute('opacity', 1);
    centerDot.setAttribute('filter', 'url(#glow)');
    svg.appendChild(centerDot);

    // White highlight
    const centerHighlight = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    centerHighlight.setAttribute('cx', center);
    centerHighlight.setAttribute('cy', center);
    centerHighlight.setAttribute('r', 1);
    centerHighlight.setAttribute('fill', '#ffffff');
    centerHighlight.setAttribute('opacity', 1);
    svg.appendChild(centerHighlight);

    // Store elements
    elementsRef.current = {
      rings,
      particles,
      orbitals,
      centerGlow,
      centerDot,
      centerHighlight,
      svg
    };

    // Create master timeline with spring easing
    const timeline = anime.timeline({
      loop: true,
      easing: 'linear'
    });

    // Rotate rings at different speeds with alternating directions
    rings.forEach((ring, i) => {
      timeline.add({
        targets: ring.group,
        rotate: i % 2 === 0 ? 360 : -360,
        duration: 35000 - (i * 6000),
        easing: 'linear'
      }, 0);

      // Subtle pulse on segments with stagger
      timeline.add({
        targets: ring.segments,
        opacity: [ring.config.opacity * 0.7, ring.config.opacity * 1.2, ring.config.opacity * 0.7],
        scale: [0.8, 1.2, 0.8],
        duration: 3000,
        delay: anime.stagger(40, {from: 'center', easing: 'easeInOutQuad'}),
        easing: 'easeInOutSine'
      }, 0);
    });

    // Grid stagger wave effect on particles from center
    timeline.add({
      targets: particles,
      scale: [0.5, 1.5, 0.5],
      opacity: [0.2, 0.8, 0.2],
      duration: 4000,
      delay: anime.stagger(30, {
        grid: [gridSize, gridSize],
        from: 'center',
        easing: 'easeOutQuad'
      }),
      easing: 'easeInOutSine'
    }, 0);

    // Orbital particles with spring-like motion
    timeline.add({
      targets: orbitals,
      scale: [0.7, 1.4, 0.7],
      opacity: [0.4, 1, 0.4],
      duration: 2500,
      delay: anime.stagger(100, {from: 'center', easing: 'spring(1, 80, 10, 0)'}),
      easing: 'spring(1, 80, 10, 0)'
    }, 0);

    // Center glow pulse with spring
    timeline.add({
      targets: centerGlow,
      scale: [1, 1.6, 1],
      opacity: [0.3, 0.7, 0.3],
      duration: 2000,
      easing: 'spring(1, 80, 10, 0)'
    }, 0);

    // Center dot pulse
    timeline.add({
      targets: centerDot,
      scale: [1, 1.3, 1],
      opacity: [0.9, 1, 0.9],
      duration: 2000,
      easing: 'easeInOutQuad'
    }, 0);

    // Highlight shimmer
    timeline.add({
      targets: centerHighlight,
      scale: [1, 1.4, 1],
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

  // Interactive hover with spring physics
  useEffect(() => {
    if (!elementsRef.current.svg) return;

    if (isHovered) {
      // Scale up with elastic bounce
      anime({
        targets: elementsRef.current.svg,
        scale: [1, 1.1],
        duration: 800,
        easing: 'spring(1, 80, 10, 0)'
      });

      // Speed up timeline
      if (timelineRef.current) {
        anime({
          targets: timelineRef.current,
          timeScale: 2,
          duration: 400,
          easing: 'easeOutQuad'
        });
      }

      // Orbital burst with stagger
      if (elementsRef.current.orbitals) {
        anime({
          targets: elementsRef.current.orbitals,
          scale: [1, 1.8, 1],
          duration: 600,
          delay: anime.stagger(30, {from: 'center'}),
          easing: 'spring(1, 80, 10, 0)'
        });
      }
    } else {
      anime({
        targets: elementsRef.current.svg,
        scale: [1.1, 1],
        duration: 600,
        easing: 'spring(1, 80, 10, 0)'
      });

      if (timelineRef.current) {
        anime({
          targets: timelineRef.current,
          timeScale: 1,
          duration: 400,
          easing: 'easeOutQuad'
        });
      }
    }
  }, [isHovered]);

  // Click burst with complex stagger
  useEffect(() => {
    if (!elementsRef.current.centerDot) return;

    if (isActive) {
      // Center explosion
      anime({
        targets: elementsRef.current.centerGlow,
        scale: [1, 3, 1],
        opacity: [0.4, 0.9, 0.4],
        duration: 800,
        easing: 'spring(1, 80, 10, 0)'
      });

      anime({
        targets: elementsRef.current.centerDot,
        scale: [1, 2.5, 1],
        duration: 700,
        easing: 'spring(1, 80, 10, 0)'
      });

      // Ring explosion with stagger
      if (elementsRef.current.rings) {
        elementsRef.current.rings.forEach((ring, i) => {
          anime({
            targets: ring.segments,
            scale: [1, 2, 1],
            opacity: [ring.config.opacity, 1, ring.config.opacity],
            duration: 800,
            delay: anime.stagger(10, {from: 'center', easing: 'easeOutQuad'}),
            easing: 'spring(1, 80, 10, 0)'
          });
        });
      }

      // Particle burst from center
      if (elementsRef.current.particles) {
        anime({
          targets: elementsRef.current.particles,
          scale: [0.5, 2.5, 0.5],
          opacity: [0.3, 1, 0.3],
          duration: 900,
          delay: anime.stagger(15, {
            grid: [8, 8],
            from: 'center',
            easing: 'easeOutQuint'
          }),
          easing: 'spring(1, 80, 10, 0)'
        });
      }
    }
  }, [isActive]);

  // Parallax with smooth damping
  useEffect(() => {
    if (!isHovered || !elementsRef.current.svg) return;

    const interval = setInterval(() => {
      const { x, y } = mousePositionRef.current;

      if (elementsRef.current.rings) {
        elementsRef.current.rings.forEach((ring, i) => {
          const factor = (i / elementsRef.current.rings.length) * 0.4;
          anime({
            targets: ring.group,
            translateX: x * 3 * factor,
            translateY: y * 3 * factor,
            duration: 1000,
            easing: 'easeOutQuint'
          });
        });
      }

      if (elementsRef.current.centerGlow) {
        anime({
          targets: [elementsRef.current.centerGlow, elementsRef.current.centerDot],
          translateX: x * 2,
          translateY: y * 2,
          duration: 800,
          easing: 'easeOutQuad'
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
