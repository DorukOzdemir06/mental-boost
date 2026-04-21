"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, ArrowLeft, Timer, Flame, Trophy, ChevronRight,
  Check, X, Zap, Shield, Star, RotateCcw, Home, Lightbulb
} from "lucide-react";
import Link from "next/link";
import { useDrillStore, type Question } from "@/store/drill-store";
import { cn, formatMs, getComboGradient, getComboMultiplier, getXpProgress } from "@/lib/utils";

export default function DrillPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const store = useDrillStore();
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [topicInfo, setTopicInfo] = useState<{ name: string; color: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Load questions
  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setSessionComplete(false);
    setAnswered(false);
    setSelectedAnswer(null);

    const [questionsRes, pbRes, topicsRes] = await Promise.all([
      fetch(`/api/questions?topic=${slug}&limit=10`),
      fetch(`/api/personal-bests?topic=${slug}`),
      fetch("/api/topics"),
    ]);

    const questions: Question[] = await questionsRes.json();
    const pb = await pbRes.json();
    const allTopics = await topicsRes.json();
    const topic = allTopics.find((t: { slug: string }) => t.slug === slug);
    if (topic) setTopicInfo({ name: topic.name, color: topic.color });

    if (questions.length === 0) {
      setLoading(false);
      return;
    }

    store.startDrill(questions, slug, pb);

    // 3-2-1 countdown
    setCountdown(3);
    setTimeout(() => setCountdown(2), 1000);
    setTimeout(() => setCountdown(1), 2000);
    setTimeout(() => {
      setCountdown(null);
      setLoading(false);
      startTimer(questions[0].targetTimeMs);
    }, 3000);
  }, [slug]);

  useEffect(() => {
    loadQuestions();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loadQuestions]);

  // Timer
  const startTimer = (targetMs: number) => {
    setTimeLeft(targetMs);
    startTimeRef.current = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, targetMs - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        handleTimeout();
      }
    }, 50);
  };

  const handleTimeout = () => {
    if (answered) return;
    setAnswered(true);
    const elapsed = Date.now() - startTimeRef.current;
    store.answerQuestion("__timeout__", elapsed);
    // Log attempt
    logAttempt(store.currentQuestion!.id, false, elapsed, 0, 0);
  };

  // Answer
  const handleAnswer = (answer: string) => {
    if (answered || !store.currentQuestion) return;
    setAnswered(true);
    setSelectedAnswer(answer);

    if (timerRef.current) clearInterval(timerRef.current);
    const elapsed = Date.now() - startTimeRef.current;

    store.answerQuestion(answer, elapsed);

    const isCorrect = answer === store.currentQuestion.correctAnswer;
    const combo = isCorrect ? store.combo : 0; // updated in store already
    const xp = isCorrect
      ? Math.floor(
          (store.currentQuestion.difficulty * 10 +
            (elapsed < store.currentQuestion.targetTimeMs
              ? Math.floor((1 - elapsed / store.currentQuestion.targetTimeMs) * 20)
              : 0)) *
          Math.min(1 + (store.combo - 1) * 0.1, 3)
        )
      : 0;

    logAttempt(store.currentQuestion.id, isCorrect, elapsed, combo, xp);
  };

  const logAttempt = async (questionId: number, isCorrect: boolean, timeTakenMs: number, comboCount: number, xpEarned: number) => {
    await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId,
        topicSlug: slug,
        isCorrect,
        timeTakenMs,
        comboCount,
        xpEarned,
      }),
    });
  };

  // Next question
  const handleNext = () => {
    setAnswered(false);
    setSelectedAnswer(null);
    store.clearAnimation();

    const nextIndex = store.questionIndex + 1;
    if (nextIndex >= store.questions.length) {
      // Session complete
      setSessionComplete(true);
      // Update personal best
      const totalTimeMs = Date.now() - (store.startTime || Date.now());
      fetch("/api/personal-bests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicSlug: slug,
          bestTimeMs: totalTimeMs,
          bestStreak: store.maxCombo,
          bestScore: store.score,
        }),
      });
      store.endDrill();
      return;
    }

    store.nextQuestion();
    startTimer(store.questions[nextIndex].targetTimeMs);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (answered) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleNext();
        }
        return;
      }
      const q = store.currentQuestion;
      if (!q) return;

      const keyMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3, "1": 0, "2": 1, "3": 2, "4": 3 };
      const idx = keyMap[e.key.toLowerCase()];
      if (idx !== undefined && idx < q.options.length) {
        handleAnswer(q.options[idx]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [answered, store.currentQuestion]);

  // ─── Loading / Countdown ────────────────────────────
  if (countdown !== null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <motion.div
          key={countdown}
          initial={{ scale: 2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="text-8xl font-bold text-primary"
        >
          {countdown}
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Brain className="w-12 h-12 text-primary animate-pulse" />
      </div>
    );
  }

  // ─── Session Complete ───────────────────────────────
  if (sessionComplete) {
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
            className="inline-flex p-4 rounded-full bg-primary/20"
          >
            <Trophy className="w-12 h-12 text-primary" />
          </motion.div>
          <h2 className="text-2xl font-bold">Antrenman Tamamlandı!</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="glass rounded-xl p-3">
              <div className="text-xl font-bold text-success">{store.correctCount}</div>
              <div className="text-[10px] text-muted-foreground">Doğru</div>
            </div>
            <div className="glass rounded-xl p-3">
              <div className="text-xl font-bold text-destructive">{store.wrongCount}</div>
              <div className="text-[10px] text-muted-foreground">Yanlış</div>
            </div>
            <div className="glass rounded-xl p-3">
              <div className="text-xl font-bold text-primary">{store.xpEarned}</div>
              <div className="text-[10px] text-muted-foreground">XP</div>
            </div>
          </div>

          {store.maxCombo >= 3 && (
            <div className="flex items-center justify-center gap-2">
              <Flame className="w-5 h-5 text-orange-400" />
              <span className="text-sm text-orange-400">En uzun seri: {store.maxCombo}</span>
            </div>
          )}

          {store.personalBest && store.score > store.personalBest.bestScore && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30"
            >
              <div className="flex items-center justify-center gap-2">
                <Star className="w-5 h-5 text-yellow-400" />
                <span className="text-sm font-semibold text-yellow-400">Yeni Rekor! 🎉</span>
              </div>
            </motion.div>
          )}

          <div className="flex gap-3 pt-2">
            <Link href="/" className="flex-1">
              <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors text-sm font-medium">
                <Home className="w-4 h-4" />
                Ana Sayfa
              </button>
            </Link>
            <button
              onClick={loadQuestions}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              <RotateCcw className="w-4 h-4" />
              Tekrar Oyna
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Game UI ────────────────────────────────────────
  const q = store.currentQuestion;
  if (!q) return null;

  const targetMs = q.targetTimeMs;
  const timePercent = (timeLeft / targetMs) * 100;
  const isDanger = timePercent < 25;
  const comboMultiplier = getComboMultiplier(store.combo);

  return (
    <div
      className={cn(
        "min-h-screen flex flex-col transition-all duration-500",
        `bg-gradient-to-b ${getComboGradient(store.combo)}`,
        store.shakeScreen && "animate-shake"
      )}
    >
      {/* Top Bar */}
      <div className="p-4 flex items-center justify-between">
        <Link href="/" className="p-2 rounded-lg hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div className="flex items-center gap-3">
          {/* Combo */}
          {store.combo >= 2 && (
            <motion.div
              key={store.combo}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20"
            >
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-bold text-orange-400">
                x{comboMultiplier} Combo
              </span>
            </motion.div>
          )}
          {/* Progress */}
          <div className="text-xs text-muted-foreground px-2 py-1 rounded-full glass">
            {store.questionIndex + 1}/{store.totalQuestions}
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg glass">
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium text-primary">{store.score} XP</span>
        </div>
      </div>

      {/* Timer Bar */}
      <div className="px-4">
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <motion.div
            className={cn("h-full rounded-full", isDanger ? "progress-bar-danger" : "progress-bar")}
            style={{ width: `${timePercent}%` }}
            transition={{ duration: 0.05 }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className={cn("text-[10px] font-mono", isDanger ? "text-destructive animate-countdown-pulse" : "text-muted-foreground")}>
            {formatMs(timeLeft)}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">
            Hedef: {formatMs(targetMs)}
          </span>
        </div>
      </div>

      {/* Personal Best Ghost */}
      {store.personalBest && store.personalBest.bestScore > 0 && !answered && (
        <div className="px-4 mt-2">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <Trophy className="w-3 h-3" />
            <span>Önceki rekorun: {store.personalBest.bestScore} XP | En uzun seri: {store.personalBest.bestStreak}</span>
          </div>
        </div>
      )}

      {/* Question */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={store.questionIndex}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="w-full max-w-xl space-y-6"
          >
            {/* Question Text */}
            <div className="glass-strong rounded-2xl p-6">
              <p className="text-lg font-medium leading-relaxed whitespace-pre-line">{q.content}</p>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 gap-2.5">
              {q.options.map((option, i) => {
                const letter = ["A", "B", "C", "D"][i];
                const isCorrectOption = option === q.correctAnswer;
                const isSelected = selectedAnswer === option;
                const showResult = answered;

                return (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    disabled={answered}
                    onClick={() => handleAnswer(option)}
                    className={cn(
                      "w-full flex items-center gap-3 px-5 py-4 rounded-xl text-left transition-all",
                      "glass hover:bg-white/5 active:scale-[0.98]",
                      !answered && "hover:border-primary/50",
                      showResult && isCorrectOption && "!bg-success/20 !border-success/50",
                      showResult && isSelected && !isCorrectOption && "!bg-destructive/20 !border-destructive/50",
                      answered && !isSelected && !isCorrectOption && "opacity-40"
                    )}
                  >
                    <span className={cn(
                      "w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold flex-shrink-0",
                      "bg-white/5",
                      showResult && isCorrectOption && "!bg-success text-white",
                      showResult && isSelected && !isCorrectOption && "!bg-destructive text-white"
                    )}>
                      {showResult && isCorrectOption ? <Check className="w-4 h-4" /> :
                       showResult && isSelected && !isCorrectOption ? <X className="w-4 h-4" /> :
                       letter}
                    </span>
                    <span className="text-sm font-medium">{option}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Tac Hint */}
        <AnimatePresence>
          {answered && store.showTactic && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 w-full max-w-xl"
            >
              <div className="glass rounded-xl p-4 border border-amber-500/30">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300/90">{store.showTactic}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Correct/Wrong Flash */}
        <AnimatePresence>
          {answered && store.lastResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="mt-4"
            >
              {store.lastResult === "correct" ? (
                <div className="flex items-center gap-2 text-success">
                  <Check className="w-5 h-5" />
                  <span className="text-sm font-semibold">Doğru!</span>
                  {store.combo >= 2 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-xs text-orange-400"
                    >
                      🔥 {store.combo} seri!
                    </motion.span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-destructive">
                  <X className="w-5 h-5" />
                  <span className="text-sm font-semibold">Yanlış!</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Next Button */}
        {answered && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleNext}
            className="mt-6 flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium text-sm"
          >
            {store.questionIndex + 1 >= store.totalQuestions ? "Sonuçlar" : "Sonraki Soru"}
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        )}
      </div>

      {/* Footer hint */}
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
