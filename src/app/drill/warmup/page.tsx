"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Check,
  X,
  Flame,
  Home,
  ChevronRight,
  Lightbulb,
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
const PROCEDURAL_TOPICS = [
  "mental-math",
  "estimation",
  "pattern-recognition",
  "tachistoscope",
  "working-memory",
];

// ─── Stimulus helpers ─────────────────────────────────
const STIMULUS_TOPICS = ["tachistoscope", "working-memory"];
function needsStimulus(topicSlug: string): boolean {
  return STIMULUS_TOPICS.includes(topicSlug);
}
function getTachistoscopeFlashMs(difficulty: number): number {
  if (difficulty >= 4) return 150;
  if (difficulty >= 3) return 250;
  if (difficulty >= 2) return 400;
  return 600;
}
function getWorkingMemoryShowMs(difficulty: number): number {
  if (difficulty >= 4) return 1500;
  if (difficulty >= 3) return 2000;
  if (difficulty >= 2) return 2500;
  return 3000;
}
function getStimulusContent(q: Question, topicSlug: string): { text: string; items?: string[] } {
  if (topicSlug === "tachistoscope") return { text: q.correctAnswer };
  if (topicSlug === "working-memory") {
    const parts = q.correctAnswer.split(";;");
    const originalSeq = parts.length > 1 ? parts[1] : q.correctAnswer;
    const items = originalSeq.split("-").map((s) => s.trim());
    return { text: originalSeq, items };
  }
  return { text: "" };
}
function getStimulusDurationMs(q: Question, topicSlug: string): number {
  if (topicSlug === "tachistoscope") return getTachistoscopeFlashMs(q.difficulty);
  if (topicSlug === "working-memory") return getWorkingMemoryShowMs(q.difficulty);
  return 0;
}

type Phase = "countdown" | "stimulus" | "stimulus-blank" | "playing" | "answered" | "done";

export default function WarmupPage() {
  const [phase, setPhase] = useState<Phase>("countdown");
  const [countdown, setCountdown] = useState(3);
  const [currentQ, setCurrentQ] = useState<Question | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [globalTimeLeft, setGlobalTimeLeft] = useState(WARMUP_DURATION_MS);
  
  const [stimulusContent, setStimulusContent] = useState<{ text: string; items?: string[] } | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<"correct" | "wrong" | null>(null);
  const [hideContext, setHideContext] = useState(false);

  const [combo, setCombo] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalWrong, setTotalWrong] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  
  const phaseRef = useRef<Phase>("countdown");
  const globalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  function goTo(p: Phase) {
    phaseRef.current = p;
    setPhase(p);
  }

  // Load first question
  useEffect(() => {
    let cancelled = false;
    // Generate async so we don't block render (even though it's sync, keeps pattern)
    setTimeout(() => {
      if (cancelled) return;
      loadNextQuestion();
    }, 0);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadNextQuestion() {
    const randomTopic = PROCEDURAL_TOPICS[Math.floor(Math.random() * PROCEDURAL_TOPICS.length)];
    const randomDiff = Math.floor(Math.random() * 3) + 1; // Level 1-3 for warmup
    const q = generateQuestion(randomTopic, randomDiff);
    if (q) {
      setCurrentQ(q as Question);
      setHideContext(false);
      setSelectedAnswer(null);
      setLastResult(null);
      
      if (phaseRef.current === "answered" || phaseRef.current === "playing") {
        showStimulusThenPlay(q as Question, randomTopic);
      }
    }
  }

  // Countdown
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      const id = setTimeout(() => {
        startTimeRef.current = Date.now();
        if (currentQ) {
          showStimulusThenPlay(currentQ, currentQ.topicSlug);
        }
      }, 0);
      return () => clearTimeout(id);
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, phase, currentQ]);

  // Global timer
  useEffect(() => {
    if (phase === "countdown" || phase === "done") return;

    globalTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, WARMUP_DURATION_MS - elapsed);
      setGlobalTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(globalTimerRef.current!);
        goTo("done");
      }
    }, 100);

    return () => {
      if (globalTimerRef.current) clearInterval(globalTimerRef.current);
    };
  }, [phase]);

  function showStimulusThenPlay(q: Question, topicSlug: string) {
    if (!needsStimulus(topicSlug)) {
      goTo("playing");
      return;
    }

    const content = getStimulusContent(q, topicSlug);
    const durationMs = getStimulusDurationMs(q, topicSlug);
    setStimulusContent(content);
    goTo("stimulus");

    setTimeout(() => {
      if (phaseRef.current !== "stimulus") return;
      if (topicSlug === "tachistoscope") {
        goTo("stimulus-blank");
        setTimeout(() => {
          if (phaseRef.current !== "stimulus-blank") return;
          setStimulusContent(null);
          goTo("playing");
        }, 300);
      } else {
        setStimulusContent(null);
        goTo("playing");
      }
    }, durationMs);
  }

  const handleAnswer = (answer: string) => {
    if (phaseRef.current !== "playing" || !currentQ) return;
    goTo("answered");
    setSelectedAnswer(answer);

    const actualCorrect = currentQ.correctAnswer.includes(";;") ? currentQ.correctAnswer.split(";;")[0] : currentQ.correctAnswer;
    const isCorrect = answer === actualCorrect;

    if (isCorrect) {
      sfx.playSuccess();
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(Math.max(maxCombo, newCombo));
      setTotalCorrect((v) => v + 1);
      setTotalXp((v) => v + currentQ.difficulty * 5);
      setLastResult("correct");
    } else {
      sfx.playError();
      setCombo(0);
      setTotalWrong((v) => v + 1);
      setLastResult("wrong");
    }
    
    // Auto-next after 1.5s if we don't want to make user click next in warmup?
    // User has to click next manually now.
  };

  const handleNext = () => {
    setCurrentIdx(i => i + 1);
    loadNextQuestion();
  };

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phaseRef.current === "answered") {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleNext();
        }
        return;
      }
      
      if (phaseRef.current !== "playing" || !currentQ) return;
      const keyMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3, "1": 0, "2": 1, "3": 2, "4": 3 };
      const idx = keyMap[e.key.toLowerCase()];
      if (idx !== undefined && idx < currentQ.options.length) {
        handleAnswer(currentQ.options[idx]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentQ]); // only dependencies that matter

  // ─── Render Phases ────────────────────────────────────
  if (phase === "countdown") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        <div className="text-sm text-amber-400 font-medium mb-4">🔥 Isınma Modu</div>
        <motion.div
          key={countdown}
          initial={{ scale: 2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-8xl font-bold text-amber-400"
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
            className="inline-flex p-4 rounded-full bg-amber-500/20"
          >
            <Clock className="w-12 h-12 text-amber-400" />
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
              <Flame className="w-5 h-5 text-orange-400" />
              <span className="text-sm text-orange-400">En uzun seri: {maxCombo}</span>
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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-amber-950/30 to-background">
      {/* Top bar */}
      <div className="p-4 flex items-center justify-between">
        <Link href="/" className="p-2 rounded-lg hover:bg-white/5 transition-colors">
          <Clock className="w-5 h-5 text-amber-400" />
        </Link>
        <div className="flex items-center gap-3">
          {combo >= 2 && (
            <motion.div
              key={combo}
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20"
            >
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-bold text-orange-400">x{combo}</span>
            </motion.div>
          )}
          <div className="text-xs text-muted-foreground px-2 py-1 rounded-full glass">
            {currentIdx + 1} soru
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg glass">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-medium text-amber-400">{totalXp} XP</span>
        </div>
      </div>

      {/* Global timer */}
      <div className="px-4">
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-100",
              globalPercent < 20 ? "progress-bar-danger" : "bg-gradient-to-r from-amber-500 to-orange-500",
            )}
            style={{ width: `${globalPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className={cn("text-[10px] font-mono", globalPercent < 20 ? "text-destructive" : "text-amber-400")}>
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
              <h2 className="text-5xl md:text-7xl font-mono tracking-widest text-[#1a1a2e]">
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
                    className="w-24 h-32 md:w-32 md:h-40 glass-strong rounded-2xl flex items-center justify-center text-3xl md:text-5xl font-bold bg-white/5"
                  >
                    {item}
                  </motion.div>
                ))}
              </div>
            ) : (
              // Single text (Tachistoscope)
              <h2 className="text-5xl md:text-7xl font-bold tracking-tight text-white drop-shadow-lg">
                {stimulusContent.text}
              </h2>
            )}
            <p className="text-muted-foreground mt-6 text-sm font-medium animate-pulse opacity-50">
              Odaklan...
            </p>
          </div>
        </div>
      )}

      {/* Question Phase */}
      {(phase === "playing" || phase === "answered") && currentQ && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIdx}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="w-full max-w-xl space-y-6"
            >
              {!hideContext && (
                <div className="glass-strong rounded-2xl p-6">
                  <p className="text-lg font-medium leading-relaxed whitespace-pre-line text-center">
                    {currentQ.content}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 gap-2.5">
                {currentQ.options.map((option, i) => {
                  const letter = ["A", "B", "C", "D"][i];
                  const actualCorrect = currentQ.correctAnswer.includes(";;") ? currentQ.correctAnswer.split(";;")[0] : currentQ.correctAnswer;
                  const isCorrectOption = option === actualCorrect;
                  const isSelected = selectedAnswer === option;
                  return (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      disabled={phase === "answered"}
                      onClick={() => handleAnswer(option)}
                      className={cn(
                        "w-full flex items-center gap-3 px-5 py-4 rounded-xl text-left transition-all glass hover:bg-white/5 active:scale-[0.98]",
                        phase === "answered" && isCorrectOption && "!bg-success/20 !border-success/50",
                        phase === "answered" && isSelected && !isCorrectOption && "!bg-destructive/20 !border-destructive/50",
                        phase === "answered" && !isSelected && !isCorrectOption && "opacity-40",
                      )}
                    >
                      <span
                        className={cn(
                          "w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold flex-shrink-0 bg-white/5",
                          phase === "answered" && isCorrectOption && "!bg-success text-white",
                          phase === "answered" && isSelected && !isCorrectOption && "!bg-destructive text-white",
                        )}
                      >
                        {phase === "answered" && isCorrectOption ? (
                          <Check className="w-4 h-4" />
                        ) : phase === "answered" && isSelected && !isCorrectOption ? (
                          <X className="w-4 h-4" />
                        ) : (
                          letter
                        )}
                      </span>
                      <span className="text-sm font-medium">{option}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          {phase === "answered" && lastResult && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3">
              {lastResult === "correct" ? (
                <span className="text-sm font-semibold text-success flex items-center gap-1 uppercase tracking-widest">
                  <Check className="w-4 h-4" />
                  {useThemeStore.getState().theme === "bloodborne" ? "PREY SLAUGHTERED" : 
                   useThemeStore.getState().theme === "ds3" ? "HEIR OF FIRE DESTROYED" : 
                   useThemeStore.getState().theme === "gta5" || useThemeStore.getState().theme === "gtasa" ? "RESPECT +" : 
                   useThemeStore.getState().theme === "arcade" ? "COMBO!" : "Doğru!"}
                </span>
              ) : (
                <span className="text-sm font-semibold text-destructive flex items-center gap-1 uppercase tracking-widest">
                  <X className="w-4 h-4" />
                  {useThemeStore.getState().theme === "bloodborne" ? "YOU DIED" : 
                   useThemeStore.getState().theme === "ds3" ? "YOU DIED" : 
                   useThemeStore.getState().theme === "gta5" || useThemeStore.getState().theme === "gtasa" ? "WASTED" : 
                   useThemeStore.getState().theme === "arcade" ? "GAME OVER" : "Yanlış!"}
                </span>
              )}
            </motion.div>
          )}

          {phase === "answered" && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={handleNext}
              className="mt-4 flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition-colors font-medium text-sm"
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
