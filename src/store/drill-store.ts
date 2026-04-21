"use client";

import { create } from "zustand";
import { generateQuestion } from "@/lib/generators";

export interface Question {
  id: number;
  topicSlug: string;
  content: string;
  options: string[];
  correctAnswer: string;
  difficulty: number;
  targetTimeMs: number;
  tacticHint: string | null;
}

export interface SessionResults {
  correctCount: number;
  wrongCount: number;
  xpEarned: number;
  maxCombo: number;
  score: number;
  personalBest: { bestTimeMs: number; bestStreak: number; bestScore: number } | null;
}

export interface DrillState {
  // Session
  isActive: boolean;
  currentQuestion: Question | null;
  questions: Question[]; // DB bank for non-generative topics
  questionIndex: number;
  totalQuestions: number;
  topicSlug: string;

  // Adaptive Difficulty Engine
  currentDifficulty: number;
  accuracyHistory: boolean[]; // tracks last N answers

  // Scoring
  combo: number;
  maxCombo: number;
  score: number;
  xpEarned: number;
  correctCount: number;
  wrongCount: number;
  startTime: number;

  // Animation triggers
  lastResult: "correct" | "wrong" | "timeout" | null;
  showTactic: string | null;
  shakeScreen: boolean;

  // Personal Best
  personalBest: { bestTimeMs: number; bestStreak: number; bestScore: number } | null;

  // Saved results
  savedResults: SessionResults | null;

  // Actions
  startDrill: (questions: Question[], topicSlug: string, pb: DrillState["personalBest"]) => void;
  answerQuestion: (answer: string, timeTakenMs: number) => { isCorrect: boolean; earnedXp: number; newCombo: number };
  nextQuestion: () => void;
  endDrill: () => void;
  clearAnimation: () => void;
}

// How many questions per drill session? Infinity for endless mode
const SESSION_LENGTH = Infinity;

export const useDrillStore = create<DrillState>((set, get) => ({
  isActive: false,
  currentQuestion: null,
  questions: [],
  questionIndex: 0,
  totalQuestions: SESSION_LENGTH,
  topicSlug: "",
  
  currentDifficulty: 1, // Starts at 1, will adapt
  accuracyHistory: [],

  combo: 0,
  maxCombo: 0,
  score: 0,
  xpEarned: 0,
  correctCount: 0,
  wrongCount: 0,
  startTime: 0,
  lastResult: null,
  showTactic: null,
  shakeScreen: false,
  personalBest: null,
  savedResults: null,

  startDrill: (questions, topicSlug, pb) => {
    // Generate first question if it's a procedural topic
    let firstQ = generateQuestion(topicSlug, 1);
    // If null, it means it's a DB-based topic (like paragraph-scanning)
    if (!firstQ && questions.length > 0) {
      firstQ = questions[0];
    }

    // Read from localStorage to persist difficulty across sessions
    let initialDiff = 1;
    let initialHist: boolean[] = [];
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`mental-boost-progress-${topicSlug}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.currentDifficulty) initialDiff = parsed.currentDifficulty;
          if (parsed.accuracyHistory) initialHist = parsed.accuracyHistory;
        }
      } catch {}
    }

    set({
      isActive: true,
      questions,
      currentQuestion: firstQ || null,
      questionIndex: 0,
      totalQuestions: SESSION_LENGTH,
      topicSlug,
      currentDifficulty: initialDiff, // Recovered adaptivity
      accuracyHistory: initialHist,
      combo: 0,
      maxCombo: 0,
      score: 0,
      xpEarned: 0,
      correctCount: 0,
      wrongCount: 0,
      startTime: Date.now(),
      lastResult: null,
      showTactic: null,
      shakeScreen: false,
      personalBest: pb,
      savedResults: null,
    });
  },

  answerQuestion: (answer, timeTakenMs) => {
    const state = get();
    const q = state.currentQuestion;
    if (!q) return { isCorrect: false, earnedXp: 0, newCombo: 0 };

    // Working memory correctAnswer may contain ";;" separator (e.g. "ans;;originalSeq")
    // Extract just the answer portion for comparison
    const actualCorrect = q.correctAnswer.includes(";;") ? q.correctAnswer.split(";;")[0] : q.correctAnswer;
    const isCorrect = answer === actualCorrect;
    
    // ─── 85% Rule (Difficulty Adaptation) ───
    const newHistory = [...state.accuracyHistory, isCorrect];
    if (newHistory.length > 10) newHistory.shift(); // keep last 10 max
    
    let newDifficulty = state.currentDifficulty;
    
    // Evaluate if we should scale up or down
    if (newHistory.length >= 3) {
      const recent3 = newHistory.slice(-3);
      const allRight = recent3.every(Boolean);
      const allWrong = recent3.every(b => !b);
      
      if (allRight) {
        newDifficulty = Math.min(10, state.currentDifficulty + 1);
      } else if (allWrong || (!isCorrect && state.currentDifficulty > 1)) {
        // Punish harsh on wrong to keep motivation if they fail
        newDifficulty = Math.max(1, state.currentDifficulty - 1);
      }
    }

    const newCombo = isCorrect ? state.combo + 1 : 0;
    const comboMultiplier = isCorrect ? Math.min(1 + state.combo * 0.1, 3) : 1;
    // XP scales intensely with procedural difficulty levels
    const baseXp = isCorrect ? q.difficulty * 15 : 0;
    const timeBonus = isCorrect && timeTakenMs < q.targetTimeMs ? Math.floor((1 - timeTakenMs / q.targetTimeMs) * 30) : 0;
    const earnedXp = Math.floor((baseXp + timeBonus) * comboMultiplier);

    const showTactic = (!isCorrect || timeTakenMs > q.targetTimeMs) && q.tacticHint ? q.tacticHint : null;

    set({
      combo: newCombo,
      maxCombo: Math.max(state.maxCombo, newCombo),
      score: state.score + earnedXp,
      xpEarned: state.xpEarned + earnedXp,
      correctCount: state.correctCount + (isCorrect ? 1 : 0),
      wrongCount: state.wrongCount + (isCorrect ? 0 : 1),
      lastResult: isCorrect ? "correct" : "wrong",
      showTactic,
      shakeScreen: !isCorrect,
      accuracyHistory: newHistory,
      currentDifficulty: newDifficulty,
    });

    if (typeof window !== "undefined") {
      localStorage.setItem(`mental-boost-progress-${state.topicSlug}`, JSON.stringify({
        currentDifficulty: newDifficulty,
        accuracyHistory: newHistory
      }));
    }

    return { isCorrect, earnedXp, newCombo };
  },

  nextQuestion: () => {
    const state = get();
    const nextIndex = state.questionIndex + 1;
    
    if (nextIndex >= state.totalQuestions) {
      set({ isActive: false, currentQuestion: null });
      return;
    }

    // Attempt to generate the next question dynamically with the NEW adapted difficulty
    let nextQ = generateQuestion(state.topicSlug, state.currentDifficulty);
    
    // Fallback to static DB questions if generator returns null
    if (!nextQ) {
      // Loop around if db bank is smaller than session length
      nextQ = state.questions[nextIndex % state.questions.length]; 
    }

    set({
      questionIndex: nextIndex,
      currentQuestion: nextQ || null,
      lastResult: null,
      showTactic: null,
      shakeScreen: false,
    });
  },

  endDrill: () => {
    const state = get();
    set({
      savedResults: {
        correctCount: state.correctCount,
        wrongCount: state.wrongCount,
        xpEarned: state.xpEarned,
        maxCombo: state.maxCombo,
        score: state.score,
        personalBest: state.personalBest,
      },
      isActive: false,
      currentQuestion: null,
      lastResult: null,
      showTactic: null,
      shakeScreen: false,
    });
  },

  clearAnimation: () => {
    set({ lastResult: null, showTactic: null, shakeScreen: false });
  },
}));
