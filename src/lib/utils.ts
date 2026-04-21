import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── XP & Leveling ─────────────────────────────────────
export function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

export function getLevelFromXp(xp: number): number {
  let level = 1;
  let totalXpNeeded = 0;
  while (true) {
    totalXpNeeded += xpForLevel(level);
    if (xp < totalXpNeeded) return level;
    level++;
    if (level > 100) return 100;
  }
}

export function getXpProgress(xp: number): { level: number; currentLevelXp: number; nextLevelXp: number; progress: number } {
  let level = 1;
  let accumulated = 0;
  while (true) {
    const needed = xpForLevel(level);
    if (xp < accumulated + needed) {
      return {
        level,
        currentLevelXp: xp - accumulated,
        nextLevelXp: needed,
        progress: (xp - accumulated) / needed,
      };
    }
    accumulated += needed;
    level++;
    if (level > 100) return { level: 100, currentLevelXp: 0, nextLevelXp: 1, progress: 1 };
  }
}

// ─── Score Calculation ──────────────────────────────────
export function calculateXp(difficulty: number, timeTakenMs: number, targetTimeMs: number, isCorrect: boolean, comboCount: number): number {
  if (!isCorrect) return 0;
  const baseXp = difficulty * 10;
  const timeBonus = timeTakenMs < targetTimeMs ? Math.floor((1 - timeTakenMs / targetTimeMs) * 20) : 0;
  const comboMultiplier = Math.min(1 + comboCount * 0.1, 3); // max x3
  return Math.floor((baseXp + timeBonus) * comboMultiplier);
}

export function getComboMultiplier(combo: number): number {
  if (combo >= 25) return 5;
  if (combo >= 15) return 3;
  if (combo >= 10) return 2.5;
  if (combo >= 5) return 2;
  if (combo >= 3) return 1.5;
  return 1;
}

// ─── Time Formatting ────────────────────────────────────
export function formatMs(ms: number): string {
  if (ms <= 0) return "0.0s";
  const seconds = ms / 1000;
  if (seconds < 1) return `${Math.round(ms)}ms`;
  return `${seconds.toFixed(1)}s`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Topic Colors ───────────────────────────────────────
export const COMBO_GRADIENTS = [
  "from-slate-900 to-slate-800",       // 0 combo
  "from-blue-950 to-indigo-900",       // 1-2
  "from-indigo-950 to-purple-900",     // 3-4
  "from-purple-950 to-fuchsia-900",    // 5-9
  "from-fuchsia-950 to-pink-900",      // 10-14
  "from-pink-950 to-rose-900",         // 15-24
  "from-rose-950 to-red-900",          // 25+
];

export function getComboGradient(combo: number): string {
  if (combo >= 25) return COMBO_GRADIENTS[6];
  if (combo >= 15) return COMBO_GRADIENTS[5];
  if (combo >= 10) return COMBO_GRADIENTS[4];
  if (combo >= 5)  return COMBO_GRADIENTS[3];
  if (combo >= 3)  return COMBO_GRADIENTS[2];
  if (combo >= 1)  return COMBO_GRADIENTS[1];
  return COMBO_GRADIENTS[0];
}
