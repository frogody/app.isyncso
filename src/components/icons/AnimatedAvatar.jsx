import React, { useEffect, useRef } from 'react';
import anime from '@/lib/anime-wrapper';

const AnimatedAvatar = ({ size = 160, state = 'idle', className = "" }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const stateRef = useRef({
    outerRingRotation: 0,
    morphProgress: 0,
    morphState: 0, // 0, 1, 2 for three states
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size with retina support
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const center = size / 2;
    const radius = size / 2 - 5; // Minimal padding for small sizes

    // State-based animation speed
    const getAnimationSpeed = (state) => {
      switch(state) {
        case 'idle': return 1.0;    // Normal speed
        case 'active': return 2.5;  // 2.5x faster
        case 'loading': return 0.5; // Slower, pulsing
        default: return 1.0;
      }
    };
    const speedMultiplier = getAnimationSpeed(state);

    // Animation timelines with anime.js
    const outerRingAnim = anime({
      targets: stateRef.current,
      outerRingRotation: 360,
      duration: 30000 / speedMultiplier,
      easing: 'linear',
      loop: true
    });

    // Morph animation - cycles through 3 states
    const morphAnim = anime({
      targets: stateRef.current,
      morphProgress: [
        { value: 1, duration: 3500 / speedMultiplier, easing: 'easeInOutQuad' },
        { value: 0, duration: 100, easing: 'linear' }
      ],
      loop: true,
      update: () => {
        if (stateRef.current.morphProgress >= 0.99) {
          stateRef.current.morphState = (stateRef.current.morphState + 1) % 3;
        }
      }
    });

    // Draw functions
    const drawOuterRing = () => {
      const rotation = (stateRef.current.outerRingRotation * Math.PI) / 180;
      const segments = size < 80 ? 180 : 360; // More segments for smoother edges
      const strokeWidth = Math.max(1.2, size / 28); // Thinner stroke for cleaner edges

      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2 + rotation;
        const nextAngle = ((i + 1) / segments) * Math.PI * 2 + rotation;

        // Color gradient around the circle
        const hue = (i / segments) * 360;
        const color = `hsl(${hue}, 100%, 60%)`;

        ctx.strokeStyle = color;
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.arc(center, center, radius, angle, nextAngle);
        ctx.stroke();
      }
    };

    const drawCentralShape = () => {
      const numLines = 35;
      const { morphProgress, morphState } = stateRef.current;

      // Define three states for morphing
      const states = [
        { type: 'diamond', scaleX: 1, scaleY: 1.4 }, // Vertical diamond
        { type: 'diamond', scaleX: 1.4, scaleY: 1 }, // Horizontal diamond
        { type: 'circle', scaleX: 1.2, scaleY: 1.2 } // Circular blob
      ];

      const currentState = states[morphState];
      const nextState = states[(morphState + 1) % 3];

      // Interpolate between states
      const t = morphProgress;
      const scaleX = currentState.scaleX + (nextState.scaleX - currentState.scaleX) * t;
      const scaleY = currentState.scaleY + (nextState.scaleY - currentState.scaleY) * t;
      const isCircle = nextState.type === 'circle' && t > 0.5;

      ctx.strokeStyle = '#ff6b6b';
      ctx.fillStyle = '#ff6b6b';

      const shapeSize = size * 0.25; // Smaller shape for better spacing
      const shapeHeight = shapeSize * 1.25;

      for (let i = 0; i < numLines; i++) {
        const yOffset = (i / numLines - 0.5) * shapeHeight;

        let lineWidth;
        if (isCircle) {
          // Circular shape
          const distFromCenter = Math.abs(yOffset) / (shapeHeight / 2);
          lineWidth = Math.sqrt(1 - distFromCenter * distFromCenter) * shapeSize * scaleX;
        } else {
          // Diamond shape
          const distFromCenter = Math.abs(yOffset) / (shapeHeight / 2);
          lineWidth = (1 - distFromCenter) * shapeSize * scaleX;
        }

        if (lineWidth > 0) {
          const y = center + yOffset * scaleY;
          const lineHeight = 1.2;

          ctx.fillRect(
            center - lineWidth / 2,
            y - lineHeight / 2,
            lineWidth,
            lineHeight
          );
        }
      }
    };

    const drawGlow = () => {
      const glowRadius = Math.max(radius * 0.35, 3); // Smaller glow for compact look
      const gradient = ctx.createRadialGradient(center, center, 0, center, center, glowRadius);
      gradient.addColorStop(0, 'rgba(255, 107, 107, 0.15)');
      gradient.addColorStop(1, 'rgba(255, 107, 107, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(center, center, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    };

    // Main animation loop
    const animate = () => {
      // Clear canvas with pure black to match app background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, size, size);

      // Apply pulsing effect for loading state
      if (state === 'loading') {
        const pulse = Math.sin(Date.now() / 300) * 0.15 + 0.85; // 0.7-1.0 range
        ctx.globalAlpha = pulse;
      } else {
        ctx.globalAlpha = 1.0;
      }

      // Draw simplified 3-layer design
      drawGlow();
      drawOuterRing();
      drawCentralShape();

      // Reset global alpha
      ctx.globalAlpha = 1.0;

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      outerRingAnim.pause();
      morphAnim.pause();
    };
  }, [size, state]);

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        style={{
          borderRadius: '50%',
          boxShadow: '0 0 20px rgba(255, 107, 107, 0.3)',
        }}
      />
    </div>
  );
};

export default AnimatedAvatar;
