import React, { useEffect, useRef } from 'react';

interface LavaBlob {
  x: number;
  y: number;
  baseRadius: number;
  radius: number;
  vx: number;
  vy: number;
  phase: number;
  speed: number;
  type: 'crimson' | 'deepRed' | 'moltenAmber' | 'ruby';
}

export const LavaLampBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    // Scale down resolution for ultra-high performance & smoother blur
    const scale = 0.5;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.max(1, Math.floor(width * scale));
      canvas.height = Math.max(1, Math.floor(height * scale));
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });

    // Generate organic lava blobs
    const blobs: LavaBlob[] = [
      { x: 0.25, y: 0.8, baseRadius: 210, radius: 210, vx: 0.0003, vy: -0.0005, phase: 0, speed: 0.0012, type: 'crimson' },
      { x: 0.75, y: 0.3, baseRadius: 240, radius: 240, vx: -0.0002, vy: 0.0004, phase: 1.5, speed: 0.0010, type: 'deepRed' },
      { x: 0.48, y: 0.6, baseRadius: 180, radius: 180, vx: 0.0002, vy: -0.0006, phase: 2.8, speed: 0.0015, type: 'moltenAmber' }, // Radiant yellow/amber
      { x: 0.15, y: 0.2, baseRadius: 190, radius: 190, vx: 0.0004, vy: 0.0003, phase: 3.9, speed: 0.0011, type: 'ruby' },
      { x: 0.85, y: 0.85, baseRadius: 220, radius: 220, vx: -0.0003, vy: -0.0004, phase: 4.7, speed: 0.0013, type: 'crimson' },
      { x: 0.35, y: 0.22, baseRadius: 165, radius: 165, vx: -0.0002, vy: 0.0005, phase: 5.6, speed: 0.0017, type: 'moltenAmber' }, // Radiant yellow/amber
      { x: 0.65, y: 0.88, baseRadius: 200, radius: 200, vx: 0.0003, vy: -0.0003, phase: 6.2, speed: 0.0014, type: 'ruby' },
      { x: 0.80, y: 0.55, baseRadius: 160, radius: 160, vx: -0.00025, vy: -0.0004, phase: 1.9, speed: 0.0016, type: 'moltenAmber' }, // Extra glowing amber
    ];

    let lastTime = performance.now();

    const render = (time: number) => {
      if (document.hidden) {
        // Pause while tab is inactive to preserve 100% battery & CPU
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const dt = Math.min(32, time - lastTime);
      lastTime = time;

      const cw = canvas.width;
      const ch = canvas.height;

      // Deep dark base
      ctx.fillStyle = '#050202';
      ctx.fillRect(0, 0, cw, ch);

      // Blending mode for molten glowing lava
      ctx.globalCompositeOperation = 'screen';

      blobs.forEach((blob) => {
        // Floating movement with sinusoidal drift
        blob.phase += blob.speed * (dt / 16);
        blob.x += blob.vx * (dt / 16) + Math.sin(blob.phase * 0.7) * 0.0003;
        blob.y += blob.vy * (dt / 16) + Math.cos(blob.phase * 0.5) * 0.0002;

        // Bounce / wrap around edges like a lava lamp tube
        if (blob.y < -0.2) {
          blob.y = 1.2;
          blob.x = Math.random();
        } else if (blob.y > 1.2) {
          blob.y = -0.2;
          blob.x = Math.random();
        }

        if (blob.x < -0.1) blob.x = 1.1;
        if (blob.x > 1.1) blob.x = -0.1;

        // Gentle breathing pulsation
        const pulse = Math.sin(blob.phase) * 0.18;
        const currentR = blob.baseRadius * scale * (1 + pulse);

        const screenX = blob.x * cw;
        const screenY = blob.y * ch;

        const grad = ctx.createRadialGradient(
          screenX, screenY, 0,
          screenX, screenY, currentR
        );

        if (blob.type === 'moltenAmber') {
          // Vivid molten yellow / amber lava accent (more noticeable glow)
          grad.addColorStop(0, 'rgba(255, 215, 35, 0.85)'); // Radiant yellow molten core
          grad.addColorStop(0.28, 'rgba(250, 135, 10, 0.65)'); // Fiery warm amber
          grad.addColorStop(0.65, 'rgba(195, 20, 5, 0.35)'); // Transition to festival crimson red
          grad.addColorStop(0.90, 'rgba(120, 10, 3, 0.12)'); // Deep edge
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else if (blob.type === 'ruby') {
          grad.addColorStop(0, 'rgba(240, 35, 20, 0.75)');
          grad.addColorStop(0.40, 'rgba(185, 15, 6, 0.50)');
          grad.addColorStop(0.80, 'rgba(90, 6, 2, 0.18)');
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else if (blob.type === 'deepRed') {
          grad.addColorStop(0, 'rgba(180, 12, 4, 0.70)');
          grad.addColorStop(0.45, 'rgba(130, 8, 3, 0.45)');
          grad.addColorStop(0.85, 'rgba(50, 3, 1, 0.12)');
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else {
          // Standard vibrant crimson festival red
          grad.addColorStop(0, 'rgba(215, 20, 8, 0.78)');
          grad.addColorStop(0.38, 'rgba(164, 11, 3, 0.55)');
          grad.addColorStop(0.75, 'rgba(95, 7, 2, 0.20)');
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(screenX, screenY, currentR, 0, Math.PI * 2);
        ctx.fill();
      });

      // Reset composite operation
      ctx.globalCompositeOperation = 'source-over';

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div 
      aria-hidden="true" 
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black select-none"
    >
      {/* Hardware-accelerated Canvas with smooth atmospheric lava lamp blur and enhanced intensity */}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover filter blur-[40px] sm:blur-[52px] opacity-90 contrast-125 saturate-140"
      />

      {/* Atmospheric vignette to ensure perfect text contrast & readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/45 pointer-events-none" />
    </div>
  );
};
