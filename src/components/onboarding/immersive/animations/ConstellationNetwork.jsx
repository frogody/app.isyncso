import React, { useEffect, useMemo, useState } from 'react';

export default function ConstellationNetwork() {
  const [loaded, setLoaded] = useState(false);
  const [Particles, setParticles] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [{ default: ParticlesComp, initParticlesEngine }, slimMod] = await Promise.all([
          import('@tsparticles/react'),
          import('@tsparticles/slim'),
        ]);

        if (cancelled) return;

        await initParticlesEngine(async (engine) => {
          await slimMod.loadSlim(engine);
        });

        if (cancelled) return;

        setParticles(() => ParticlesComp);
        setLoaded(true);
      } catch (err) {
        console.warn('ConstellationNetwork: tsparticles failed to load', err);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const options = useMemo(
    () => ({
      fullScreen: { enable: false },
      background: { color: { value: 'transparent' } },
      fpsLimit: 60,
      particles: {
        number: { value: 40, density: { enable: true, area: 600 } },
        color: {
          value: ['#06b6d4', '#6366f1', '#ec4899', '#10b981', '#3b82f6', '#14b8a6'],
        },
        shape: { type: 'circle' },
        opacity: {
          value: { min: 0.3, max: 0.7 },
          animation: { enable: true, speed: 0.5, minimumValue: 0.2, sync: false },
        },
        size: {
          value: { min: 1.5, max: 3.5 },
        },
        move: {
          enable: true,
          speed: 0.4,
          direction: 'none',
          random: true,
          straight: false,
          outModes: { default: 'bounce' },
        },
        links: {
          enable: true,
          distance: 100,
          color: '#06b6d4',
          opacity: 0.15,
          width: 0.8,
        },
      },
      interactivity: {
        events: {
          onHover: { enable: true, mode: 'grab' },
        },
        modes: {
          grab: { distance: 120, links: { opacity: 0.3 } },
        },
      },
      detectRetina: true,
    }),
    []
  );

  return (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{ width: 280, height: 200 }}
    >
      {/* Subtle border glow */}
      <div className="absolute inset-0 rounded-xl border border-cyan-500/10" />

      {loaded && Particles ? (
        <Particles
          id="constellation-network"
          options={options}
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        /* Fallback shimmer while loading */
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-cyan-500/40 animate-pulse" />
        </div>
      )}

      {/* Overlay gradient edges */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.7) 100%)',
        }}
      />
    </div>
  );
}
