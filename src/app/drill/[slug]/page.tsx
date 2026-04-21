"use client";

import { useEffect, useState, useRef, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, ArrowLeft, Flame, Trophy, ChevronRight,
  Check, X, Zap, Star, RotateCcw, Home, Lightbulb, Eye
} from "lucide-react";
import Link from "next/link";
import { useDrillStore, type Question } from "@/store/drill-store";
import { cn, formatMs, getComboMultiplier } from "@/lib/utils";

const COMBO_BG = [
  "from-slate-900 to-slate-800",
  "from-blue-950 to-indigo-900",
  "from-indigo-950 to-purple-900",
  "from-purple-950 to-fuchsia-900",
  "from-fuchsia-950 to-pink-900",
  "from-pink-950 to-rose-900",
  "from-rose-950 to-red-900",
] as const;

function comboGrad(c: number) {
  if (c >= 25) return COMBO_BG[6];
  if (c >= 15) return COMBO_BG[5];
  if (c >= 10) return COMBO_BG[4];
  if (c >= 5)  return COMBO_BG[3];
  if (c >= 3)  return COMBO_BG[2];
  if (c >= 1)  return COMBO_BG[1];
  return COMBO_BG[0];
}

// ─── Stimulus helpers ─────────────────────────────────
// Topics that need a stimulus shown before the question
const STIMULUS_TOPICS = ["tachistoscope", "working-memory"];

function needsStimulus(topicSlug: string): boolean {
  return STIMULUS_TOPICS.includes(topicSlug);
}

// Tachistoscope: brief flash. Harder = shorter.
function getTachistoscopeFlashMs(difficulty: number): number {
  if (difficulty >= 4) return 150;
  if (difficulty >= 3) return 250;
  if (difficulty >= 2) return 400;
  return 600; // easy
}

// Working Memory: show sequence for a duration. Harder = shorter.
function getWorkingMemoryShowMs(difficulty: number): number {
  if (difficulty >= 4) return 1500;
  if (difficulty >= 3) return 2000;
  if (difficulty >= 2) return 2500;
  return 3000; // easy
}

// Get what to show as stimulus for a given question
function getStimulusContent(q: Question, topicSlug: string): { text: string; items?: string[] } {
  if (topicSlug === "tachistoscope") {
    // The correct answer IS the word to flash
    return { text: q.correctAnswer };
  }
  if (topicSlug === "working-memory") {
    // The correct answer contains the sequence (e.g. "4-7-2" or "Kalem-Masa-Kitap")
    const items = q.correctAnswer.split("-").map((s) => s.trim());
    return { text: q.correctAnswer, items };
  }
  return { text: "" };
}

function getStimulusDurationMs(q: Question, topicSlug: string): number {
  if (topicSlug === "tachistoscope") return getTachistoscopeFlashMs(q.difficulty);
  if (topicSlug === "working-memory") return getWorkingMemoryShowMs(q.difficulty);
  return 0;
}

type Phase = "loading" | "countdown" | "stimulus" | "stimulus-blank" | "playing" | "answered" | "results";

export default function DrillPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const store = useDrillStore();

  const [phase, setPhase] = useState<Phase>("loading");
  const [countdownNum, setCountdownNum] = useState(3);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [, forceUpdate] = useState(0);

  // Stimulus state
  const [stimulusContent, setStimulusContent] = useState<{ text: string; items?: string[] } | null>(null);

  // Refs
  const phaseRef = useRef<Phase>("loading");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const targetMsRef = useRef(0);
  const slugRef = useRef(slug);
  slugRef.current = slug;

  function goTo(p: Phase) {
    phaseRef.current = p;
    setPhase(p);
  }

  function stopTimer() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function startTimer(targetMs: number) {
    stopTimer();
    targetMsRef.current = targetMs;
    startTimeRef.current = Date.now();
    setTimeLeft(targetMs);

    intervalRef.current = setInterval(() => {
      if (phaseRef.current !== "playing") return;
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, targetMsRef.current - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        stopTimer();
        if (phaseRef.current !== "playing") return;
        const q = useDrillStore.getState().currentQuestion;
        if (q) {
          useDrillStore.getState().answerQuestion("__timeout__", elapsed);
          fetch("/api/attempts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ questionId: q.id, topicSlug: slugRef.current, isCorrect: false, timeTakenMs: elapsed, comboCount: 0, xpEarned: 0 }),
          }).catch(() => {});
        }
        goTo("answered");
      }
    }, 50);
  }

  // ─── Show Stimulus then transition to playing ───────
  function showStimulusThenPlay(q: Question) {
    if (!needsStimulus(slug)) {
      // Normal topics — go straight to playing
      goTo("playing");
      startTimer(q.targetTimeMs);
      return;
    }

    const content = getStimulusContent(q, slug);
    const durationMs = getStimulusDurationMs(q, slug);
    setStimulusContent(content);
    goTo("stimulus");

    // After stimulus duration, show brief blank screen (for tachistoscope)
    setTimeout(() => {
      if (phaseRef.current !== "stimulus") return; // cancelled
      if (slug === "tachistoscope") {
        // Brief blank screen after flash (300ms)
        goTo("stimulus-blank");
        setTimeout(() => {
          if (phaseRef.current !== "stimulus-blank") return;
          setStimulusContent(null);
          goTo("playing");
          startTimer(q.targetTimeMs);
        }, 300);
      } else {
        // Working memory — go straight to question
        setStimulusContent(null);
        goTo("playing");
        startTimer(q.targetTimeMs);
      }
    }, durationMs);
  }

  useEffect(() => () => stopTimer(), []);

  // ─── Load Questions ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      goTo("loading");
      stopTimer();
      setSelectedAnswer(null);
      setShaking(false);
      setStimulusContent(null);

      const [qRes, pbRes] = await Promise.all([
        fetch(`/api/questions?topic=${slug}&limit=10`),
        fetch(`/api/personal-bests?topic=${slug}`),
      ]);

      if (cancelled) return;

      const questions: Question[] = await qRes.json();
      const pb = await pbRes.json();
      if (questions.length === 0) return;

      useDrillStore.getState().startDrill(questions, slug, pb);

      // 3-2-1 countdown
      setCountdownNum(3);
      goTo("countdown");
      setTimeout(() => { if (!cancelled) setCountdownNum(2); }, 1000);
      setTimeout(() => { if (!cancelled) setCountdownNum(1); }, 2000);
      setTimeout(() => {
        if (cancelled) return;
        showStimulusThenPlay(questions[0]);
      }, 3000);
    }

    init();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // ─── Handle Answer ──────────────────────────────────
  function handleAnswer(answer: string) {
    if (phaseRef.current !== "playing") return;
    const q = useDrillStore.getState().currentQuestion;
    if (!q) return;

    goTo("answered");
    stopTimer();
    setSelectedAnswer(answer);

    const elapsed = Date.now() - startTimeRef.current;
    const { isCorrect, earnedXp, newCombo } = useDrillStore.getState().answerQuestion(answer, elapsed);

    if (!isCorrect) {
      setShaking(true);
      setTimeout(() => setShaking(false), 400);
    }

    fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: q.id, topicSlug: slug, isCorrect, timeTakenMs: elapsed, comboCount: newCombo, xpEarned: earnedXp }),
    }).catch(() => {});

    forceUpdate((n) => n + 1);
  }

  // ─── Handle Next ────────────────────────────────────
  function handleNext() {
    const s = useDrillStore.getState();
    const nextIdx = s.questionIndex + 1;

    if (nextIdx >= s.questions.length) {
      const totalTimeMs = Date.now() - s.startTime;
      fetch("/api/personal-bests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicSlug: slug, bestTimeMs: totalTimeMs, bestStreak: s.maxCombo, bestScore: s.score }),
      }).catch(() => {});
      useDrillStore.getState().endDrill();
      goTo("results");
      forceUpdate((n) => n + 1);
      return;
    }

    setSelectedAnswer(null);
    setShaking(false);
    useDrillStore.getState().clearAnimation();
    useDrillStore.getState().nextQuestion();

    const nextQ = useDrillStore.getState().currentQuestion;
    if (nextQ) {
      showStimulusThenPlay(nextQ);
    }
    forceUpdate((n) => n + 1);
  }

  // ─── Replay ─────────────────────────────────────────
  function handleReplay() {
    goTo("loading");
    stopTimer();
    setSelectedAnswer(null);
    setShaking(false);
    setStimulusContent(null);

    (async () => {
      const [qRes, pbRes] = await Promise.all([
        fetch(`/api/questions?topic=${slug}&limit=10`),
        fetch(`/api/personal-bests?topic=${slug}`),
      ]);
      const questions: Question[] = await qRes.json();
      const pb = await pbRes.json();
      if (questions.length === 0) return;
      useDrillStore.getState().startDrill(questions, slug, pb);
      setCountdownNum(3);
      goTo("countdown");
      setTimeout(() => setCountdownNum(2), 1000);
      setTimeout(() => setCountdownNum(1), 2000);
      setTimeout(() => showStimulusThenPlay(questions[0]), 3000);
      forceUpdate((n) => n + 1);
    })();
  }

  // ─── Keyboard Shortcuts ─────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phaseRef.current === "answered") {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleNext(); }
        return;
      }
      if (phaseRef.current !== "playing") return;
      const q = useDrillStore.getState().currentQuestion;
      if (!q) return;
      const map: Record<string, number> = { a: 0, b: 1, c: 2, d: 3, "1": 0, "2": 1, "3": 2, "4": 3 };
      const idx = map[e.key.toLowerCase()];
      if (idx !== undefined && idx < q.options.length) handleAnswer(q.options[idx]);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ─── RENDER ─────────────────────────────────────────

  if (phase === "loading") {
    return <div className="flex items-center justify-center min-h-screen bg-background"><Brain className="w-12 h-12 text-primary animate-pulse" /></div>;
  }

  if (phase === "countdown") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <AnimatePresence mode="wait">
          <motion.div key={countdownNum} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.3 }} className="text-8xl font-bold text-primary">
            {countdownNum}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // ─── Stimulus Phase (Tachistoscope flash / Working Memory display) ───
  if (phase === "stimulus" && stimulusContent) {
    const isTachy = slug === "tachistoscope";

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        {isTachy ? (
          // TACHISTOSCOPE: Just the word, BIG, centered
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            {/* Glow effect behind word */}
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
            <h1 className="relative text-5xl md:text-7xl font-bold text-primary tracking-wide">
              {stimulusContent.text}
            </h1>
          </motion.div>
        ) : (
          // WORKING MEMORY: Show items as cards
          <div className="space-y-6 text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Eye className="w-5 h-5" />
              <span className="text-sm font-medium">Ezberle!</span>
            </div>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {stimulusContent.items ? (
                stimulusContent.items.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.15 }}
                    className="glass-strong rounded-2xl px-6 py-4 min-w-[60px]"
                  >
                    <span className="text-2xl md:text-3xl font-bold text-primary">{item}</span>
                  </motion.div>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass-strong rounded-2xl px-8 py-5"
                >
                  <span className="text-3xl font-bold text-primary">{stimulusContent.text}</span>
                </motion.div>
              )}
            </div>
            {/* Countdown bar for how long they have to memorize */}
            <StimulusCountdownBar durationMs={getStimulusDurationMs(store.currentQuestion!, slug)} />
          </div>
        )}
      </div>
    );
  }

  // Blank screen after tachistoscope flash
  if (phase === "stimulus-blank") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-muted-foreground text-sm"
        >
          Ne gördün?
        </motion.div>
      </div>
    );
  }

  if (phase === "results") {
    const r = store.savedResults;
    if (!r) return null;
    const newRecord = r.personalBest && r.score > r.personalBest.bestScore;

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-strong rounded-3xl p-8 max-w-md w-full text-center space-y-6">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }} className="inline-flex p-4 rounded-full bg-primary/20">
            <Trophy className="w-12 h-12 text-primary" />
          </motion.div>
          <h2 className="text-2xl font-bold">Antrenman Tamamlandı!</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="glass rounded-xl p-3"><div className="text-xl font-bold text-emerald-400">{r.correctCount}</div><div className="text-[10px] text-muted-foreground">Doğru</div></div>
            <div className="glass rounded-xl p-3"><div className="text-xl font-bold text-red-400">{r.wrongCount}</div><div className="text-[10px] text-muted-foreground">Yanlış</div></div>
            <div className="glass rounded-xl p-3"><div className="text-xl font-bold text-primary">{r.xpEarned}</div><div className="text-[10px] text-muted-foreground">XP</div></div>
          </div>
          {r.maxCombo >= 3 && <div className="flex items-center justify-center gap-2"><Flame className="w-5 h-5 text-orange-400" /><span className="text-sm text-orange-400">En uzun seri: {r.maxCombo}</span></div>}
          {newRecord && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30"><div className="flex items-center justify-center gap-2"><Star className="w-5 h-5 text-yellow-400" /><span className="text-sm font-semibold text-yellow-400">Yeni Rekor! 🎉</span></div></motion.div>}
          <div className="flex gap-3 pt-2">
            <Link href="/" className="flex-1"><button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors text-sm font-medium"><Home className="w-4 h-4" /> Ana Sayfa</button></Link>
            <button onClick={handleReplay} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"><RotateCcw className="w-4 h-4" /> Tekrar Oyna</button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Game UI ────────────────────────────────────────
  const q = store.currentQuestion;
  if (!q) return null;

  const isAns = phase === "answered";
  const tMs = q.targetTimeMs;
  const pct = Math.min(100, Math.max(0, (timeLeft / tMs) * 100));
  const danger = pct < 25;
  const mult = getComboMultiplier(store.combo);

  return (
    <div className={cn("min-h-screen flex flex-col transition-all duration-500 bg-gradient-to-b", comboGrad(store.combo), shaking && "animate-shake")}>
      {/* Top bar */}
      <div className="p-4 flex items-center justify-between">
        <Link href="/" className="p-2 rounded-lg hover:bg-white/5 transition-colors"><ArrowLeft className="w-5 h-5 text-muted-foreground" /></Link>
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {store.combo >= 2 && (
              <motion.div key={`c${store.combo}`} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20">
                <Flame className="w-4 h-4 text-orange-400" /><span className="text-sm font-bold text-orange-400">x{mult} Combo</span>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="text-xs text-muted-foreground px-2 py-1 rounded-full glass">{store.questionIndex + 1}/{store.totalQuestions}</div>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg glass"><Zap className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-medium text-primary">{store.score} XP</span></div>
      </div>

      {/* Timer */}
      <div className="px-4">
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div className={cn("h-full rounded-full transition-[width] duration-100 ease-linear", danger ? "progress-bar-danger" : "progress-bar")} style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className={cn("text-[10px] font-mono", danger ? "text-red-400 animate-countdown-pulse" : "text-muted-foreground")}>{formatMs(timeLeft)}</span>
          <span className="text-[10px] text-muted-foreground font-mono">Hedef: {formatMs(tMs)}</span>
        </div>
      </div>

      {/* Ghost PB */}
      {store.personalBest && store.personalBest.bestScore > 0 && !isAns && (
        <div className="px-4 mt-2"><div className="flex items-center gap-2 text-[10px] text-muted-foreground"><Trophy className="w-3 h-3" /><span>Rekorun: {store.personalBest.bestScore} XP | Seri: {store.personalBest.bestStreak}</span></div></div>
      )}

      {/* Question & Options */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div key={store.questionIndex} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }} className="w-full max-w-xl space-y-6">
            <div className="glass-strong rounded-2xl p-6"><p className="text-lg font-medium leading-relaxed whitespace-pre-line">{q.content}</p></div>
            <div className="grid grid-cols-1 gap-2.5">
              {q.options.map((opt, i) => {
                const letter = ["A", "B", "C", "D"][i];
                const isRight = opt === q.correctAnswer;
                const isSel = selectedAnswer === opt;
                return (
                  <motion.button key={`${store.questionIndex}-${i}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    disabled={isAns} onClick={() => handleAnswer(opt)}
                    className={cn("w-full flex items-center gap-3 px-5 py-4 rounded-xl text-left transition-all cursor-pointer glass hover:bg-white/5 active:scale-[0.98]",
                      !isAns && "hover:border-primary/50",
                      isAns && isRight && "!bg-emerald-500/20 !border-emerald-500/50",
                      isAns && isSel && !isRight && "!bg-red-500/20 !border-red-500/50",
                      isAns && !isSel && !isRight && "opacity-40"
                    )}>
                    <span className={cn("w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold flex-shrink-0 bg-white/5",
                      isAns && isRight && "!bg-emerald-500 text-white",
                      isAns && isSel && !isRight && "!bg-red-500 text-white"
                    )}>
                      {isAns && isRight ? <Check className="w-4 h-4" /> : isAns && isSel && !isRight ? <X className="w-4 h-4" /> : letter}
                    </span>
                    <span className="text-sm font-medium">{opt}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {isAns && store.showTactic && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 w-full max-w-xl">
              <div className="glass rounded-xl p-4 border border-amber-500/30"><div className="flex items-start gap-2"><Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" /><p className="text-xs text-amber-300/90">{store.showTactic}</p></div></div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isAns && store.lastResult && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="mt-4">
              {store.lastResult === "correct" ? (
                <div className="flex items-center gap-2 text-emerald-400"><Check className="w-5 h-5" /><span className="text-sm font-semibold">Doğru!</span>{store.combo >= 2 && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-xs text-orange-400">🔥 {store.combo} seri!</motion.span>}</div>
              ) : (
                <div className="flex items-center gap-2 text-red-400"><X className="w-5 h-5" /><span className="text-sm font-semibold">{selectedAnswer ? "Yanlış!" : "Süre Doldu!"}</span></div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {isAns && (
          <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={handleNext}
            className="mt-6 flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium text-sm">
            {store.questionIndex + 1 >= store.totalQuestions ? "Sonuçlar" : "Sonraki Soru"} <ChevronRight className="w-4 h-4" />
          </motion.button>
        )}
      </div>

      {!isAns && <div className="pb-4 text-center"><p className="text-[10px] text-muted-foreground">Klavye: A, B, C, D veya 1, 2, 3, 4</p></div>}
    </div>
  );
}

// ─── Stimulus Countdown Bar (visual timer during memorization) ───
function StimulusCountdownBar({ durationMs }: { durationMs: number }) {
  const [pct, setPct] = useState(100);
  const startRef = useRef(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    const iv = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, 100 - (elapsed / durationMs) * 100);
      setPct(remaining);
      if (remaining <= 0) clearInterval(iv);
    }, 30);
    return () => clearInterval(iv);
  }, [durationMs]);

  return (
    <div className="w-48 mx-auto mt-4">
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full bg-primary/60 transition-[width] duration-75 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
