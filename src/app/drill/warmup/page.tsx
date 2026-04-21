"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Check,
  ChevronRight,
  Home,
  Flame,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { cn, formatMs } from "@/lib/utils";
import { generateQuestion } from "@/lib/generators";
import { sfx } from "@/lib/audio-engine";
import { useThemeStore } from "@/store/theme-store";

interface Question {
  id: number;
  topicSlug: string;
  content: string;
  options: string[];
  correctAnswer: string;
  difficulty: number;
  targetTimeMs: number;
  tacticHint: string | null;
}

const WARMUP_DURATION_MS = 3 * 60 * 1000; // 3 minutes

type Phase = "countdown" | "playing" | "stimulus" | "stimulus-blank" | "answered" | "done";

export default function WarmupPage() {
  const [phase, setPhase] = useState<Phase>("countdown");
  const [countdown, setCountdown] = useState(3);
  const [currentQ, setCurrentQ] = useState<Question | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [globalTimeLeft, setGlobalTimeLeft] = useState(WARMUP_DURATION_MS);
  
  const [stimulusContent, setStimulusContent] = useState<{ text: string; items?: string[] } | null>(null);
  const [isSelected, setIsSelected] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<"correct" | "wrong" | null>(null);

  const [combo, setCombo] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalWrong, setTotalWrong] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);

  const handleNext = useCallback(() => {
    const warmupTopics = ["mental-math", "pen-paper-math", "estimation", "pattern-recognition", "tachistoscope", "working-memory"];
    const randomTopic = warmupTopics[Math.floor(Math.random() * warmupTopics.length)];
    const q = generateQuestion(randomTopic, 2); // Warmup difficulty is 2
    if (!q) return;

    setCurrentQ(q);
    setIsSelected(null);
    setLastResult(null);
    setCurrentIdx((prev) => prev + 1);

    // Some topics have stimulus phase
    if (["tachistoscope", "working-memory"].includes(q.topicSlug)) {
      setPhase("stimulus");
      if (q.topicSlug === "working-memory") {
        const content = JSON.parse(q.content);
        setStimulusContent({ text: "", items: content.sequence });
        setTimeout(() => setPhase("stimulus-blank"), 2000);
        setTimeout(() => setPhase("playing"), 2500);
      } else {
        setStimulusContent({ text: q.content });
        setTimeout(() => setPhase("stimulus-blank"), 150);
        setTimeout(() => setPhase("playing"), 300);
      }
    } else {
      setPhase("playing");
    }
  }, []);

  const handleAnswer = useCallback((option: string) => {
    // Access current state via argument or refs if needed, but here we can just use the closure since it's recreated or use functional updates
    setPhase((prev) => {
      if (prev === "answered") return prev;
      
      setCurrentQ((q) => {
        if (!q) return q;
        const isRight = option === q.correctAnswer;
        setIsSelected(option);

        if (isRight) {
          setLastResult("correct");
          setTotalCorrect((c) => c + 1);
          setCombo((comb) => {
            const next = comb + 1;
            setMaxCombo((m) => Math.max(m, next));
            setTotalXp((xp) => xp + 10 + (next > 1 ? next * 2 : 0));
            return next;
          });
          sfx.playSuccess();
        } else {
          setLastResult("wrong");
          setTotalWrong((w) => w + 1);
          setCombo(0);
          sfx.playError();
        }
        return q;
      });
      
      return "answered";
    });
  }, []);

  // Initial countdown
  useEffect(() => {
    if (phase !== "countdown") return;
    const timer = setTimeout(() => {
      if (countdown > 1) {
        setCountdown(prev => prev - 1);
      } else {
        setPhase("playing");
        handleNext();
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, phase, handleNext]);

  // Global timer
  useEffect(() => {
    if (phase === "countdown" || phase === "done") return;
    const timer = setInterval(() => {
      setGlobalTimeLeft((prev) => {
        if (prev <= 100) {
          setPhase("done");
          clearInterval(timer);
          return 0;
        }
        return prev - 100;
      });
    }, 100);
    return () => clearInterval(timer);
  }, [phase]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== "playing") return;
      const key = e.key.toUpperCase();
      const options = ["A", "B", "C", "D"];
      const nums = ["1", "2", "3", "4"];

      setCurrentQ((q) => {
        if (!q) return q;
        if (options.includes(key)) handleAnswer(q.options[options.indexOf(key)]);
        else if (nums.includes(key)) handleAnswer(q.options[nums.indexOf(key)]);
        return q;
      });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, handleAnswer]);

  if (phase === "countdown") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        <div className="text-sm text-accent font-medium mb-4">🔥 Isınma Modu</div>
        <motion.div
          key={countdown}
          initial={{ scale: 2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-8xl font-bold text-accent"
        >
          {countdown}
        </motion.div>
        <p className="text-xs text-muted-foreground mt-4">3 dakika, karma sorular, refleks açıcı!</p>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-strong rounded-3xl p-8 max-w-md w-full text-center space-y-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="inline-flex p-4 rounded-full bg-accent/20"
          >
            <Clock className="w-12 h-12 text-accent" />
          </motion.div>
          <h2 className="text-2xl font-bold">Isınma Tamamlandı! 🔥</h2>
          <p className="text-sm text-muted-foreground">Beyinin ısındı, artık asıl antrenmanlara geçebilirsin!</p>

          <div className="grid grid-cols-3 gap-4">
            <div className="glass rounded-xl p-3">
              <div className="text-xl font-bold text-success">{totalCorrect}</div>
              <div className="text-[10px] text-muted-foreground">Doğru</div>
            </div>
            <div className="glass rounded-xl p-3">
              <div className="text-xl font-bold text-destructive">{totalWrong}</div>
              <div className="text-[10px] text-muted-foreground">Yanlış</div>
            </div>
            <div className="glass rounded-xl p-3">
              <div className="text-xl font-bold text-primary">{totalXp}</div>
              <div className="text-[10px] text-muted-foreground">XP</div>
            </div>
          </div>

          {maxCombo >= 3 && (
            <div className="flex items-center justify-center gap-2">
              <Flame className="w-5 h-5 text-accent" />
              <span className="text-sm text-accent">En uzun seri: {maxCombo}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Link href="/" className="flex-1">
              <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium">
                <Home className="w-4 h-4" /> Antrenmanlara Geç
              </button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const globalPercent = (globalTimeLeft / WARMUP_DURATION_MS) * 100;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-primary/10 to-background">
      {/* Top bar */}
      <div className="p-4 flex items-center justify-between">
        <Link href="/" className="p-2 rounded-lg hover:bg-foreground/5 transition-colors">
          <Clock className="w-5 h-5 text-accent" />
        </Link>
        <div className="flex items-center gap-3">
          {combo >= 2 && (
            <motion.div
              key={combo}
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/20"
            >
              <Flame className="w-4 h-4 text-accent" />
              <span className="text-sm font-bold text-accent">x{combo}</span>
            </motion.div>
          )}
          <div className="text-xs text-muted-foreground px-2 py-1 rounded-full glass">
            {currentIdx} soru
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg glass">
          <Zap className="w-3.5 h-3.5 text-accent" />
          <span className="text-xs font-medium text-accent">{totalXp} XP</span>
        </div>
      </div>

      {/* Global timer */}
      <div className="px-4">
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-100",
              globalPercent < 20 ? "progress-bar-danger" : "bg-gradient-to-r from-primary to-accent",
            )}
            style={{ width: `${globalPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className={cn("text-[10px] font-mono", globalPercent < 20 ? "text-destructive" : "text-accent")}>
            {formatMs(globalTimeLeft)}
          </span>
          <span className="text-[10px] text-muted-foreground">Isınma Modu</span>
        </div>
      </div>

      {/* Stimulus Phase */}
      {(phase === "stimulus" || phase === "stimulus-blank") && stimulusContent && currentQ && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            {phase === "stimulus-blank" ? (
              <h2 className="text-5xl md:text-7xl font-mono tracking-widest text-muted/30">
                {"#".repeat(Math.max(5, stimulusContent.text.length))}
              </h2>
            ) : stimulusContent.items ? (
              // Array of items (Working Memory)
              <div className="flex flex-wrap justify-center gap-4">
                {stimulusContent.items.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.1, type: "spring", stiffness: 200 }}
                    className="w-24 h-32 md:w-32 md:h-40 glass-strong rounded-2xl flex items-center justify-center text-3xl md:text-5xl font-bold bg-foreground/5"
                  >
                    {item}
                  </motion.div>
                ))}
              </div>
            ) : (
              // Single text (Tachistoscope)
              <motion.h2
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-5xl md:text-8xl font-bold tracking-tighter"
              >
                {stimulusContent.text}
              </motion.h2>
            )}
          </div>
        </div>
      )}

      {/* Playing Phase */}
      {(phase === "playing" || phase === "answered") && currentQ && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
          <motion.div
            key={currentQ.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl"
          >
            <div className="glass-strong rounded-3xl p-8 text-center border-primary/20 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              <div className="text-2xl md:text-3xl font-bold mb-2">
                {currentQ.content}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              {currentQ.options.map((option) => (
                <motion.button
                  key={option}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={phase === "answered"}
                  onClick={() => handleAnswer(option)}
                  className={cn(
                    "w-full flex items-center gap-3 px-5 py-4 rounded-xl text-left transition-all glass hover:bg-foreground/5 active:scale-[0.98]",
                    phase === "answered" && option === currentQ.correctAnswer && "!bg-success/20 !border-success/50",
                    phase === "answered" && isSelected === option && option !== currentQ.correctAnswer && "!bg-destructive/20 !border-destructive/50",
                    phase === "answered" && isSelected !== option && option !== currentQ.correctAnswer && "opacity-40",
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm",
                    "bg-secondary/50 border border-border"
                  )}>
                    {["A", "B", "C", "D"][currentQ.options.indexOf(option)]}
                  </div>
                  <span className="text-lg font-medium">{option}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>

          <AnimatePresence>
            {phase === "answered" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4"
              >
                {lastResult === "correct" ? (
                  <div className="flex items-center gap-2 text-primary font-bold text-xl">
                    <Check className="w-6 h-6" /> 
                    <span>
                      {useThemeStore.getState().theme === "bloodborne" ? "PREY SLAUGHTERED" : 
                       useThemeStore.getState().theme === "ds3" ? "HEIR OF FIRE DESTROYED" : 
                       useThemeStore.getState().theme === "gta5" || useThemeStore.getState().theme === "gtasa" ? "RESPECT +" : 
                       useThemeStore.getState().theme === "arcade" ? "COMBO!" : "Doğru!"}
                    </span>
                  </div>
                ) : (
                  <span className="text-destructive font-bold text-xl">
                    {useThemeStore.getState().theme === "bloodborne" ? "YOU DIED" : 
                     useThemeStore.getState().theme === "ds3" ? "YOU DIED" : 
                     useThemeStore.getState().theme === "gta5" || useThemeStore.getState().theme === "gtasa" ? "WASTED" : 
                     useThemeStore.getState().theme === "arcade" ? "GAME OVER" : "Yanlış!"}
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {phase === "answered" && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={handleNext}
              className="mt-4 flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium text-sm"
            >
              Sonraki <ChevronRight className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      )}

      {phase === "playing" && (
        <div className="pb-4 text-center">
          <p className="text-[10px] text-muted-foreground">Klavye: A, B, C, D veya 1, 2, 3, 4</p>
        </div>
      )}
    </div>
  );
}
