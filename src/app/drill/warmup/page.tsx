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

interface WarmupQuestion {
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

export default function WarmupPage() {
  const [phase, setPhase] = useState<"countdown" | "active" | "done">(
    "countdown",
  );
  const [countdown, setCountdown] = useState(3);
  const [questions, setQuestions] = useState<WarmupQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [globalTimeLeft, setGlobalTimeLeft] = useState(WARMUP_DURATION_MS);
  const [answered, setAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<"correct" | "wrong" | null>(
    null,
  );
  const [showTactic, setShowTactic] = useState<string | null>(null);
  const [combo, setCombo] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalWrong, setTotalWrong] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const globalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  // Load all questions randomly across all topics
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const topicSlugs = [
        "mental-math",
        "pen-paper-math",
        "estimation",
        "pattern-recognition",
        "tachistoscope",
        "paragraph-scanning",
        "table-builder",
        "working-memory",
      ];

      const allQuestions: WarmupQuestion[] = [];
      for (const t of topicSlugs) {
        const res = await fetch(`/api/questions?topic=${t}&limit=5`);
        const qs = await res.json();
        allQuestions.push(...qs);
      }

      // Shuffle
      for (let i = allQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]];
      }
      if (!cancelled) setQuestions(allQuestions);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Countdown
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      // Use setTimeout to avoid synchronous setState in effect body
      const id = setTimeout(() => {
        setPhase("active");
        startTimeRef.current = Date.now();
      }, 0);
      return () => clearTimeout(id);
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, phase]);

  // Global timer
  useEffect(() => {
    if (phase !== "active") return;

    globalTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, WARMUP_DURATION_MS - elapsed);
      setGlobalTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(globalTimerRef.current!);
        setPhase("done");
      }
    }, 100);

    return () => {
      if (globalTimerRef.current) clearInterval(globalTimerRef.current);
    };
  }, [phase]);

  const handleAnswer = (answer: string) => {
    if (answered || phase !== "active") return;
    setAnswered(true);
    setSelectedAnswer(answer);

    const q = questions[currentIdx];
    const isCorrect = answer === q.correctAnswer;

    if (isCorrect) {
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(Math.max(maxCombo, newCombo));
      setTotalCorrect((v) => v + 1);
      setTotalXp((v) => v + q.difficulty * 5);
      setLastResult("correct");
      setShowTactic(null);
    } else {
      setCombo(0);
      setTotalWrong((v) => v + 1);
      setLastResult("wrong");
      setShowTactic(q.tacticHint || null);
    }
  };

  const handleNext = () => {
    setAnswered(false);
    setSelectedAnswer(null);
    setLastResult(null);
    setShowTactic(null);

    if (currentIdx + 1 >= questions.length) {
      setPhase("done");
      return;
    }
    setCurrentIdx(currentIdx + 1);
  };

  // Keyboard — register on every render to always have fresh closures
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== "active") return;
      if (answered) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleNext();
        }
        return;
      }
      const q = questions[currentIdx];
      if (!q) return;
      const keyMap: Record<string, number> = {
        a: 0,
        b: 1,
        c: 2,
        d: 3,
        "1": 0,
        "2": 1,
        "3": 2,
        "4": 3,
      };
      const idx = keyMap[e.key.toLowerCase()];
      if (idx !== undefined && idx < q.options.length) {
        handleAnswer(q.options[idx]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Countdown ──────────────────────────────────────
  if (phase === "countdown") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        <div className="text-sm text-amber-400 font-medium mb-4">
          🔥 Isınma Modu
        </div>
        <motion.div
          key={countdown}
          initial={{ scale: 2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-8xl font-bold text-amber-400"
        >
          {countdown}
        </motion.div>
        <p className="text-xs text-muted-foreground mt-4">
          3 dakika, karma sorular, refleks açıcı!
        </p>
      </div>
    );
  }

  // ─── Done ───────────────────────────────────────────
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
          <p className="text-sm text-muted-foreground">
            Beyinin ısındı, artık asıl antrenmanlara geçebilirsin!
          </p>

          <div className="grid grid-cols-3 gap-4">
            <div className="glass rounded-xl p-3">
              <div className="text-xl font-bold text-success">
                {totalCorrect}
              </div>
              <div className="text-[10px] text-muted-foreground">Doğru</div>
            </div>
            <div className="glass rounded-xl p-3">
              <div className="text-xl font-bold text-destructive">
                {totalWrong}
              </div>
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
              <span className="text-sm text-orange-400">
                En uzun seri: {maxCombo}
              </span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Link href="/" className="flex-1">
              <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium">
                <Home className="w-4 h-4" />
                Antrenmanlara Geç
              </button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Active Warmup ──────────────────────────────────
  const q = questions[currentIdx];
  if (!q) return null;

  const globalPercent = (globalTimeLeft / WARMUP_DURATION_MS) * 100;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-amber-950/30 to-background">
      {/* Top bar */}
      <div className="p-4 flex items-center justify-between">
        <Link
          href="/"
          className="p-2 rounded-lg hover:bg-white/5 transition-colors"
        >
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
              <span className="text-sm font-bold text-orange-400">
                x{combo}
              </span>
            </motion.div>
          )}
          <div className="text-xs text-muted-foreground px-2 py-1 rounded-full glass">
            {currentIdx + 1} soru
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg glass">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-medium text-amber-400">
            {totalXp} XP
          </span>
        </div>
      </div>

      {/* Global timer */}
      <div className="px-4">
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-100",
              globalPercent < 20
                ? "progress-bar-danger"
                : "bg-gradient-to-r from-amber-500 to-orange-500",
            )}
            style={{ width: `${globalPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span
            className={cn(
              "text-[10px] font-mono",
              globalPercent < 20 ? "text-destructive" : "text-amber-400",
            )}
          >
            {formatMs(globalTimeLeft)}
          </span>
          <span className="text-[10px] text-muted-foreground">Isınma Modu</span>
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="w-full max-w-xl space-y-6"
          >
            <div className="glass-strong rounded-2xl p-6">
              <p className="text-lg font-medium leading-relaxed whitespace-pre-line">
                {q.content}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              {q.options.map((option, i) => {
                const letter = ["A", "B", "C", "D"][i];
                const isCorrectOption = option === q.correctAnswer;
                const isSelected = selectedAnswer === option;
                return (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    disabled={answered}
                    onClick={() => handleAnswer(option)}
                    className={cn(
                      "w-full flex items-center gap-3 px-5 py-4 rounded-xl text-left transition-all glass hover:bg-white/5 active:scale-[0.98]",
                      answered &&
                        isCorrectOption &&
                        "!bg-success/20 !border-success/50",
                      answered &&
                        isSelected &&
                        !isCorrectOption &&
                        "!bg-destructive/20 !border-destructive/50",
                      answered &&
                        !isSelected &&
                        !isCorrectOption &&
                        "opacity-40",
                    )}
                  >
                    <span
                      className={cn(
                        "w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold flex-shrink-0 bg-white/5",
                        answered && isCorrectOption && "!bg-success text-white",
                        answered &&
                          isSelected &&
                          !isCorrectOption &&
                          "!bg-destructive text-white",
                      )}
                    >
                      {answered && isCorrectOption ? (
                        <Check className="w-4 h-4" />
                      ) : answered && isSelected && !isCorrectOption ? (
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

        {/* Tactic */}
        <AnimatePresence>
          {answered && showTactic && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 w-full max-w-xl"
            >
              <div className="glass rounded-xl p-4 border border-amber-500/30">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300/90">{showTactic}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {answered && lastResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3"
          >
            {lastResult === "correct" ? (
              <span className="text-sm font-semibold text-success flex items-center gap-1">
                <Check className="w-4 h-4" /> Doğru!
              </span>
            ) : (
              <span className="text-sm font-semibold text-destructive flex items-center gap-1">
                <X className="w-4 h-4" /> Yanlış
              </span>
            )}
          </motion.div>
        )}

        {answered && (
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

      {!answered && (
        <div className="pb-4 text-center">
          <p className="text-[10px] text-muted-foreground">
            Klavye: A, B, C, D veya 1, 2, 3, 4
          </p>
        </div>
      )}
    </div>
  );
}
