"use client";

import { create } from "zustand";

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
  questions: Question[];
  questionIndex: number;
  totalQuestions: number;
  topicSlug: string;

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

  // Saved results (persisted after endDrill so results screen can read them)
  savedResults: SessionResults | null;

  // Actions
  startDrill: (questions: Question[], topicSlug: string, pb: DrillState["personalBest"]) => void;
  answerQuestion: (answer: string, timeTakenMs: number) => { isCorrect: boolean; earnedXp: number; newCombo: number };
  nextQuestion: () => void;
  endDrill: () => void;
  clearAnimation: () => void;
}

export const useDrillStore = create<DrillState>((set, get) => ({
  isActive: false,
  currentQuestion: null,
  questions: [],
  questionIndex: 0,
  totalQuestions: 0,
  topicSlug: "",
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
    set({
      isActive: true,
      questions,
      currentQuestion: questions[0] || null,
      questionIndex: 0,
      totalQuestions: questions.length,
      topicSlug,
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

    const isCorrect = answer === q.correctAnswer;
    const newCombo = isCorrect ? state.combo + 1 : 0;
    // Use the CURRENT combo (before increment) for multiplier calculation
    const comboMultiplier = isCorrect ? Math.min(1 + state.combo * 0.1, 3) : 1;
    const baseXp = isCorrect ? q.difficulty * 10 : 0;
    const timeBonus = isCorrect && timeTakenMs < q.targetTimeMs ? Math.floor((1 - timeTakenMs / q.targetTimeMs) * 20) : 0;
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
    });

    return { isCorrect, earnedXp, newCombo };
  },

  nextQuestion: () => {
    const state = get();
    const nextIndex = state.questionIndex + 1;
    if (nextIndex >= state.questions.length) {
      set({ isActive: false, currentQuestion: null });
      return;
    }
    set({
      questionIndex: nextIndex,
      currentQuestion: state.questions[nextIndex],
      lastResult: null,
      showTactic: null,
      shakeScreen: false,
    });
  },

  endDrill: () => {
    const state = get();
    // Save results BEFORE clearing state
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
