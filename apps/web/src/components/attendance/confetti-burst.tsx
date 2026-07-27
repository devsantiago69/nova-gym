"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#a3e635", "#22d3ee", "#fb923c", "#f472b6", "#facc15"];
const PARTICLE_COUNT = 140;
const DURATION_MS = 2200;

export function ConfettiBurst({ onDone }: { onDone?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 140,
      y: canvas.height * 0.28,
      vx: (Math.random() - 0.5) * 11,
      vy: -Math.random() * 10 - 4,
      size: Math.random() * 7 + 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.3,
      gravity: 0.28 + Math.random() * 0.1,
    }));

    const start = performance.now();
    let raf = 0;

    function frame(now: number) {
      const elapsed = now - start;
      context!.clearRect(0, 0, canvas!.width, canvas!.height);
      for (const particle of particles) {
        particle.vy += particle.gravity * 0.06;
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.rotation += particle.spin;
        context!.save();
        context!.translate(particle.x, particle.y);
        context!.rotate(particle.rotation);
        context!.fillStyle = particle.color;
        context!.globalAlpha = Math.max(0, 1 - elapsed / DURATION_MS);
        context!.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 0.6);
        context!.restore();
      }
      if (elapsed < DURATION_MS) {
        raf = requestAnimationFrame(frame);
      } else {
        onDoneRef.current?.();
      }
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-70" aria-hidden />;
}
