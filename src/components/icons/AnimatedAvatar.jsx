import React, { useEffect, useRef } from 'react';
import anime from '@/lib/anime-wrapper';

const AnimatedAvatar = ({ size = 160, className = "" }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const stateRef = useRef({
    outerRingRotation: 0,
    tickWaveOffset: 0,
    arcTrail1Rotation: 0,
    arcTrail2Rotation: 0,
    arcTrail3Rotation: 0,
    orbitRotation: 0,
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
    const radius = size / 2 - 15;

    // Animation timelines with anime.js
    const outerRingAnim = anime({
      targets: stateRef.current,
      outerRingRotation: 360,
      duration: 30000,
      easing: 'linear',
      loop: true
    });

    const tickWaveAnim = anime({
      targets: stateRef.current,
      tickWaveOffset: Math.PI * 2,
      duration: 4000,
      easing: 'linear',
      loop: true
    });

    const arcTrail1Anim = anime({
      targets: stateRef.current,
      arcTrail1Rotation: 360,
      duration: 20000,
      easing: 'linear',
      loop: true
    });

    const arcTrail2Anim = anime({
      targets: stateRef.current,
      arcTrail2Rotation: -360,
      duration: 25000,
      easing: 'linear',
      loop: true
    });

    const arcTrail3Anim = anime({
      targets: stateRef.current,
      arcTrail3Rotation: 360,
      duration: 35000,
      easing: 'linear',
      loop: true
    });

    const orbitAnim = anime({
      targets: stateRef.current,
      orbitRotation: 360,
      duration: 15000,
      easing: 'linear',
      loop: true
    });

    // Morph animation - cycles through 3 states
    const morphAnim = anime({
      targets: stateRef.current,
      morphProgress: [
        { value: 1, duration: 3500, easing: 'easeInOutQuad' },
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
      const segments = 360;
      const strokeWidth = 8;

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

    const drawTickMarks = () => {
      const numTicks = 72;
      const tickRadius = radius - 12;

      for (let i = 0; i < numTicks; i++) {
        const angle = (i / numTicks) * Math.PI * 2;
        const wave = Math.sin(angle * 3 + stateRef.current.tickWaveOffset);
        const tickLength = 4 + wave * 2;
        const highlight = wave > 0.5;

        ctx.strokeStyle = highlight ? '#555566' : '#333344';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'butt';

        const x1 = center + Math.cos(angle) * tickRadius;
        const y1 = center + Math.sin(angle) * tickRadius;
        const x2 = center + Math.cos(angle) * (tickRadius - tickLength);
        const y2 = center + Math.sin(angle) * (tickRadius - tickLength);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    };

    const drawArcTrails = () => {
      // Arc trail 1
      const rotation1 = (stateRef.current.arcTrail1Rotation * Math.PI) / 180;
      ctx.strokeStyle = 'rgba(255, 136, 102, 0.4)';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(center, center, radius - 20, rotation1, rotation1 + Math.PI / 2);
      ctx.stroke();

      // Arc trail 2
      const rotation2 = (stateRef.current.arcTrail2Rotation * Math.PI) / 180;
      ctx.strokeStyle = 'rgba(255, 136, 102, 0.3)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(center, center, radius - 30, rotation2, rotation2 + Math.PI / 3);
      ctx.stroke();

      // Arc trail 3
      const rotation3 = (stateRef.current.arcTrail3Rotation * Math.PI) / 180;
      ctx.strokeStyle = 'rgba(255, 136, 102, 0.35)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(center, center, radius - 25, rotation3, rotation3 + Math.PI / 2.5);
      ctx.stroke();
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

      for (let i = 0; i < numLines; i++) {
        const yOffset = (i / numLines - 0.5) * 50;

        let lineWidth;
        if (isCircle) {
          // Circular shape
          const distFromCenter = Math.abs(yOffset) / 25;
          lineWidth = Math.sqrt(1 - distFromCenter * distFromCenter) * 30 * scaleX;
        } else {
          // Diamond shape
          const distFromCenter = Math.abs(yOffset) / 25;
          lineWidth = (1 - distFromCenter) * 30 * scaleX;
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

    const drawOrbitingDots = () => {
      const numDots = 20;
      const orbitRotation = (stateRef.current.orbitRotation * Math.PI) / 180;
      const ellipseA = radius - 35; // Major axis
      const ellipseB = radius - 45; // Minor axis

      for (let i = 0; i < numDots; i++) {
        const angle = (i / numDots) * Math.PI * 2;
        const stagger = Math.sin(angle * 2) * 0.2;
        const adjustedAngle = angle + orbitRotation + stagger;

        const x = center + Math.cos(adjustedAngle) * ellipseA;
        const y = center + Math.sin(adjustedAngle) * ellipseB;
        const dotSize = 3 + Math.sin(angle * 3) * 1.5;

        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.arc(x, y, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawGlow = () => {
      const gradient = ctx.createRadialGradient(center, center, 0, center, center, radius - 40);
      gradient.addColorStop(0, 'rgba(255, 107, 107, 0.15)');
      gradient.addColorStop(1, 'rgba(255, 107, 107, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(center, center, radius - 40, 0, Math.PI * 2);
      ctx.fill();
    };

    // Main animation loop
    const animate = () => {
      // Clear canvas
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, size, size);

      // Draw layers from back to front
      drawGlow();
      drawArcTrails();
      drawTickMarks();
      drawOuterRing();
      drawOrbitingDots();
      drawCentralShape();

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      outerRingAnim.pause();
      tickWaveAnim.pause();
      arcTrail1Anim.pause();
      arcTrail2Anim.pause();
      arcTrail3Anim.pause();
      orbitAnim.pause();
      morphAnim.pause();
    };
  }, [size]);

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
