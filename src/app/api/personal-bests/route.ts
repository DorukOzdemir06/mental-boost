import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// GET: Get personal best for a topic
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const topicSlug = searchParams.get("topic");

  if (!topicSlug) {
    return Response.json({ error: "topic is required" }, { status: 400 });
  }

  const pb = db
    .select()
    .from(schema.personalBests)
    .where(eq(schema.personalBests.topicSlug, topicSlug))
    .get();

  return Response.json(pb || null);
}

// POST: Update personal best
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { topicSlug, bestTimeMs, bestStreak, bestScore } = body;

  const existing = db
    .select()
    .from(schema.personalBests)
    .where(eq(schema.personalBests.topicSlug, topicSlug))
    .get();

  if (existing) {
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (bestTimeMs < existing.bestTimeMs) updates.bestTimeMs = bestTimeMs;
    if (bestStreak > existing.bestStreak) updates.bestStreak = bestStreak;
    if (bestScore > existing.bestScore) updates.bestScore = bestScore;

    db.update(schema.personalBests)
      .set(updates)
      .where(eq(schema.personalBests.id, existing.id))
      .run();
  } else {
    db.insert(schema.personalBests)
      .values({ topicSlug, bestTimeMs, bestStreak, bestScore })
      .run();
  }

  return Response.json({ success: true });
}
