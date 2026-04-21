"use client";

import { useEffect, useRef } from "react";
import { useThemeStore } from "@/store/theme-store";

const EMBER_THEMES = ["ds3", "bloodborne", "crimson"];
const MATRIX_THEMES = ["neo-tokyo", "arcade"];

export function ThemeEffects() {
  const theme = useThemeStore((state) => state.theme);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Cancel any previous animation
    cancelAnimationFrame(animFrameRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // Always clear canvas first when switching themes
    ctx.clearRect(0, 0, width, height);

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener("resize", handleResize);

    let running = true;

    if (EMBER_THEMES.includes(theme)) {
      // ── Ember / Ash Particles ──
      const particles: { x: number; y: number; s: number; vx: number; vy: number; life: number }[] = [];
      for (let i = 0; i < 40; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height + height * 0.5,
          s: Math.random() * 2 + 0.5,
          vx: (Math.random() - 0.5) * 0.8,
          vy: Math.random() * -0.8 - 0.3,
          life: Math.random() * 120 + 30,
        });
      }

      const drawEmbers = () => {
        if (!running) return;
        ctx.clearRect(0, 0, width, height);
        particles.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.4;

          if (p.y < -10 || p.life < 0) {
            p.y = height + 10;
            p.x = Math.random() * width;
            p.life = Math.random() * 120 + 30;
          }

          const alpha = Math.max(0, p.life / 150);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
          ctx.fillStyle =
            theme === "bloodborne"
              ? `rgba(163, 0, 0, ${alpha})`
              : theme === "crimson"
                ? `rgba(220, 38, 38, ${alpha})`
                : `rgba(211, 84, 0, ${alpha})`;
          ctx.shadowBlur = 8;
          ctx.shadowColor =
            theme === "bloodborne" ? "#a30000" : theme === "crimson" ? "#dc2626" : "#d35400";
          ctx.fill();
        });
        ctx.shadowBlur = 0;
        animFrameRef.current = requestAnimationFrame(drawEmbers);
      };
      drawEmbers();

    } else if (MATRIX_THEMES.includes(theme)) {
      // ── Matrix Rain ──
      const chars = "01アイウエオカキクケコ".split("");
      const fontSize = 14;
      const columns = Math.floor(width / fontSize);
      const drops: number[] = new Array(columns).fill(0).map(() => Math.random() * -50);

      const drawMatrix = () => {
        if (!running) return;
        ctx.fillStyle = "rgba(0, 0, 0, 0.06)";
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
        timeoutRef.current = setTimeout(() => {
          animFrameRef.current = requestAnimationFrame(drawMatrix);
        }, 60);
      };
      drawMatrix();

    }
    // For all other themes: canvas stays blank (already cleared above)

    return () => {
      running = false;
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animFrameRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      // Explicitly clear canvas on cleanup
      ctx.clearRect(0, 0, width, height);
    };
  }, [theme]);

  // Only render canvas for themes that need it
  const hasEffects = EMBER_THEMES.includes(theme) || MATRIX_THEMES.includes(theme);

  return hasEffects ? (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[-1] opacity-40"
    />
  ) : null;
}
