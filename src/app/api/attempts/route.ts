import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, sql, and, desc, gte } from "drizzle-orm";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// POST: Log an attempt
export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    questionId,
    topicSlug,
    isCorrect,
    timeTakenMs,
    comboCount,
    xpEarned,
  } = body;

  // Log the attempt
  db.insert(schema.attemptLogs)
    .values({
      questionId,
      topicSlug,
      isCorrect,
      timeTakenMs,
      comboCount,
      xpEarned,
    })
    .run();

  // Update user XP and stats
  const user = db.select().from(schema.users).limit(1).get();
  if (user) {
    db.update(schema.users)
      .set({
        xp: user.xp + xpEarned,
        totalCorrect: user.totalCorrect + (isCorrect ? 1 : 0),
        totalAttempts: user.totalAttempts + 1,
        longestStreak: Math.max(user.longestStreak, comboCount),
      })
      .where(eq(schema.users.id, user.id))
      .run();
  }

  return Response.json({ success: true });
}

// GET: Get stats for dashboard
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type"); // "user" | "topic-stats" | "weakness"

  if (type === "user") {
    const user = db.select().from(schema.users).limit(1).get();
    return Response.json(user || {});
  }

  if (type === "topic-stats") {
    const stats = db
      .select({
        topicSlug: schema.attemptLogs.topicSlug,
        totalAttempts: sql<number>`COUNT(*)`,
        correctCount: sql<number>`SUM(CASE WHEN ${schema.attemptLogs.isCorrect} = 1 THEN 1 ELSE 0 END)`,
        avgTimeMs: sql<number>`AVG(${schema.attemptLogs.timeTakenMs})`,
      })
      .from(schema.attemptLogs)
      .groupBy(schema.attemptLogs.topicSlug)
      .all();

    return Response.json(stats);
  }

  if (type === "weakness") {
    // Find weak topics: accuracy < 60% or avg time > target
    const stats = db
      .select({
        topicSlug: schema.attemptLogs.topicSlug,
        totalAttempts: sql<number>`COUNT(*)`,
        correctCount: sql<number>`SUM(CASE WHEN ${schema.attemptLogs.isCorrect} = 1 THEN 1 ELSE 0 END)`,
        avgTimeMs: sql<number>`AVG(${schema.attemptLogs.timeTakenMs})`,
      })
      .from(schema.attemptLogs)
      .groupBy(schema.attemptLogs.topicSlug)
      .having(sql`COUNT(*) >= 5`)
      .all();

    const weakTopics = stats
      .map((s) => ({
        ...s,
        accuracy: s.totalAttempts > 0 ? s.correctCount / s.totalAttempts : 0,
      }))
      .filter((s) => s.accuracy < 0.6);

    return Response.json(weakTopics);
  }

  return Response.json({ error: "invalid type" }, { status: 400 });
}
