import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// ─── Users ───────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().default("Çalışkan"),
  xp: integer("xp").notNull().default(0),
  currentLevel: integer("current_level").notNull().default(1),
  longestStreak: integer("longest_streak").notNull().default(0),
  totalCorrect: integer("total_correct").notNull().default(0),
  totalAttempts: integer("total_attempts").notNull().default(0),
  streakShields: integer("streak_shields").notNull().default(0),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Topics ──────────────────────────────────────────────
export const topics = sqliteTable("topics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(), // e.g. "mental-math"
  name: text("name").notNull(),          // e.g. "Mental Math"
  description: text("description").notNull().default(""),
  icon: text("icon").notNull().default("brain"), // lucide icon name
  color: text("color").notNull().default("#8b5cf6"), // theme color
  category: text("category").notNull(), // "math" | "verbal"
});

// ─── Questions ───────────────────────────────────────────
export const questions = sqliteTable("questions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  topicSlug: text("topic_slug").notNull().references(() => topics.slug),
  content: text("content").notNull(),       // The question text or JSON
  options: text("options").notNull(),        // JSON array of choices
  correctAnswer: text("correct_answer").notNull(),
  difficulty: integer("difficulty").notNull().default(1), // 1-5
  targetTimeMs: integer("target_time_ms").notNull().default(15000),
  tacticHint: text("tactic_hint"),           // Quick tip shown after
});

// ─── Attempt Logs ────────────────────────────────────────
export const attemptLogs = sqliteTable("attempt_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  questionId: integer("question_id").notNull(),
  topicSlug: text("topic_slug").notNull(),
  isCorrect: integer("is_correct", { mode: "boolean" }).notNull(),
  timeTakenMs: integer("time_taken_ms").notNull(),
  comboCount: integer("combo_count").notNull().default(0),
  xpEarned: integer("xp_earned").notNull().default(0),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Achievements ────────────────────────────────────────
export const achievements = sqliteTable("achievements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull().default("trophy"),
  condition: text("condition").notNull(), // JSON describing unlock condition
});

// ─── User Achievements ──────────────────────────────────
export const userAchievements = sqliteTable("user_achievements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  achievementSlug: text("achievement_slug").notNull().references(() => achievements.slug),
  unlockedAt: text("unlocked_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Personal Bests (Ghost Mode) ─────────────────────────
export const personalBests = sqliteTable("personal_bests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  topicSlug: text("topic_slug").notNull().references(() => topics.slug),
  bestTimeMs: integer("best_time_ms").notNull(),
  bestStreak: integer("best_streak").notNull().default(0),
  bestScore: integer("best_score").notNull().default(0),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Daily Quests ────────────────────────────────────────
export const dailyQuests = sqliteTable("daily_quests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  targetTopicSlug: text("target_topic_slug"),
  targetCount: integer("target_count").notNull().default(10),
  currentCount: integer("current_count").notNull().default(0),
  xpReward: integer("xp_reward").notNull().default(50),
  isCompleted: integer("is_completed", { mode: "boolean" }).notNull().default(false),
  dateStr: text("date_str").notNull(), // "2026-04-21"
});
