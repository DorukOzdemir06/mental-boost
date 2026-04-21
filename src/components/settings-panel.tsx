"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { Theme, useThemeStore } from "@/store/theme-store";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const THEMES: { id: Theme; name: string; desc: string; colors: string[] }[] = [
  { id: "default", name: "Gökada", desc: "Varsayılan uzay moru konsepti.", colors: ["#050508", "#8b5cf6"] },
  { id: "neo-tokyo", name: "Neo-Tokyo", desc: "Hacker ve Cyberpunk hissiyatı.", colors: ["#090310", "#d946ef", "#22d3ee"] },
  { id: "arcade", name: "Retro Arcade", desc: "CRT yeşili ve canlı atari sarısı.", colors: ["#0a0a0a", "#39ff14", "#ffea00"] },
  { id: "nord", name: "Kuzey (Sakin)", desc: "Odaklanma için göz yormayan soft renkler.", colors: ["#2e3440", "#88c0d0"] },
  { id: "crimson", name: "Kızıl Boşluk", desc: "Agresif karanlık ve kan kırmızısı vurgular.", colors: ["#050000", "#dc2626"] },
  { id: "bloodborne", name: "Bloodborne", desc: "Gotik, paslı gümüş ve kurumuş kan.", colors: ["#111111", "#8a0303", "#b08d57"] },
  { id: "ds3", name: "Dark Souls 3", desc: "Küller, köz turuncusu ve umutsuz karanlık.", colors: ["#1e1e1e", "#d35400"] },
  { id: "gta5", name: "Los Santos", desc: "Canlı yeşil ve neon Los Santos mavisidir.", colors: ["#0f172a", "#22c55e", "#3b82f6"] },
  { id: "gtasa", name: "Grove Street", desc: "Klasik PS2 sepia, gün batımı ve çete yeşili.", colors: ["#2a1f1a", "#16a34a", "#ea580c"] },
];

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { theme: currentTheme, setTheme } = useThemeStore();

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-strong rounded-3xl p-6 sm:p-8 flex flex-col gap-6 shadow-2xl"
        >
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full bg-foreground/5 hover:bg-foreground/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <header>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Palette className="w-6 h-6 text-primary" />
              Görsel Temalar
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Uygulamanın atmosferini ve renk paletini modunuza göre değiştirin.
            </p>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {THEMES.map((t) => {
              const isActive = currentTheme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    "text-left glass rounded-2xl p-4 transition-all hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden",
                    isActive ? "ring-2 ring-primary border-transparent bg-primary/5" : "hover:border-primary/50 border-white/5"
                  )}
                >
                  <div className="flex gap-1.5 mb-3">
                    {t.colors.map((c, i) => (
                      <div key={i} className="w-6 h-6 rounded-full border border-white/10" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <h3 className="font-semibold text-foreground">{t.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">{t.desc}</p>

                  {isActive && (
                    <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
