"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, TrendingDown, Target, Brain, Award, AlertCircle, LucideIcon } from "lucide-react";
import { cn, formatMs } from "@/lib/utils";

interface TopicStat {
  topicSlug: string;
  totalAttempts: number;
  correctCount: number;
  avgTimeMs: number;
}

interface Topic {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
}

interface StatsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  stats: TopicStat[];
  topics: Topic[];
}

function getRecommendation(slug: string, accuracy: number, avgTimeMs: number): { text: string; type: "strong" | "weak"; icon: LucideIcon } {
  if (accuracy >= 80) {
    if (avgTimeMs < 5000) {
      return {
        text: "Tebrikler! Bu alanda adeta ustalaştın. Hızın ve doğruluğun tavan yapmış durumda. Artık enerjini en zayıf olduğun konulara kaydırabilirsin.",
        type: "strong",
        icon: Award,
      };
    } else {
      return {
        text: "Mükemmel bir doğruluğa sahipsin! Ancak soru başına süreni biraz daha kısaltmalısın. Gevşeme, reflekslerini hızlandır.",
        type: "weak",
        icon: Target,
      };
    }
  }

  // Weak Performance Defaults
  if (slug === "mental-math" || slug === "pen-paper-math") {
    if (avgTimeMs > 6000) {
      return {
        text: "İşlem hızın çok yavaş. Tam hesap yapmak yerine son basamakları çarparak şıklardan elenmeyi dene.",
        type: "weak",
        icon: AlertCircle,
      };
    }
    return {
      text: "İşlem hataları yapıyorsun. Sayıları onluklarına ayırarak toplamaya çalış. En azından bol bol antrenmanla hızlanacaksın.",
      type: "weak",
      icon: TrendingDown,
    };
  }

  if (slug === "estimation") {
    return {
      text: "Tahmin yürütmede çok zaman kaybediyorsun veya detaylara boğuluyorsun. Unutma, buradaki amaç tam sonucu bulmak değil, en mantıklı olana yuvarlamaktır!",
      type: "weak",
      icon: AlertCircle,
    };
  }

  if (slug === "working-memory" || slug === "tachistoscope") {
    return {
      text: "Hafıza alanında kelimeleri sürekli içinden tekrar etme (subvokalizasyon) eğilimindesin. Sadece görüntülerini fotoğrafını çeker gibi aklına kazı.",
      type: "weak",
      icon: Brain,
    };
  }

  return {
    text: "Henüz bu konuda istediğimiz seviyede değilsin. İstikrarlı pratikle bu alanı güçlü bir kas haline getirebilirsin. Günde 10 soru çözmeye başla!",
    type: "weak",
    icon: TrendingDown,
  };
}

export function StatsPanel({ isOpen, onClose, stats, topics }: StatsPanelProps) {
  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
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
          className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto glass-strong rounded-3xl p-6 sm:p-8 flex flex-col gap-8 shadow-2xl"
        >
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full bg-foreground/5 hover:bg-foreground/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <header>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="w-6 h-6 text-primary" />
              Detaylı Gelişim Analizi
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Güçlü yönlerini gör ve zayıf kaslarını geliştirmek için önerileri dikkate al.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {stats.length === 0 && (
              <div className="col-span-1 md:col-span-2 text-center py-10 text-muted-foreground">
                Henüz yeterli istatistik yok. Biraz antrenman yapıp tekrar gel!
              </div>
            )}

            {stats.filter(s => s.totalAttempts > 0).map((s) => {
              const topic = topics.find((t) => t.slug === s.topicSlug);
              if (!topic) return null;

              const accuracy = Math.round((s.correctCount / s.totalAttempts) * 100);
              const rec = getRecommendation(s.topicSlug, accuracy, s.avgTimeMs);
              const isStrong = rec.type === "strong";
              const RecIcon = rec.icon;

              return (
                <div key={s.topicSlug} className="glass rounded-2xl p-5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                  
                  <div className="flex items-center justify-between mb-4 relative">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5" style={{ color: topic.color }}>
                        <Brain className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{topic.name}</h3>
                        <p className="text-xs text-muted-foreground">{s.totalAttempts} Soru</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={cn("text-xl font-bold", accuracy >= 70 ? "text-success" : accuracy >= 40 ? "text-warning" : "text-destructive")}>
                        %{accuracy}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Doğruluk</div>
                    </div>
                  </div>

                  <div className="space-y-4 relative">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Hız / Soru</span>
                        <span className="font-mono">{formatMs(s.avgTimeMs)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, (s.avgTimeMs / 15000) * 100)}%`,
                            backgroundColor: topic.color
                          }}
                        />
                      </div>
                    </div>

                    <div className={cn(
                      "p-3 rounded-xl border mt-2 flex gap-3 items-start",
                      isStrong ? "bg-success/10 border-success/20 text-success-foreground" : "bg-primary/5 border-primary/20 text-primary-foreground"
                    )}>
                      <RecIcon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", isStrong ? "text-success" : "text-primary")} />
                      <p className="text-xs leading-relaxed opacity-90">{rec.text}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
