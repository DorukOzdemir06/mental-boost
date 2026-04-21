"use client";

import { useThemeStore } from "@/store/theme-store";

// A robust procedural Web Audio API engine to avoid missing .mp3 files
class SFXEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  init() {
    if (!this.ctx && typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  playHover() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const theme = useThemeStore.getState().theme;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    const now = this.ctx.currentTime;

    if (theme === "arcade") {
      osc.type = "square";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (theme === "ds3" || theme === "bloodborne") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(100, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (theme === "neo-tokyo") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.linearRampToValueAtTime(200, now + 0.1);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (theme === "gta5" || theme === "gtasa") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else {
      // Default
      osc.type = "sine";
      osc.frequency.setValueAtTime(400, now);
      gain.gain.setValueAtTime(0.02, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  }

  playSuccess() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const theme = useThemeStore.getState().theme;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    if (theme === "bloodborne" || theme === "ds3") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1);
      osc.start(now);
      osc.stop(now + 1);
    } else if (theme === "arcade") {
      osc.type = "square";
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.setValueAtTime(600, now + 0.1);
      osc.frequency.setValueAtTime(800, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (theme === "gta5" || theme === "gtasa") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554, now + 0.15); // Mission Passed chord
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
      gain.gain.linearRampToValueAtTime(0, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(1000, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    }
  }

  playError() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const theme = useThemeStore.getState().theme;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    if (theme === "bloodborne" || theme === "ds3" || theme === "crimson") {
      // Deep heavy thud
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + 0.5);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (theme === "arcade") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(50, now + 0.3);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (theme === "gta5" || theme === "gtasa") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.linearRampToValueAtTime(180, now + 0.8);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.8);
      osc.start(now);
      osc.stop(now + 0.8);
    } else {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.3);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  }
}

export const sfx = new SFXEngine();
