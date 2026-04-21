"use client";

import { useEffect, useRef } from "react";
import { useThemeStore } from "@/store/theme-store";

export function ThemeEffects() {
  const theme = useThemeStore((state) => state.theme);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener("resize", handleResize);

    let animationFrameId: number;

    if (theme === "ds3" || theme === "bloodborne" || theme === "crimson") {
      // Ember particles
      const particles: { x: number; y: number; s: number; vx: number; vy: number; life: number }[] = [];
      for (let i = 0; i < 50; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height + height,
          s: Math.random() * 2 + 1,
          vx: (Math.random() - 0.5) * 1,
          vy: Math.random() * -1 - 0.5,
          life: Math.random() * 100,
        });
      }

      const drawEmbers = () => {
        ctx.clearRect(0, 0, width, height);
        particles.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.5;

          if (p.y < -10 || p.life < 0) {
            p.y = height + 10;
            p.x = Math.random() * width;
            p.life = Math.random() * 100 + 50;
          }

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
          const alpha = Math.max(0, p.life / 150);
          ctx.fillStyle = theme === "bloodborne" ? `rgba(138, 3, 3, ${alpha})` : `rgba(211, 84, 0, ${alpha})`;
          ctx.shadowBlur = 10;
          ctx.shadowColor = theme === "bloodborne" ? "red" : "orange";
          ctx.fill();
        });
        animationFrameId = requestAnimationFrame(drawEmbers);
      };
      drawEmbers();

    } else if (theme === "neo-tokyo" || theme === "arcade") {
      // Matrix code / Grid stars
      const chars = "01".split("");
      const drops: number[] = [];
      const fontSize = 14;
      const columns = width / fontSize;
      for (let x = 0; x < columns; x++) drops[x] = 1;

      const drawMatrix = () => {
        ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = theme === "arcade" ? "#39ff14" : "#22d3ee";
        ctx.font = `${fontSize}px monospace`;

        for (let i = 0; i < drops.length; i++) {
          const text = chars[Math.floor(Math.random() * chars.length)];
          ctx.fillText(text, i * fontSize, drops[i] * fontSize);

          if (drops[i] * fontSize > height && Math.random() > 0.975) {
            drops[i] = 0;
          }
          drops[i]++;
        }
        // Slow down matrix
        setTimeout(() => {
          animationFrameId = requestAnimationFrame(drawMatrix);
        }, 50);
      };
      drawMatrix();

    } else {
      ctx.clearRect(0, 0, width, height);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[-1] opacity-50"
    />
  );
}
